/* Star Striker: every picture in the game is drawn here in code (no image files), once, into small canvases.
   Each sprite is {c, w, h, f}: c = the picture, w/h = its size in game units, f = a white "hit flash" copy. */

const S = 2;                                               // draw at 2x so the ships stay sharp on phones
const TAU = Math.PI * 2;

function mk(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w * S); c.height = Math.ceil(h * S);
  const x = c.getContext("2d");
  x.scale(S, S); x.translate(w / 2, h / 2);
  return [c, x];
}
function lg(x, x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function rg(x, cx, cy, r0, r1, stops) { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function poly(x, pts, close = true) { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); if (close) x.closePath(); }
function mirror(pts) { return pts.map(([a, b]) => [-a, b]).reverse(); }
function whiten(src) {
  const c = document.createElement("canvas"); c.width = src.width; c.height = src.height;
  const x = c.getContext("2d"); x.drawImage(src, 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
  return c;
}
function done(c, w, h) { return { c, w, h, f: whiten(c) }; }
function rim(x, color, blur) { x.shadowColor = color; x.shadowBlur = blur; }

/* ---------------- the player's ship: red and white, like a Forest kit ---------------- */
function playerShip() {
  const [c, x] = mk(96, 108);
  rim(x, "#ff3b52", 12);
  const wing = [[0, -42], [9, -14], [30, 14], [42, 30], [34, 36], [14, 26], [8, 38], [-8, 38], [-14, 26], [-34, 36], [-42, 30], [-30, 14], [-9, -14]];
  poly(x, wing); x.fillStyle = lg(x, 0, -42, 0, 38, [[0, "#ff7a86"], [.45, "#e11d33"], [1, "#7a0c1c"]]); x.fill();
  x.shadowBlur = 0;
  x.strokeStyle = "rgba(255,255,255,.75)"; x.lineWidth = 1.6; x.stroke();
  poly(x, [[-4, -34], [4, -34], [7, 30], [-7, 30]]); x.fillStyle = "#fff"; x.fill();                         // white racing stripe
  poly(x, [[30, 14], [42, 30], [34, 36], [26, 24]]); x.fillStyle = "#fff"; x.fill();
  poly(x, [[-30, 14], [-42, 30], [-34, 36], [-26, 24]]); x.fill();
  x.fillStyle = "#33222a"; x.beginPath(); x.ellipse(-12, 34, 5, 6, 0, 0, TAU); x.ellipse(12, 34, 5, 6, 0, 0, TAU); x.fill();   // engines
  rim(x, "#7df3ff", 10);
  x.fillStyle = rg(x, 0, -8, 1, 12, [[0, "#ffffff"], [.5, "#7df3ff"], [1, "#1c6fb0"]]);
  x.beginPath(); x.ellipse(0, -8, 6, 13, 0, 0, TAU); x.fill();                                                  // canopy
  x.shadowBlur = 0; x.fillStyle = "#ffd34d"; x.beginPath(); x.arc(-40, 31, 2.4, 0, TAU); x.arc(40, 31, 2.4, 0, TAU); x.fill();   // wing lights
  return done(c, 96, 108);
}

/* ---------------- the enemies ---------------- */
const ENEMY_ART = {
  scout(x) {                                                // green flying saucer
    rim(x, "#5cff9d", 10);
    x.fillStyle = lg(x, 0, -10, 0, 14, [[0, "#9dffc6"], [1, "#127a45"]]); x.beginPath(); x.ellipse(0, 4, 26, 11, 0, 0, TAU); x.fill();
    x.fillStyle = rg(x, 0, -6, 2, 15, [[0, "#eafff3"], [1, "#2fd484"]]); x.beginPath(); x.ellipse(0, -4, 13, 12, 0, Math.PI, 0); x.fill();
    x.shadowBlur = 0; x.fillStyle = "#fff"; [-16, -6, 6, 16].forEach((px) => { x.beginPath(); x.arc(px, 6, 2, 0, TAU); x.fill(); });
  },
  zig(x) {                                                  // yellow dart pointing down
    rim(x, "#ffe14d", 10);
    poly(x, [[0, 22], [18, -14], [8, -8], [0, -16], [-8, -8], [-18, -14]]); x.fillStyle = lg(x, 0, -16, 0, 22, [[0, "#fff3a0"], [1, "#e0a800"]]); x.fill();
    x.shadowBlur = 0; x.fillStyle = "#3a2a00"; poly(x, [[0, 12], [5, -6], [-5, -6]]); x.fill();
  },
  bee(x) {                                                  // pink swarm bee
    rim(x, "#ff7ad9", 8);
    x.fillStyle = "rgba(255,255,255,.55)"; x.beginPath(); x.ellipse(-12, -3, 9, 5, -.5, 0, TAU); x.ellipse(12, -3, 9, 5, .5, 0, TAU); x.fill();
    x.fillStyle = lg(x, 0, -12, 0, 12, [[0, "#ffb3ee"], [1, "#d6279f"]]); x.beginPath(); x.ellipse(0, 0, 10, 13, 0, 0, TAU); x.fill();
    x.shadowBlur = 0; x.fillStyle = "#4a0d3a"; x.fillRect(-9, -1, 18, 3); x.fillRect(-8, 5, 16, 3);
    x.fillStyle = "#fff"; x.beginPath(); x.arc(-4, -7, 2, 0, TAU); x.arc(4, -7, 2, 0, TAU); x.fill();
  },
  gunner(x) {                                               // blue frigate with a front cannon
    rim(x, "#5ab8ff", 10);
    poly(x, [[-10, -22], [10, -22], [22, -6], [18, 16], [0, 24], [-18, 16], [-22, -6]]); x.fillStyle = lg(x, 0, -22, 0, 24, [[0, "#9bd4ff"], [1, "#1f5a99"]]); x.fill();
    x.fillStyle = "#1b2f4d"; x.fillRect(-4, 10, 8, 20); x.fillRect(-26, -4, 6, 16); x.fillRect(20, -4, 6, 16);
    x.shadowBlur = 0; x.fillStyle = "#ff5d5d"; x.beginPath(); x.arc(0, -4, 5, 0, TAU); x.fill(); x.fillStyle = "#fff"; x.beginPath(); x.arc(-1.5, -5.5, 1.6, 0, TAU); x.fill();
  },
  spinner(x) {                                              // orange spiky star (rotated while flying)
    rim(x, "#ff9a3c", 12);
    x.beginPath(); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, r = i % 2 ? 15 : 28; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath();
    x.fillStyle = rg(x, 0, 0, 2, 28, [[0, "#fff0c2"], [.5, "#ff9a3c"], [1, "#a43d00"]]); x.fill();
    x.shadowBlur = 0; x.fillStyle = "#2a1000"; x.beginPath(); x.arc(0, 0, 8, 0, TAU); x.fill(); x.fillStyle = "#ff3b3b"; x.beginPath(); x.arc(0, 0, 4, 0, TAU); x.fill();
  },
  tank(x) {                                                 // armoured grey hex hull, two cannons
    rim(x, "#9fb0c8", 10);
    x.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; x.lineTo(Math.cos(a) * 34, Math.sin(a) * 30); } x.closePath();
    x.fillStyle = lg(x, 0, -30, 0, 30, [[0, "#d4deec"], [.5, "#7d8ea8"], [1, "#3b4659"]]); x.fill();
    x.shadowBlur = 0; x.strokeStyle = "#1f2733"; x.lineWidth = 2; x.stroke();
    x.fillStyle = "#1f2733"; x.fillRect(-20, 14, 8, 22); x.fillRect(12, 14, 8, 22);
    x.fillStyle = "#ffcf4d"; [[-18, -10], [18, -10], [0, 16], [-8, 0], [8, 0]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 2.2, 0, TAU); x.fill(); });
    x.fillStyle = "#ff4d5e"; x.beginPath(); x.arc(0, -8, 6, 0, TAU); x.fill();
  },
  kamikaze(x) {                                             // red spike, nose first
    rim(x, "#ff4d5e", 12);
    poly(x, [[0, 24], [14, -4], [10, -16], [0, -10], [-10, -16], [-14, -4]]); x.fillStyle = lg(x, 0, -16, 0, 24, [[0, "#ff9aa5"], [1, "#b3122a"]]); x.fill();
    x.shadowBlur = 0; x.fillStyle = "#fff"; poly(x, [[0, 16], [4, 0], [-4, 0]]); x.fill();
    x.fillStyle = "#ffe14d"; x.beginPath(); x.arc(-6, -8, 2, 0, TAU); x.arc(6, -8, 2, 0, TAU); x.fill();
  },
  weaver(x) {                                               // purple crescent wings with a glowing core
    rim(x, "#b17bff", 10);
    x.fillStyle = lg(x, -26, 0, 26, 0, [[0, "#6d2bd1"], [.5, "#d2b3ff"], [1, "#6d2bd1"]]);
    x.beginPath(); x.moveTo(-26, -10); x.quadraticCurveTo(0, 24, 26, -10); x.quadraticCurveTo(0, 6, -26, -10); x.fill();
    x.fillStyle = rg(x, 0, 2, 1, 11, [[0, "#fff"], [.5, "#d7b3ff"], [1, "#8a3df0"]]); x.beginPath(); x.arc(0, 2, 10, 0, TAU); x.fill();
  },
  layer(x) {                                                // teal mine layer
    rim(x, "#7dffcf", 10);
    x.fillStyle = lg(x, 0, -16, 0, 18, [[0, "#b4ffe6"], [1, "#12856a"]]); x.beginPath(); x.roundRect ? x.roundRect(-30, -14, 60, 28, 12) : x.rect(-30, -14, 60, 28); x.fill();
    x.shadowBlur = 0; x.fillStyle = "#0a3b30"; [-18, 0, 18].forEach((px) => { x.beginPath(); x.arc(px, 6, 6, 0, TAU); x.fill(); });
    x.fillStyle = "#ffe14d"; [-18, 0, 18].forEach((px) => { x.beginPath(); x.arc(px, 6, 2.5, 0, TAU); x.fill(); });
    x.fillStyle = "#fff"; x.fillRect(-10, -8, 20, 4);
  },
  phantom(x) {                                              // cyan ghost ship
    rim(x, "#7ef2ff", 14);
    x.fillStyle = lg(x, 0, -22, 0, 22, [[0, "#e6fdff"], [1, "#2aa9c4"]]);
    x.beginPath(); x.moveTo(-20, 18); x.lineTo(-20, -4); x.quadraticCurveTo(-20, -22, 0, -22); x.quadraticCurveTo(20, -22, 20, -4); x.lineTo(20, 18);
    x.lineTo(12, 12); x.lineTo(6, 20); x.lineTo(0, 12); x.lineTo(-6, 20); x.lineTo(-12, 12); x.closePath(); x.fill();
    x.shadowBlur = 0; x.fillStyle = "#03323d"; x.beginPath(); x.ellipse(-7, -6, 4, 6, 0, 0, TAU); x.ellipse(7, -6, 4, 6, 0, 0, TAU); x.fill();
  },
  splitter(x) {                                             // two-lobed orange blob
    rim(x, "#ffb35c", 10);
    x.fillStyle = rg(x, 0, 0, 2, 30, [[0, "#ffe3b5"], [1, "#d96a00"]]); x.beginPath(); x.arc(-11, 0, 17, 0, TAU); x.arc(11, 0, 17, 0, TAU); x.fill();
    x.shadowBlur = 0; x.strokeStyle = "#7a3a00"; x.lineWidth = 2.5; x.beginPath(); x.moveTo(0, -17); x.lineTo(0, 17); x.stroke();
    x.fillStyle = "#3a1a00"; x.beginPath(); x.arc(-11, -2, 4, 0, TAU); x.arc(11, -2, 4, 0, TAU); x.fill();
  },
  carrier(x) {                                              // big hangar ship
    rim(x, "#ff7a59", 12);
    poly(x, [[-14, -34], [14, -34], [40, -6], [36, 20], [14, 34], [-14, 34], [-36, 20], [-40, -6]]); x.fillStyle = lg(x, 0, -34, 0, 34, [[0, "#ffb199"], [.5, "#c84a2e"], [1, "#5e1d10"]]); x.fill();
    x.shadowBlur = 0; x.fillStyle = "#2a0d08"; x.fillRect(-16, 2, 32, 22);
    x.fillStyle = "#ffe14d"; for (let i = -12; i <= 12; i += 8) x.fillRect(i - 2, 8, 4, 10);
    x.fillStyle = "#fff"; x.fillRect(-8, -24, 16, 5); x.fillStyle = "#ff3b3b"; x.beginPath(); x.arc(0, -12, 5, 0, TAU); x.fill();
  },
};

