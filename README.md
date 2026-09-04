# The Accompanist

a piano that records what you actually play - real timing, held notes, chords, rests - and improvises a chord accompaniment underneath your recorded performance and the built-in songs when you play them back.

*(a screenshot and a short (10-15s) screen recording go here - this project especially needs one, since its actual value (real rhythm, audible chord accompaniment) isn't something a static screenshot alone can show. I can't capture either from this sandbox - no browser, no audio output here - so this one's genuinely on you. worth recording: pick a built-in song, press play, and let the accompaniment chord actually play underneath it audibly, since that's the single thing this project does that the previous version never did at all.)*

## what this actually is

**it earns the name now.** the original version was an interactive piano, melody player, and basic sequencer - real, working pieces, but nothing in it actually accompanied a performer. this version adds genuine chord-tone auto-harmonisation: whatever melody you play (or pick from the built-in songs), the app analyses which notes are actually sounding in each short window and picks a real chord that fits them, then plays it quietly underneath. that's what makes it an accompanist rather than a piano that happens to also play back what you typed.

**the note visualiser is not real sheet music**, and doesn't claim to be. it shows pitch position clearly on a staff, which is genuinely useful for seeing melodic shape - but it has no time signature, no key signature, no rests, no bar lines, no beaming, and can't show more than one voice. calling it a "score" implied more than it delivers, so it's a note visualiser now, with an actual text-based list of the same notes underneath for screen readers.

## features

- a full on-screen piano, playable by mouse, touch, stylus, or your computer keyboard
- **real rhythm recording** - press-and-release timing, held-note duration, gaps, and simultaneous notes (chords) are all captured, not just which keys were pressed. changing the octave controls mid-hold correctly releases whatever's currently sounding first, rather than leaving it orphaned when the key it was tied to gets rebuilt out from under it.
- **correct tempo math** - a beat at 100bpm lasts exactly 600ms, calculated one consistent way everywhere, rather than the two different (and both wrong) values the original used for recorded playback versus song playback
- **automatic chord accompaniment** during playback of the built-in songs and anything you record, chosen by analysing the actual notes in the melody - not a fixed progression. this happens on *playback*, not while you're actively playing or recording - see "known limitations" below.
- 6 built-in pieces, each with real rhythm (including rests where the tune needs them): Ode to Joy, Twinkle Twinkle, a C major scale, Mary Had a Little Lamb, Jingle Bells, and Minuet in G
- accurate audio scheduling - every note's start time is set directly on the Web Audio clock, not on a chain of `setTimeout` calls that can drift out of sync with each other over a long piece
- accessible piano keys (real `<button>` elements with proper names, genuinely operable from the keyboard via Enter/Space - not just focusable but functionally dead - with the same hold-to-sustain behaviour as clicking, plus visible keyboard focus throughout, and the current keyboard octave shown on screen when you shift it with Z/X. the on-screen keys and the A-J computer-key mapping are two separate, both-genuine ways to play, not one pretending to be the other.

## a note on "Mario Theme"

it's gone, replaced with Mary Had a Little Lamb. the original Mario theme is a Nintendo composition still under copyright - not something worth the risk of keeping in a public portfolio project when a genuinely public-domain tune does the same job.

## how the accompaniment actually works

every major and minor triad (24 in total) is scored against whatever notes are sounding in a given time window, weighted by how long each note is held - a note held for a full beat counts for more than a passing sixteenth note when deciding the underlying harmony. whichever chord fits best gets played, with ties broken toward staying on the previous chord (so the harmony doesn't restlessly change for no reason), then toward matching the window's first note as the root.

this is deliberately a simplified technique, not full music theory - it doesn't know what key a piece is in, doesn't follow real voice-leading rules, and won't always make the same choice a human accompanist would. what it does do is genuinely listen to what's being played and respond to it, rather than following a fixed script - which is why it works equally well on a C major tune and on Minuet in G's F#s, without needing to be told in advance what key either one is in.

## project structure

```
the-accompanist/
├── index.html
├── style.css
├── js/
│   ├── theory.js               - pure music-theory helpers (frequency, pitch class, tempo math)
│   ├── chord-engine.js         - the accompaniment: scores and picks chords for a melody
│   ├── audio-engine.js         - Web Audio synthesis: live held notes + precisely scheduled playback
│   ├── songs.js                - the 6 built-in pieces, with real rhythm
│   ├── playback-scheduler.js   - turns a song (beats) or recording (real time) into one common timeline
│   ├── playback-controller.js  - owns every timer/audio node playback creates; the single stop/start authority
│   ├── piano.js                 - the on-screen keyboard: accessible buttons, pointer events
│   ├── visualiser.js           - the canvas note visualiser + its text alternative
│   └── app.js                  - wires everything above to the actual page
├── tests/
│   ├── theory.test.js
│   ├── chord-engine.test.js
│   ├── playback-scheduler.test.js
│   ├── recorder.test.js
│   └── playback-controller.test.js
└── package.json
```

six small, focused files instead of one 886-line HTML file with a giant inline `<script>` - and importantly, the pieces with real logic worth getting right (tempo math, chord fitting, timeline building, recording, playback state) have no DOM or AudioContext dependency at all, which is what makes them directly testable.

## running it locally

no build step - just open `index.html` in a browser.

## running the tests

```bash
npm test
```

45 tests across 6 files, covering: frequency and tempo conversion (including the exact 100bpm/600ms case from an earlier bug report), chord fitting across major and minor keys, building a playback timeline from both songs and recordings, recording timing with a fully deterministic fake clock (held notes, gaps, simultaneous notes, releasing a key that was never pressed), the playback controller's state management (including a test that reproduces the exact "clearing during playback" bug and asserts it's actually fixed, not just superficially quiet), and - critically - a dedicated integration suite (`tests/integration.test.js`) that runs the real `ChordEngine` and `AudioEngine` together rather than mocking the boundary between them, which is what actually caught the bug described just below.

what's **not** covered: anything that needs a real browser to test - actual audio output, the piano's pointer-event handling, canvas drawing, and the accessibility behaviour (focus movement, aria-live announcements). those were checked by reasoning through the code and by simulating a real DOM with node's `vm` module and, for a couple of specific fixes, `jsdom` (used as a one-off verification tool during development, not a permanent dependency - see the project's `package.json`), but not by an automated browser test suite.

