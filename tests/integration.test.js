/**
 * tests/integration.test.js
 *
 * THE ACTUAL GAP THIS FILE FIXES: every other test file for the playback
 * controller mocks out audio-engine.js and/or chord-engine.js, which is
 * exactly right for testing the controller's own timer/state bookkeeping
 * in isolation - but it also means nothing was ever checking that the
 * DATA SHAPE chord-engine.js actually produces is the one audio-engine.js
 * actually expects at the boundary between them. it wasn't: chooseChords()
 * returns { chord, startTime, duration }, scheduleChord() expected
 * { tones, startTime, duration } directly, and the controller passed the
 * region straight through unchanged - so `tones` was undefined the moment
 * real accompaniment ever got scheduled, despite all 41 tests in the
 * suite passing. this file uses the REAL chord-engine.js and the REAL
 * audio-engine.js together (audio-engine's internals genuinely execute
 * against a fake-but-realistic AudioContext, not a stub that never looks
 * at what it's given) specifically to catch this class of bug.
 *
 * uses node's vm module (not plain require()) to load these - audio-
 * engine.js checks `typeof window !== "undefined"` to decide whether a
 * real AudioContext exists, which is false under plain require() and
 * would make AC null, causing every scheduling function to short-circuit
 * before ever running its actual logic. vm.createContext with a fake
 * window.AudioContext is what lets the real code path actually execute.
 */

const assert = require("assert");
const vm = require("vm");
const fs = require("fs");
const path = require("path");

class FakeOscillator {
  constructor() { this.frequency = { value: 0 }; this.type = ""; }
  connect() {}
  start() {}
  stop() {}
}

class FakeGainParam {
  constructor() { this.value = 0; }
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
  cancelScheduledValues() {}
}

class FakeGain {
  constructor() { this.gain = new FakeGainParam(); }
  connect() {}
}

class FakeAudioContext {
  constructor() { this.currentTime = 0; this.destination = {}; }
  createOscillator() { return new FakeOscillator(); }
  createGain() { return new FakeGain(); }
  resume() {}
}

function loadRealApp() {
  const sandbox = {
    window: { AudioContext: FakeAudioContext },
    console,
    setTimeout,
    clearTimeout,
  };
  vm.createContext(sandbox);

  const files = [
    "js/theory.js",
    "js/chord-engine.js",
    "js/audio-engine.js",
    "js/songs.js",
    "js/recorder.js",
    "js/playback-scheduler.js",
    "js/playback-controller.js",
  ];
  for (const file of files) {
    const fullPath = path.join(__dirname, "..", file);
    vm.runInContext(fs.readFileSync(fullPath, "utf8"), sandbox, { filename: file });
  }

  return sandbox.window;
}

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test("THE ACTUAL BUG: playing a timeline with an obvious chord schedules real accompaniment without throwing", async () => {
  const { PlaybackController } = loadRealApp();
  const controller = PlaybackController.createPlaybackController();

  const timeline = [
    { note: "C", octave: 4, startTime: 0, duration: 1 },
    { note: "E", octave: 4, startTime: 1, duration: 1 },
    { note: "G", octave: 4, startTime: 2, duration: 1 },
  ];

  let thrown = null;
  let chordFired = null;
  try {
    controller.play(timeline, { onChordStart: (name) => { chordFired = name; } });
  } catch (err) {
    thrown = err;
  }

  assert.strictEqual(thrown, null, `play() should not throw when real accompaniment is scheduled, but threw: ${thrown && thrown.message}`);

  await delay(50); // let the scheduled onChordStart timer actually fire
  assert.strictEqual(chordFired, "C", "a C-E-G melody should be recognised and announced as a C major chord");
});

test("scheduleChord is actually called with a real tones array, not undefined", async () => {
  // the most direct possible proof this specific bug is fixed: spy on the
  // REAL AudioEngine.scheduleChord (not a mock standing in for it) and
  // confirm what playback-controller.js actually hands it
  const windowObj = loadRealApp();
  const { PlaybackController, AudioEngine } = windowObj;

  const originalScheduleChord = AudioEngine.scheduleChord;
  const capturedCalls = [];
  AudioEngine.scheduleChord = function (anchorTime, region, ...rest) {
    capturedCalls.push(region);
    return originalScheduleChord.call(this, anchorTime, region, ...rest);
  };

  const controller = PlaybackController.createPlaybackController();
  const timeline = [
    { note: "C", octave: 4, startTime: 0, duration: 1 },
    { note: "E", octave: 4, startTime: 1, duration: 1 },
    { note: "G", octave: 4, startTime: 2, duration: 1 },
  ];

  controller.play(timeline, {});

  assert.ok(capturedCalls.length >= 1, "scheduleChord should have been called at least once");
  for (const call of capturedCalls) {
    assert.ok(Array.isArray(call.tones), `expected region.tones to be an array, got ${JSON.stringify(call)}`);
    assert.ok(call.tones.length === 3, "a triad should have exactly 3 tones");
    assert.ok(call.tones.every((t) => typeof t === "number" && t >= 0 && t <= 11), "each tone should be a pitch class 0-11");
  }
});

test("a real built-in song plays all the way through the controller without throwing", async () => {
  const { PlaybackController, PlaybackScheduler, Songs } = loadRealApp();
  const controller = PlaybackController.createPlaybackController();

  const timeline = PlaybackScheduler.buildTimelineFromSong(Songs.songs.ode.notes, 100);

  let thrown = null;
  try {
    controller.play(timeline, {});
  } catch (err) {
    thrown = err;
  }

  assert.strictEqual(thrown, null, `playing "Ode to Joy" end-to-end should not throw, but threw: ${thrown && thrown.message}`);
});

test("a real (recording-shaped) timeline with simultaneous notes also plays through the controller without throwing", async () => {
  const { PlaybackController, PlaybackScheduler } = loadRealApp();
  const controller = PlaybackController.createPlaybackController();

  const recording = [
    { note: "C", octave: 4, startTime: 0, duration: 1 },
    { note: "E", octave: 4, startTime: 0, duration: 1 }, // a chord played by the user, both notes at once
    { note: "G", octave: 4, startTime: 0, duration: 1 },
    { note: "F", octave: 4, startTime: 1.2, duration: 0.8 },
  ];
  const timeline = PlaybackScheduler.buildTimelineFromRecording(recording);

  let thrown = null;
  try {
    controller.play(timeline, {});
  } catch (err) {
    thrown = err;
  }

  assert.strictEqual(thrown, null, `playing a recorded performance end-to-end should not throw, but threw: ${thrown && thrown.message}`);
});

// ── async-aware runner ──
async function run() {
  let passed = 0, failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.log(`  ✗ ${name}`);
      console.log(`    ${err.message}`);
      failed++;
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
