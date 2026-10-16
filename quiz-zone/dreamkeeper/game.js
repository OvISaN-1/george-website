/* Dreamkeeper: the rules. Worries drift along a path towards the Sleep Nest; helper towers turn them into stars. There is no game over:
   if the calm runs out, the garden takes a breather and the wave is tried again with the towers kept. */
import { WORRY, BOSS, TOWER, TOWER_IDS, LEVELS, TILE, COLS, ROWS, GY, pathFor, makeWaves, CARD_ORDER } from "./data.js";
import { S, SAVE, saveNow, rand, clamp, lerp, dist, TAU, unlock, cardCount, spark, stardust, ring, popup, markToday } from "./core.js";
import { audio } from "./audio.js";

const stat = (t, k) => TOWER[t.id][k][t.lv];
let pathTiles = new Set();

/* =========================== the path =========================== */
export function setPath(level) {
  const wp = pathFor(level);
  S.pts = wp.map(([c, r]) => ({ x: c * TILE + TILE / 2, y: GY + r * TILE + TILE / 2 }));
  S.cum = [0]; for (let i = 1; i < S.pts.length; i++) S.cum.push(S.cum[i - 1] + Math.hypot(S.pts[i].x - S.pts[i - 1].x, S.pts[i].y - S.pts[i - 1].y));
  S.plen = S.cum[S.cum.length - 1]; S.nestPos = S.pts[S.pts.length - 1];
  pathTiles = new Set();
  for (let i = 1; i < wp.length; i++) { const [c0, r0] = wp[i - 1], [c1, r1] = wp[i], n = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0)); for (let k = 0; k <= n; k++) pathTiles.add(`${Math.round(c0 + ((c1 - c0) * k) / n)},${Math.round(r0 + ((r1 - r0) * k) / n)}`); }
}
export function posAt(d) {
  const c = S.cum; if (d <= 0) return { x: S.pts[0].x, y: S.pts[0].y };
  for (let i = 1; i < c.length; i++) if (d <= c[i]) { const t = (d - c[i - 1]) / (c[i] - c[i - 1]); return { x: lerp(S.pts[i - 1].x, S.pts[i].x, t), y: lerp(S.pts[i - 1].y, S.pts[i].y, t) }; }
  return { x: S.nestPos.x, y: S.nestPos.y };
}
export const isPathTile = (c, r) => pathTiles.has(`${c},${r}`);
export const towerAt = (c, r) => S.towers.find((t) => t.col === c && t.row === r);
export const canBuild = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS && !isPathTile(c, r) && !towerAt(c, r);

/* =========================== a level =========================== */
export function beginLevel(i) {
  const L = LEVELS[i];
  S.level = i; S.state = "intro"; S.introT = 3.6; S.waves = makeWaves(i); S.wave = -1; S.queue.length = 0; S.waveActive = false; S.nextIn = 30;
  S.stars = L.stars0; S.calm = 100; S.leaks = 0; S.breathers = 0; S.towers.length = 0; S.enemies.length = 0; S.shots.length = 0; S.fx.length = 0; S.rings.length = 0; S.beams.length = 0; S.pops.length = 0; S.bubbles.length = 0;
  S.armed = null; S.sel = null; S.snap = null; S.bossRef = null; S.runAch = []; S.newCards = []; S.seen = new Set(); S.waveT = 0; S.levelKills = 0;
  setPath(i); S.hooks.level && S.hooks.level(i); markToday();
}

function snapshot() { S.snap = { wave: S.wave, stars: S.stars, towers: S.towers.map((t) => ({ id: t.id, lv: t.lv, col: t.col, row: t.row, invested: t.invested })) }; }
function restoreSnapshot() {
  const s = S.snap; if (!s) return;
  S.towers = s.towers.map((o) => { const t = mkTower(o.id, o.col, o.row); t.lv = o.lv; t.invested = o.invested; return t; });
  S.stars = s.stars; S.wave = s.wave - 1; S.calm = 100; S.enemies.length = 0; S.shots.length = 0; S.queue.length = 0; S.waveActive = false; S.bossRef = null; S.nextIn = 8; S.sel = null;
}

