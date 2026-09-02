const assert = require("assert");
const path = require("path");

// mock out audio-engine.js and chord-engine.js before requiring the
// controller, since there's no real AudioContext available in node - this
// test is purely about the controller's timer/state bookkeeping, which is
// exactly where the reported bugs actually lived (not in the audio
// synthesis itself)
const audioEnginePath = require.resolve("../js/audio-engine.js");
const chordEnginePath = require.resolve("../js/chord-engine.js");

let scheduledCount = 0;
let stoppedHandles = [];

require.cache[audioEnginePath] = {
  exports: {
    AC: { currentTime: 0 },
    scheduleNote: (anchor, note) => { scheduledCount++; return { id: `note-${scheduledCount}` }; },
    scheduleChord: (anchor, region) => { scheduledCount++; return [{ id: `chord-${scheduledCount}` }]; },
    stopAllScheduled: (handles) => { stoppedHandles.push(...handles); },
  },
};
require.cache[chordEnginePath] = {
  exports: {
    chooseChords: () => [], // no chords needed for these tests - isolating just the note/timer logic
    chordName: () => "C",
  },
};

const { createPlaybackController } = require("../js/playback-controller.js");

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function resetMocks() { scheduledCount = 0; stoppedHandles = []; }

test("playing a timeline calls onNoteStart for every note (eventually)", (done) => {
  resetMocks();
  const controller = createPlaybackController();
  const timeline = [
    { note: "C", octave: 4, startTime: 0, duration: 0.01 },
    { note: "D", octave: 4, startTime: 0.01, duration: 0.01 },
  ];
  const started = [];
  controller.play(timeline, {
    onNoteStart: (n) => started.push(n.note),
    onComplete: () => {
      assert.deepStrictEqual(started, ["C", "D"]);
      done();
    },
  });
});

test("stopPlayback immediately resets isPlaying to false, even mid-playback", () => {
  resetMocks();
  const controller = createPlaybackController();
  const timeline = [{ note: "C", octave: 4, startTime: 0, duration: 10 }]; // a long note
  controller.play(timeline, {});
  assert.strictEqual(controller.isPlaying(), true);

  controller.stopPlayback();
  assert.strictEqual(controller.isPlaying(), false, "stopPlayback should immediately un-set playing, not wait for the original timers");
});

test("this is the actual 'clear during playback' bug: stopping never leaves playback permanently stuck", () => {
  resetMocks();
  const controller = createPlaybackController();
  // a timeline that would take a long time to finish on its own
  controller.play([{ note: "C", octave: 4, startTime: 0, duration: 100 }], {});
  assert.strictEqual(controller.isPlaying(), true);

  // simulate the user hitting "clear" mid-playback
  controller.stopPlayback();

  // the critical assertion: playing must be false NOW, not just eventually -
  // the original bug was that clearing the recorded array didn't stop the
  // pending timers, and the "is this the last note" check against the
  // now-empty array meant `playing` could never flip back to false at all
  assert.strictEqual(controller.isPlaying(), false);
});

test("starting a new playback run while one is already active cleans up the old one first (no leaked timers)", (done) => {
  resetMocks();
  const controller = createPlaybackController();

  controller.play([{ note: "C", octave: 4, startTime: 0, duration: 5 }], {
    onComplete: () => assert.fail("the FIRST playback's onComplete should never fire - it should be cancelled by the second play() call"),
  });

  controller.play([{ note: "D", octave: 4, startTime: 0, duration: 0.01 }], {
    onComplete: () => done(), // only the second run's completion should ever fire
  });
});

test("an empty timeline completes immediately rather than hanging", (done) => {
  resetMocks();
  const controller = createPlaybackController();
  controller.play([], {
    onComplete: () => {
      assert.strictEqual(controller.isPlaying(), false);
      done();
    },
  });
});

// ── async-aware runner (some of the tests above use a callback-style
// `done`, since real setTimeout-based scheduling is genuinely asynchronous
// and can't be tested with a purely synchronous assertion) ──
let passed = 0, failed = 0, remaining = tests.length;

function finish() {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

tests.forEach(({ name, fn }) => {
  const isAsync = fn.length > 0;
  const finishOne = (err) => {
    if (err) { console.log(`  ✗ ${name}\n    ${err.message}`); failed++; }
    else { console.log(`  ✓ ${name}`); passed++; }
    remaining--;
    if (remaining === 0) finish();
  };

  try {
    if (isAsync) {
      fn(() => finishOne(null));
    } else {
      fn();
      finishOne(null);
    }
  } catch (err) {
    finishOne(err);
  }
});
