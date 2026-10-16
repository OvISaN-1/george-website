/* Star Striker: the rules. The ship, weapons, enemies, bosses, pickups, collisions and how a level flows. */
import { ENEMY, BOSS, PICK, WEAPONS, BOOSTS, LEVELS } from "./data.js";
import { S, SAVE, saveNow, W, TAU, rand, clamp, lerp, pick, unlock, addShake, addFlash, spark, burst, ring, popup, explode, resetFx } from "./core.js";
import { audio, music } from "./audio.js";

const P = S.P;
export const keys = {};
let uid = 0;

const lv = () => S.level;
const hpMul = () => 1 + 0.2 * lv();
const bsMul = () => 1 + 0.035 * lv();
const fireMul = () => 1 + 0.07 * lv();
const aim = (x, y) => Math.atan2(P.y - y, P.x - x);

/* =========================== a run =========================== */
export function startRun(startAt) {
  S.startLevel = startAt; S.practice = startAt > 0;
  Object.assign(S, { score: 0, shown: 0, lives: 5, bombs: 2, combo: 0, comboT: 0, mult: 1, maxCombo: 0, gems: 0, kills: 0, picks: 0, levelsCleared: 0, victory: false, runAch: [], ts: 1, bombKills: 0 });
  S.weaponsUsed = new Set(); S.runKills = { ball: 0, beam: 0, bomb: 0 };
  Object.assign(P, { x: W / 2, y: S.H - 150, tx: W / 2, ty: S.H - 150, vx: 0, cool: 0, c2: 0, dc: 0, weapon: null, tier: 1, wT: 0, rapid: 0, shield: 0, shT: 0, magnet: 0, freeze: 0, x2: 0, drone: 0, inv: 1.5, beam: false });
  SAVE.st.games++; saveNow();
  beginLevel(startAt);
}

export function beginLevel(i) {
  resetFx();
  S.level = i; S.lt = 0; S.evIdx = 0; S.hits = 0; S.state = "intro"; S.intro = 2.8; S.warp = 1; S.supplyT = 8; S.ts = 1;
  SAVE.maxLevel = Math.max(SAVE.maxLevel, i + 1); saveNow();
  if (i + 1 >= 3) unlock("level-3"); if (i + 1 >= 5) unlock("level-5"); if (i + 1 >= 10) unlock("level-10");
  S.hooks.level(i); music.set(i, false);
  P.x = clamp(P.x, 40, W - 40);
  // a welcome gift on every level: a weapon, and a shield on the harder levels
  S.timers.push({ at: S.now + 3.0, fn: () => dropPickup(rand(170, 430), -30, pick(WEAPONS), 90) });
  if (i >= 3) S.timers.push({ at: S.now + 4.2, fn: () => dropPickup(rand(170, 430), -30, "shield", 90) });
}

function clearLevel() {
  S.state = "clear"; S.levelsCleared++; S.warp = 1;
  const stars = S.hits === 0 ? 3 : S.hits <= 2 ? 2 : 1;
  const bonus = 500 * (lv() + 1) * stars;
  S.score += bonus; if (S.hits === 0) unlock("untouched");
  S.lives = Math.min(8, S.lives + 1); S.bombs = Math.min(5, S.bombs + 1);
  audio.play("clear"); music.set(lv(), false);
  if (lv() >= 9) { S.victory = true; unlock("win"); S.timers.push({ at: S.now + 2.2, fn: () => endRun(true) }); return; }
  S.timers.push({ at: S.now + 1.4, fn: () => S.hooks.clear(stars, bonus) });
}
export function nextLevel() { beginLevel(lv() + 1); }

function endRun(victory) {
  S.state = "over"; music.stop();
  if (S.score > SAVE.best) SAVE.best = S.score;
  saveNow();
  S.hooks.end(victory);
}

/* =========================== helpers =========================== */
function addScore(n) {
  const v = Math.round(n * S.mult * (P.x2 > 0 ? 2 : 1)); S.score += v;
  if (S.score >= 10000) unlock("score-10k"); if (S.score >= 50000) unlock("score-50k"); if (S.score >= 150000) unlock("score-150k");
  return v;
}

export function makeEnemy(type, x, y, o = {}) {
  const d = ENEMY[type];
  const hp = type === "rock" ? Math.ceil(d.hp * (1 + 0.1 * lv())) : type === "bee" ? 1 : Math.ceil(d.hp * hpMul());
  const m = o.m || { scout: "wob", zig: "zig", bee: "sine", gunner: "hover", spinner: "hover", tank: "down", kamikaze: "kami", weaver: "sine", layer: "strafe", phantom: "phase", splitter: "wob", carrier: "hover", rock: "rock" }[type];
  const e = { id: ++uid, type, x, y, x0: x, y0: y, vx: o.vx || 0, vy: d.vy * (1 + 0.03 * lv()), hp, maxhp: hp, r: d.r, t: 0, m, ph: rand(0, TAU), flash: 0, dead: false, dir: o.dir || 1,
    fireT: rand(0.8, 1.8) / fireMul(), hy: rand(130, 220), stay: 8 + rand(0, 2), amp: o.amp || (type === "weaver" ? 170 : 110), state: 0, rot: rand(0, TAU), spin: rand(-1.4, 1.4), ghost: false, bcd: 0, sprIdx: Math.floor(rand(0, 3)) };
  if (type === "rock") { e.vx = rand(-40, 40); e.r = rand(20, 32); e.sc = e.r / 26; }
  S.en.push(e); return e;
}