export function startWave() {
  if (S.waveActive || S.wave + 1 >= S.waves.length || !["play"].includes(S.state)) return false;
  S.wave++; snapshot(); S.waveActive = true; S.waveT = 0; S.queue.length = 0;
  for (const [type, n, gap, delay] of S.waves[S.wave]) for (let i = 0; i < n; i++) S.queue.push({ at: delay + i * gap, type });
  S.queue.sort((a, b) => a.at - b.at);
  audio.play("wave"); S.hooks.wave && S.hooks.wave(S.wave);
  // the first time a new worry turns up, tell George what it is and a kind way to think about it
  for (const [type] of S.waves[S.wave]) { const key = type === "__boss" ? BOSS[LEVELS[S.level].boss].id : type; if (!S.seen.has(key)) { S.seen.add(key); if (!SAVE.cards[key]) S.hooks.meet && S.hooks.meet(key); } }
  return true;
}

function spawn(type) {
  const boss = type === "__boss", def = boss ? BOSS[LEVELS[S.level].boss] : WORRY[type], L = S.level, w = Math.max(0, S.wave);
  const mul = 1 + 0.11 * L + 0.03 * w, hp = Math.round(def.hp * (boss ? 1 + 0.035 * L : mul));
  const says = def.says[Math.floor(Math.random() * def.says.length)];
  const e = { id: ++S.uid, type: boss ? def.id : type, boss, d: 0, x: 0, y: 0, hp, maxhp: hp, armor: def.armor, spd: def.spd, r: def.r, col: def.col, slow: null, lit: null, calm: null, flash: 0, dead: false,
    say: says, bub: rand(1, 8), bubOn: 0, hidden: !!def.hidden, revealed: 0, aura: def.aura || 0, leak: Math.max(2, Math.round(def.leak * (boss ? 1 : 0.7))), reward: Math.round(def.reward * (1 + 0.1 * L)), again: false, split: false, spawnT: rand(5, 8), wob: rand(0, TAU), def };
  S.enemies.push(e); if (boss) { S.bossRef = e; audio.play("boss"); S.hooks.boss && S.hooks.boss(e); }
  return e;
}

/* =========================== towers =========================== */
function mkTower(id, col, row) {
  return { id, lv: 0, col, row, x: col * TILE + TILE / 2, y: GY + row * TILE + TILE / 2, cd: rand(0.2, 1.2), buff: 0, spdb: 0, gloom: 1, invested: TOWER[id].cost[0], n: 0, anim: 0, born: S.now, ang: 0, pulse: 0 };
}
export function placeTower(col, row, id) {
  const def = TOWER[id]; if (!def || !canBuild(col, row) || S.stars < def.cost[0]) return null;
  S.stars -= def.cost[0]; const t = mkTower(id, col, row); S.towers.push(t);
  audio.play("place"); ring(t.x, t.y, 50, 0.9, def.col, 3); stardust(t.x, t.y, 8, def.col);
  if (!SAVE.built.includes(id)) { SAVE.built.push(id); saveNow(); } if (TOWER_IDS.every((k) => SAVE.built.includes(k))) unlock("all-towers");
  return t;
}
export function upgradeTower(t) {
  if (!t || t.lv >= 2) return false; const c = TOWER[t.id].cost[t.lv + 1]; if (S.stars < c) return false;
  S.stars -= c; t.invested += c; t.lv++; audio.play("up"); ring(t.x, t.y, 64, 1.1, TOWER[t.id].col, 4); stardust(t.x, t.y, 12, TOWER[t.id].col);
  if (t.lv === 2) unlock("upgrade"); return true;
}
export function sellTower(t) { if (!t) return; S.stars += Math.floor(t.invested * 0.7); S.towers = S.towers.filter((o) => o !== t); if (S.sel === t) S.sel = null; ring(t.x, t.y, 40, 0.7, "#cfc6e8", 3); audio.play("click"); }

