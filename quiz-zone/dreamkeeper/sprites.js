/* Dreamkeeper: all the pictures, drawn in code in a soft, low-contrast way that is easy on tired eyes. */
import { WORRY, BOSS, TOWER, TOWER_IDS, W, TILE, COLS, ROWS, GY } from "./data.js";

const S = 2, TAU = Math.PI * 2;
function mk(w, h) { const c = document.createElement("canvas"); c.width = Math.ceil(w * S); c.height = Math.ceil(h * S); const x = c.getContext("2d"); x.scale(S, S); x.translate(w / 2, h / 2); return [c, x]; }
function rg(x, cx, cy, r0, r1, stops) { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function lg(x, x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function blob(x, r, col, wob = 0) {
  x.beginPath(); for (let i = 0; i <= 24; i++) { const a = (i / 24) * TAU, rr = r * (1 + Math.sin(a * 3 + wob) * 0.05); x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.92); } x.closePath();
  x.fillStyle = rg(x, -r * 0.3, -r * 0.4, r * 0.1, r * 1.1, [[0, lighten(col, 0.35)], [1, col]]); x.fill();
}
function lighten(hex, k) { const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; const f = (v) => Math.round(v + (255 - v) * k); return `rgb(${f(r)},${f(g)},${f(b)})`; }
function darken(hex, k) { const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; const f = (v) => Math.round(v * (1 - k)); return `rgb(${f(r)},${f(g)},${f(b)})`; }
function face(x, cy, sz, worried = 1) {
  x.fillStyle = "#2a2440"; x.beginPath(); x.arc(-sz * 0.32, cy, sz * 0.13, 0, TAU); x.arc(sz * 0.32, cy, sz * 0.13, 0, TAU); x.fill();
  x.fillStyle = "rgba(255,255,255,.8)"; x.beginPath(); x.arc(-sz * 0.35, cy - sz * 0.04, sz * 0.045, 0, TAU); x.arc(sz * 0.29, cy - sz * 0.04, sz * 0.045, 0, TAU); x.fill();
  x.strokeStyle = "#2a2440"; x.lineWidth = Math.max(1.2, sz * 0.05); x.lineCap = "round";
  x.beginPath(); x.moveTo(-sz * 0.48, cy - sz * 0.26 - worried * 2); x.lineTo(-sz * 0.2, cy - sz * 0.2); x.moveTo(sz * 0.48, cy - sz * 0.26 - worried * 2); x.lineTo(sz * 0.2, cy - sz * 0.2); x.stroke();
  x.beginPath(); x.moveTo(-sz * 0.2, cy + sz * 0.36); x.quadraticCurveTo(0, cy + sz * 0.26, sz * 0.2, cy + sz * 0.36); x.stroke();
}

/* ---------------- the worries ---------------- */
const WORRY_ART = {
  wonder(x, r, c) { blob(x, r, c, 1); x.fillStyle = "rgba(255,255,255,.55)"; x.font = `700 ${r * 0.9}px Manrope, sans-serif`; x.textAlign = "center"; x.fillText("?", 0, -r * 0.55); face(x, r * 0.1, r); },
  flutter(x, r, c) { x.fillStyle = lighten(c, 0.3); x.beginPath(); x.ellipse(-r * 0.9, -r * 0.2, r * 0.8, r * 0.95, -0.5, 0, TAU); x.ellipse(r * 0.9, -r * 0.2, r * 0.8, r * 0.95, 0.5, 0, TAU); x.fill(); x.fillStyle = lighten(c, 0.55); x.beginPath(); x.ellipse(-r * 0.8, r * 0.7, r * 0.5, r * 0.5, 0.4, 0, TAU); x.ellipse(r * 0.8, r * 0.7, r * 0.5, r * 0.5, -0.4, 0, TAU); x.fill(); blob(x, r * 0.62, c); face(x, 0, r * 0.7); },
  mind(x, r, c) { blob(x, r, c, 2); x.fillStyle = "rgba(255,255,255,.8)"; x.beginPath(); x.ellipse(0, -r * 0.12, r * 0.62, r * 0.38, 0, 0, TAU); x.fill(); x.fillStyle = "#2a2440"; x.beginPath(); x.arc(r * 0.12, -r * 0.12, r * 0.24, 0, TAU); x.fill(); x.fillStyle = "rgba(255,255,255,.9)"; x.beginPath(); x.arc(r * 0.2, -r * 0.2, r * 0.07, 0, TAU); x.fill(); x.strokeStyle = "#2a2440"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-r * 0.25, r * 0.55); x.quadraticCurveTo(0, r * 0.45, r * 0.25, r * 0.55); x.stroke(); },
  allnone(x, r, c) { blob(x, r, c, 0); x.save(); x.beginPath(); x.rect(0, -r * 1.2, r * 1.2, r * 2.4); x.clip(); blob(x, r, "#4a3f5a", 0); x.restore(); x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -r * 0.95); x.lineTo(0, r * 0.95); x.stroke(); face(x, -r * 0.05, r * 0.9); },
  myfault(x, r, c) { blob(x, r, c, 3); x.fillStyle = "rgba(255,255,255,.75)"; x.font = `800 ${r * 0.95}px Manrope, sans-serif`; x.textAlign = "center"; x.fillText("!", 0, -r * 0.5); face(x, r * 0.12, r * 0.95); },
  shadow(x, r, c) { x.fillStyle = rg(x, 0, 0, 2, r * 1.2, [[0, "rgba(40,44,110,.95)"], [1, "rgba(30,30,80,.2)"]]); x.beginPath(); x.moveTo(-r, r); x.quadraticCurveTo(-r * 1.1, -r * 1.2, 0, -r * 1.15); x.quadraticCurveTo(r * 1.1, -r * 1.2, r, r); x.lineTo(r * 0.5, r * 0.7); x.lineTo(0, r); x.lineTo(-r * 0.5, r * 0.7); x.closePath(); x.fill(); x.fillStyle = "#d8dcff"; x.beginPath(); x.ellipse(-r * 0.35, -r * 0.2, r * 0.18, r * 0.26, 0, 0, TAU); x.ellipse(r * 0.35, -r * 0.2, r * 0.18, r * 0.26, 0, 0, TAU); x.fill(); },
  hurry(x, r, c) { x.strokeStyle = "rgba(255,240,180,.55)"; x.lineWidth = 3; x.lineCap = "round"; for (const dy of [-r * 0.5, 0, r * 0.5]) { x.beginPath(); x.moveTo(-r * 1.9, dy); x.lineTo(-r * 0.9, dy); x.stroke(); } blob(x, r, c, 4); face(x, 0, r * 0.95, 2); },
  gloom(x, r, c) { x.fillStyle = darken(c, 0.15); [[-0.7, 0.1, 0.65], [0.7, 0.1, 0.65], [0, -0.35, 0.8]].forEach(([a, b, k]) => { x.beginPath(); x.arc(a * r, b * r, k * r, 0, TAU); x.fill(); }); blob(x, r * 0.85, c); x.fillStyle = "rgba(160,190,230,.6)"; x.beginPath(); x.ellipse(-r * 0.4, r * 1.05, 2, 4, 0, 0, TAU); x.ellipse(r * 0.3, r * 1.2, 2, 4, 0, 0, TAU); x.fill(); face(x, 0, r * 0.9); },
  replay(x, r, c) { blob(x, r, c, 5); x.strokeStyle = "rgba(255,255,255,.7)"; x.lineWidth = 2.2; x.beginPath(); x.arc(0, -r * 0.55, r * 0.35, 0.4, TAU - 0.6); x.stroke(); x.fillStyle = "rgba(255,255,255,.7)"; x.beginPath(); x.moveTo(r * 0.32, -r * 0.62); x.lineTo(r * 0.5, -r * 0.4); x.lineTo(r * 0.15, -r * 0.4); x.fill(); face(x, r * 0.15, r * 0.9); },
  heap(x, r, c) { for (let i = 0; i < 5; i++) { x.save(); x.rotate((i - 2) * 0.09); x.fillStyle = lighten(c, 0.15 + i * 0.05); x.fillRect(-r * 0.9, r * 0.7 - i * r * 0.36, r * 1.8, r * 0.34); x.restore(); } x.fillStyle = "rgba(60,50,70,.5)"; for (let i = 0; i < 3; i++) x.fillRect(-r * 0.6, r * 0.78 - i * r * 0.5, r * 1.1, 2); blob(x, r * 0.55, c); face(x, -r * 0.55, r * 0.7); },
};
const BOSS_ART = {
  test(x, r, c) { x.fillStyle = lighten(c, 0.45); x.fillRect(-r * 0.8, -r, r * 1.6, r * 2); x.strokeStyle = "#8a7aa8"; x.lineWidth = 2; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(-r * 0.6, -r * 0.5 + i * r * 0.3); x.lineTo(r * 0.6, -r * 0.5 + i * r * 0.3); x.stroke(); } x.fillStyle = "rgba(120,90,160,.8)"; x.font = `800 ${r * 1.2}px Manrope, sans-serif`; x.textAlign = "center"; x.fillText("?", 0, -r * 0.3); face(x, r * 0.35, r * 0.9, 2); },
  falling(x, r, c) { x.fillStyle = "#c98ab0"; x.beginPath(); x.ellipse(-r * 0.55, 0, r * 0.7, r * 0.8, 0, 0, TAU); x.fill(); x.fillStyle = "#8aa8d8"; x.beginPath(); x.ellipse(r * 0.55, 0, r * 0.7, r * 0.8, 0, 0, TAU); x.fill(); x.strokeStyle = "rgba(255,255,255,.6)"; x.lineWidth = 3; x.setLineDash([5, 5]); x.beginPath(); x.moveTo(0, -r * 0.85); x.lineTo(0, r * 0.85); x.stroke(); x.setLineDash([]); face(x, 0, r * 1.0, 2); },
  mistake(x, r, c) { blob(x, r, c, 2); x.strokeStyle = "rgba(90,50,70,.75)"; x.lineWidth = r * 0.14; x.lineCap = "round"; x.beginPath(); x.moveTo(-r * 0.5, -r * 0.7); x.lineTo(r * 0.5, -r * 0.1); x.moveTo(r * 0.5, -r * 0.7); x.lineTo(-r * 0.5, -r * 0.1); x.stroke(); face(x, r * 0.4, r * 0.9, 2); },
  bed(x, r, c) { x.fillStyle = "rgba(40,44,110,.9)"; x.beginPath(); x.ellipse(0, r * 0.2, r * 1.1, r * 0.8, 0, Math.PI, 0); x.fill(); x.fillRect(-r * 1.1, r * 0.2, r * 2.2, r * 0.5); x.fillStyle = "#6a5a7a"; x.fillRect(-r * 1.2, r * 0.6, r * 2.4, r * 0.18); x.fillRect(-r * 1.15, r * 0.6, r * 0.12, r * 0.5); x.fillRect(r * 1.03, r * 0.6, r * 0.12, r * 0.5); x.fillStyle = "#d8dcff"; x.beginPath(); x.ellipse(-r * 0.35, -r * 0.1, r * 0.18, r * 0.26, 0, 0, TAU); x.ellipse(r * 0.35, -r * 0.1, r * 0.18, r * 0.26, 0, 0, TAU); x.fill(); },
  cloud(x, r, c) { x.fillStyle = darken(c, 0.2); [[-1, 0.2, 0.7], [1, 0.2, 0.7], [-0.5, -0.5, 0.75], [0.55, -0.5, 0.7], [0, 0.55, 0.65]].forEach(([a, b, k]) => { x.beginPath(); x.arc(a * r, b * r, k * r, 0, TAU); x.fill(); }); blob(x, r * 0.95, c, 1); face(x, r * 0.05, r * 1.2, 2); },
};