function eshot(x, y, ang, speed, k = "orb", r) {
  const rr = r || { orb: 8, needle: 6, big: 14, mine: 12 }[k] || 8;
  S.eb.push({ x, y, vx: Math.cos(ang) * speed * bsMul(), vy: Math.sin(ang) * speed * bsMul(), k, r: rr, t: 0, a: ang });
}
function ringShot(x, y, n, speed, rot = 0, k = "orb") { for (let i = 0; i < n; i++) eshot(x, y, rot + (i / n) * TAU, speed, k); }
function beam(x, w = 70) { S.beams.push({ x: clamp(x, 40, W - 40), w, t: 0, warn: 1.0, on: 0.9 }); }

/* =========================== kills, drops, pickups =========================== */
function gemDrop(x, y, n) { for (let i = 0; i < n; i++) S.gm.push({ x: x + rand(-10, 10), y: y + rand(-10, 10), vx: rand(-90, 90), vy: rand(-120, -10), v: 10, t: 0 }); }

export function dropPickup(x, y, type, vy = 85) {
  if (!type) {
    const wts = { twin: 3, spread: 3, laser: 3, missile: 3, ball: 3, nova: 3, rapid: 2, shield: 2, magnet: 1.5, freeze: 1.5, x2: 1.5, drone: 1.5, bomb: 1.5, heart: S.lives < 4 ? 2.2 : 0.5 };
    let tot = 0; for (const k in wts) tot += wts[k]; let r = Math.random() * tot; type = "twin";
    for (const k in wts) { r -= wts[k]; if (r <= 0) { type = k; break; } }
  }
  S.pk.push({ x, y, type, t: 0, vy });
}

function comboUp() {
  S.combo++; S.comboT = 2.2; S.maxCombo = Math.max(S.maxCombo, S.combo);
  const m = Math.min(8, 1 + Math.floor(S.combo / 3));
  if (m > S.mult) { S.mult = m; popup(P.x, P.y - 70, "COMBO x" + m, "#ffe14d", 28); audio.play("combo"); if (m >= 5) unlock("combo-5"); if (m >= 8) unlock("combo-8"); }
}

function kill(e, how) {
  if (e.dead) return; e.dead = true;
  const d = ENEMY[e.type], big = e.r >= 34;
  explode(e.x, e.y, big ? 2 : 1, d.col);
  if (e.type !== "rock") {
    S.kills++; SAVE.st.kills++; unlock("first-blood"); if (SAVE.st.kills >= 500) unlock("kills-500");
    comboUp();
    const v = addScore(d.score); if (v >= 250) popup(e.x, e.y - 18, "+" + v, "#fff", 18);
  } else addScore(d.score);
  if (how === "ball") { S.runKills.ball++; SAVE.st.ball++; if (SAVE.st.ball >= 20) unlock("football-fan"); }
  if (how === "beam") { S.runKills.beam++; SAVE.st.beam++; if (SAVE.st.beam >= 20) unlock("beam-me-up"); }
  if (how === "bomb") { S.bombKills++; }
  if (e.type !== "rock") {
    gemDrop(e.x, e.y, big ? 6 : Math.random() < 0.65 ? 2 : 1);
    if (d.drop || Math.random() < 0.14) dropPickup(e.x, e.y);
  }
  if (e.type === "splitter") for (const s of [-1, 1]) makeEnemy("bee", e.x + s * 16, e.y, { m: "drift", vx: s * 130 }).vy = 120;
}

function hurt(e, dmg, how) {
  if (e.dead || e.ghost || e.inv) return false;
  e.hp -= dmg; e.flash = 0.1;
  if (e.hp <= 0) { if (e.boss) bossDefeated(e); else kill(e, how); }
  else { spark(e.x + rand(-8, 8), e.y + rand(-8, 8), rand(-80, 80), rand(-80, 80), 0.3, 5, "#fff"); audio.play("hit", 60); }
  return true;
}

function collect(p) {
  const info = PICK[p.type];
  S.picks++; if (S.picks >= 10) unlock("power-hungry");
  ring(P.x, P.y, 70, 0.4, info.col, 5); burst(P.x, P.y, 14, 220, 0.6, 6, info.col);
  if (info.kind === "weapon") {
    if (P.weapon === p.type) { P.tier = Math.min(3, P.tier + 1); popup(P.x, P.y - 54, info.name + (P.tier > 1 ? " Lv" + P.tier : ""), info.col, 22); }
    else { P.weapon = p.type; P.tier = 1; popup(P.x, P.y - 54, info.name, info.col, 22); }
    P.wT = 16; S.weaponsUsed.add(p.type); if (S.weaponsUsed.size >= WEAPONS.length) unlock("arsenal"); audio.play("power");
  } else {
    audio.play("pick"); popup(P.x, P.y - 54, info.name, info.col, 22);
    if (p.type === "rapid") P.rapid = 12;
    if (p.type === "shield") { P.shield = 3; P.shT = 14; }
    if (p.type === "magnet") P.magnet = 14;
    if (p.type === "freeze") P.freeze = 5;
    if (p.type === "x2") P.x2 = 15;
    if (p.type === "drone") { P.drone = 15; unlock("drone-squad"); }
    if (p.type === "bomb") S.bombs = Math.min(5, S.bombs + 1);
    if (p.type === "heart") { if (S.lives === 1) unlock("close-call"); S.lives = Math.min(8, S.lives + 1); }
  }
  S.hooks.pickup && S.hooks.pickup(p.type);
}