## three real bugs this caught during development, worth mentioning

**a data-shape mismatch that every existing test missed.** `ChordEngine.chooseChords()` returns `{ chord, startTime, duration }` - `chord` itself being the richer object with a `.tones` array inside it. `AudioEngine.scheduleChord()` expected a flat `{ tones, startTime, duration }` directly, and the controller passed the chord-engine's region straight through unchanged - so `tones` was `undefined` the moment any real accompaniment got scheduled, which is to say: pressing play on literally any song or recording. every existing controller test mocked out `scheduleChord` with a stub that never looked at what it was given, and the one place chord scheduling was tested at all used an empty chord list - so this was invisible to 41 passing tests. fixed at the call site (translating the region into the shape `scheduleChord` actually expects), and a new integration test (`tests/integration.test.js`) now runs the real chord engine and real audio engine together specifically so a mismatch like this can't hide behind a mock again - proved this by temporarily reverting the fix and confirming the new tests fail while the old mocked suite stays green, exactly reproducing the original bug's blind spot.

**a cross-file global collision.** `chord-engine.js` originally tried to destructure `pitchClass` from `theory.js`'s exports at its own top level - but `theory.js` already declares a plain global `function pitchClass()`, and you can't `const`-declare an identifier that collides with an existing global function of the same name in the same scope. this is invisible to a `require()`-based test (node's module system doesn't share scope the way multiple `<script>` tags do), and only showed up when simulating genuine multi-script browser loading with node's `vm` module. every file now uses an explicit namespace object (`window.Theory`, `window.ChordEngine`, etc.) instead of bare globals, specifically to avoid this class of bug entirely.

**a frequency rounding error.** the original formula computed all frequencies from a rounded approximation of middle C (261.63hz) rather than from concert pitch (A4 = 440hz) directly - accurate to within a few thousandths of a hertz, but a test asserting A4 should be *exactly* 440 caught the discrepancy. fixed to derive from A4 directly.

## known limitations

- **the accompaniment only plays during playback, not while you're actually performing.** it accompanies the built-in songs and your own recordings once you press play - it does not listen and generate chords underneath your hands in real time while you're actively playing or recording. genuine real-time accompaniment (following a live performer's tempo and harmony as they play) is a substantially harder problem than analysing a melody that's already fully known, and is listed as a possible future direction below rather than attempted here.
- the chord accompaniment doesn't do key detection - it fits chords to whatever's being played in the moment, which works well in practice but isn't the same as understanding a piece is "in G major"
- no chord progression styles, no waltz/ballad accompaniment patterns, no key transposition, no tap tempo, no metronome, no MIDI input, no microphone pitch detection - all genuinely reasonable next steps for a deeper accompanist, left out of this pass to keep scope bounded to what's here now
- the note visualiser remains a pitch visualiser, not real notation - see "what this actually is" above
- no automated browser/canvas tests (see "running the tests" above)

## license

MIT - see [LICENSE](LICENSE).