/* ---------------- the towers: soft pastel helpers; the glow and pips grow with each level ---------------- */
function towerArt(id, lv) {
  const t = TOWER[id], c = t.col, [cv, x] = mk(100, 100), g = 1 + lv * 0.18;
  x.fillStyle = rg(x, 0, 6, 4, 46 * g, [[0, c + "55"], [1, c + "00"]]); x.beginPath(); x.arc(0, 6, 46 * g, 0, TAU); x.fill();
  x.fillStyle = "rgba(24,20,48,.55)"; x.beginPath(); x.ellipse(0, 30, 28, 8, 0, 0, TAU); x.fill();                // a soft shadow on the ground
  x.fillStyle = lg(x, 0, 20, 0, 36, [[0, "#6a5a82"], [1, "#43385e"]]); x.beginPath(); x.ellipse(0, 28, 26, 9, 0, 0, TAU); x.fill();   // the little stone base
  switch (id) {
    case "firefly": x.fillStyle = "rgba(210,225,255,.25)"; x.strokeStyle = "rgba(220,230,255,.5)"; x.lineWidth = 2; x.beginPath(); x.roundRect(-14, -16, 28, 40, 9); x.fill(); x.stroke(); x.fillStyle = "#7a6a52"; x.fillRect(-11, -20, 22, 6); for (let i = 0; i < 3 + lv; i++) { x.fillStyle = rg(x, 0, 0, 0, 7, [[0, "#fff6c8"], [1, c + "00"]]); x.save(); x.translate(Math.sin(i * 2.1) * 8, -4 + Math.cos(i * 3.3) * 12); x.beginPath(); x.arc(0, 0, 7, 0, TAU); x.fill(); x.restore(); } break;
    case "lantern": x.fillStyle = "#7a5a46"; x.fillRect(-3, -30, 6, 10); x.fillStyle = "rgba(255,200,130,.35)"; x.strokeStyle = "#8a6a52"; x.lineWidth = 2.5; x.beginPath(); x.roundRect(-14, -22, 28, 42, 8); x.fill(); x.stroke(); x.fillStyle = rg(x, 0, 0, 1, 14, [[0, "#fff0c8"], [1, c + "00"]]); x.beginPath(); x.ellipse(0, 0, 9, 14, 0, 0, TAU); x.fill(); break;
    case "chime": x.strokeStyle = "#8a7aa0"; x.lineWidth = 3; x.beginPath(); x.moveTo(-18, -26); x.lineTo(18, -26); x.stroke(); for (let i = -2; i <= 2; i++) { const h = 22 + (2 - Math.abs(i)) * 6; x.fillStyle = lg(x, 0, -24, 0, 0, [[0, "#cdeee4"], [1, c]]); x.fillRect(i * 7 - 2.5, -24, 5, h); x.strokeStyle = "rgba(255,255,255,.4)"; x.beginPath(); x.moveTo(i * 7, -26); x.lineTo(i * 7, -24); x.stroke(); } x.fillStyle = "#e8d28f"; x.beginPath(); x.arc(0, 14, 5, 0, TAU); x.fill(); break;
    case "dandelion": x.strokeStyle = "#7ab08a"; x.lineWidth = 3.5; x.beginPath(); x.moveTo(0, 26); x.quadraticCurveTo(4, 6, 0, -8); x.stroke(); x.fillStyle = "rgba(255,255,230,.7)"; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; x.strokeStyle = "rgba(255,250,220,.7)"; x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, -12); x.lineTo(Math.cos(a) * 18, -12 + Math.sin(a) * 18); x.stroke(); x.beginPath(); x.arc(Math.cos(a) * 18, -12 + Math.sin(a) * 18, 2.6, 0, TAU); x.fill(); } x.fillStyle = c; x.beginPath(); x.arc(0, -12, 5, 0, TAU); x.fill(); break;
    case "lavender": for (let i = -1; i <= 1; i++) { x.strokeStyle = "#7ab08a"; x.lineWidth = 2.5; x.beginPath(); x.moveTo(i * 6, 26); x.quadraticCurveTo(i * 8, 6, i * 11, -18 + Math.abs(i) * 6); x.stroke(); for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? c : lighten(c, 0.25); x.beginPath(); x.ellipse(i * 10 + (k % 2 ? 3 : -3), -20 + Math.abs(i) * 6 + k * 4, 3.4, 2.6, 0, 0, TAU); x.fill(); } } break;
    case "moonbeam": x.strokeStyle = "#7a7aa8"; x.lineWidth = 3.5; x.beginPath(); x.arc(0, -4, 22, 0, TAU); x.stroke(); x.fillStyle = rg(x, -4, -8, 2, 22, [[0, "#f4f6ff"], [1, "#a8b4e0"]]); x.beginPath(); x.arc(0, -4, 17, 0.4, TAU - 0.4); x.arc(7, -4, 13, TAU - 0.9, 0.9, true); x.fill(); break;
    case "catcher": x.strokeStyle = "#c9a0c0"; x.lineWidth = 3; x.beginPath(); x.arc(0, -6, 19, 0, TAU); x.stroke(); x.strokeStyle = "rgba(255,230,250,.8)"; x.lineWidth = 1.2; for (let i = 1; i <= 3; i++) { x.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; x.lineTo(Math.cos(a) * (19 - i * 5), -6 + Math.sin(a) * (19 - i * 5)); } x.closePath(); x.stroke(); } for (const dx of [-8, 0, 8]) { x.strokeStyle = "#e8b4d8"; x.lineWidth = 2; x.beginPath(); x.moveTo(dx, 12); x.lineTo(dx, 26 + Math.abs(dx) * 0.2); x.stroke(); x.fillStyle = dx ? "#8fc7e8" : c; x.beginPath(); x.ellipse(dx, 28, 3, 5, 0, 0, TAU); x.fill(); } break;
    case "blanket": x.fillStyle = lg(x, -20, -10, 20, 20, [[0, "#f0c0c0"], [1, "#c98a8a"]]); x.beginPath(); x.roundRect(-22, -6, 44, 32, 10); x.fill(); x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 1.5; x.setLineDash([4, 4]); x.beginPath(); x.roundRect(-18, -2, 36, 24, 7); x.stroke(); x.setLineDash([]); x.fillStyle = "#d8b090"; x.beginPath(); x.arc(0, -14, 11, 0, TAU); x.arc(-9, -23, 5, 0, TAU); x.arc(9, -23, 5, 0, TAU); x.fill(); x.fillStyle = "#4a3a50"; x.beginPath(); x.arc(-4, -15, 1.6, 0, TAU); x.arc(4, -15, 1.6, 0, TAU); x.fill(); break;
  }
  // little glowing dots show the level
  for (let i = 0; i < lv + 1; i++) { x.fillStyle = rg(x, 0, 0, 0, 5, [[0, "#fff6d0"], [1, "#f2d37c"]]); x.beginPath(); x.arc((i - lv / 2) * 10, 40, 3, 0, TAU); x.fill(); }
  return { c: cv, w: 100, h: 100 };
}