/* =========================== the player =========================== */
export function useBomb() {
  if (S.bombs <= 0 || !["play", "boss", "intro"].includes(S.state)) return false;
  S.bombs--; S.bombKills = 0; audio.play("bomb");
  ring(P.x, P.y, 760, 0.8, "#ff9a5c", 14); ring(P.x, P.y, 520, 0.6, "#fff", 8); addFlash(0.55); addShake(14);
  burst(P.x, P.y, 40, 520, 0.9, 8, "#ffb347");
  for (const b of S.eb) { gemDrop(b.x, b.y, 0); spark(b.x, b.y, 0, 0, 0.4, 14, "#ffd27a"); b.dead = true; }
  for (const e of S.en) if (!e.dead && e.y > -20) hurt(e, e.boss ? 26 : 16, "bomb");
  if (S.bombKills >= 8) unlock("bomb-squad");
  S.timers.push({ at: S.now + 0.05, fn: () => { if (S.bombKills >= 8) unlock("bomb-squad"); } });
  return true;
}

function hitPlayer() {
  if (P.inv > 0 || !["play", "boss", "intro", "warn"].includes(S.state)) return;
  if (P.shield > 0) { P.shield--; P.inv = 0.6; ring(P.x, P.y, 90, 0.4, "#6bb5ff", 8); audio.play("hit"); if (P.shield <= 0) P.shT = 0; return; }
  S.lives--; S.hits++; P.inv = 2.2; S.combo = 0; S.mult = 1; S.comboT = 0;
  audio.play("hurt"); addShake(16); S.vig = 1; ring(P.x, P.y, 200, 0.5, "#ff5d5d", 10); burst(P.x, P.y, 26, 300, 0.8, 7, "#ff7a6a");
  if (P.tier > 1) P.tier--;
  try { if (!S.calm && navigator.vibrate) navigator.vibrate(S.lives <= 0 ? [80, 50, 160] : 90); } catch (e) {}
  for (const b of S.eb) if (Math.hypot(b.x - P.x, b.y - P.y) < 170) b.dead = true;       // breathing space
  if (S.lives <= 0) {
    S.state = "dying"; explode(P.x, P.y, 3, "#ff6b6b"); S.vig = 1; music.stop(); audio.play("over");
    S.timers.push({ at: S.now + 1.7, fn: () => endRun(false) });
  }
}

function pshot(x, y, ang, speed, dmg, k = "laser", extra) {
  S.pb.push(Object.assign({ x, y, vx: Math.sin(ang) * speed, vy: -Math.cos(ang) * speed, dmg, k, r: k === "ball" ? 18 : k === "missile" ? 10 : 7, life: 2, t: 0 }, extra));
}

function fireWeapon() {
  const w = P.weapon, t = P.tier, x = P.x, y = P.y - 34;
  const base = () => { pshot(x, y, 0, 950, 1.2); audio.play("laser", 70); };
  switch (w) {
    case "twin":
      if (t === 1) { pshot(x - 11, y, 0, 950, 1.1); pshot(x + 11, y, 0, 950, 1.1); }
      else if (t === 2) { pshot(x - 15, y, 0, 950, 1.1); pshot(x, y - 6, 0, 1000, 1.2); pshot(x + 15, y, 0, 950, 1.1); }
      else { pshot(x - 10, y, 0, 950, 1.1); pshot(x + 10, y, 0, 950, 1.1); pshot(x, y - 8, 0, 1000, 1.3); pshot(x - 20, y + 4, -0.13, 930, 1); pshot(x + 20, y + 4, 0.13, 930, 1); }
      audio.play("twin", 70); break;
    case "spread": { const n = [3, 5, 7][t - 1]; for (let i = 0; i < n; i++) pshot(x, y, (i - (n - 1) / 2) * 0.15, 900, 1); audio.play("twin", 70); break; }
    case "laser": break;                                  // the beam is handled every frame
    default: base();
  }
  if (w === "missile" || w === "ball" || w === "nova") { /* the special part runs on its own timer below */ }
}
function fireSpecial() {
  const w = P.weapon, t = P.tier, x = P.x, y = P.y - 20;
  if (w === "missile") { const n = [2, 3, 4][t - 1]; for (let i = 0; i < n; i++) { const s = (i - (n - 1) / 2); pshot(x + s * 18, y, s * 0.35, 320, 2.4, "missile", { home: true, sp: 320, life: 3 }); } audio.play("missile", 100); }
  else if (w === "ball") { const n = t; for (let i = 0; i < n; i++) pshot(x, y, (i - (n - 1) / 2) * 0.32, 560, 3.2, "ball", { life: 4, bounce: 5 }); audio.play("ball", 100); }
  else if (w === "nova") { const n = [10, 14, 20][t - 1]; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; S.pb.push({ x, y, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, dmg: 1, k: "nova", r: 9, life: 0.9, t: 0 }); } ring(x, y, 70, 0.35, "#ffe66b", 4); audio.play("nova", 100); }
}

