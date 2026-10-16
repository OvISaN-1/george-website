/* Dreamkeeper: the shared core. State, save, achievements and the gentle sparkle effects. */
import { W, ACH, CARD_ORDER } from "./data.js";
import { audio } from "./audio.js";

export { W };
export const TAU = Math.PI * 2;
export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ---------------- the save (this device; the optional login carries it between devices) ---------------- */
const KEY = "gz_dk_v1";
const dayNum = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
function loadSave() {
  let s = {}; try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  const st = s.st || {};
  return {
    maxLevel: clamp(+s.maxLevel || 1, 1, 10), rating: s.rating && typeof s.rating === "object" ? s.rating : {}, cards: s.cards && typeof s.cards === "object" ? s.cards : {}, ach: s.ach && typeof s.ach === "object" ? s.ach : {},
    bosses: Array.isArray(s.bosses) ? s.bosses : [], built: Array.isArray(s.built) ? s.built : [], rewarded: Array.isArray(s.rewarded) ? s.rewarded : [],
    st: { days: Array.isArray(st.days) ? st.days.slice(-10) : [], good: +st.good || 0 },
    opt: Object.assign({ music: true, sound: true, rain: false, crickets: true, auto: true, speed: 1, dim: 2, sleep: 15 }, s.opt || {}),
  };
}
export const SAVE = loadSave();
export function saveNow() { try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) {} }
export function markToday() {
  const t = dayNum(); if (!SAVE.st.days.includes(t)) { SAVE.st.days.push(t); saveNow(); }
  if (SAVE.st.days.includes(t) && SAVE.st.days.includes(t - 1) && SAVE.st.days.includes(t - 2)) unlock("streak");
}

/* ---------------- the state everything shares ---------------- */
export const S = {
  H: 900, state: "menu", level: 0, wave: -1, waves: [], queue: [], waveActive: false, nextIn: 0, speed: 1, paused: false,
  stars: 150, calm: 100, leaks: 0, breathers: 0, towers: [], enemies: [], shots: [], fx: [], rings: [], beams: [], pops: [], bubbles: [], flyers: [],
  pts: [], cum: [], plen: 0, armed: null, sel: null, snap: null, now: 0, tick: 0, introT: 0, seen: new Set(), newCards: [], runAch: [],
  reduced: false, uid: 0, bossRef: null, hooks: {}, spr: null, garden: null, nestPos: { x: 0, y: 0 }, sleepLeft: 0, sleepOn: false, tileHover: null, builtTypes: new Set(),
};

/* ---------------- achievements ---------------- */
export function unlock(id) {
  if (SAVE.ach[id]) return; const a = ACH.find((x) => x[0] === id); if (!a) return;
  SAVE.ach[id] = Date.now(); saveNow(); S.runAch.push(id); S.hooks.toast && S.hooks.toast(a); audio.play("win");
  if (id !== "cards-5" && id !== "cards-all") return;
}
export function cardCount() { return CARD_ORDER.filter((k) => SAVE.cards[k]).length; }

/* ---------------- soft sparkles that drift upwards ---------------- */
export function spark(x, y, vx, vy, life, size, col, k = "s") { if (S.fx.length > 220) return; S.fx.push({ x, y, vx, vy, l: life, m: life, s: size, c: col, k }); }
export function stardust(x, y, n, col = "#f2d37c") { for (let i = 0; i < n; i++) { const a = rand(0, TAU), v = rand(10, 38); spark(x, y, Math.cos(a) * v, Math.sin(a) * v - 16, rand(1.2, 2.2), rand(4, 8), col); } }
export function ring(x, y, r1, life, col, w = 3) { S.rings.push({ x, y, r: 4, r1, l: life, m: life, c: col, w }); }
export function popup(x, y, text, col = "#efe6d6", size = 16) { S.pops.push({ x, y, t: text, c: col, s: size, l: 1.6, m: 1.6 }); }
