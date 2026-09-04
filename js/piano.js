// piano.js
//
// builds the on-screen keyboard. two accessibility fixes live here that
// matter more than they might look:
//
// - real <button> elements, not <div>s with a click handler bolted on.
//   a div has no accessible name, no keyboard focus, and no notion of
//   being a "control" at all to a screen reader - it's just decoration
//   that happens to respond to a mouse. a button is a real, focusable,
//   nameable control for free.
//
// - pointer events (pointerdown/up/leave/cancel), not mousedown. pointer
//   events are the unified input model that covers mouse, touch, AND
//   stylus - mousedown alone means the piano simply doesn't respond to a
//   tap on a touchscreen the same way, and never fires a "note off" at
//   all (there's no mouseup handler here originally), which is also
//   exactly what stood in the way of ever recording how long a note was
//   actually held.
(function () {

  const whites = ["C", "D", "E", "F", "G", "A", "B"];
  const blackDefs = [
    { n: "C#", a: 0 }, { n: "D#", a: 1 }, { n: "F#", a: 3 }, { n: "G#", a: 4 }, { n: "A#", a: 5 },
  ];
  const KW = 36;

  // note names read awkwardly to a screen reader as raw symbols ("C sharp
  // four" is far clearer than "C#4") - this builds that out properly
  function accessibleNoteName(note, octave) {
    const spoken = note.replace("#", " sharp");
    return `${spoken}, octave ${octave}`;
  }

  // builds the keyboard into `container`, and wires each key's pointer
  // events to onNoteDown(note, octave) / onNoteUp(note, octave) - it's up
  // to the caller (app.js) to decide what a note down/up actually DOES
  // (play a sound, record it, flash the key), keeping this module only
  // responsible for the keyboard's own dom and layout.
  function buildPiano({ container, railEl, numOctaves, startOctave, onNoteDown, onNoteUp }) {
    container.innerHTML = "";
    const totalW = numOctaves * 7 * KW;
    if (railEl) railEl.style.width = totalW + 20 + "px";

    let whiteIdx = 0;

    function wireKey(el, note, octave) {
      el.dataset.n = note;
      el.dataset.o = octave;

      // pointerdown starts the note; pointerup/leave/cancel all end it -
      // covering "let go normally", "dragged off the key while still
      // pressed", and "the browser cancelled the pointer" (e.g. a system
      // gesture interrupting it) all the same way, so a note can never get
      // stuck sounding forever because of an edge case in how it ended
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        el.classList.add("active");
        onNoteDown(note, octave);
      });
      const release = () => {
        if (!el.classList.contains("active")) return;
        el.classList.remove("active");
        onNoteUp(note, octave);
      };
      el.addEventListener("pointerup", release);
      el.addEventListener("pointerleave", release);
      el.addEventListener("pointercancel", release);

      // keyboard activation: these are real, focusable <button> elements,
      // so Enter/Space already generate a synthetic "click" once focused -
      // but nothing here ever listened for clicks at all, only pointer
      // events, so tabbing to a key and pressing Enter or Space previously
      // did precisely nothing. this listens for the actual key press/
      // release directly instead (not the synthetic click), which is what
      // makes a genuine hold-to-sustain note possible from the keyboard,
      // matching the pointer-based interaction above rather than just
      // firing a fixed, instantaneous pluck on activation.
      el.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault(); // stops space from scrolling the page, and stops the browser's own synthetic click from ALSO firing
        if (e.repeat) return; // a held key repeats keydown continuously at the OS level - one physical press should be one note-on, not many
        if (el.classList.contains("active")) return;
        el.classList.add("active");
        onNoteDown(note, octave);
      });
      el.addEventListener("keyup", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        release();
      });
    }

    for (let o = startOctave; o < startOctave + numOctaves; o++) {
      if (o > startOctave) {
        const div = document.createElement("div");
        div.className = "oct-divider";
        div.style.left = whiteIdx * KW - 1 + "px";
        container.appendChild(div);
      }

      whites.forEach((note) => {
        const k = document.createElement("button");
        k.type = "button";
        k.className = "wk";
        k.setAttribute("aria-label", accessibleNoteName(note, o));
        const isC = note === "C";
        k.innerHTML = `<span aria-hidden="true" style="font-size:${isC ? "10" : "9"}px;color:${isC ? "#999" : "#ccc"}">${note}${isC ? o : ""}</span>`;
        wireKey(k, note, o);
        container.appendChild(k);
        whiteIdx++;
      });

      blackDefs.forEach(({ n, a }) => {
        const octOffset = (o - startOctave) * 7;
        const k = document.createElement("button");
        k.type = "button";
        k.className = "bk";
        k.setAttribute("aria-label", accessibleNoteName(n, o));
        k.style.left = `${(octOffset + a) * KW + KW * 0.63}px`;
        wireKey(k, n, o);
        container.appendChild(k);
      });
    }

    container.style.width = totalW + "px";
  }

  function flashKey(container, note, octave) {
    const el = container.querySelector(`[data-n="${note}"][data-o="${octave}"]`);
    if (!el) return;
    el.classList.add("active");
    setTimeout(() => el.classList.remove("active"), 180);
  }

  const PianoExports = { buildPiano, flashKey, accessibleNoteName };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PianoExports;
  } else {
    window.Piano = PianoExports;
  }

})();