function updatePlayer(dt) {
  const ox = P.x;
  if (S.input === "kbd") {
    const ax = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), ay = (keys.down ? 1 : 0) - (keys.up ? 1 : 0), sp = 440, n = ax && ay ? 0.707 : 1;
    P.x += ax * sp * n * dt; P.y += ay * sp * n * dt; P.tx = P.x; P.ty = P.y;
  } else {
    const k = Math.min(1, dt * 15); P.x += (P.tx - P.x) * k; P.y += (P.ty - P.y) * k;
  }
  P.x = clamp(P.x, 30, W - 30); P.y = clamp(P.y, 110, S.H - 44);
  P.vx = lerp(P.vx, (P.x - ox) / Math.max(dt, 0.001), Math.min(1, dt * 10));
  P.anim += dt;

  for (const k of ["rapid", "magnet", "freeze", "x2", "drone", "inv"]) if (P[k] > 0) P[k] = Math.max(0, P[k] - dt);
  if (P.shT > 0) { P.shT -= dt; if (P.shT <= 0) P.shield = 0; }
  if (P.wT > 0) { P.wT -= dt; if (P.wT <= 0) { P.weapon = null; P.tier = 1; } }
  if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) { S.combo = 0; S.mult = 1; } }

  const live = ["intro", "play", "boss"].includes(S.state);
  P.beam = false;
  if (!live) return;
  P.cool -= dt;
  if (P.cool <= 0) { fireWeapon(); P.cool = (P.weapon === "spread" ? 0.2 : 0.17) / (P.rapid > 0 ? 1.7 : 1); }
  P.c2 -= dt; if (P.c2 <= 0 && (P.weapon === "missile" || P.weapon === "ball" || P.weapon === "nova")) { fireSpecial(); P.c2 = (P.weapon === "nova" ? 0.85 : P.weapon === "ball" ? 0.55 : 0.55) / (P.rapid > 0 ? 1.5 : 1); }
  if (P.weapon === "laser") {
    P.beam = true; const t = P.tier, w = [22, 34, 48][t - 1], dps = [17, 27, 40][t - 1] * (P.rapid > 0 ? 1.3 : 1);
    P.beamW = w; audio.play("beam", 140);
    for (const e of S.en) if (!e.dead && !e.ghost && e.y < P.y && Math.abs(e.x - P.x) < e.r + w / 2) { hurt(e, dps * dt, "beam"); if (Math.random() < 0.5) spark(P.x + rand(-w / 3, w / 3), e.y + e.r * 0.6, rand(-60, 60), rand(20, 120), 0.3, 5, "#fff"); }
    for (const b of S.eb) if (Math.abs(b.x - P.x) < b.r + w / 2 && b.y < P.y) { b.dead = true; spark(b.x, b.y, 0, 0, 0.3, 10, "#ff9ae6"); }
  }
  if (P.drone > 0) { P.dc -= dt; if (P.dc <= 0) { P.dc = 0.4; for (const s of [-1, 1]) { const a = S.now * 3 + (s > 0 ? Math.PI : 0); pshot(P.x + Math.cos(a) * 46, P.y + Math.sin(a) * 14, 0, 850, 0.9, "laser", { r: 5 }); } } }
  // the engine's flame
  if (Math.random() < 0.9) { spark(P.x - 11, P.y + 34, rand(-14, 14), rand(150, 260), 0.28, 11, "#7df3ff"); spark(P.x + 11, P.y + 34, rand(-14, 14), rand(150, 260), 0.28, 11, "#ffb347"); }
}

/* =========================== bullets =========================== */
function updatePlayerBullets(dt) {
  for (const b of S.pb) {
    b.t += dt; b.life -= dt;
    if (b.home) {
      let best = null, bd = 1e9; for (const e of S.en) if (!e.dead && !e.ghost && e.y > 0 && e.y < S.H) { const d = (e.x - b.x) ** 2 + (e.y - b.y) ** 2; if (d < bd) { bd = d; best = e; } }
      b.sp = Math.min(660, b.sp + 520 * dt); let ang = Math.atan2(b.vy, b.vx);
      if (best) { const want = Math.atan2(best.y - b.y, best.x - b.x); let da = want - ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; ang += clamp(da, -6.5 * dt, 6.5 * dt); } else { const da = -Math.PI / 2 - ang; ang += clamp(da, -3 * dt, 3 * dt); }
      b.vx = Math.cos(ang) * b.sp; b.vy = Math.sin(ang) * b.sp;
      if (Math.random() < 0.8) spark(b.x, b.y + 8, rand(-20, 20), rand(40, 90), 0.3, 9, "#ffb347");
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.k === "ball") {
      if (Math.random() < 0.7) spark(b.x, b.y, rand(-30, 30), rand(-30, 30), 0.4, 10, "#ffffff");
      if (b.bounce > 0) { if (b.x < 20 && b.vx < 0) { b.vx = -b.vx; b.bounce--; } if (b.x > W - 20 && b.vx > 0) { b.vx = -b.vx; b.bounce--; } if (b.y < 20 && b.vy < 0) { b.vy = -b.vy; b.bounce--; } if (b.y > S.H - 20 && b.vy > 0) { b.vy = -b.vy; b.bounce--; } }
    }
    if (b.y < -50 || b.y > S.H + 50 || b.x < -50 || b.x > W + 50 || b.life <= 0) b.dead = true;
  }
  for (const b of S.pb) {
    if (b.dead) continue;
    for (const e of S.en) {
      if (e.dead || e.ghost || e.y < -30) continue;
      const rr = e.r + b.r; if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > rr * rr) continue;
      if (b.k === "ball") { if (e.bcd > S.now) continue; e.bcd = S.now + 0.22; hurt(e, b.dmg, "ball"); spark(b.x, b.y, 0, 0, 0.25, 22, "#fff"); continue; }
      if (e.inv) { b.dead = true; spark(b.x, b.y, 0, 0, 0.2, 14, "#9fe"); break; }
      hurt(e, b.dmg, b.k === "laser" ? "laser" : b.k);
      if (b.k === "missile") { explode(b.x, b.y, 1, "#ffb347"); for (const o of S.en) if (o !== e && !o.dead && (o.x - b.x) ** 2 + (o.y - b.y) ** 2 < 70 * 70) hurt(o, 2, "missile"); b.dead = true; break; }
      b.dead = true; break;
    }
  }
}