function visible(e) { return !e.hidden || e.revealed > 0 || e.d > S.plen * 0.85; }
function inRange(t, range, includeHidden) { const out = []; for (const e of S.enemies) if (!e.dead && Math.hypot(e.x - t.x, e.y - t.y) <= range + e.r * 0.6 && (includeHidden || visible(e))) out.push(e); out.sort((a, b) => b.d - a.d); return out; }

function applySlow(e, a, t) { if (!e.slow || a >= e.slow.a - 0.001) e.slow = { a, t }; else e.slow.t = Math.max(e.slow.t, t * 0.5); }
function applyLit(e, a, t) { if (!e.lit || a >= e.lit.a - 0.001) e.lit = { a, t }; else e.lit.t = Math.max(e.lit.t, t); }
function applyCalm(e, dps, t) { if (!e.calm || dps >= e.calm.dps) e.calm = { dps, t }; else e.calm.t = Math.max(e.calm.t, t); }

function deal(e, amt, src, pierce = false) {
  if (e.dead || !visible(e)) return 0;
  let d = amt * (1 + src.buff);
  if (e.lit) d *= 1 + e.lit.a;
  if (e.lit && e.slow && e.calm) { d *= 1.2; if (!S.harmony || S.now - S.harmony > 9) { S.harmony = S.now; popup(e.x, e.y - e.r - 16, "Harmony ✦", "#f2d37c", 17); } unlock("harmony"); }
  if (!pierce) d = Math.max(1, d - e.armor);
  e.hp -= d; e.flash = 0.12; if (e.hp <= 0) die(e); return d;
}

function shoot(k, t, target, o) { S.shots.push(Object.assign({ k, x: t.x, y: t.y - 6, tx: target.x, ty: target.y, target, speed: 230, tower: t, life: 4, col: TOWER[t.id].col, h: 0 }, o)); }

function fire(t) {
  const id = t.id, lv = t.lv;
  if (id === "blanket") return false;
  if (id === "lantern") {
    const list = inRange(t, stat(t, "range"), true); if (!list.length) return false;
    ring(t.x, t.y, stat(t, "range"), 1.2, "#f0c890", 2);
    for (const e of list) applyLit(e, stat(t, "lit"), 3.2);
    const v = list.find(visible); if (v) deal(v, stat(t, "dmg"), t); return true;
  }
  if (id === "chime") {
    const list = inRange(t, stat(t, "range"), true); if (!list.length) return false;
    for (const e of list) applySlow(e, stat(t, "slow"), 2.6);
    ring(t.x, t.y, stat(t, "range"), 1.1, "#b7e8d8", 3); t.pulse = 1; audio.play("chime", 400); return true;
  }
  const list = inRange(t, stat(t, "range")); if (!list.length) return false;
  const e = list[0]; t.ang = Math.atan2(e.y - t.y, e.x - t.x);
  if (id === "firefly") { const n = stat(t, "shots"); for (let i = 0; i < n; i++) { const tg = list[Math.min(i, list.length - 1)]; shoot("orb", t, tg, { dmg: stat(t, "dmg"), speed: 250, delay: i * 0.12 }); } return true; }
  if (id === "dandelion") { const ahead = posAt(Math.min(S.plen, e.d + e.spd * (1 - (e.slow ? e.slow.a : 0)) * 1.0)); shoot("seed", t, ahead, { dmg: stat(t, "dmg"), splash: stat(t, "splash"), speed: 200, arc: true, target: null }); return true; }
  if (id === "lavender") { const n = 1 + lv; for (let i = 0; i < Math.min(n, list.length); i++) shoot("mist", t, list[i], { dps: stat(t, "dps"), slow: stat(t, "slow"), speed: 300 }); return true; }
  if (id === "moonbeam") {
    t.n++; const full = t.n % 3 === 0, dmg = stat(t, "dmg") * (full ? 1.8 : 1), a = Math.atan2(e.y - t.y, e.x - t.x), range = stat(t, "range");
    const ex = t.x + Math.cos(a) * range, ey = t.y + Math.sin(a) * range;
    for (const o of S.enemies) { if (o.dead || !visible(o)) continue; const px = o.x - t.x, py = o.y - t.y, proj = px * Math.cos(a) + py * Math.sin(a), off = Math.abs(-px * Math.sin(a) + py * Math.cos(a)); if (proj > 0 && proj < range && off < o.r + (full ? 16 : 10)) deal(o, dmg, t, true); }
    S.beams.push({ x0: t.x, y0: t.y, x1: ex, y1: ey, l: 0.5, m: 0.5, c: full ? "#f4f6ff" : "#cfd8f0", w: full ? 9 : 5 }); audio.play("beam", 300); return true;
  }
  if (id === "catcher") {
    const jumps = stat(t, "chain"), hit = new Set([e]); let cur = e, dm = stat(t, "dmg"), prev = t; S.beams.push({ x0: t.x, y0: t.y, x1: e.x, y1: e.y, l: 0.35, m: 0.35, c: "#f0c8e8", w: 3 });
    deal(e, dm, t);
    for (let j = 0; j < jumps; j++) { let best = null, bd = 130 + lv * 12; for (const o of S.enemies) { if (o.dead || hit.has(o) || !visible(o)) continue; const d = Math.hypot(o.x - cur.x, o.y - cur.y); if (d < bd) { bd = d; best = o; } } if (!best) break; dm *= 0.75; S.beams.push({ x0: cur.x, y0: cur.y, x1: best.x, y1: best.y, l: 0.35, m: 0.35, c: "#f0c8e8", w: 3 }); hit.add(best); deal(best, dm, t); cur = best; }
    audio.play("zap", 120); return true;
  }
  return false;
}

