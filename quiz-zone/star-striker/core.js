/* Star Striker: the shared core. The game state, the save, achievements, and the particle effects. */
import { W as FIELD_W, ACH } from "./data.js";
import { audio } from "./audio.js";

export const W = FIELD_W, TAU = Math.PI * 2;
export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ---------------- the save (kept on this device; the optional login carries it between devices) ---------------- */
const KEY = "gz_ss_v1";
function loadSave() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  const st = s.st || {};
  return {
    best: +s.best || 0, maxLevel: Math.max(1, Math.min(10, +s.maxLevel || 1)), ach: s.ach && typeof s.ach === "object" ? s.ach : {},
    st: { kills: +st.kills || 0, gems: +st.gems || 0, games: +st.games || 0, ball: +st.ball || 0, beam: +st.beam || 0, bosses: Array.isArray(st.bosses) ? st.bosses : [] },
    music: s.music !== false, sound: s.sound !== false, calm: !!s.calm,
  };
}
export const SAVE = loadSave();
export function saveNow() { try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) {} }

/* ---------------- the state everything shares ---------------- */
export const S = {
  H: 900, state: "menu", level: 0, lt: 0, evIdx: 0, ts: 1, now: 0,
  score: 0, shown: 0, lives: 5, bombs: 2, combo: 0, comboT: 0, mult: 1, maxCombo: 0, gems: 0, kills: 0, picks: 0,
  hits: 0, startLevel: 0, practice: false, levelsCleared: 0, victory: false,
  shake: 0, flash: 0, vig: 0, warp: 0, intro: 0, warn: 0, endT: 0, supplyT: 9,
  calm: false, osReduced: false, fxMul: 1,
  P: { x: W / 2, y: 780, tx: W / 2, ty: 780, vx: 0, r: 11, cool: 0, weapon: null, tier: 1, wT: 0, rapid: 0, shield: 0, shT: 0, magnet: 0, freeze: 0, x2: 0, drone: 0, inv: 0, beam: false, anim: 0 },
  pb: [], eb: [], en: [], pk: [], gm: [], fx: [], pops: [], rings: [], beams: [], spawnQ: [], timers: [], boss: null,
  weaponsUsed: new Set(), runAch: [], runKills: { ball: 0, beam: 0, bomb: 0 },
  spr: null, bgImg: null, planetImg: null, stars: [], decor: [], input: "ptr",
  hooks: { toast() {}, },
};

/* ---------------- achievements ---------------- */
export function unlock(id) {
  if (SAVE.ach[id]) return;
  const a = ACH.find((x) => x[0] === id); if (!a) return;
  SAVE.ach[id] = Date.now(); saveNow(); S.runAch.push(id);
  S.hooks.toast(a); audio.play("ach");
}

/* ---------------- effects ---------------- */
export function addShake(n) { if (!S.calm) S.shake = Math.min(26, Math.max(S.shake, n)); }
export function addFlash(n) { if (!S.calm) S.flash = Math.max(S.flash, n); }

export function spark(x, y, vx, vy, life, size, col, k = "s") {
  const cap = 650 * S.fxMul; if (S.fx.length > cap) return;
  S.fx.push({ x, y, vx, vy, l: life, m: life, s: size, c: col, k, r: rand(0, TAU), vr: rand(-6, 6) });
}
export function burst(x, y, n, speed, life, size, col, k = "s") {
  n = Math.round(n * S.fxMul * (S.calm ? 0.6 : 1));
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), v = rand(0.25, 1) * speed; spark(x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.5, 1) * life, rand(0.6, 1.2) * size, col, k); }
}
export function ring(x, y, r1, life, col, w = 6) { S.rings.push({ x, y, r: 6, r1, l: life, m: life, c: col, w }); }
export function popup(x, y, text, col = "#fff", size = 22) { S.pops.push({ x, y, t: text, c: col, s: size, l: 0.9, m: 0.9 }); }

export function explode(x, y, size, col = "#ffb347") {
  // size: 1 = small ship, 2 = big ship, 3 = boss
  const sc = size;
  S.rings.push({ x, y, r: 4, r1: 40 + 36 * sc, l: 0.32 + 0.08 * sc, m: 0.32 + 0.08 * sc, c: "#fff", w: 4 });
  S.fx.push({ x, y, vx: 0, vy: 0, l: 0.35 + 0.1 * sc, m: 0.35 + 0.1 * sc, s: 70 + 70 * sc, c: "#ffd27a", k: "fire", r: 0, vr: 0 });
  burst(x, y, 12 + 8 * sc, 170 + 80 * sc, 0.6, 7, col);
  burst(x, y, 8 + 4 * sc, 120 + 40 * sc, 0.5, 5, "#fff");
  burst(x, y, 5 + 3 * sc, 90, 0.9, 16 + 6 * sc, "#6b5a4a", "smoke");
  burst(x, y, 6 + 3 * sc, 220, 0.8, 4, "#ffcf6b", "deb");
  audio.play(size >= 3 ? "big" : "boom", 40);
  addShake(3 + 3 * sc);
}

export function resetFx() { S.pb.length = S.eb.length = S.en.length = S.pk.length = S.gm.length = S.fx.length = S.pops.length = S.rings.length = S.beams.length = S.spawnQ.length = S.timers.length = 0; S.boss = null; }