function updateEnemyBullets(dt) {
  const f = P.freeze > 0 ? 0.35 : 1;
  for (const b of S.eb) {
    b.t += dt * f;
    if (b.k === "missile") { if (b.t < b.home) { const want = Math.atan2(P.y - b.y, P.x - b.x); let ang = Math.atan2(b.vy, b.vx), da = want - ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; ang += clamp(da, -2.2 * dt, 2.2 * dt); const sp = 230 * bsMul(); b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp; } b.a = Math.atan2(b.vy, b.vx); if (Math.random() < 0.6) spark(b.x, b.y, 0, 0, 0.3, 9, "#ff8a4d"); }
    if (b.k === "mine" && b.t > 1.9) { b.dead = true; explode(b.x, b.y, 1, "#ff9a3c"); ringShot(b.x, b.y, 4, 210, TAU / 8); continue; }
    b.x += b.vx * dt * f; b.y += b.vy * dt * f;
    if (b.y > S.H + 40 || b.y < -80 || b.x < -50 || b.x > W + 50) b.dead = true;
    else if (!b.dead && (b.x - P.x) ** 2 + (b.y - P.y) ** 2 < (b.r + P.r) ** 2) { b.dead = true; hitPlayer(); }
  }
}

/* =========================== enemies =========================== */
function enemyFire(e) {
  const d = ENEMY[e.type], base = d.fire / fireMul(); e.fireT = base * rand(0.85, 1.25);
  switch (e.type) {
    case "gunner": { const a = aim(e.x, e.y); eshot(e.x, e.y + 20, a, 260); if (lv() >= 3) { eshot(e.x - 10, e.y + 20, a - 0.08, 260); eshot(e.x + 10, e.y + 20, a + 0.08, 260); } break; }
    case "spinner": ringShot(e.x, e.y, lv() >= 4 ? 10 : 8, 165, e.t * 1.3); break;
    case "tank": for (let i = -1; i <= 1; i++) eshot(e.x, e.y + 24, Math.PI / 2 + i * 0.3, 210); break;
    case "weaver": eshot(e.x, e.y + 16, Math.PI / 2, 250, "needle"); break;
    case "layer": S.eb.push({ x: e.x, y: e.y + 20, vx: 0, vy: 60, k: "mine", r: 13, t: 0, a: 0 }); break;
    case "phantom": if (!e.ghost) eshot(e.x, e.y + 14, aim(e.x, e.y), 250); break;
  }
}

function updateEnemies(dt) {
  const f = P.freeze > 0 ? 0.35 : 1, ed = dt * f;
  for (const e of S.en) {
    if (e.dead) continue;
    if (e.boss) { updateBoss(e, dt); continue; }
    e.t += ed; if (e.flash > 0) e.flash -= dt; if (e.type === "spinner" || e.type === "rock") e.rot += (e.type === "rock" ? e.spin : 2.4) * ed;
    const vy = e.vy;
    switch (e.m) {
      case "down": e.y += vy * ed; break;
      case "wob": e.y += vy * ed; e.x = e.x0 + Math.sin(e.t * 2 + e.ph) * 36; break;
      case "sine": e.y += vy * ed; e.x = clamp(e.x0 + Math.sin(e.t * 2.2 + e.ph * 0) * e.amp, 24, W - 24); break;
      case "zig": e.y += vy * ed; e.state -= ed; if (e.state <= 0) { e.state = 0.8; e.dir = -e.dir; } e.x = clamp(e.x + e.dir * 190 * ed, 24, W - 24); break;
      case "drift": e.x += e.vx * ed; e.y += e.vy * ed; break;
      case "swoop": e.x += e.dir * 200 * ed; e.y = e.y0 + 70 * Math.sin(e.t * 1.7) + e.t * 55; break;
      case "rock": e.y += vy * ed; e.x += e.vx * ed; break;
      case "phase": e.y += vy * ed; e.x = e.x0 + Math.sin(e.t * 1.2) * 70; e.ghost = ((e.t + e.ph) % 3) > 1.9; break;
      case "hover": {
        if (e.state === 0) { e.y += Math.max(vy, 120) * ed; if (e.y >= e.hy) { e.state = 1; e.t0 = e.t; } }
        else if (e.state === 1) { e.x = e.x0 + Math.sin(e.t * 1.1 + e.ph) * 60; if (e.t - e.t0 > e.stay) e.state = 2; }
        else e.y += 150 * ed;
        break;
      }
      case "kami": {
        if (e.state === 0) { e.y += 330 * ed; if (e.y > e.hy * 0.55) { e.state = 1; e.t0 = e.t; } }
        else if (e.state === 1) { if (e.t - e.t0 > 0.7) { const a = aim(e.x, e.y); e.vx = Math.cos(a) * 400; e.vy2 = Math.sin(a) * 400; e.state = 2; } }
        else { e.x += e.vx * ed; e.y += e.vy2 * ed; }
        break;
      }
      case "strafe": { if (e.y < 140) e.y += 90 * ed; else { e.x += e.dir * 85 * ed; if (e.x < 60) e.dir = 1; if (e.x > W - 60) e.dir = -1; if (e.t > 14) e.y += 120 * ed; } break; }
    }
    if (e.type === "carrier") { e.carry = (e.carry || 2) - ed; if (e.carry <= 0) { e.carry = 3.2; if (S.en.filter((o) => o.type === "scout" && !o.dead).length < 8) for (const s of [-1, 1]) makeEnemy("scout", e.x + s * 30, e.y + 24, { m: "wob" }); } }
    const d = ENEMY[e.type];
    if (d.fire && e.y > 20 && e.y < S.H - 120 && !(e.m === "hover" && e.state === 0)) { e.fireT -= ed; if (e.fireT <= 0) enemyFire(e); }
    if (e.y > S.H + 70 || e.x < -90 || e.x > W + 90 || e.y < -140) { e.dead = true; e.gone = true; continue; }
    if (e.y > 0 && !e.ghost && (e.x - P.x) ** 2 + (e.y - P.y) ** 2 < (e.r * 0.8 + P.r) ** 2) { hitPlayer(); if (e.type === "rock") hurt(e, 3, "ram"); else hurt(e, 4, "ram"); }
  }
}