function updateTowers(dt) {
  for (const t of S.towers) { t.buff = 0; t.spdb = 0; t.gloom = 1; t.anim += dt; if (t.pulse > 0) t.pulse = Math.max(0, t.pulse - dt * 0.8); }
  for (const b of S.towers) if (b.id === "blanket") { let n = 0; for (const t of S.towers) if (t !== b && dist(b, t) <= stat(b, "range")) { t.buff = Math.min(0.6, t.buff + stat(b, "buff")); t.spdb = Math.min(0.3, t.spdb + stat(b, "speed")); n++; } if (n >= 3) unlock("cosy"); }
  for (const e of S.enemies) if (!e.dead && e.aura) for (const t of S.towers) if (Math.hypot(e.x - t.x, e.y - t.y) <= e.aura) t.gloom = 0.72;
  for (const t of S.towers) {
    if (t.id === "lantern") for (const e of S.enemies) if (e.hidden && !e.dead && Math.hypot(e.x - t.x, e.y - t.y) <= stat(t, "range")) e.revealed = 0.5;
    if (t.id === "blanket") continue;
    t.cd -= dt * (1 + t.spdb) * t.gloom;
    if (t.cd <= 0) { if (fire(t)) t.cd = stat(t, "rate"); else t.cd = 0.15; }
  }
}

function updateShots(dt) {
  for (const s of S.shots) {
    if (s.delay > 0) { s.delay -= dt; continue; }
    s.life -= dt; s.t = (s.t || 0) + dt;
    if (s.target && !s.target.dead) { s.tx = s.target.x; s.ty = s.target.y; }
    const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy), step = s.speed * dt;
    if (d <= step + 4) {
      s.dead = true;
      if (s.k === "orb") { if (s.target && !s.target.dead) deal(s.target, s.dmg, s.tower); stardust(s.tx, s.ty, 2, s.col); }
      else if (s.k === "mist") { if (s.target && !s.target.dead) { applyCalm(s.target, s.dps, 5); applySlow(s.target, s.slow, 3); } spark(s.tx, s.ty, 0, -10, 0.8, 9, "#cdb8f0"); }
      else if (s.k === "seed") { ring(s.tx, s.ty, s.splash, 0.7, "#f6eaa0", 3); audio.play("puff", 120); stardust(s.tx, s.ty, 8, "#fdf6c0"); for (const e of S.enemies) if (!e.dead && Math.hypot(e.x - s.tx, e.y - s.ty) <= s.splash + e.r * 0.5) deal(e, s.dmg, s.tower); }
    } else { s.x += (dx / d) * step; s.y += (dy / d) * step; }
    if (s.life <= 0) s.dead = true;
  }
  S.shots = S.shots.filter((s) => !s.dead);
}

