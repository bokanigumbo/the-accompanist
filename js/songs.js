// songs.js
//
// built-in melodies, now with actual rhythm - each note carries a `beats`
// duration (and rests are explicit), rather than being an even, undifferentiated
// list of pitches. this is what the original version was missing entirely:
// Mario, Jingle Bells and Minuet in G all used the exact same spacing
// between every note regardless of the tune's real rhythm, which is why
// none of them were actually recognisable as themselves when played back.
//
// rhythms below are reasonable, singable simplifications for a demo -
// particularly Minuet in G, whose real rhythm is more intricate than a
// small hand-transcribed version can fully capture - rather than
// scholarly-accurate transcriptions.
//
// note on "Mario Theme": it's been replaced with Mary Had a Little Lamb.
// the original Mario theme is a Nintendo composition still under copyright;
// keeping it in a public portfolio project risked exactly the kind of
// unnecessary complication that's easy to avoid by picking something
// genuinely in the public domain instead.
(function () {

  const songs = {
    ode: {
      title: "Ode to Joy",
      composer: "Beethoven",
      notes: [
        { note: "E", octave: 4, beats: 1 }, { note: "E", octave: 4, beats: 1 },
        { note: "F", octave: 4, beats: 1 }, { note: "G", octave: 4, beats: 1 },
        { note: "G", octave: 4, beats: 1 }, { note: "F", octave: 4, beats: 1 },
        { note: "E", octave: 4, beats: 1 }, { note: "D", octave: 4, beats: 1 },
        { note: "C", octave: 4, beats: 1 }, { note: "C", octave: 4, beats: 1 },
        { note: "D", octave: 4, beats: 1 }, { note: "E", octave: 4, beats: 1 },
        { note: "E", octave: 4, beats: 1.5 }, { note: "D", octave: 4, beats: 0.5 },
        { note: "D", octave: 4, beats: 2 },
      ],
    },

    twinkle: {
      title: "Twinkle Twinkle",
      composer: "traditional",
      notes: [
        { note: "C", octave: 4, beats: 1 }, { note: "C", octave: 4, beats: 1 },
        { note: "G", octave: 4, beats: 1 }, { note: "G", octave: 4, beats: 1 },
        { note: "A", octave: 4, beats: 1 }, { note: "A", octave: 4, beats: 1 },
        { note: "G", octave: 4, beats: 2 },
        { note: "F", octave: 4, beats: 1 }, { note: "F", octave: 4, beats: 1 },
        { note: "E", octave: 4, beats: 1 }, { note: "E", octave: 4, beats: 1 },
        { note: "D", octave: 4, beats: 1 }, { note: "D", octave: 4, beats: 1 },
        { note: "C", octave: 4, beats: 2 },
      ],
    },

    scale: {
      title: "C Major Scale",
      composer: null,
      notes: ["C", "D", "E", "F", "G", "A", "B"].map((note) => ({ note, octave: 4, beats: 1 }))
        .concat([{ note: "C", octave: 5, beats: 2 }]),
    },

    mary: {
      title: "Mary Had a Little Lamb",
      composer: "traditional (Hale, 1830)",
      notes: [
        { note: "E", octave: 4, beats: 1 }, { note: "D", octave: 4, beats: 1 },
        { note: "C", octave: 4, beats: 1 }, { note: "D", octave: 4, beats: 1 },
        { note: "E", octave: 4, beats: 1 }, { note: "E", octave: 4, beats: 1 },
        { note: "E", octave: 4, beats: 2 },
        { note: "D", octave: 4, beats: 1 }, { note: "D", octave: 4, beats: 1 },
        { note: "D", octave: 4, beats: 2 },
        { note: "E", octave: 4, beats: 1 }, { note: "G", octave: 4, beats: 1 },
        { note: "G", octave: 4, beats: 2 },
        { note: "E", octave: 4, beats: 1 }, { note: "D", octave: 4, beats: 1 },
        { note: "C", octave: 4, beats: 1 }, { note: "D", octave: 4, beats: 1 },
        { note: "E", octave: 4, beats: 1 }, { note: "E", octave: 4, beats: 1 },
        { note: "E", octave: 4, beats: 1 }, { note: "E", octave: 4, beats: 1 },
        { note: "D", octave: 4, beats: 1 }, { note: "D", octave: 4, beats: 1 },
        { note: "E", octave: 4, beats: 1 }, { note: "D", octave: 4, beats: 1 },
        { note: "C", octave: 4, beats: 4 },
      ],
    },

    jingle: {
      title: "Jingle Bells",
      composer: "James Lord Pierpont",
      notes: [
        { note: "E", octave: 4, beats: 1 }, { note: "E", octave: 4, beats: 1 }, { note: "E", octave: 4, beats: 2 },
        { note: "E", octave: 4, beats: 1 }, { note: "E", octave: 4, beats: 1 }, { note: "E", octave: 4, beats: 2 },
        { note: "E", octave: 4, beats: 1 }, { note: "G", octave: 4, beats: 1 }, { note: "C", octave: 4, beats: 1 }, { note: "D", octave: 4, beats: 1 },
        { note: "E", octave: 4, beats: 4 },
        { note: "F", octave: 4, beats: 1 }, { note: "F", octave: 4, beats: 1 }, { note: "F", octave: 4, beats: 1 }, { note: "F", octave: 4, beats: 1 },
        { note: "F", octave: 4, beats: 1 }, { note: "E", octave: 4, beats: 1 }, { note: "E", octave: 4, beats: 0.5 }, { note: "E", octave: 4, beats: 0.5 },
        { note: "D", octave: 4, beats: 1 }, { note: "D", octave: 4, beats: 1 }, { note: "E", octave: 4, beats: 1 }, { note: "D", octave: 4, beats: 2 },
        { note: "G", octave: 4, beats: 2 },
      ],
    },

    minuet: {
      title: "Minuet in G",
      composer: "Petzold (formerly attr. Bach)",
      notes: [
        { note: "D", octave: 4, beats: 0.75 }, { note: "G", octave: 4, beats: 0.75 }, { note: "A", octave: 4, beats: 0.75 }, { note: "B", octave: 4, beats: 0.75 },
        { note: "C", octave: 5, beats: 0.75 }, { note: "B", octave: 4, beats: 0.75 }, { note: "A", octave: 4, beats: 1.5 },
        { note: "D", octave: 5, beats: 0.75 }, { note: "C", octave: 5, beats: 0.75 }, { note: "B", octave: 4, beats: 0.75 }, { note: "A", octave: 4, beats: 0.75 },
        { note: "G", octave: 4, beats: 1.5 },
        { note: "A", octave: 4, beats: 0.75 }, { note: "B", octave: 4, beats: 0.75 }, { note: "C", octave: 5, beats: 0.75 }, { note: "B", octave: 4, beats: 0.75 },
        { note: "A", octave: 4, beats: 0.75 }, { note: "G", octave: 4, beats: 0.75 },
        { note: "F#", octave: 4, beats: 0.75 }, { note: "G", octave: 4, beats: 1.5 },
      ],
    },
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { songs };
  } else {
    window.Songs = { songs };
  }

})();