function summon(type, n, bx, by) {
  if (S.en.filter((o) => !o.dead && !o.boss).length > 10) return;
  for (let i = 0; i < n; i++) makeEnemy(type, clamp(bx + (i - (n - 1) / 2) * 56, 30, W - 30), by + 30, { m: type === "phantom" ? "phase" : "wob" });
}

/* =========================== bosses =========================== */
function spawnBoss(idx) {
  const d = BOSS[idx], hp = Math.round(d.hp * (1 + 0.04 * idx));
  const b = { id: ++uid, boss: true, bi: idx, type: "boss", x: W / 2, y: -150, hp, maxhp: hp, r: d.r, t: 0, enter: 2.6, inv: true, flash: 0, dead: false, ph: 1, a: 1.2, b: 3, c: 4, d: 6, ang: 0, dash: 0, alt: false, name: d.name, col: d.col };
  S.en.push(b); S.boss = b; S.state = "boss"; music.set(lv(), true); S.warp = 0.5;
}
const phaseOf = (b) => { const r = b.hp / b.maxhp; return r > 0.6 ? 1 : r > 0.28 ? 2 : 3; };

function updateBoss(b, dt) {
  const f = P.freeze > 0 ? 0.55 : 1, d = dt * f;
  b.t += d; if (b.flash > 0) b.flash -= dt;
  if (b.enter > 0) { b.enter -= dt; b.y = lerp(-150, 235, 1 - Math.pow(b.enter / 2.6, 2)); if (b.enter <= 0) { b.inv = false; } return; }
  if (S.state !== "boss") return;
  const ph = phaseOf(b);
  if (ph > b.ph) { b.ph = ph; popup(b.x, b.y + 80, ph === 3 ? "FINAL FORM!" : "ENRAGED!", "#ff5d5d", 30); addShake(14); audio.play("boom"); for (const x of S.eb) x.dead = true; ring(b.x, b.y, 380, 0.7, b.col, 12); dropPickup(b.x - 50, b.y + 40, null, 80); dropPickup(b.x + 50, b.y + 40, null, 80); }
  b.a -= d; b.b -= d; b.c -= d; b.d -= d;
  switch (b.bi) {
    case 0: {
      b.x = W / 2 + Math.sin(b.t * 0.9) * 190; b.y = 235 + Math.sin(b.t * 1.7) * 10;
      if (b.a <= 0) { b.a = ph === 3 ? 0.85 : 1.2; const n = ph >= 2 ? 7 : 5; for (let i = 0; i < n; i++) eshot(b.x, b.y + 40, Math.PI / 2 + (i - (n - 1) / 2) * 0.2, 230); }
      if (b.b <= 0) { b.b = ph === 1 ? 2.6 : 1.8; const a = aim(b.x, b.y); for (let k = -1; k <= 1; k++) eshot(b.x, b.y + 30, a + k * 0.13, 300, "needle"); }
      if (ph >= 2 && b.c <= 0) { b.c = 6.5; summon("scout", 3, b.x, b.y); }
      if (ph === 3 && b.d <= 0) { b.d = 1.7; ringShot(b.x, b.y, 14, 170, b.t); }
      break;
    }
    case 1: {
      b.x = W / 2 + Math.sin(b.t * 0.7) * 170; b.y = 235;
      if (b.a <= 0) { b.a = ph === 1 ? 1.0 : 0.7; b.alt = !b.alt; const cx = b.x + (b.alt ? 62 : -62), a = aim(cx, b.y + 30); eshot(cx, b.y + 36, a, 290); eshot(cx, b.y + 36, a + 0.15, 290); }
      if (ph >= 2 && b.b <= 0) { b.b = 0.3; eshot(rand(30, 570), -20, Math.PI / 2, 330, "needle"); }
      if (ph === 3 && b.c <= 0) { b.c = 4.4; beam(P.x); }
      if (ph >= 2 && b.d <= 0) { b.d = 1.5; ringShot(b.x, b.y, 10, 160, b.t * 2); }
      break;
    }
    case 2: {
      b.x = W / 2 + Math.sin(b.t * 0.6) * 200;
      if (b.dash > 0) { b.dash -= d; b.y = 235 + Math.sin((1 - b.dash / 1.7) * Math.PI) * 260; } else b.y = 235 + Math.sin(b.t * 1.2) * 14;
      if (b.a <= 0) { b.a = ph === 1 ? 0.11 : 0.08; b.ang += 0.45; const arms = ph >= 2 ? 3 : 2; for (let i = 0; i < arms; i++) eshot(b.x, b.y + 20, b.ang + (i * TAU) / arms, 185); }
      if (b.b <= 0) { b.b = ph === 1 ? 7 : 5; summon("bee", 6, b.x, b.y); }
      if (ph === 3 && b.c <= 0) { b.c = 7; b.dash = 1.7; popup(b.x, b.y + 90, "INCOMING!", "#ffb3ee", 24); }
      break;
    }
    case 3: {
      b.x = W / 2 + Math.sin(b.t * 0.5) * 150; b.y = 240;
      if (b.a <= 0) { b.a = ph === 1 ? 3.3 : 2.4; const gap = rand(110, 490); for (let x = 24; x <= 576; x += 34) if (Math.abs(x - gap) > 62) eshot(x, b.y + 60, Math.PI / 2, 165, "needle"); }
      if (b.b <= 0) { b.b = ph === 1 ? 4.2 : 3; for (const dx of [-50, 50]) S.eb.push({ k: "missile", x: b.x + dx, y: b.y + 50, vx: 0, vy: 120, r: 9, t: 0, a: Math.PI / 2, home: 3.2 }); }
      if (ph >= 2 && b.c <= 0) { b.c = 5.2; beam(P.x - 100); beam(P.x + 100); }
      if (ph === 3 && b.d <= 0) { b.d = 1.1; const a = aim(b.x, b.y); for (let k = -2; k <= 2; k++) eshot(b.x, b.y + 50, a + k * 0.12, 290); }
      break;
    }
    case 4: {
      b.x = W / 2 + Math.sin(b.t * 0.7) * 200; b.y = 240 + Math.sin(b.t * 1.1) * 18;
      b.ang += d * (ph === 1 ? 1.2 : ph === 2 ? 1.8 : 2.4);
      if (b.a <= 0) { b.a = ph === 1 ? 0.13 : 0.09; for (let i = 0; i < 4; i++) eshot(b.x, b.y, b.ang + (i * TAU) / 4, 195); }
      if (b.b <= 0) { b.b = ph === 3 ? 1.3 : 1.9; const a = aim(b.x, b.y); for (let k = -1; k <= 1; k++) eshot(b.x, b.y + 50, a + k * 0.16, 250, "big"); }
      if (ph >= 2 && b.c <= 0) { b.c = 4; const gap = rand(110, 490); for (let x = 24; x <= 576; x += 34) if (Math.abs(x - gap) > 62) eshot(x, b.y + 70, Math.PI / 2, 160, "needle"); }
      if (ph >= 2 && b.d <= 0) { b.d = 8; summon("phantom", 4, b.x, b.y); }
      if (ph === 3) { b.e = (b.e || 0) - d; if (b.e <= 0) { b.e = 5; beam(120, 60); beam(300, 60); beam(480, 60); } b.f = (b.f || 0) - d; if (b.f <= 0) { b.f = 2.2; ringShot(b.x, b.y, 20, 150, b.t); } }
      break;
    }
  }
}

