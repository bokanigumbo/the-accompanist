// playback-controller.js
//
// owns every timer and every scheduled audio node that playback creates,
// and is the ONLY thing allowed to start or stop playback - Clear, Stop,
// and any new playback request all funnel through this one controller.
// that single ownership is what fixes three separate bugs at once:
//
// - "recording while playing back duplicates the recording": playback
//   notes are scheduled directly through the audio engine, never through
//   the same code path that live key presses use to record - there's
//   no shared function for a recording flag to accidentally leak into.
//
// - "clearing during playback can permanently lock playback": Clear calls
//   stopPlayback() - the exact same function Stop uses - which
//   unconditionally resets state and cancels everything immediately,
//   rather than relying on checking whether a (possibly just-emptied)
//   array has reached its last index.
//
// - "timer ids accumulate forever": every timer and every audio node
//   this controller creates goes into ONE list, owned here, cleared
//   every single time playback starts OR stops - never left to just
//   pile up across multiple playback runs.
(function () {

  const AudioEngine = typeof module !== "undefined" ? require("./audio-engine.js") : window.AudioEngine;
  const ChordEngine = typeof module !== "undefined" ? require("./chord-engine.js") : window.ChordEngine;

  function createPlaybackController() {
    let playing = false;
    let pendingTimers = [];
    let scheduledAudioHandles = [];

    function isPlaying() {
      return playing;
    }

    // the one function everything (Clear, Stop, and a new play request)
    // calls to actually stop things. safe to call even when nothing is
    // playing - it's just a no-op in that case.
    function stopPlayback(onStop) {
      pendingTimers.forEach(clearTimeout);
      pendingTimers = [];
      AudioEngine.stopAllScheduled(scheduledAudioHandles);
      scheduledAudioHandles = [];
      playing = false;
      if (onStop) onStop();
    }

    // timeline: [{ note, octave, startTime, duration }, ...] in seconds,
    // already normalised to start at (or near) time 0 - see
    // playback-scheduler.js for how either a song or a recording gets
    // turned into this shape.
    //
    // callbacks:
    //   onNoteStart(note, index)   - fired right as each note begins, for
    //                                 flashing the key / highlighting the
    //                                 score or sequence pill
    //   onChordStart(chordName)    - fired as each accompaniment chord
    //                                 region begins
    //   onComplete()               - fired once, after the last scheduled
    //                                 thing finishes
    //   accompanimentWindowBeats   - how many seconds per chord-fitting
    //                                 window (defaults to a musically
    //                                 reasonable 2 seconds' worth)
    function play(timeline, { onNoteStart, onChordStart, onComplete, chordWindowSeconds = 2 } = {}) {
      // defensively stop any previous run first - guarantees a fresh start
      // can never inherit stale timers or nodes from an earlier one
      stopPlayback();

      if (timeline.length === 0) {
        if (onComplete) onComplete();
        return;
      }

      playing = true;
      const anchorTime = AudioEngine.AC.currentTime;

      timeline.forEach((noteEvent, index) => {
        const handle = AudioEngine.scheduleNote(anchorTime, { ...noteEvent, gainScale: 0.45 });
        scheduledAudioHandles.push(handle);

        const timer = setTimeout(() => {
          if (onNoteStart) onNoteStart(noteEvent, index);
        }, noteEvent.startTime * 1000);
        pendingTimers.push(timer);
      });

      // the actual "accompaniment" - a chord fitted to each window of the
      // melody, played quietly underneath it
      const chordRegions = ChordEngine.chooseChords(timeline, chordWindowSeconds);
      chordRegions.forEach((region) => {
        const handles = AudioEngine.scheduleChord(anchorTime, region);
        scheduledAudioHandles.push(...handles);

        const timer = setTimeout(() => {
          if (onChordStart) onChordStart(ChordEngine.chordName(region.chord));
        }, region.startTime * 1000);
        pendingTimers.push(timer);
      });

      const totalEnd = Math.max(...timeline.map((n) => n.startTime + n.duration));
      const completionTimer = setTimeout(() => {
        playing = false;
        if (onComplete) onComplete();
      }, totalEnd * 1000);
      pendingTimers.push(completionTimer);
    }

    return { play, stopPlayback, isPlaying };
  }

  const ControllerExports = { createPlaybackController };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ControllerExports;
  } else {
    window.PlaybackController = ControllerExports;
  }

})();
