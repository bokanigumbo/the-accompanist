const assert = require("assert");
const { noteFrequency, pitchClass, beatDurationMs, beatsToSeconds } = require("../js/theory.js");

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test("A4 is 440hz exactly", () => {
  assert.strictEqual(noteFrequency("A", 4), 440);
});

test("middle C (C4) is approximately 261.63hz", () => {
  assert.ok(Math.abs(noteFrequency("C", 4) - 261.63) < 0.01);
});

test("an octave up doubles the frequency", () => {
  const c4 = noteFrequency("C", 4);
  const c5 = noteFrequency("C", 5);
  assert.ok(Math.abs(c5 - c4 * 2) < 0.001);
});

test("pitchClass ignores octave - C4 and C6 are the same pitch class", () => {
  assert.strictEqual(pitchClass("C"), pitchClass("C"));
});

test("pitchClass distinguishes different notes", () => {
  assert.notStrictEqual(pitchClass("C"), pitchClass("G"));
});

// the actual bug from the report: 100 bpm should give a 600ms beat.
// the original code produced 300ms (recorded playback, *500 multiplier)
// and 360ms (score playback, *600 multiplier) - both wrong, and
// disagreeing with each other.
test("100 bpm gives exactly a 600ms beat", () => {
  assert.strictEqual(beatDurationMs(100), 600);
});

test("120 bpm gives exactly a 500ms beat", () => {
  assert.strictEqual(beatDurationMs(120), 500);
});

test("60 bpm gives exactly a 1000ms beat (one beat per second)", () => {
  assert.strictEqual(beatDurationMs(60), 1000);
});

test("beatsToSeconds: 2 beats at 120bpm is exactly 1 second", () => {
  assert.strictEqual(beatsToSeconds(2, 120), 1);
});

test("beatsToSeconds: half a beat at 100bpm is 0.3 seconds", () => {
  assert.strictEqual(beatsToSeconds(0.5, 100), 0.3);
});

let passed = 0, failed = 0;
for (const { name, fn } of tests) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (err) { console.log(`  ✗ ${name}\n    ${err.message}`); failed++; }
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