function rockArt(seed) {
  return (x) => {
    rim(x, "#6b5238", 4);
    const pts = []; for (let i = 0; i < 11; i++) { const a = (i / 11) * TAU, r = 26 + ((Math.sin(seed * 9 + i * 2.7) + 1) * 4.5); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    poly(x, pts); x.fillStyle = lg(x, -20, -24, 20, 26, [[0, "#d1b794"], [.5, "#8d7254"], [1, "#4a3a28"]]); x.fill();
    x.shadowBlur = 0; x.fillStyle = "rgba(40,28,18,.55)"; [[-8, -6, 6], [9, 7, 5], [2, -14, 3.5], [-12, 12, 4]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, TAU); x.fill(); });
  };
}

/* ---------------- the five bosses ---------------- */
const BOSS_ART = [
  (x) => {                                                  // Mini Mothership: a big saucer with three cannons
    rim(x, "#5ab8ff", 16);
    x.fillStyle = lg(x, 0, -30, 0, 50, [[0, "#cfe9ff"], [.4, "#5a8fd1"], [1, "#1a2f5e"]]); x.beginPath(); x.ellipse(0, 8, 84, 34, 0, 0, TAU); x.fill();
    x.fillStyle = rg(x, 0, -14, 4, 44, [[0, "#f4fbff"], [.6, "#7fc4ff"], [1, "#2b5d9c"]]); x.beginPath(); x.ellipse(0, -8, 38, 34, 0, Math.PI, 0); x.fill();
    x.shadowBlur = 0; x.fillStyle = "#16243f"; [[-52, 24], [0, 36], [52, 24]].forEach(([a, b]) => x.fillRect(a - 7, b, 14, 24));
    for (let i = -6; i <= 6; i++) { x.fillStyle = i % 2 ? "#ffe14d" : "#ff5d5d"; x.beginPath(); x.arc(i * 12, 10 + Math.cos(i / 4) * 2, 3.2, 0, TAU); x.fill(); }
    x.fillStyle = "#ff3b3b"; x.beginPath(); x.arc(0, -10, 9, 0, TAU); x.fill(); x.fillStyle = "#fff"; x.beginPath(); x.arc(-3, -13, 3, 0, TAU); x.fill();
  },
  (x) => {                                                  // Frost Crab
    rim(x, "#8be9ff", 16);
    x.fillStyle = lg(x, 0, -50, 0, 50, [[0, "#e9fcff"], [.5, "#6ec6e6"], [1, "#1c5f85"]]);
    x.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; x.lineTo(Math.cos(a) * 58, Math.sin(a) * 44); } x.closePath(); x.fill();
    [-1, 1].forEach((s) => { x.fillStyle = lg(x, 0, -30, 0, 50, [[0, "#bff1ff"], [1, "#2c7ea8"]]); poly(x, [[s * 52, -10], [s * 96, -34], [s * 104, -4], [s * 82, 6], [s * 100, 30], [s * 62, 28]]); x.fill(); x.strokeStyle = "#e9fcff"; x.lineWidth = 2; x.stroke(); });
    x.shadowBlur = 0; x.fillStyle = "#0b3a55"; x.fillRect(-26, 20, 12, 28); x.fillRect(14, 20, 12, 28);
    x.fillStyle = "#fff"; x.beginPath(); x.arc(-16, -10, 10, 0, TAU); x.arc(16, -10, 10, 0, TAU); x.fill(); x.fillStyle = "#1a7fb8"; x.beginPath(); x.arc(-16, -8, 5, 0, TAU); x.arc(16, -8, 5, 0, TAU); x.fill();
  },
  (x) => {                                                  // Hive Queen
    rim(x, "#ff7ad9", 16);
    x.fillStyle = "rgba(255,255,255,.5)"; x.beginPath(); x.ellipse(-70, -14, 46, 22, -.55, 0, TAU); x.ellipse(70, -14, 46, 22, .55, 0, TAU); x.fill();
    x.fillStyle = lg(x, 0, -10, 0, 70, [[0, "#ffb3ee"], [1, "#a0187a"]]); x.beginPath(); x.ellipse(0, 36, 36, 46, 0, 0, TAU); x.fill();
    x.fillStyle = lg(x, 0, -50, 0, 14, [[0, "#ffd1f4"], [1, "#d6279f"]]); x.beginPath(); x.ellipse(0, -14, 40, 38, 0, 0, TAU); x.fill();
    x.shadowBlur = 0; x.fillStyle = "#4a0d3a"; for (let i = 0; i < 4; i++) x.fillRect(-30, 18 + i * 14, 60, 4);
    x.fillStyle = "#ffe14d"; poly(x, [[-26, -44], [-14, -62], [-6, -42], [0, -66], [6, -42], [14, -62], [26, -44]]); x.fill();
    x.fillStyle = "#fff"; x.beginPath(); x.ellipse(-14, -14, 9, 12, 0, 0, TAU); x.ellipse(14, -14, 9, 12, 0, 0, TAU); x.fill(); x.fillStyle = "#6b0f55"; x.beginPath(); x.arc(-14, -10, 5, 0, TAU); x.arc(14, -10, 5, 0, TAU); x.fill();
  },
  (x) => {                                                  // Iron Titan
    rim(x, "#9fb0c8", 16);
    poly(x, [[-40, -64], [40, -64], [88, -20], [96, 40], [60, 70], [-60, 70], [-96, 40], [-88, -20]]); x.fillStyle = lg(x, 0, -64, 0, 70, [[0, "#aebbd0"], [.45, "#5f7090"], [1, "#222a3a"]]); x.fill();
    x.shadowBlur = 0; x.strokeStyle = "#141a24"; x.lineWidth = 3; x.stroke();
    x.fillStyle = "#1c2330"; x.fillRect(-76, 30, 20, 50); x.fillRect(56, 30, 20, 50); x.fillRect(-10, 44, 20, 36);
    x.fillStyle = "#4a566b"; poly(x, [[-30, -44], [30, -44], [44, -4], [-44, -4]]); x.fill();
    x.fillStyle = "#ffcf4d"; for (let i = -3; i <= 3; i++) { x.beginPath(); x.arc(i * 22, 20, 3, 0, TAU); x.fill(); }
    rim(x, "#ff3b3b", 18); x.fillStyle = rg(x, 0, -22, 2, 20, [[0, "#fff"], [.4, "#ff6b6b"], [1, "#a30f1f"]]); x.beginPath(); x.arc(0, -22, 18, 0, TAU); x.fill();
  },
  (x) => {                                                  // Galactic Overlord
    rim(x, "#ffcf4d", 20);
    x.fillStyle = lg(x, 0, -70, 0, 70, [[0, "#c36bff"], [1, "#2a0f66"]]); poly(x, [[0, -78], [30, -40], [100, -64], [84, -10], [110, 40], [50, 36], [30, 78], [0, 56], [-30, 78], [-50, 36], [-110, 40], [-84, -10], [-100, -64], [-30, -40]]); x.fill();
    x.shadowBlur = 0; x.strokeStyle = "#ffcf4d"; x.lineWidth = 3; x.stroke();
    x.fillStyle = "#ffcf4d"; poly(x, [[0, -92], [10, -70], [-10, -70]]); x.fill(); poly(x, [[-40, -80], [-30, -56], [-48, -58]]); x.fill(); poly(x, [[40, -80], [30, -56], [48, -58]]); x.fill();
    rim(x, "#ffcf4d", 22); x.fillStyle = rg(x, 0, -4, 2, 34, [[0, "#fff8d0"], [.4, "#ffcf4d"], [1, "#a86a00"]]); x.beginPath(); x.arc(0, -4, 32, 0, TAU); x.fill();
    x.shadowBlur = 0; x.fillStyle = "#2a0f66"; x.beginPath(); x.ellipse(0, -4, 22, 11, 0, 0, TAU); x.fill(); x.fillStyle = "#ff3b8a"; x.beginPath(); x.arc(0, -4, 8, 0, TAU); x.fill(); x.fillStyle = "#fff"; x.beginPath(); x.arc(-3, -7, 2.4, 0, TAU); x.fill();
  },
];

