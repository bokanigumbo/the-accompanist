// audio-engine.js
//
// the actual sound-producing layer. two distinct capabilities live here:
//
// 1. LIVE notes (noteOn/noteOff) - for the piano keys and computer keyboard,
//    where a note needs to keep sounding for exactly as long as the key is
//    physically held down. this is also what makes real rhythm recording
//    possible at all: the original app only ever played a fixed 0.85s pluck
//    per keypress, so there was no such thing as "how long a key was held"
//    to even record.
//
// 2. SCHEDULED notes (scheduleNote) - for song and recording playback,
//    where every note's start time is set directly on the Web Audio node
//    via AudioContext.currentTime, rather than a JS setTimeout deciding
//    when to start it. setTimeout is a *minimum* delay, not a guaranteed
//    one - if the main thread is even briefly busy (updating the dom,
//    garbage collecting, whatever), every subsequent note in a setTimeout
//    chain drifts later and later. scheduling directly on the audio clock
//    means the audio hardware itself is responsible for timing, which
//    doesn't drift the way JS timers can.
(function () {

  const Theory = typeof module !== "undefined" ? require("./theory.js") : window.Theory;

  const AC = (typeof window !== "undefined")
    ? new (window.AudioContext || window.webkitAudioContext)()
    : null;

  let currentVolume = 0.5;
  function setVolume(v) { currentVolume = v; }
  function getVolume() { return currentVolume; }

  // exponentialRampToValueAtTime requires strictly positive values - ramping
  // FROM zero (which is exactly what happens with the volume slider all the
  // way down) throws a real, silent-failure-inducing error. a tiny positive
  // floor avoids that without being audibly different from true silence.
  const MIN_GAIN = 0.0001;

  function safeStartGain(targetGain) {
    return Math.max(targetGain, MIN_GAIN);
  }

  // ── live, held notes ──
  // returns a handle that noteOff() later uses to release exactly this note
  function noteOn(note, octave, gainScale = 0.45) {
    if (!AC) return null;
    AC.resume();

    const osc = AC.createOscillator();
    const gain = AC.createGain();
    osc.type = "triangle";
    osc.frequency.value = Theory.noteFrequency(note, octave);

    const targetGain = currentVolume * gainScale;
    const startGain = safeStartGain(targetGain);

    gain.gain.setValueAtTime(startGain, AC.currentTime);
    // a short attack ramp avoids an audible click at note-on
    if (targetGain > MIN_GAIN) {
      gain.gain.linearRampToValueAtTime(targetGain, AC.currentTime + 0.015);
    }

    osc.connect(gain);
    gain.connect(AC.destination);
    osc.start();

    return { osc, gain };
  }

  function noteOff(handle, releaseSeconds = 0.25) {
    if (!handle || !AC) return;
    const { osc, gain } = handle;
    const now = AC.currentTime;

    gain.gain.cancelScheduledValues(now);
    const current = Math.max(gain.gain.value, MIN_GAIN);
    gain.gain.setValueAtTime(current, now);

    // linear, not exponential, when muted or near-muted - exponential ramps
    // can only ever approach zero asymptotically and require a positive
    // starting value throughout; a linear ramp works correctly all the way
    // down to true zero, which matters most exactly when the volume slider
    // is at (or near) zero
    if (current <= 0.01) {
      gain.gain.linearRampToValueAtTime(0, now + releaseSeconds);
    } else {
      gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + releaseSeconds);
    }

    osc.stop(now + releaseSeconds + 0.02);
  }

  // ── scheduled (playback) notes ──
  // startTime/duration are in seconds, relative to `anchorTime` (which the
  // playback controller sets once per playback run to AC.currentTime at the
  // moment playback begins) - this is what lets a whole song or recording's
  // worth of notes be handed to the audio clock all at once, rather than
  // trusting a chain of setTimeouts to stay in sync with each other.
  function scheduleNote(anchorTime, { note, octave, startTime, duration, gainScale = 0.45 }) {
    if (!AC) return null;

    const osc = AC.createOscillator();
    const gain = AC.createGain();
    osc.type = "triangle";
    osc.frequency.value = Theory.noteFrequency(note, octave);

    const noteStart = anchorTime + startTime;
    const noteEnd = noteStart + duration;
    const targetGain = safeStartGain(currentVolume * gainScale);

    gain.gain.setValueAtTime(targetGain, noteStart);
    if (targetGain > MIN_GAIN) {
      gain.gain.exponentialRampToValueAtTime(MIN_GAIN, noteEnd);
    } else {
      gain.gain.linearRampToValueAtTime(0, noteEnd);
    }

    osc.connect(gain);
    gain.connect(AC.destination);
    osc.start(noteStart);
    osc.stop(noteEnd + 0.02);

    return { osc, gain };
  }

  // schedules a full chord (three simultaneous oscillators) as soft
  // accompaniment underneath the melody - the same scheduling mechanism as
  // a single note, just three at once, one octave below middle C by default
  // so it sits underneath the melody rather than competing with it
  function scheduleChord(anchorTime, { tones, startTime, duration }, accompanimentOctave = 3) {
    if (!AC) return [];
    return tones.map((pitchClass) => {
      const note = Theory.NOTE_NAMES[pitchClass];
      return scheduleNote(anchorTime, {
        note, octave: accompanimentOctave, startTime, duration, gainScale: 0.14,
      });
    });
  }

  function stopAllScheduled(handles) {
    if (!AC) return;
    const now = AC.currentTime;
    handles.forEach((h) => {
      if (!h) return;
      try {
        h.gain.gain.cancelScheduledValues(now);
        h.gain.gain.setValueAtTime(0, now);
        h.osc.stop(now);
      } catch (e) {
        // the oscillator may already have finished and stopped naturally -
        // that's fine, there's nothing left to cancel
      }
    });
  }

  const AudioEngineExports = {
    AC, setVolume, getVolume, noteOn, noteOff, scheduleNote, scheduleChord, stopAllScheduled, MIN_GAIN,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = AudioEngineExports;
  } else {
    window.AudioEngine = AudioEngineExports;
  }

})();