function bossDefeated(b) {
  if (b.dead) return; b.dead = true; S.state = "bossdie"; S.boss = null;
  for (const x of S.eb) x.dead = true; S.beams.length = 0;
  S.ts = 0.35; addShake(10);
  for (let i = 0; i < 16; i++) S.timers.push({ at: S.now + i * 0.1, fn: () => explode(b.x + rand(-70, 70), b.y + rand(-45, 45), 2, b.col) });
  S.timers.push({ at: S.now + 1.7, fn: () => {
    S.ts = 1; explode(b.x, b.y, 3, b.col); addFlash(0.8); addShake(22); ring(b.x, b.y, 700, 1, "#fff", 14);
    gemDrop(b.x, b.y, 40); for (let i = 0; i < 3; i++) dropPickup(b.x + (i - 1) * 60, b.y, null, 70);
    const v = addScore(BOSS[b.bi].score); popup(b.x, b.y + 30, "+" + v, "#ffe14d", 34); S.kills++; SAVE.st.kills++;
  } });
  for (const o of S.en) if (!o.dead && o !== b) { o.dead = true; explode(o.x, o.y, 1, "#fff"); }
  unlock("boss-1");
  if (!SAVE.st.bosses.includes(b.bi)) { SAVE.st.bosses.push(b.bi); saveNow(); }
  if (SAVE.st.bosses.length >= 5) unlock("boss-all");
  S.timers.push({ at: S.now + 3.6, fn: () => { S.ts = 1; clearLevel(); } });
}

/* =========================== the level script =========================== */
function runEvent(ev) {
  const { f, type, n, o } = ev, q = (delay, x, y, extra) => S.spawnQ.push(Object.assign({ at: S.lt + delay, type, x, y }, extra));
  switch (f) {
    case "line": for (let i = 0; i < n; i++) q(0, lerp(70, 530, (i + 0.5) / n), -30); break;
    case "vee": { const mid = (n - 1) / 2; for (let i = 0; i < n; i++) q(0, 300 + (i - mid) * 58, -30 - Math.abs(i - mid) * 46); break; }
    case "col": { const x = o.x != null ? o.x : rand(100, 500); for (let i = 0; i < n; i++) q(i * 0.45, x, -30); break; }
    case "sine": { const x = rand(190, 410); for (let i = 0; i < n; i++) q(i * 0.35, x, -30, { m: "sine" }); break; }
    case "side": { const L = o.side === "L", y0 = rand(70, 150); for (let i = 0; i < n; i++) q(i * 0.32, L ? -30 : W + 30, y0, { m: "swoop", dir: L ? 1 : -1 }); break; }
    case "rain": for (let i = 0; i < n; i++) q(rand(0, o.span || 4), rand(50, 550), -40); break;
    case "single": q(0, o.x != null ? o.x : rand(100, 500), -40); break;
  }
}