export function glow(color) {
  glow.cache = glow.cache || {}; if (glow.cache[color]) return glow.cache[color];
  const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(0.25, color); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return (glow.cache[color] = c);
}

/* the Sleep Nest at the end of the path */
function nestArt() {
  const [c, x] = mk(110, 110);
  x.fillStyle = rg(x, 0, 6, 8, 54, [[0, "rgba(255,210,140,.5)"], [1, "rgba(255,210,140,0)"]]); x.beginPath(); x.arc(0, 6, 54, 0, TAU); x.fill();
  x.fillStyle = "#6a4a5a"; x.beginPath(); x.ellipse(0, 18, 36, 14, 0, 0, TAU); x.fill();
  x.fillStyle = lg(x, 0, -4, 0, 24, [[0, "#c9a6e8"], [1, "#8a6ab0"]]); x.beginPath(); x.roundRect(-34, -2, 68, 28, 12); x.fill();
  x.fillStyle = "#f0e2cc"; x.beginPath(); x.roundRect(-30, -14, 28, 18, 9); x.fill(); x.fillStyle = "#f0c0c0"; x.beginPath(); x.roundRect(-4, 0, 36, 20, 8); x.fill();
  x.fillStyle = "#f2d37c"; x.font = "14px sans-serif"; x.textAlign = "center"; x.fillText("✦", 22, -10); x.fillText("✦", 34, -22);
  return { c, w: 110, h: 110 };
}

