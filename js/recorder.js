// recorder.js
//
// captures an actual performance, not just a list of pitches. the original
// recorder stored only { note, oct } - no press time, no release time, no
// gaps, no chords - so every "recording" played back as evenly-spaced
// notes no matter what was actually played. this tracks real press and
// release timestamps, which is what a genuine musical recording needs.
//
// built as a factory that takes a clock function, rather than calling
// performance.now() directly - that's what makes the timing logic testable
// with exact, deterministic fake timestamps instead of real elapsed time.
(function () {

  function createRecorder(now) {
    let recording = false;
    let recordStartTime = null;
    let notes = [];
    // tracks notes currently held down, keyed by "note+octave", so the
    // matching release can compute how long the key was actually held.
    // simultaneous different notes (chords) get separate entries and don't
    // interfere with each other at all.
    let activeNotes = new Map();

    function start() {
      recording = true;
      recordStartTime = now();
      notes = [];
      activeNotes.clear();
    }

    function stop() {
      recording = false;
      // any note still physically held when recording stops is closed off
      // at that moment, rather than left with no duration at all
      const stopTime = now();
      activeNotes.forEach((entry) => {
        entry.duration = (stopTime - recordStartTime) / 1000 - entry.startTime;
      });
      activeNotes.clear();
    }

    function isRecording() {
      return recording;
    }

    // call when a key is physically pressed. safe to call even when not
    // recording - it just does nothing, so callers don't need to check
    // isRecording() themselves everywhere a note is triggered.
    function noteOn(note, octave) {
      if (!recording) return;
      const key = note + octave;
      const startTime = (now() - recordStartTime) / 1000;
      const entry = { note, octave, startTime, duration: null };
      notes.push(entry);
      activeNotes.set(key, entry);
    }

    // call when the key is released. resolves the matching noteOn's
    // duration - if there's no matching open note (e.g. noteOff without a
    // prior noteOn, or recording started after the key was already down),
    // this is a safe no-op rather than throwing.
    function noteOff(note, octave) {
      if (!recording) return;
      const key = note + octave;
      const entry = activeNotes.get(key);
      if (!entry) return;
      const endTime = (now() - recordStartTime) / 1000;
      entry.duration = endTime - entry.startTime;
      activeNotes.delete(key);
    }

    // returns only fully-resolved notes (a release was recorded) - a note
    // that's still being held has duration === null and isn't ready to be
    // played back yet
    function getRecording() {
      return notes.filter((n) => n.duration !== null);
    }

    function clear() {
      notes = [];
      activeNotes.clear();
    }

    function hasNotes() {
      return notes.length > 0;
    }

    return { start, stop, isRecording, noteOn, noteOff, getRecording, clear, hasNotes };
  }

  const RecorderExports = { createRecorder };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = RecorderExports;
  } else {
    window.Recorder = RecorderExports;
  }

})();