function updateLevel(dt) {
  const L = LEVELS[lv()];
  S.lt += dt;
  while (S.evIdx < L.ev.length && L.ev[S.evIdx].t <= S.lt) runEvent(L.ev[S.evIdx++]);
  for (let i = S.spawnQ.length - 1; i >= 0; i--) { const s = S.spawnQ[i]; if (s.at <= S.lt) { makeEnemy(s.type, s.x, s.y, s); S.spawnQ.splice(i, 1); } }
  const last = L.ev[L.ev.length - 1].t;
  if (S.evIdx >= L.ev.length && !S.spawnQ.length && S.lt > last + 2 && !S.en.some((e) => !e.dead && e.type !== "rock")) {
    if (L.boss != null) { S.state = "warn"; S.warn = 3.4; S.warp = 0.2; audio.play("warn"); for (const e of S.en) if (!e.dead) e.dead = true; }
    else clearLevel();
  }
}

/* =========================== pickups, gems, beams =========================== */
function supply(dt) {
  S.supplyT -= dt;
  if (S.supplyT <= 0) { S.supplyT = S.state === "boss" ? rand(6, 8) : rand(11, 15); dropPickup(rand(70, 530), -30, null, 70); }
}

function updatePickups(dt) {
  for (const p of S.pk) {
    p.t += dt; p.y += p.vy * dt; p.x += Math.sin(p.t * 2.2) * 22 * dt;
    if (P.magnet > 0) { const d = Math.hypot(P.x - p.x, P.y - p.y); if (d < 280) { p.x += ((P.x - p.x) / d) * 380 * dt; p.y += ((P.y - p.y) / d) * 380 * dt; } }
    if (Math.hypot(p.x - P.x, p.y - P.y) < 38) { p.dead = true; collect(p); }
    else if (p.y > S.H + 40) p.dead = true;
  }
  const pull = P.magnet > 0 ? 300 : S.state === "clear" || S.state === "bossdie" ? 2000 : 110;
  for (const g of S.gm) {
    g.t += dt; g.vy = lerp(g.vy, 90, Math.min(1, dt * 2)); g.vx = lerp(g.vx, 0, Math.min(1, dt * 2)); g.x += g.vx * dt; g.y += g.vy * dt;
    const d = Math.hypot(P.x - g.x, P.y - g.y);
    if (d < pull) { g.x += ((P.x - g.x) / d) * 560 * dt; g.y += ((P.y - g.y) / d) * 560 * dt; }
    if (d < 30) { g.dead = true; S.gems++; SAVE.st.gems++; if (SAVE.st.gems >= 100) unlock("gem-hoarder"); addScore(g.v); audio.play("gem", 50); }
    else if (g.y > S.H + 30) g.dead = true;
  }
  for (const b of S.beams) {
    b.t += dt;
    if (b.t > b.warn && b.t < b.warn + b.on) { if (Math.abs(P.x - b.x) < b.w / 2 + P.r) hitPlayer(); if (Math.random() < 0.7) spark(b.x + rand(-b.w / 2, b.w / 2), rand(0, S.H), 0, rand(100, 300), 0.3, 7, "#ff9ae6"); }
    if (b.t > b.warn + b.on) b.dead = true;
  }
}

/* =========================== the master update =========================== */
export function update(rawDt) {
  S.now += rawDt;
  for (let i = S.timers.length - 1; i >= 0; i--) if (S.timers[i].at <= S.now) { const t = S.timers.splice(i, 1)[0]; t.fn(); }
  const dt = rawDt * S.ts;
  // glow and shake settle down
  S.shake = Math.max(0, S.shake - rawDt * 40); S.flash = Math.max(0, S.flash - rawDt * 1.6); S.vig = Math.max(0, S.vig - rawDt * 1.4);
  S.warp = Math.max(S.state === "intro" ? 0.6 : 0, S.warp - rawDt * 0.5);
  S.shown += (S.score - S.shown) * Math.min(1, rawDt * 9); if (S.score - S.shown < 1) S.shown = S.score;
  if (S.state !== "menu" && S.state !== "over" && S.state !== "dying") {
    if (S.state === "intro") { S.intro -= dt; if (S.intro <= 0) S.state = "play"; }
    if (S.state === "warn") { S.warn -= dt; if (S.warn <= 0) spawnBoss(LEVELS[lv()].boss); }
    updatePlayer(dt);
    if (S.state === "play") updateLevel(dt);
    if (S.state === "play" || S.state === "boss") supply(dt);
    updateEnemies(dt); updatePlayerBullets(dt); updateEnemyBullets(dt); updatePickups(dt);
  }
  if (S.state === "dying") { updateEnemyBullets(dt * 0.3); updateEnemies(dt * 0.3); }
  // clean up what was destroyed
  const keep = (a) => { let j = 0; for (let i = 0; i < a.length; i++) if (!a[i].dead) a[j++] = a[i]; a.length = j; };
  keep(S.pb); keep(S.eb); keep(S.en); keep(S.pk); keep(S.gm); keep(S.beams);
  // effects
  for (const p of S.fx) { p.l -= rawDt; p.x += p.vx * rawDt; p.y += p.vy * rawDt; p.r += p.vr * rawDt; if (p.k === "smoke") { p.vx *= 0.97; p.vy *= 0.97; } else if (p.k === "deb") p.vy += 380 * rawDt; else if (p.k === "s") { p.vx *= 0.985; p.vy *= 0.985; } }
  for (const r of S.rings) { r.l -= rawDt; r.r = lerp(r.r, r.r1, Math.min(1, rawDt * 7)); }
  for (const p of S.pops) { p.l -= rawDt; p.y -= 38 * rawDt; }
  const k2 = (a) => { let j = 0; for (let i = 0; i < a.length; i++) if (a[i].l > 0) a[j++] = a[i]; a.length = j; };
  k2(S.fx); k2(S.rings); k2(S.pops);
}
