// chord-engine.js
//
// this is what actually makes the app an accompanist rather than just a
// piano: given a melody (a list of notes with real start times and
// durations), it works out a chord to play underneath, by checking how
// well each of the 24 possible major/minor triads fits the notes actually
// being played in each short time window, and picking whichever fits best.
//
// this is a genuine (if intentionally simplified) harmonisation technique -
// scoring candidate chords by how many of a passage's notes are one of the
// chord's three tones - rather than a hardcoded progression. it's why this
// works equally for a C major tune and Minuet in G's F#s, without needing
// to know in advance what key anything is in.
//
// no DOM or audio api dependency here either - purely a function of "what
// notes were played, when" to "what chords to play", which is what makes
// it directly testable.
(function () {

  const Theory = typeof module !== "undefined" ? require("./theory.js") : window.Theory;
  const pitchClass = Theory.pitchClass;

  // every major and minor triad, built from its root's pitch class.
  // major = root, +4 semitones, +7 semitones. minor = root, +3, +7.
  function buildChord(rootPc, quality) {
    const third = quality === "major" ? 4 : 3;
    return {
      root: rootPc,
      quality,
      tones: [rootPc, (rootPc + third) % 12, (rootPc + 7) % 12],
    };
  }

  const ALL_CHORDS = [];
  for (let root = 0; root < 12; root++) {
    ALL_CHORDS.push(buildChord(root, "major"));
    ALL_CHORDS.push(buildChord(root, "minor"));
  }

  const NOTE_NAMES_FOR_DISPLAY = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  function chordName(chord) {
    return NOTE_NAMES_FOR_DISPLAY[chord.root] + (chord.quality === "minor" ? "m" : "");
  }

  // scores one candidate chord against the notes in a window, weighted by
  // each note's duration - a note held for a full beat should count for
  // more than a passing sixteenth note when deciding what the underlying
  // harmony actually is
  function scoreChord(chord, notesInWindow) {
    return notesInWindow.reduce((score, n) => {
      const pc = pitchClass(n.note);
      return score + (chord.tones.includes(pc) ? n.duration : 0);
    }, 0);
  }

  // picks the best-fitting chord for one window of notes.
  // ties are broken by, in order: staying on the previous chord (avoids
  // needlessly restless harmony changes), matching the window's first note
  // as the root, then preferring major over minor, then lowest root as a
  // final deterministic tiebreak so results are reproducible.
  function pickChordForWindow(notesInWindow, previousChord) {
    if (notesInWindow.length === 0) return previousChord || null;

    let best = null;
    let bestScore = -1;

    for (const chord of ALL_CHORDS) {
      const score = scoreChord(chord, notesInWindow);
      if (score <= 0) continue;

      if (score > bestScore) {
        best = chord;
        bestScore = score;
        continue;
      }

      if (score === bestScore && best) {
        const firstNotePc = pitchClass(notesInWindow[0].note);
        const prevIsSame = previousChord && chord.root === previousChord.root && chord.quality === previousChord.quality;
        const bestIsPrev = previousChord && best.root === previousChord.root && best.quality === previousChord.quality;

        if (prevIsSame && !bestIsPrev) { best = chord; continue; }
        if (bestIsPrev) continue;

        if (chord.root === firstNotePc && best.root !== firstNotePc) { best = chord; continue; }
        if (best.root === firstNotePc) continue;

        if (chord.quality === "major" && best.quality === "minor") { best = chord; continue; }
        if (best.quality === "major" && chord.quality === "minor") continue;

        if (chord.root < best.root) best = chord;
      }
    }

    return best || previousChord || null;
  }

  // splits a melody (real start times + durations, in seconds) into fixed
  // windows and picks a chord for each one. returns a list of
  // { chord, startTime, duration } ready to be scheduled as accompaniment.
  //
  // notes that are rests are ignored entirely for harmonisation purposes -
  // only actual pitches inform the chord choice.
  function chooseChords(notes, windowSeconds) {
    const pitched = notes.filter((n) => !n.rest);
    if (pitched.length === 0) return [];

    const totalEnd = Math.max(...pitched.map((n) => n.startTime + n.duration));
    const chords = [];
    let previousChord = null;

    for (let windowStart = 0; windowStart < totalEnd; windowStart += windowSeconds) {
      const windowEnd = windowStart + windowSeconds;
      const notesInWindow = pitched.filter(
        (n) => n.startTime < windowEnd && n.startTime + n.duration > windowStart
      );

      const chord = pickChordForWindow(notesInWindow, previousChord);
      if (chord) {
        chords.push({ chord, startTime: windowStart, duration: Math.min(windowSeconds, totalEnd - windowStart) });
        previousChord = chord;
      }
    }

    return chords;
  }

  const ChordEngineExports = { buildChord, chordName, scoreChord, pickChordForWindow, chooseChords, ALL_CHORDS };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ChordEngineExports;
  } else {
    window.ChordEngine = ChordEngineExports;
  }

})();
