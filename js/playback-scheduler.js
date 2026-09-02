// playback-scheduler.js
//
// pure timeline-building logic - turns either a built-in song (pitches +
// beat durations) or a user recording (pitches + real start/duration times)
// into one common format: a flat list of
//   { note, octave, startTime, duration }
// all in real seconds, relative to whenever playback is about to begin.
// this is what playback-controller.js then hands to the audio engine and
// the chord engine - neither of which needs to care where the notes
// originally came from.
//
// no AudioContext or DOM dependency here, which is what makes tempo
// conversion and rest-handling directly testable.
(function () {

  const Theory = typeof module !== "undefined" ? require("./theory.js") : window.Theory;

  // a built-in song's notes are defined in BEATS, since they should play
  // faster or slower with the tempo slider - unlike a recording, which
  // already happened in real time and shouldn't rescale with bpm at all.
  function buildTimelineFromSong(songNotes, bpm) {
    let cursorBeats = 0;
    const timeline = [];

    for (const entry of songNotes) {
      const startTime = Theory.beatsToSeconds(cursorBeats, bpm);
      const duration = Theory.beatsToSeconds(entry.beats, bpm);

      if (!entry.rest) {
        timeline.push({ note: entry.note, octave: entry.octave, startTime, duration });
      }

      cursorBeats += entry.beats;
    }

    return timeline;
  }

  // a recording already has real startTime/duration in seconds (captured
  // from actual key press/release timestamps) - this just normalises it so
  // the earliest note starts at time 0, regardless of how long the user
  // waited after pressing "record" before actually playing anything.
  function buildTimelineFromRecording(recordedNotes) {
    if (recordedNotes.length === 0) return [];
    const earliestStart = Math.min(...recordedNotes.map((n) => n.startTime));
    return recordedNotes.map((n) => ({
      note: n.note,
      octave: n.octave,
      startTime: n.startTime - earliestStart,
      duration: n.duration,
    }));
  }

  function timelineDuration(timeline) {
    if (timeline.length === 0) return 0;
    return Math.max(...timeline.map((n) => n.startTime + n.duration));
  }

  const SchedulerExports = { buildTimelineFromSong, buildTimelineFromRecording, timelineDuration };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = SchedulerExports;
  } else {
    window.PlaybackScheduler = SchedulerExports;
  }

})();