export function buildSprites() {
  const spr = { worry: {}, boss: {}, tower: {}, nest: nestArt() };
  Object.keys(WORRY).forEach((k) => { const r = WORRY[k].r, sz = Math.ceil(r * 3.6), [c, x] = mk(sz, sz); WORRY_ART[k](x, r, WORRY[k].col); spr.worry[k] = { c, w: sz, h: sz }; });
  BOSS.forEach((b) => { const sz = Math.ceil(b.r * 3.8), [c, x] = mk(sz, sz); BOSS_ART[b.id](x, b.r, b.col); spr.boss[b.id] = { c, w: sz, h: sz }; });
  TOWER_IDS.forEach((id) => { spr.tower[id] = [0, 1, 2].map((lv) => towerArt(id, lv)); });
  return spr;
}

/* ---------------- the garden for a level, drawn once ---------------- */
export function drawGarden(L, H, path, seedN) {
  const c = document.createElement("canvas"); c.width = W * 1.5; c.height = Math.round(H * 1.5); const x = c.getContext("2d"); x.scale(1.5, 1.5);
  let seed = seedN * 7919 + 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // sky and distant hills
  x.fillStyle = lg(x, 0, 0, 0, H, [[0, L.sky[0]], [0.55, L.sky[1]], [1, L.ground]]); x.fillRect(0, 0, W, H);
  x.fillStyle = "rgba(20,16,50,.45)"; x.beginPath(); x.moveTo(0, GY + 20); for (let i = 0; i <= 12; i++) x.lineTo(i * 50, GY - 4 + Math.sin(i * 1.3 + seedN) * 14); x.lineTo(W, 0); x.lineTo(0, 0); x.fill();
  // the ground
  x.fillStyle = lg(x, 0, GY, 0, GY + ROWS * TILE, [[0, L.ground], [1, "#1c1938"]]); x.beginPath(); x.roundRect(8, GY, W - 16, ROWS * TILE, 22); x.fill();
  // grass tufts and little flowers
  for (let i = 0; i < 150; i++) { const px = 14 + rnd() * (W - 28), py = GY + 8 + rnd() * (ROWS * TILE - 16); x.strokeStyle = "rgba(160,220,170,.18)"; x.lineWidth = 1.2; x.beginPath(); x.moveTo(px, py); x.lineTo(px - 2, py - 5); x.moveTo(px, py); x.lineTo(px + 2, py - 6); x.stroke(); }
  for (let i = 0; i < 26; i++) { const px = 20 + rnd() * (W - 40), py = GY + 14 + rnd() * (ROWS * TILE - 28); x.fillStyle = ["rgba(255,220,160,.35)", "rgba(220,190,255,.35)", "rgba(255,190,210,.35)"][i % 3]; x.beginPath(); x.arc(px, py, 2.2, 0, TAU); x.fill(); }
  // the lane the worries drift along
  const pts = path.map(([c, r]) => [c * TILE + TILE / 2, GY + r * TILE + TILE / 2]);
  x.lineCap = "round"; x.lineJoin = "round";
  for (const [w, col] of [[62, "rgba(20,16,40,.35)"], [54, L.lane], [40, "rgba(255,255,255,.05)"]]) { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); }
  x.strokeStyle = "rgba(255,230,190,.10)"; x.lineWidth = 2; x.setLineDash([2, 18]); x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); x.setLineDash([]);
  // soft tile marks so George can see where helpers can go
  x.strokeStyle = "rgba(255,255,255,.035)"; x.lineWidth = 1; for (let cI = 0; cI <= COLS; cI++) { x.beginPath(); x.moveTo(cI * TILE, GY); x.lineTo(cI * TILE, GY + ROWS * TILE); x.stroke(); } for (let rI = 0; rI <= ROWS; rI++) { x.beginPath(); x.moveTo(0, GY + rI * TILE); x.lineTo(W, GY + rI * TILE); x.stroke(); }
  // little scenes on the free tiles: flowers, glowing mushrooms, rocks and a pond, different on every level
  const used = new Set(); for (let i = 1; i < path.length; i++) { const [c0, r0] = path[i - 1], [c1, r1] = path[i], n = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0)); for (let k = 0; k <= n; k++) used.add(`${Math.round(c0 + ((c1 - c0) * k) / n)},${Math.round(r0 + ((r1 - r0) * k) / n)}`); }
  const free = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!used.has(`${c},${r}`)) free.push([c, r]);
  const pond = free[Math.floor(rnd() * free.length)];
  if (pond) { const px = pond[0] * TILE + TILE - 14, py = GY + pond[1] * TILE + TILE - 12; x.fillStyle = "rgba(120,150,210,.22)"; x.beginPath(); x.ellipse(px - 18, py - 8, 26, 11, 0, 0, TAU); x.fill(); x.strokeStyle = "rgba(200,220,255,.25)"; x.lineWidth = 1.2; x.beginPath(); x.ellipse(px - 18, py - 8, 18, 7, 0, 0, TAU); x.stroke(); }
  for (let i = 0; i < 46; i++) {
    const [c, r] = free[Math.floor(rnd() * free.length)], px = c * TILE + 10 + rnd() * (TILE - 20), py = GY + r * TILE + 10 + rnd() * (TILE - 20), k = i % 5;
    if (k === 0) { x.fillStyle = "rgba(255,230,200,.5)"; x.beginPath(); x.arc(px, py, 2.4, 0, TAU); x.fill(); x.fillStyle = [L.glow, "#f0b0d0", "#c9b6f0"][i % 3] + "88"; for (let a = 0; a < 5; a++) { x.beginPath(); x.arc(px + Math.cos(a * 1.26) * 4, py + Math.sin(a * 1.26) * 4, 2.6, 0, TAU); x.fill(); } }
    else if (k === 1) { x.fillStyle = "rgba(120,90,110,.55)"; x.fillRect(px - 1.2, py, 2.4, 6); x.fillStyle = L.glow + "99"; x.beginPath(); x.ellipse(px, py, 6, 4, 0, Math.PI, 0); x.fill(); x.fillStyle = "rgba(255,255,255,.35)"; x.beginPath(); x.arc(px - 2, py - 2, 1, 0, TAU); x.fill(); }
    else if (k === 2) { x.fillStyle = "rgba(90,90,120,.5)"; x.beginPath(); x.ellipse(px, py, 7 + rnd() * 4, 4.5, 0, 0, TAU); x.fill(); x.fillStyle = "rgba(255,255,255,.12)"; x.beginPath(); x.ellipse(px - 2, py - 1.5, 3, 1.5, 0, 0, TAU); x.fill(); }
    else if (k === 3) { x.strokeStyle = "rgba(150,210,170,.4)"; x.lineWidth = 1.4; for (let a = -2; a <= 2; a++) { x.beginPath(); x.moveTo(px, py); x.lineTo(px + a * 2.5, py - 7 + Math.abs(a)); x.stroke(); } }
    else { x.globalCompositeOperation = "lighter"; x.fillStyle = L.glow + "55"; x.beginPath(); x.arc(px, py, 5, 0, TAU); x.fill(); x.globalCompositeOperation = "source-over"; }
  }
  // trees and mushrooms in the corners
  for (let i = 0; i < 6; i++) { const px = rnd() < 0.5 ? 6 + rnd() * 16 : W - 22 + rnd() * 16, py = GY + 30 + rnd() * (ROWS * TILE - 60); x.fillStyle = "rgba(20,26,50,.5)"; x.beginPath(); x.arc(px, py, 12 + rnd() * 8, 0, TAU); x.fill(); }
  return c;
}
