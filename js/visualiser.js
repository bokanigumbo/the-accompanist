// visualiser.js
//
// draws a staff-like pitch visualisation on canvas. renamed from "score" -
// see the readme's "what this actually is" section, but in short: this
// shows relative pitch position clearly, which is genuinely useful, but it
// is NOT real music notation. it has no time signature, no key signature,
// no rhythm values, no rests, no bar lines, no beaming, and can't show more
// than one voice - all things real notation needs. calling it a "score"
// implied more than it delivers; "note visualiser" is what it actually is.
//
// canvas content is invisible to screen readers by default, so this also
// maintains a plain-text list of the same notes alongside it, kept in sync
// every time the drawing updates - that's the actual accessible alternative,
// not just a static label on the canvas element.
(function () {

  const staffNoteOrder = ["C", "D", "E", "F", "G", "A", "B"];

  function staffPos(note, octave) {
    const base = note.replace("#", "").replace("b", "");
    return (octave - 4) * 7 + staffNoteOrder.indexOf(base);
  }

  function draw(canvas, textAlternativeEl, seq, activeIdx) {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth || 600;

    canvas.width = W * dpr;
    canvas.height = 110 * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const activeCol = "#534AB7";
    const fg = "#2C2C2A";
    const fgMid = "#5F5E5A";

    ctx.clearRect(0, 0, W, 110);

    const staffTop = 20;
    const lineGap = 10;
    const clefW = 34;
    const noteSpacing = Math.min(36, (W - clefW - 16) / Math.max(seq.length, 1));

    ctx.strokeStyle = fg;
    ctx.lineWidth = 0.8;
    for (let l = 0; l < 5; l++) {
      const y = staffTop + l * lineGap;
      ctx.beginPath();
      ctx.moveTo(8, y);
      ctx.lineTo(W - 8, y);
      ctx.stroke();
    }

    ctx.font = "36px serif";
    ctx.fillStyle = fg;
    ctx.fillText("𝄞", 8, staffTop + 33);

    const midC = staffPos("C", 4);

    seq.forEach((item, i) => {
      if (item.rest) return; // rests have no pitch to place on the staff

      const pos = staffPos(item.note, item.octave);
      const rel = pos - midC;
      const noteY = staffTop + 4 * lineGap - rel * (lineGap / 2) + lineGap;
      const x = clefW + i * noteSpacing + noteSpacing / 2;
      const isActive = i === activeIdx;
      const nc = isActive ? activeCol : fg;
      const bot = staffTop + 4 * lineGap;

      if (noteY > bot + lineGap / 2) {
        ctx.strokeStyle = isActive ? activeCol : fgMid;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(x - 8, bot + lineGap);
        ctx.lineTo(x + 8, bot + lineGap);
        ctx.stroke();
      }
      if (noteY < staffTop - lineGap / 2) {
        ctx.strokeStyle = isActive ? activeCol : fgMid;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(x - 8, staffTop - lineGap);
        ctx.lineTo(x + 8, staffTop - lineGap);
        ctx.stroke();
      }

      ctx.strokeStyle = nc;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(x, noteY, 5.5, 4, -0.22, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? "#EEEDFE" : "#2C2C2A";
      ctx.fill();
      ctx.stroke();

      ctx.lineWidth = 0.9;
      ctx.strokeStyle = nc;
      ctx.beginPath();
      ctx.moveTo(x + 5.5, noteY);
      ctx.lineTo(x + 5.5, noteY - 28);
      ctx.stroke();

      if (item.note.includes("#")) {
        ctx.font = 'italic 11px "Cormorant Garamond", serif';
        ctx.fillStyle = nc;
        ctx.textAlign = "center";
        ctx.fillText("♯", x - 13, noteY + 3);
      }

      ctx.font = 'italic 10px "Cormorant Garamond", serif';
      ctx.fillStyle = isActive ? activeCol : fgMid;
      ctx.textAlign = "center";
      ctx.fillText(item.note + item.octave, x, staffTop + 5 * lineGap + 11);
      ctx.textAlign = "left";
    });

    // the actual accessible alternative - not just a label, the real content
    if (textAlternativeEl) {
      textAlternativeEl.innerHTML = seq.length
        ? seq.map((item, i) => {
            const label = item.rest ? "rest" : item.note + item.octave;
            const activeMark = i === activeIdx ? " (currently playing)" : "";
            return `<li>${label}${activeMark}</li>`;
          }).join("")
        : "<li>no notes to show yet</li>";
    }

    canvas.setAttribute(
      "aria-label",
      seq.length
        ? `Note visualiser showing ${seq.length} notes. A text list of the same notes follows for screen readers.`
        : "Note visualiser, currently empty."
    );
  }

  const VisualiserExports = { draw, staffPos };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = VisualiserExports;
  } else {
    window.Visualiser = VisualiserExports;
  }

})();
