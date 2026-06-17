# 🎹 The Accompanist

A browser-based virtual piano built for musical theatre practice. Play notes, read sheet music, and record your own sequences.

---

## why I built this

I do musical theatre and regularly need to work through scores at home. I don't own a piano, so I built this as a practical alternative. It lets me play through sheet music, practise individual lines, and record short sequences to replay and learn from.

---

## getting started

No installation needed. Just open `the-accompanist.html` in any modern browser (Chrome, Firefox, Safari, Edge all work). You'll need an internet connection the first time to load the fonts from Google Fonts.

---

## features

**keyboard**
- 2 to 5 octaves displayed at once, starting from whichever octave you choose
- Proper ivory white keys and lacquered black keys with a press-down effect
- Octave dividers so you can always find your position
- C notes are labelled with their octave number (C3, C4 etc.)

**score reader**
- Pick a built-in piece from the dropdown and the sheet music appears on a staff
- Hit play score and each note lights up in purple as it plays
- Includes: Ode to Joy, Twinkle Twinkle, C Major Scale, Mario Theme, Jingle Bells, Minuet in G

**record & playback**
- Hit record, play anything on the keys, hit record again to stop
- Hit play back to hear it at whatever tempo you've set
- Your notes show up as little pills that highlight as they play
- Clear wipes the slate for a new take

**controls**
- Octaves shown: choose how many octaves are visible (2 to 5)
- Starting octave: shift the keyboard range up or down
- Volume: adjusts how loud the notes are
- Tempo: sets the BPM for score playback and your own recorded playback

---

## keyboard shortcuts

| key | note |
|-----|------|
| A   | C    |
| S   | D    |
| D   | E    |
| F   | F    |
| G   | G    |
| H   | A    |
| J   | B    |
| W   | C#   |
| E   | D#   |
| T   | F#   |
| Y   | G#   |
| U   | A#   |
| Z   | shift keyboard octave down |
| X   | shift keyboard octave up   |

---

## adding your own songs

Songs are defined as arrays of `{ n, o }` objects inside the `songs` constant in the script. `n` is the note name (e.g. `"F#"`) and `o` is the octave number.

```js
mypiece: {
  title: 'My Piece',
  notes: [
    { n:'C', o:4 }, { n:'E', o:4 }, { n:'G', o:4 },
  ],
},
```

Then add a matching `<option>` in the song dropdown:

```html
<option value="mypiece">My Piece</option>
```

---

## fonts used

- **IM Fell English** (italic): title. An antique-press serif with real character.
- **Cormorant Garamond**: all UI labels, controls, and note pills. Elegant at small sizes.

Both load from Google Fonts and require an internet connection.

---

## how the sound works

Sound is generated using the Web Audio API with no audio files or libraries. Each keypress creates an oscillator set to triangle wave, wired through a gain node for volume control. The frequency for any note is calculated from middle C (C4 = 261.63 Hz) using equal temperament:
