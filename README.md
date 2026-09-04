# The Accompanist

an interactive piano that records a melody and plays it back with an automatically generated chord accompaniment.

![The Accompanist](screenshots/the-accompanist.png)

[watch the demo](demo/the-accompanist-demo.mp4)

## features

* piano playable with a mouse, touchscreen or computer keyboard
* records note timing, held notes, rests and chords
* generates a chord accompaniment for recorded performances
* six built-in songs with adjustable tempo
* moveable keyboard range with up to five octaves
* volume controls and note visualiser
* accessible piano buttons and text alternatives

## how it works

recordings store when each note begins and how long it is held. this preserves the original rhythm instead of playing every note for the same length.

during playback, the recording is divided into short sections. the chord engine compares the notes in each section against 24 major and minor chords, then selects the best match.

longer notes have more influence than short passing notes, while ties favour keeping the previous chord to create smoother accompaniment.

the Web Audio API schedules the melody and chords using the browser’s audio clock, helping them remain synchronised during playback.

## built-in songs

* Ode to Joy
* Twinkle Twinkle
* C Major Scale
* Mary Had a Little Lamb
* Jingle Bells
* Minuet in G

## controls

the piano can be played using the on-screen keys or a computer keyboard:

* `A S D F G H J` for white keys
* `W E T Y U` for black keys
* `Z` and `X` to change octave

## run locally

open `index.html` in a modern browser.

no build step or server is required.

## tests

run the test suite with:

```bash
npm test
```

45 tests cover music theory calculations, tempo conversion, chord selection, recording, playback scheduling, playback controls and integration between the chord and audio engines.

## limitations

* accompaniment is generated during playback rather than while performing live
* the chord engine does not detect the overall key of a piece
* the note visualiser shows pitch and melodic shape rather than full musical notation
* browser audio and canvas behaviour are manually tested

## licence

MIT — see [LICENSE](LICENSE).