/* ---------------- bullets, pickups, gems ---------------- */
function bulletArt() {
  const out = {};
  let [c, x] = mk(16, 40); rim(x, "#7df3ff", 10); x.fillStyle = lg(x, 0, -16, 0, 16, [[0, "#ffffff"], [1, "#27c5ff"]]); x.beginPath(); x.roundRect ? x.roundRect(-3.5, -16, 7, 32, 3.5) : x.rect(-3.5, -16, 7, 32); x.fill(); out.laser = done(c, 16, 40);
  [c, x] = mk(24, 44); rim(x, "#ff8a4d", 8); poly(x, [[0, -20], [6, -6], [5, 14], [-5, 14], [-6, -6]]); x.fillStyle = "#f4f4f4"; x.fill(); poly(x, [[0, -20], [6, -6], [-6, -6]]); x.fillStyle = "#e11d33"; x.fill(); poly(x, [[-5, 8], [-12, 18], [-5, 14]]); x.fill(); poly(x, [[5, 8], [12, 18], [5, 14]]); x.fill(); out.missile = done(c, 24, 44);
  [c, x] = mk(46, 46); rim(x, "#ffffff", 10); x.fillStyle = rg(x, -4, -4, 2, 20, [[0, "#fff"], [1, "#d8d8d8"]]); x.beginPath(); x.arc(0, 0, 18, 0, TAU); x.fill(); x.shadowBlur = 0; x.fillStyle = "#1a1a1a";
  poly(x, [[0, -7], [6.6, -2.2], [4, 5.6], [-4, 5.6], [-6.6, -2.2]]); x.fill(); for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU - Math.PI / 2; x.beginPath(); x.arc(Math.cos(a) * 17, Math.sin(a) * 17, 5, 0, TAU); x.fill(); }
  x.strokeStyle = "#888"; x.lineWidth = 1.2; x.beginPath(); x.arc(0, 0, 18, 0, TAU); x.stroke(); out.ball = done(c, 46, 46);
  [c, x] = mk(26, 26); rim(x, "#ffe66b", 12); x.fillStyle = rg(x, 0, 0, 1, 9, [[0, "#fff"], [1, "#ffbf1f"]]); x.beginPath(); x.arc(0, 0, 8, 0, TAU); x.fill(); out.nova = done(c, 26, 26);
  [c, x] = mk(28, 28); rim(x, "#ff3b7a", 12); x.fillStyle = rg(x, 0, 0, 1, 10, [[0, "#fff"], [.5, "#ff7aa8"], [1, "#d6104f"]]); x.beginPath(); x.arc(0, 0, 9, 0, TAU); x.fill(); out.orb = done(c, 28, 28);
  [c, x] = mk(16, 40); rim(x, "#ff7ad9", 10); x.fillStyle = lg(x, 0, -16, 0, 16, [[0, "#fff"], [1, "#e62ec0"]]); poly(x, [[0, 16], [4, -8], [0, -16], [-4, -8]]); x.fill(); out.needle = done(c, 16, 40);
  [c, x] = mk(48, 48); rim(x, "#b17bff", 14); x.fillStyle = rg(x, 0, 0, 2, 20, [[0, "#fff"], [.45, "#c9a3ff"], [1, "#6a24d6"]]); x.beginPath(); x.arc(0, 0, 18, 0, TAU); x.fill(); out.big = done(c, 48, 48);
  [c, x] = mk(40, 40); rim(x, "#ff9a3c", 10); x.fillStyle = rg(x, 0, 0, 1, 14, [[0, "#ffd9a0"], [1, "#6a2d00"]]); x.beginPath(); x.arc(0, 0, 12, 0, TAU); x.fill(); x.shadowBlur = 0; x.strokeStyle = "#ff9a3c"; x.lineWidth = 3;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; x.beginPath(); x.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); x.lineTo(Math.cos(a) * 18, Math.sin(a) * 18); x.stroke(); } x.fillStyle = "#ff3b3b"; x.beginPath(); x.arc(0, 0, 4, 0, TAU); x.fill(); out.mine = done(c, 40, 40);
  [c, x] = mk(36, 36); rim(x, "#b58cff", 10); x.fillStyle = lg(x, 0, -12, 0, 12, [[0, "#e4d4ff"], [1, "#5b2ac2"]]); x.beginPath(); x.ellipse(0, 0, 14, 9, 0, 0, TAU); x.fill(); x.shadowBlur = 0; x.fillStyle = "#7df3ff"; x.beginPath(); x.arc(0, -2, 4, 0, TAU); x.fill(); out.drone = done(c, 36, 36);
  [c, x] = mk(24, 24); rim(x, "#6bf7ff", 8); poly(x, [[0, -10], [7, 0], [0, 10], [-7, 0]]); x.fillStyle = lg(x, 0, -10, 0, 10, [[0, "#e8ffff"], [1, "#19b8d6"]]); x.fill(); x.shadowBlur = 0; poly(x, [[0, -10], [3, 0], [0, 10], [-3, 0]]); x.fillStyle = "rgba(255,255,255,.55)"; x.fill(); out.gem = done(c, 24, 24);
  [c, x] = mk(28, 28); rim(x, "#ffd34d", 10); poly(x, [[0, -12], [3.6, -4], [12, -3.6], [5.8, 2.4], [7.4, 11], [0, 6.6], [-7.4, 11], [-5.8, 2.4], [-12, -3.6], [-3.6, -4]]); x.fillStyle = lg(x, 0, -12, 0, 11, [[0, "#fff6b8"], [1, "#f0a800"]]); x.fill(); out.star = done(c, 28, 28);
  return out;
}

