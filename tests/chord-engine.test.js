const assert = require("assert");
const { chordName, pickChordForWindow, chooseChords, scoreChord, buildChord } = require("../js/chord-engine.js");

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test("a C major triad played together is recognised as C major", () => {
  const notes = [
    { note: "C", octave: 4, duration: 1 },
    { note: "E", octave: 4, duration: 1 },
    { note: "G", octave: 4, duration: 1 },
  ];
  const chord = pickChordForWindow(notes, null);
  assert.strictEqual(chordName(chord), "C");
});

test("an A minor triad is recognised as Am, not conflated with C major despite sharing two notes", () => {
  const notes = [
    { note: "A", octave: 4, duration: 2 }, // weighted longer, so it should anchor the chord as A minor
    { note: "C", octave: 4, duration: 0.5 },
    { note: "E", octave: 4, duration: 0.5 },
  ];
  const chord = pickChordForWindow(notes, null);
  assert.strictEqual(chordName(chord), "Am");
});

test("a G major triad (used in Minuet in G's key) is found correctly, not forced into a C-major-only chord", () => {
  const notes = [
    { note: "G", octave: 4, duration: 1 },
    { note: "B", octave: 4, duration: 1 },
    { note: "D", octave: 4, duration: 1 },
  ];
  const chord = pickChordForWindow(notes, null);
  assert.strictEqual(chordName(chord), "G");
});

test("longer notes are weighted more heavily than passing short ones", () => {
  // solid F major tones, with one brief, harmonically unrelated passing note
  // (B doesn't belong to F major OR to any other chord that also contains
  // both F and A, so it can't accidentally tip the balance toward a
  // different chord the way a more harmonically-relevant passing note might)
  const notes = [
    { note: "F", octave: 4, duration: 2 },
    { note: "A", octave: 4, duration: 2 },
    { note: "B", octave: 4, duration: 0.1 },
  ];
  const chord = pickChordForWindow(notes, null);
  assert.strictEqual(chordName(chord), "F");
});

test("an empty window keeps the previous chord rather than picking nothing", () => {
  const chord = pickChordForWindow([], { root: 7, quality: "major" });
  assert.strictEqual(chordName(chord), "G");
});

test("ties are broken toward staying on the previous chord (harmonic continuity)", () => {
  // C and Am share two notes (C, E) - a single ambiguous note fits both
  // equally. previously being in Am should keep it in Am rather than
  // flipping to C for no real musical reason.
  const notes = [{ note: "E", octave: 4, duration: 1 }];
  const previousChord = { root: 9, quality: "minor" }; // Am
  const chord = pickChordForWindow(notes, previousChord);
  assert.strictEqual(chordName(chord), "Am");
});

test("chooseChords splits a whole melody into successive windows with plausible chords", () => {
  // a simple 4-second melody outlining C major then G major
  const melody = [
    { note: "C", octave: 4, startTime: 0, duration: 1 },
    { note: "E", octave: 4, startTime: 1, duration: 1 },
    { note: "G", octave: 4, startTime: 2, duration: 1 },
    { note: "B", octave: 4, startTime: 3, duration: 1 },
  ];
  const chords = chooseChords(melody, 2); // 2-second windows
  assert.strictEqual(chords.length, 2, "a 4-second melody in 2-second windows should produce 2 chord regions");
  assert.strictEqual(chordName(chords[0].chord), "C");
  assert.strictEqual(chordName(chords[1].chord), "G");
});

test("rests are ignored when choosing chords - they contribute no harmonic information", () => {
  const melody = [
    { note: "C", octave: 4, startTime: 0, duration: 1 },
    { rest: true, startTime: 1, duration: 1 },
    { note: "E", octave: 4, startTime: 2, duration: 1 },
    { note: "G", octave: 4, startTime: 3, duration: 1 },
  ];
  const chords = chooseChords(melody, 4); // one big window covering everything
  assert.strictEqual(chordName(chords[0].chord), "C");
});

test("an entirely empty (all-rest) sequence produces no chords, not an error", () => {
  const melody = [{ rest: true, startTime: 0, duration: 4 }];
  assert.deepStrictEqual(chooseChords(melody, 2), []);
});

let passed = 0, failed = 0;
for (const { name, fn } of tests) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (err) { console.log(`  ✗ ${name}\n    ${err.message}`); failed++; }
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
