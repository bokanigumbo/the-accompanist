// app.js
// wires all the other modules to the actual page - dom event listeners,
// on-screen state (stats, chord name, keyboard octave), and the glue
// between the piano/recorder/playback-controller/visualiser.
(function () {

  const AudioEngine = window.AudioEngine;
  const ChordEngine = window.ChordEngine;
  const Piano = window.Piano;
  const Visualiser = window.Visualiser;
  const Recorder = window.Recorder;
  const PlaybackScheduler = window.PlaybackScheduler;
  const PlaybackController = window.PlaybackController;
  const { songs } = window.Songs;

  const els = {
    piano: document.getElementById("piano"),
    topRail: document.getElementById("topRail"),
    octCount: document.getElementById("octCount"),
    startOct: document.getElementById("startOct"),
    volSl: document.getElementById("volSl"),
    bpmSl: document.getElementById("bpmSl"),
    bpmVal: document.getElementById("bpmVal"),
    noteCount: document.getElementById("noteCount"),
    lastNote: document.getElementById("lastNote"),
    chordNow: document.getElementById("chordNow"),
    songSel: document.getElementById("songSel"),
    scoreLabel: document.getElementById("scoreLabel"),
    scoreCanvas: document.getElementById("scoreCanvas"),
    scoreTextAlt: document.getElementById("scoreTextAlt"),
    scorePlayBtn: document.getElementById("scorePlayBtn"),
    scoreStopBtn: document.getElementById("scoreStopBtn"),
    recBtn: document.getElementById("recBtn"),
    playBtn: document.getElementById("playBtn"),
    clearBtn: document.getElementById("clearBtn"),
    seqRow: document.getElementById("seqRow"),
    kbdOctaveDisplay: document.getElementById("kbdOctaveDisplay"),
  };

  let noteCount = 0;
  let kbdOctave = 4;
  let currentSongKey = null;
  const heldByKeyboard = new Map(); // computer-key -> {note, octave, audioHandle}
  const heldByPiano = new Map(); // "note+octave" -> {note, octave, handle}, for piano/touch/keyboard-activated input

  const recorder = Recorder.createRecorder(() => performance.now());
  const playbackController = PlaybackController.createPlaybackController();

  // ── live note on/off - shared by the piano and the computer keyboard ──
  function liveNoteOn(note, octave) {
    const handle = AudioEngine.noteOn(note, octave);
    recorder.noteOn(note, octave);

    noteCount++;
    els.noteCount.textContent = noteCount;
    els.lastNote.textContent = note + octave;

    return handle;
  }

  function liveNoteOff(note, octave, handle) {
    AudioEngine.noteOff(handle);
    recorder.noteOff(note, octave);
  }

  // ── piano keyboard (mouse/touch/stylus, via pointer events) ──
  function releaseAllHeldPianoNotes() {
    // rebuilding the piano (via Piano.buildPiano) wipes the container's
    // contents outright - any button currently held down is destroyed
    // without its pointerup/pointerleave/keyup handler ever getting a
    // chance to fire, since the element itself is simply gone, not
    // "released" by the user. without this, changing the octave controls
    // mid-hold could leave that note's oscillator sounding forever, with
    // nothing left to ever call noteOff on it.
    for (const { note, octave, handle } of heldByPiano.values()) {
      liveNoteOff(note, octave, handle);
    }
    heldByPiano.clear();
  }

  function rebuildPiano() {
    releaseAllHeldPianoNotes();

    Piano.buildPiano({
      container: els.piano,
      railEl: els.topRail,
      numOctaves: parseInt(els.octCount.value, 10),
      startOctave: parseInt(els.startOct.value, 10),
      onNoteDown: (note, octave) => {
        const handle = liveNoteOn(note, octave);
        heldByPiano.set(note + octave, { note, octave, handle });
      },
      onNoteUp: (note, octave) => {
        const held = heldByPiano.get(note + octave);
        if (held) liveNoteOff(held.note, held.octave, held.handle);
        heldByPiano.delete(note + octave);
      },
    });
  }

  els.octCount.addEventListener("change", rebuildPiano);
  els.startOct.addEventListener("change", rebuildPiano);

  // ── volume / tempo ──
  els.volSl.addEventListener("input", (e) => {
    AudioEngine.setVolume(parseFloat(e.target.value));
  });

  els.bpmSl.addEventListener("input", (e) => {
    els.bpmVal.textContent = e.target.value + " bpm";
  });

  // ── computer keyboard ──
  // home row = white keys, top row = black keys, matching the original
  // layout. keyup now genuinely releases the note, rather than every
  // keypress just firing a fixed-length pluck regardless of how long the
  // key was actually held.
  const kmap = {
    a: "C", s: "D", d: "E", f: "F", g: "G", h: "A", j: "B",
    w: "C#", e: "D#", t: "F#", y: "G#", u: "A#",
  };

  function updateKbdOctaveDisplay() {
    if (els.kbdOctaveDisplay) els.kbdOctaveDisplay.textContent = "octave " + kbdOctave;
  }

  document.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;

    const key = e.key.toLowerCase();

    if (key === "z") { kbdOctave = Math.max(2, kbdOctave - 1); updateKbdOctaveDisplay(); return; }
    if (key === "x") { kbdOctave = Math.min(7, kbdOctave + 1); updateKbdOctaveDisplay(); return; }

    const note = kmap[key];
    if (!note || heldByKeyboard.has(key)) return;

    const octave = kbdOctave;
    const handle = liveNoteOn(note, octave);
    heldByKeyboard.set(key, { note, octave, handle });
    Piano.flashKey(els.piano, note, octave);
  });

  document.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    const held = heldByKeyboard.get(key);
    if (!held) return;
    liveNoteOff(held.note, held.octave, held.handle);
    heldByKeyboard.delete(key);
  });

  // ── record / play back / clear ──
  els.recBtn.addEventListener("click", () => {
    if (recorder.isRecording()) {
      recorder.stop();
    } else {
      recorder.start();
    }
    els.recBtn.classList.toggle("on", recorder.isRecording());
    els.recBtn.textContent = recorder.isRecording() ? "⏹ recording…" : "⏺ record";
    els.recBtn.setAttribute("aria-pressed", String(recorder.isRecording()));
  });

  function renderSeq(notes, activeIdx) {
    if (!notes.length) {
      els.seqRow.innerHTML = '<span style="font-size:12px;font-style:italic;color:#888780;">your recorded notes appear here</span>';
      return;
    }
    els.seqRow.innerHTML = notes.map((n, i) =>
      `<div class="seq-note ${i === activeIdx ? "playing" : ""}">${n.note}${n.octave}</div>`
    ).join("");
  }

  els.clearBtn.addEventListener("click", () => {
    // stopPlayback FIRST - this is what stops "clear during playback" from
    // ever being able to leave things stuck, since it unconditionally
    // resets playback state rather than relying on the (about to be empty)
    // recording array to detect its own end
    playbackController.stopPlayback(() => renderSeq([], -1));
    recorder.clear();
    renderSeq([], -1);
    els.chordNow.textContent = "—";
  });

  els.playBtn.addEventListener("click", () => {
    const recording = recorder.getRecording();
    if (!recording.length || playbackController.isPlaying()) return;

    const timeline = PlaybackScheduler.buildTimelineFromRecording(recording);
    playbackController.play(timeline, {
      onNoteStart: (note, i) => {
        Piano.flashKey(els.piano, note.note, note.octave);
        renderSeq(recording, i);
      },
      onChordStart: (name) => { els.chordNow.textContent = name; },
      onComplete: () => {
        renderSeq(recording, -1);
        els.chordNow.textContent = "—";
      },
    });
  });

  // ── built-in songs ──
  els.songSel.addEventListener("change", (e) => {
    currentSongKey = e.target.value || null;
    if (currentSongKey && songs[currentSongKey]) {
      els.scoreLabel.textContent = songs[currentSongKey].title;
      Visualiser.draw(els.scoreCanvas, els.scoreTextAlt, songs[currentSongKey].notes, -1);
    } else {
      Visualiser.draw(els.scoreCanvas, els.scoreTextAlt, [], -1);
    }
  });

  els.scorePlayBtn.addEventListener("click", () => {
    if (!currentSongKey || !songs[currentSongKey] || playbackController.isPlaying()) return;
    const seq = songs[currentSongKey].notes;
    const bpm = parseInt(els.bpmSl.value, 10);
    const timeline = PlaybackScheduler.buildTimelineFromSong(seq, bpm);

    // the score visualiser highlights by index into the ORIGINAL sequence
    // (which includes rests), but the audio timeline has rests filtered
    // out - this keeps a mapping back from timeline index to the right
    // position in the visual sequence, so a run of rests doesn't throw the
    // highlighted note out of sync with what's actually playing
    const seqIndexForTimelineIndex = [];
    seq.forEach((entry, i) => { if (!entry.rest) seqIndexForTimelineIndex.push(i); });

    playbackController.play(timeline, {
      onNoteStart: (note, i) => {
        Piano.flashKey(els.piano, note.note, note.octave);
        Visualiser.draw(els.scoreCanvas, els.scoreTextAlt, seq, seqIndexForTimelineIndex[i]);
      },
      onChordStart: (name) => { els.chordNow.textContent = name; },
      onComplete: () => {
        Visualiser.draw(els.scoreCanvas, els.scoreTextAlt, seq, -1);
        els.chordNow.textContent = "—";
      },
    });
  });

  els.scoreStopBtn.addEventListener("click", () => {
    playbackController.stopPlayback(() => {
      if (currentSongKey && songs[currentSongKey]) {
        Visualiser.draw(els.scoreCanvas, els.scoreTextAlt, songs[currentSongKey].notes, -1);
      }
      els.chordNow.textContent = "—";
    });
  });

  window.addEventListener("resize", () => {
    if (currentSongKey && songs[currentSongKey]) {
      Visualiser.draw(els.scoreCanvas, els.scoreTextAlt, songs[currentSongKey].notes, -1);
    }
  });

  // ── kick everything off ──
  AudioEngine.setVolume(parseFloat(els.volSl.value));
  rebuildPiano();
  updateKbdOctaveDisplay();
  Visualiser.draw(els.scoreCanvas, els.scoreTextAlt, [], -1);
  renderSeq([], -1);

})();