function pickupArt(type, info) {
  const [c, x] = mk(54, 54);
  rim(x, info.col, 14);
  x.fillStyle = rg(x, -5, -6, 2, 24, [[0, "rgba(255,255,255,.95)"], [.5, info.col], [1, "rgba(0,0,0,.55)"]]); x.beginPath(); x.arc(0, 0, 21, 0, TAU); x.fill();
  x.shadowBlur = 0; x.strokeStyle = "rgba(255,255,255,.9)"; x.lineWidth = 2.5; x.beginPath(); x.arc(0, 0, 21, 0, TAU); x.stroke();
  x.fillStyle = "rgba(255,255,255,.22)"; x.beginPath(); x.ellipse(-5, -10, 10, 5, -.5, 0, TAU); x.fill();
  x.font = '22px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#fff"; x.fillText(info.e, 0, 2);
  return done(c, 54, 54);
}

/* soft round glow, tinted: the building block for sparks, explosions and trails */
const glowCache = {};
export function glow(color) {
  if (glowCache[color]) return glowCache[color];
  const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "#fff"); g.addColorStop(.25, color); g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return (glowCache[color] = c);
}

/* a planet for the background, drawn per level */
export function planet(colors, size) {
  const c = document.createElement("canvas"); c.width = c.height = size * 1.6; const x = c.getContext("2d"), m = c.width / 2, r = size / 2;
  x.save(); x.translate(m, m);
  x.strokeStyle = "rgba(255,255,255,.28)"; x.lineWidth = r * 0.12; x.beginPath(); x.ellipse(0, 0, r * 1.45, r * 0.34, -0.35, Math.PI, TAU); x.stroke();
  x.fillStyle = rg(x, -r * 0.4, -r * 0.4, r * 0.1, r * 1.05, [[0, colors[0]], [1, colors[1]]]); x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
  x.save(); x.beginPath(); x.arc(0, 0, r, 0, TAU); x.clip(); x.globalAlpha = 0.18; x.fillStyle = "#fff";
  for (let i = -3; i <= 3; i++) { x.fillRect(-r, i * r * 0.28, r * 2, r * 0.1); } x.restore();
  x.fillStyle = rg(x, r * 0.5, r * 0.5, r * 0.2, r * 1.3, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,10,.7)"]]); x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
  x.strokeStyle = "rgba(255,255,255,.28)"; x.lineWidth = r * 0.12; x.beginPath(); x.ellipse(0, 0, r * 1.45, r * 0.34, -0.35, 0, Math.PI); x.stroke();
  x.restore();
  return c;
}

export function buildSprites(ENEMY, BOSS, PICK) {
  const spr = { player: playerShip(), enemy: {}, boss: [], pick: {}, rock: [] };
  Object.keys(ENEMY).forEach((k) => {
    if (k === "rock") return;
    const r = ENEMY[k].r, sz = Math.ceil(r * 2 + 34), [c, x] = mk(sz, sz); ENEMY_ART[k](x); spr.enemy[k] = done(c, sz, sz);
  });
  for (let i = 0; i < 3; i++) { const [c, x] = mk(84, 84); rockArt(i + 1)(x); spr.rock.push(done(c, 84, 84)); }
  BOSS.forEach((b, i) => { const [c, x] = mk(240, 200); BOSS_ART[i](x); spr.boss.push(done(c, 240, 200)); });
  Object.assign(spr, { b: bulletArt() });
  Object.keys(PICK).forEach((k) => { spr.pick[k] = pickupArt(k, PICK[k]); });
  return spr;
}
