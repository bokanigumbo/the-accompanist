const assert = require("assert");
const { createRecorder } = require("../js/recorder.js");

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// a controllable fake clock, so timing tests are exact and deterministic
// rather than depending on real elapsed wall-clock time
function fakeClock(startMs = 0) {
  let t = startMs;
  const clock = () => t;
  clock.advance = (ms) => { t += ms; };
  return clock;
}

test("a single held note records the correct start time and duration", () => {
  const clock = fakeClock();
  const rec = createRecorder(clock);
  rec.start();
  clock.advance(250); // press at 250ms in
  rec.noteOn("C", 4);
  clock.advance(500); // held for 500ms
  rec.noteOff("C", 4);

  const notes = rec.getRecording();
  assert.strictEqual(notes.length, 1);
  assert.strictEqual(notes[0].startTime, 0.25);
  assert.strictEqual(notes[0].duration, 0.5);
});

test("gaps between notes (rests) are preserved as real silence, not compressed away", () => {
  const clock = fakeClock();
  const rec = createRecorder(clock);
  rec.start();
  rec.noteOn("C", 4);
  clock.advance(200);
  rec.noteOff("C", 4);
  clock.advance(800); // a long pause before the next note
  rec.noteOn("D", 4);
  clock.advance(200);
  rec.noteOff("D", 4);

  const notes = rec.getRecording();
  const gap = notes[1].startTime - (notes[0].startTime + notes[0].duration);
  assert.strictEqual(gap, 0.8);
});

test("simultaneous notes (a chord) are both captured with the same start time", () => {
  const clock = fakeClock();
  const rec = createRecorder(clock);
  rec.start();
  rec.noteOn("C", 4);
  rec.noteOn("E", 4);
  rec.noteOn("G", 4);
  clock.advance(1000);
  rec.noteOff("C", 4);
  rec.noteOff("E", 4);
  rec.noteOff("G", 4);

  const notes = rec.getRecording();
  assert.strictEqual(notes.length, 3);
  assert.ok(notes.every((n) => n.startTime === notes[0].startTime));
});

test("different notes with the same pitch class in different octaves don't interfere with each other", () => {
  const clock = fakeClock();
  const rec = createRecorder(clock);
  rec.start();
  rec.noteOn("C", 4);
  clock.advance(100);
  rec.noteOn("C", 5); // a different octave, held while C4 is still down
  clock.advance(100);
  rec.noteOff("C", 4); // release the lower one first
  clock.advance(100);
  rec.noteOff("C", 5);

  const notes = rec.getRecording();
  const c4 = notes.find((n) => n.octave === 4);
  const c5 = notes.find((n) => n.octave === 5);
  assert.ok(Math.abs(c4.duration - 0.2) < 1e-9);
  assert.ok(Math.abs(c5.duration - 0.2) < 1e-9);
});

test("a note release with no matching press is safely ignored, not a crash", () => {
  const clock = fakeClock();
  const rec = createRecorder(clock);
  rec.start();
  assert.doesNotThrow(() => rec.noteOff("C", 4));
  assert.strictEqual(rec.getRecording().length, 0);
});

test("a note still held when recording stops is closed off at that moment", () => {
  const clock = fakeClock();
  const rec = createRecorder(clock);
  rec.start();
  rec.noteOn("C", 4);
  clock.advance(300);
  rec.stop(); // released the key after stopping, or never released it at all

  const notes = rec.getRecording();
  assert.strictEqual(notes.length, 1);
  assert.strictEqual(notes[0].duration, 0.3);
});

test("noteOn/noteOff are safely no-ops when not recording", () => {
  const clock = fakeClock();
  const rec = createRecorder(clock);
  rec.noteOn("C", 4); // never called start()
  rec.noteOff("C", 4);
  assert.strictEqual(rec.getRecording().length, 0);
});

test("clear() empties the recording completely", () => {
  const clock = fakeClock();
  const rec = createRecorder(clock);
  rec.start();
  rec.noteOn("C", 4);
  clock.advance(100);
  rec.noteOff("C", 4);
  rec.clear();
  assert.strictEqual(rec.getRecording().length, 0);
  assert.strictEqual(rec.hasNotes(), false);
});

let passed = 0, failed = 0;
for (const { name, fn } of tests) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (err) { console.log(`  ✗ ${name}\n    ${err.message}`); failed++; }
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