/* =========================== worries =========================== */
/* a worry turns into a happy thought: its kind reply pops up, its Calm Card is collected, and the stars arrive with the thought */
function learn(e, key) {
  if (!SAVE.cards[key]) { SAVE.cards[key] = Date.now(); saveNow(); S.newCards.push(key); S.hooks.card && S.hooks.card(key); const n = cardCount(); if (n >= 5) unlock("cards-5"); if (n >= CARD_ORDER.length) unlock("cards-all"); }
}
function happy(x, y, stars, reply, long) {
  S.flyers.push({ x, y, l: 1.3, m: 1.3, v: stars });
  S.bubbles.push({ x, y: y - 26, text: reply, l: long ? 6 : 4.2, m: long ? 6 : 4.2 });
  popup(x, y - 4, `+${stars} ⭐`, "#f2d37c", 17);
}
function die(e) {
  if (e.dead) return;
  if (e.def.again && !e.again) { e.again = true; e.hp = e.maxhp * 0.5; e.flash = 0.4; popup(e.x, e.y - e.r - 14, "Again?!", "#f0b08c", 15); return; }
  e.dead = true; S.levelKills++;
  stardust(e.x, e.y, e.boss ? 40 : 14, "#f2d37c"); audio.play("star", 80);
  happy(e.x, e.y - e.r - 6, e.reward, e.say[1], e.boss);
  unlock("first-star"); learn(e, e.type);
  if (e.boss) {
    if (S.bossRef === e) S.bossRef = null; for (const o of S.enemies) if (o.twin && !o.dead && o.type === e.type) S.bossRef = o;
    const idx = BOSS.findIndex((b) => b.id === e.type); if (!SAVE.bosses.includes(idx)) { SAVE.bosses.push(idx); saveNow(); } unlock("boss-1"); if (SAVE.bosses.length >= 5) unlock("boss-all");
    ring(e.x, e.y, 200, 1.6, "#f2d37c", 4); S.hooks.bossDown && S.hooks.bossDown(e);
  }
}

function updateEnemies(dt) {
  S.harmonyTick = 0; let showing = 0;
  for (const e of S.enemies) if (e.bubOn > 0) showing++;
  for (const e of S.enemies) {
    if (e.dead) continue;
    for (const k of ["slow", "lit", "calm"]) if (e[k]) { e[k].t -= dt; if (e[k].t <= 0) e[k] = null; }
    if (e.revealed > 0) e.revealed -= dt; if (e.flash > 0) e.flash -= dt;
    if (e.calm) { e.hp -= e.calm.dps * dt; if (e.hp <= 0) { die(e); continue; } }
    let sp = e.spd * (1 - Math.min(0.65, (e.slow ? e.slow.a : 0) + (e.calm ? 0.05 : 0)));
    e.d += sp * dt; const p = posAt(e.d); e.x = p.x; e.y = p.y; e.wob += dt;
    // thoughts: at most two worries speak at a time
    if (e.bubOn > 0) { e.bubOn -= dt; if (e.bubOn <= 0) { e.bub = rand(9, 18); } } else { e.bub -= dt; if (e.bub <= 0 && showing < 2 && visible(e)) { e.bubOn = e.boss ? 7 : 4.5; showing++; } }
    if (e.boss) {
      e.spawnT -= dt; const def = e.def;
      if (def.spawn && e.spawnT <= 0) { e.spawnT = def.id === "cloud" ? 6 : 9; const pool = LEVELS[S.level].pool, type = def.spawn === "mix" ? pool[Math.floor(Math.random() * pool.length)] : def.spawn; for (let i = 0; i < (def.id === "test" ? 3 : 2); i++) { const m = spawnMinion(type, e.d - 30 - i * 40); } }
      if (def.split && !e.split && e.hp <= e.maxhp * 0.5) { e.split = true; e.hp = e.hp / 2; e.maxhp = e.maxhp / 2; const c = Object.assign({}, e, { id: ++S.uid, d: Math.max(0, e.d - 110), twin: true, slow: null, lit: null, calm: null, say: e.say }); e.twin = true; S.enemies.push(c); popup(e.x, e.y - e.r - 14, "They split in two!", "#e8a5a5", 15); }
    }
    if (e.d >= S.plen) {
      e.dead = true; S.calm = Math.max(0, S.calm - e.leak); S.leaks++; ring(S.nestPos.x, S.nestPos.y, 70, 1, "#f0c890", 3); audio.play("leak", 300);
      const gain = Math.min(e.boss ? 20 : 99, Math.max(1, Math.floor(e.reward * 0.5)));
      happy(S.nestPos.x, S.nestPos.y - 34, gain, e.say[1], false); learn(e, e.type);
      if (e.boss && S.bossRef === e) S.bossRef = null;
    }
  }
  S.enemies = S.enemies.filter((e) => !e.dead);
}
function spawnMinion(type, d) { const e = spawn(type); e.d = Math.max(0, d); const p = posAt(e.d); e.x = p.x; e.y = p.y; return e; }

