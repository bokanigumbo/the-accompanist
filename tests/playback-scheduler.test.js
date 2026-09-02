const assert = require("assert");
const { buildTimelineFromSong, buildTimelineFromRecording, timelineDuration } = require("../js/playback-scheduler.js");
const { songs } = require("../js/songs.js");

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test("a quarter note at 100bpm lasts exactly 600ms (0.6s) - the actual bug from the report", () => {
  const timeline = buildTimelineFromSong([{ note: "C", octave: 4, beats: 1 }], 100);
  assert.strictEqual(timeline[0].duration, 0.6);
});

test("consecutive notes start back to back, not overlapping or gapped", () => {
  const timeline = buildTimelineFromSong(
    [{ note: "C", octave: 4, beats: 1 }, { note: "D", octave: 4, beats: 1 }],
    120 // 0.5s per beat
  );
  assert.strictEqual(timeline[0].startTime, 0);
  assert.strictEqual(timeline[1].startTime, 0.5);
});

test("a rest takes up time but produces no playable note", () => {
  const timeline = buildTimelineFromSong(
    [{ note: "C", octave: 4, beats: 1 }, { rest: true, beats: 1 }, { note: "D", octave: 4, beats: 1 }],
    120
  );
  assert.strictEqual(timeline.length, 2, "only 2 actual notes, the rest doesn't produce a timeline entry");
  assert.strictEqual(timeline[1].startTime, 1, "the second note starts after both the first note AND the rest");
});

test("a dotted note (1.5 beats) gets proportionally longer duration", () => {
  const timeline = buildTimelineFromSong([{ note: "C", octave: 4, beats: 1.5 }], 100);
  assert.strictEqual(timeline[0].duration, 0.9); // 1.5 * 0.6s
});

test("every built-in song produces a valid, non-empty timeline", () => {
  for (const key of Object.keys(songs)) {
    const timeline = buildTimelineFromSong(songs[key].notes, 100);
    assert.ok(timeline.length > 0, `${key} should produce at least one playable note`);
    timeline.forEach((n) => {
      assert.ok(n.duration > 0, `${key}: every note should have a positive duration`);
      assert.ok(n.startTime >= 0, `${key}: no note should start before time 0`);
    });
  }
});

test("recording playback: notes keep their relative timing, normalised to start at 0", () => {
  const recording = [
    { note: "C", octave: 4, startTime: 5.0, duration: 0.5 },
    { note: "E", octave: 4, startTime: 5.5, duration: 0.3 },
  ];
  const timeline = buildTimelineFromRecording(recording);
  assert.strictEqual(timeline[0].startTime, 0, "the first note should be shifted to start at time 0");
  assert.strictEqual(timeline[1].startTime, 0.5, "the gap between notes should be preserved exactly");
});

test("recording playback: simultaneous (chord) notes are preserved, not forced apart", () => {
  const recording = [
    { note: "C", octave: 4, startTime: 0, duration: 1 },
    { note: "E", octave: 4, startTime: 0, duration: 1 }, // played at the same instant
  ];
  const timeline = buildTimelineFromRecording(recording);
  assert.strictEqual(timeline[0].startTime, timeline[1].startTime, "notes played together should stay together");
});

test("an empty recording produces an empty timeline, not an error", () => {
  assert.deepStrictEqual(buildTimelineFromRecording([]), []);
});

test("timelineDuration reports the true end of the whole piece, not just the last note's start", () => {
  const timeline = [{ note: "C", octave: 4, startTime: 0, duration: 1 }, { note: "D", octave: 4, startTime: 1, duration: 2 }];
  assert.strictEqual(timelineDuration(timeline), 3);
});

let passed = 0, failed = 0;
for (const { name, fn } of tests) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (err) { console.log(`  ✗ ${name}\n    ${err.message}`); failed++; }
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
