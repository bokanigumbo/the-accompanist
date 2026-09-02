// theory.js
//
// pure music-theory helpers - no DOM, no AudioContext, nothing that can't
// run in plain node. this is what makes tempo conversion, frequency
// calculation and chord fitting all directly testable (see tests/).
//
// everything is wrapped in an IIFE so nothing leaks into the global scope
// except the one explicit `Theory` namespace at the bottom - classic
// <script> tags all share one global scope, and an accidental bare
// function/const at top level in one file can silently collide with an
// identically-named one in another (this bit chord-engine.js during
// testing: see the note in its export section).
(function () {

  // all 12 note names in chromatic order, starting from C
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // ── frequency ──
  // derived directly from concert pitch (A4 = 440hz exactly), rather than
  // working from a rounded approximation of middle C's frequency - the
  // difference is tiny (a few thousandths of a hertz) but avoids
  // accumulating rounding error, and means A4 comes out as exactly 440
  // rather than 440.0075
  function noteFrequency(note, octave) {
    const A4_INDEX = NOTE_NAMES.indexOf('A');
    const semitonesFromA4 = (octave - 4) * 12 + (NOTE_NAMES.indexOf(note) - A4_INDEX);
    return 440 * Math.pow(2, semitonesFromA4 / 12);
  }

  // ── pitch class ──
  // the note's position in the chromatic scale (0-11), ignoring octave -
  // C4 and C5 both have pitch class 0. this is what chord-fitting needs,
  // since a chord is defined by which pitch classes it contains, not which
  // specific octave they happen to be played in.
  function pitchClass(note) {
    return NOTE_NAMES.indexOf(note);
  }

  // ── tempo ──
  // the one fix this whole rewrite hinged on: a beat at X bpm lasts
  // (60 / X) * 1000 milliseconds. the original code used two different,
  // both-wrong multipliers (*500 for recorded playback, *600 for score
  // playback) that didn't even agree with each other, let alone the correct
  // value. this is now the single source of truth either playback path uses.
  function beatDurationMs(bpm) {
    return (60 / bpm) * 1000;
  }

  function beatsToSeconds(beats, bpm) {
    return (beats * beatDurationMs(bpm)) / 1000;
  }

  const TheoryExports = { NOTE_NAMES, noteFrequency, pitchClass, beatDurationMs, beatsToSeconds };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = TheoryExports;
  } else {
    window.Theory = TheoryExports;
  }

})();