/* =========================== the flow of a level =========================== */
function levelComplete() {
  S.state = "win"; S.waveActive = false; S.armed = null; S.sel = null; audio.play("win");
  const stars = S.leaks === 0 && S.breathers === 0 ? 3 : S.leaks <= 4 && S.breathers === 0 ? 2 : 1;
  SAVE.rating[S.level] = Math.max(SAVE.rating[S.level] || 0, stars); SAVE.maxLevel = Math.max(SAVE.maxLevel, Math.min(10, S.level + 2)); saveNow();
  if (S.level === 0) unlock("lvl-1"); if (S.level === 4) unlock("lvl-5"); if (S.level === 9) unlock("lvl-10"); if (S.leaks === 0) unlock("quiet");
  S.hooks.win && S.hooks.win({ stars, level: S.level, leaks: S.leaks, breathers: S.breathers, cards: S.newCards.slice() });
}

export function update(rawDt) {
  S.tick++;
  S.now += rawDt;
  for (const k of ["fx", "rings", "beams", "pops", "bubbles", "flyers"]) { const a = S[k]; for (const p of a) { p.l -= rawDt; if (k === "flyers" && p.l <= 0 && !p.paid) { p.paid = true; S.stars += p.v || 0; } if (k === "fx") { p.x += p.vx * rawDt; p.y += p.vy * rawDt; p.vy -= 3 * rawDt; } } S[k] = a.filter((p) => p.l > 0); }
  for (const r of S.rings) r.r += (r.r1 - r.r) * Math.min(1, rawDt * 3.5);
  if (S.paused) return;
  const dt = rawDt * S.speed;
  if (S.state === "intro") { S.introT -= rawDt; if (S.introT <= 0) S.state = "play"; return; }
  if (S.state !== "play") return;
  if (!S.waveActive && S.wave + 1 < S.waves.length && SAVE.opt.auto) { S.nextIn -= dt; if (S.nextIn <= 0) startWave(); }
  if (S.waveActive) {
    S.waveT += dt; while (S.queue.length && S.queue[0].at <= S.waveT) spawn(S.queue.shift().type);
    if (!S.queue.length && !S.enemies.length) { S.waveActive = false; S.stars += 16 + S.level * 5; popup(S.nestPos.x, S.nestPos.y - 40, "Wave calm", "#b7e8d8", 16); if (S.wave + 1 >= S.waves.length) { levelComplete(); return; } S.nextIn = 30; }
  }
  updateEnemies(dt); updateTowers(dt); updateShots(dt);
  if (S.calm <= 0 && S.state === "play") { S.state = "breather"; S.breathers++; S.hooks.breather && S.hooks.breather(); }
}
export function endBreather() { restoreSnapshot(); S.state = "play"; }
