/* Star Striker: drawing. The moving space backdrop, every ship and bullet, the particles and the on-screen display. */
import { S, W, TAU, rand, clamp, lerp } from "./core.js";
import { LEVELS, BOSS, PICK } from "./data.js";
import { glow, planet } from "./sprites.js";

const FONT = '"Rajdhani","Manrope",sans-serif';
let bgY = 0, planetY = 200, planetX = 420, tint = ["#1d5fff", "#00d2ff"];

/* ---------------- the backdrop for a level ---------------- */
export function backdrop(i) {
  const L = LEVELS[i], H = Math.round(S.H), cw = 300, ch = Math.round((H / W) * cw);
  const c = document.createElement("canvas"); c.width = cw; c.height = ch; const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, L.sky[0]); g.addColorStop(0.5, L.sky[1]); g.addColorStop(1, L.sky[0]); x.fillStyle = g; x.fillRect(0, 0, cw, ch);
  for (let n = 0; n < 7; n++) {
    const px = Math.random() * cw, py = Math.random() * ch, r = rand(60, 130), col = L.neb[n % 2];
    for (const oy of [-ch, 0, ch]) { const rg = x.createRadialGradient(px, py + oy, 0, px, py + oy, r); rg.addColorStop(0, col + "55"); rg.addColorStop(1, col + "00"); x.fillStyle = rg; x.fillRect(px - r, py + oy - r, r * 2, r * 2); }
  }
  S.bgImg = c; S.planetImg = planet(L.planet, 190); planetX = rand(110, 490); planetY = -80; tint = L.neb;
  if (!S.stars.length) for (let k = 0; k < 130; k++) S.stars.push({ x: rand(0, W), y: rand(0, 1000), z: k % 3, a: rand(0.35, 1), tw: rand(0, 6) });
}

export function updateBackdrop(dt) {
  const sp = 1 + S.warp * 9;
  bgY = (bgY + 22 * sp * dt) % S.H;
  planetY += 7 * dt * (1 + S.warp * 3); if (planetY > S.H + 220) { planetY = -220; planetX = rand(110, 490); }
  for (const s of S.stars) { s.y += [20, 55, 120][s.z] * sp * dt; if (s.y > S.H + 10) { s.y = -10; s.x = rand(0, W); } }
}

/* ---------------- small helpers ---------------- */
function spr(ctx, s, x, y, rot = 0, sc = 1, alpha = 1, flash = 0) {
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (alpha !== 1) ctx.globalAlpha = alpha;
  const w = s.w * sc, h = s.h * sc; ctx.drawImage(s.c, -w / 2, -h / 2, w, h);
  if (flash > 0) { ctx.globalAlpha = clamp(flash / 0.08, 0, 1) * 0.9; ctx.drawImage(s.f, -w / 2, -h / 2, w, h); }
  ctx.restore();
}
function text(ctx, t, x, y, size, col, align = "left", glowCol, stroke = true) {
  ctx.font = `700 ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = "alphabetic";
  if (glowCol) { ctx.shadowColor = glowCol; ctx.shadowBlur = size * 0.5; }
  if (stroke) { ctx.lineWidth = Math.max(2, size / 7); ctx.strokeStyle = "rgba(4,3,20,.8)"; ctx.strokeText(t, x, y); }
  ctx.fillStyle = col; ctx.fillText(t, x, y); ctx.shadowBlur = 0;
}

/* ---------------- the whole picture ---------------- */
export function render(ctx, cv, scale) {
  const H = S.H, calm = S.calm;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (S.shake > 0 && !calm) ctx.translate(rand(-S.shake, S.shake) * 0.5, rand(-S.shake, S.shake) * 0.5);

  // sky + nebula
  if (S.bgImg) { const h = H; ctx.drawImage(S.bgImg, 0, bgY - h, W, h); ctx.drawImage(S.bgImg, 0, bgY, W, h); } else { ctx.fillStyle = "#06041a"; ctx.fillRect(0, 0, W, H); }
  if (S.planetImg) { ctx.globalAlpha = 0.9; ctx.drawImage(S.planetImg, planetX - S.planetImg.width / 2, planetY - S.planetImg.height / 2); ctx.globalAlpha = 1; }
  // stars (and speed lines when the ship is warping)
  for (const s of S.stars) {
    const tw = 0.6 + 0.4 * Math.sin(S.now * 2 + s.tw), a = s.a * tw, sz = [1.1, 1.6, 2.2][s.z];
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    if (S.warp > 0.15 && !calm) ctx.fillRect(s.x, s.y, sz, sz + S.warp * [14, 34, 70][s.z]); else ctx.fillRect(s.x, s.y, sz, sz);
  }

  const st = S.state;
  if (st === "menu") { menuScene(ctx); } else {
    // laser lanes announced by bosses
    for (const b of S.beams) drawLane(ctx, b);
    // gems and pickups
    for (const g of S.gm) { spr(ctx, S.spr.b.gem, g.x, g.y, S.now * 3 + g.t, 0.8 + Math.sin(S.now * 8 + g.t * 9) * 0.1); }
    for (const p of S.pk) { const s = 1 + Math.sin(p.t * 5) * 0.07; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.55; ctx.drawImage(glow(PICK[p.type].col), p.x - 40, p.y - 40, 80, 80); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; spr(ctx, S.spr.pick[p.type], p.x, p.y, Math.sin(p.t * 2) * 0.12, s); }
    // enemies and bosses
    for (const e of S.en) { if (!e.dead) drawEnemy(ctx, e); }
    // the player's ship and what it shoots
    if (st !== "dying" && st !== "over") drawPlayer(ctx);
    drawPlayerBullets(ctx);
    drawEnemyBullets(ctx);
  }

  // sparks, fire and rings glow
  ctx.globalCompositeOperation = "lighter";
  for (const p of S.fx) {
    const k = clamp(p.l / p.m, 0, 1);
    if (p.k === "s") { const sz = p.s * (0.4 + k * 0.9); ctx.globalAlpha = k; ctx.drawImage(glow(p.c), p.x - sz, p.y - sz, sz * 2, sz * 2); }
    else if (p.k === "fire") { const sz = p.s * (1.5 - k * 0.7); ctx.globalAlpha = k * 0.9; ctx.drawImage(glow(p.c), p.x - sz, p.y - sz, sz * 2, sz * 2); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  for (const p of S.fx) {
    const k = clamp(p.l / p.m, 0, 1);
    if (p.k === "smoke") { const sz = p.s * (1.8 - k); ctx.globalAlpha = k * 0.35; ctx.drawImage(glow("#5a4a44"), p.x - sz, p.y - sz, sz * 2, sz * 2); }
    else if (p.k === "deb") { ctx.globalAlpha = k; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
  }
  ctx.globalAlpha = 1;
  for (const r of S.rings) { const k = clamp(r.l / r.m, 0, 1); ctx.globalAlpha = k; ctx.strokeStyle = r.c; ctx.lineWidth = r.w * k + 1; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
  for (const p of S.pops) { const k = clamp(p.l / p.m, 0, 1); ctx.globalAlpha = Math.min(1, k * 2.2); text(ctx, p.t, p.x, p.y, p.s * (1 + (1 - k) * 0.15), p.c, "center", p.c); }
  ctx.globalAlpha = 1;

  if (st !== "menu") { drawHud(ctx); banners(ctx); }
  // red hit glow and white flashes (soft, never a strobe)
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (S.vig > 0 && !calm) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75); g.addColorStop(0, "rgba(255,40,60,0)"); g.addColorStop(1, `rgba(255,40,60,${0.55 * S.vig})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (S.flash > 0 && !calm) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.6, S.flash)})`; ctx.fillRect(0, 0, W, H); }
}

function menuScene(ctx) {
  const t = S.now;
  for (let i = 0; i < 5; i++) { const x = 80 + i * 110 + Math.sin(t * 0.8 + i) * 18, y = 210 + Math.sin(t * 1.3 + i * 1.7) * 26 + (i % 2) * 70; spr(ctx, S.spr.enemy[["scout", "zig", "gunner", "weaver", "kamikaze"][i]], x, y, Math.sin(t + i) * 0.1, 1); }
  spr(ctx, S.spr.player, W / 2 + Math.sin(t * 0.9) * 30, S.H - 160 + Math.sin(t * 2) * 6, Math.cos(t * 0.9) * 0.1, 1);
}

function drawLane(ctx, b) {
  const warn = b.t < b.warn, k = warn ? b.t / b.warn : 1;
  if (warn) { ctx.fillStyle = `rgba(255,60,90,${0.12 + 0.12 * Math.sin(b.t * 18)})`; ctx.fillRect(b.x - b.w / 2, 0, b.w, S.H); ctx.fillStyle = `rgba(255,120,140,${0.5 * k})`; ctx.fillRect(b.x - 2, 0, 4, S.H); return; }
  ctx.globalCompositeOperation = "lighter"; const g = ctx.createLinearGradient(b.x - b.w / 2, 0, b.x + b.w / 2, 0);
  g.addColorStop(0, "rgba(255,60,200,0)"); g.addColorStop(0.35, "rgba(255,120,230,.7)"); g.addColorStop(0.5, "#fff"); g.addColorStop(0.65, "rgba(255,120,230,.7)"); g.addColorStop(1, "rgba(255,60,200,0)");
  ctx.fillStyle = g; ctx.fillRect(b.x - b.w / 2, 0, b.w, S.H); ctx.globalCompositeOperation = "source-over";
}

function drawEnemy(ctx, e) {
  if (e.boss) {
    const s = S.spr.boss[e.bi], pulse = 1 + Math.sin(e.t * 3) * 0.015, sc = (e.r * 2.5 / 200) * pulse * 1.0;
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.35 + 0.15 * Math.sin(e.t * 4); ctx.drawImage(glow(e.col), e.x - e.r * 1.7, e.y - e.r * 1.4, e.r * 3.4, e.r * 2.8); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    spr(ctx, s, e.x, e.y, 0, sc * 1.0, e.inv && e.enter > 0 ? 0.65 + 0.35 * Math.sin(e.t * 30) : 1, e.flash);
    return;
  }
  let s = e.type === "rock" ? S.spr.rock[e.sprIdx] : S.spr.enemy[e.type], rot = 0, sc = 1, alpha = 1;
  if (e.type === "rock") { rot = e.rot; sc = e.sc || 1; }
  if (e.type === "spinner") rot = e.rot;
  if (e.type === "kamikaze") { if (e.state === 2) rot = Math.atan2(e.vy2, e.vx) - Math.PI / 2; else if (e.state === 1) { sc = 1 + Math.sin(e.t * 40) * 0.12; } }
  if (e.ghost) alpha = 0.22 + 0.1 * Math.sin(e.t * 9);
  else if (e.type === "kamikaze" && e.state === 1 && Math.floor(e.t * 14) % 2 === 0) alpha = 0.7;
  if (e.type === "carrier" || e.type === "tank") sc = 1 + Math.sin(e.t * 3) * 0.015;
  const col = (ENEMY_COL[e.type]);
  if (col && !e.ghost) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.22; ctx.drawImage(glow(col), e.x - e.r * 1.5, e.y - e.r * 1.5, e.r * 3, e.r * 3); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
  spr(ctx, s, e.x, e.y, rot, sc, alpha, e.flash);
  if (e.maxhp > 8 && e.hp < e.maxhp) { const w = e.r * 1.6; ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w, 5); ctx.fillStyle = "#5cff9d"; ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w * (e.hp / e.maxhp), 5); }
}
const ENEMY_COL = { scout: "#5cff9d", zig: "#ffe14d", bee: "#ff7ad9", gunner: "#5ab8ff", spinner: "#ff9a3c", tank: "#9fb0c8", kamikaze: "#ff4d5e", weaver: "#b17bff", layer: "#7dffcf", phantom: "#7ef2ff", splitter: "#ffb35c", carrier: "#ff7a59" };

function drawPlayer(ctx) {
  const P = S.P, blink = P.inv > 0 && Math.floor(S.now * 14) % 2 === 0;
  // engine flame
  ctx.globalCompositeOperation = "lighter"; const fl = 1 + Math.sin(S.now * 40) * 0.18;
  for (const dx of [-11, 11]) { ctx.globalAlpha = 0.9; ctx.drawImage(glow("#4dc9ff"), P.x + dx - 13, P.y + 28, 26, 40 * fl); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  // the beam weapon
  if (P.beam) {
    const w = P.beamW || 22, x0 = P.x - w / 2, y1 = P.y - 38; ctx.globalCompositeOperation = "lighter";
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0), h = (S.now * 360) % 360;
    g.addColorStop(0, `hsla(${h},100%,60%,0)`); g.addColorStop(0.25, `hsla(${h},100%,65%,.8)`); g.addColorStop(0.5, "#fff"); g.addColorStop(0.75, `hsla(${(h + 120) % 360},100%,65%,.8)`); g.addColorStop(1, `hsla(${(h + 200) % 360},100%,60%,0)`);
    ctx.fillStyle = g; ctx.fillRect(x0, 0, w, y1); ctx.globalAlpha = 0.9; ctx.drawImage(glow("#ffffff"), P.x - 30, y1 - 24, 60, 60); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  if (!blink) spr(ctx, S.spr.player, P.x, P.y, clamp(P.vx / 1600, -0.28, 0.28), 1);
  if (P.drone > 0) for (const s of [0, Math.PI]) { const a = S.now * 3 + s; spr(ctx, S.spr.b.drone, P.x + Math.cos(a) * 46, P.y + Math.sin(a) * 14, 0, 0.9); }
  if (P.shield > 0) {
    const a = P.shT < 3 && Math.floor(S.now * 8) % 2 ? 0.3 : 0.85;
    ctx.save(); ctx.translate(P.x, P.y); ctx.globalAlpha = a; ctx.lineWidth = 3; ctx.strokeStyle = "#8fd0ff"; ctx.shadowColor = "#4da3ff"; ctx.shadowBlur = 14;
    for (let i = 0; i < P.shield; i++) { ctx.beginPath(); ctx.arc(0, 0, 46 + i * 5, S.now * 2 + i * 2, S.now * 2 + i * 2 + 4.2); ctx.stroke(); }
    ctx.globalAlpha = 0.12; ctx.fillStyle = "#6bb5ff"; ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.fill(); ctx.restore();
  }
}

function drawPlayerBullets(ctx) {
  for (const b of S.pb) {
    const s = S.spr.b[b.k]; if (!s) continue;
    const glowCol = b.k === "laser" ? "#4dd2ff" : b.k === "missile" ? "#ff8a4d" : b.k === "ball" ? "#ffffff" : "#ffe66b";
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5; ctx.drawImage(glow(glowCol), b.x - 22, b.y - 22, 44, 44); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    spr(ctx, s, b.x, b.y, b.k === "ball" ? S.now * 8 : b.k === "nova" ? 0 : Math.atan2(b.vx, -b.vy), b.k === "ball" ? 1 : 1);
  }
}
function drawEnemyBullets(ctx) {
  for (const b of S.eb) {
    const s = S.spr.b[b.k === "missile" ? "missile" : b.k]; if (!s) continue;
    const rot = b.k === "needle" ? b.a - Math.PI / 2 : b.k === "missile" ? b.a + Math.PI / 2 : b.k === "mine" ? S.now * 3 : 0, flash = b.k === "mine" && Math.floor(b.t * 8) % 2 === 0;
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.45; ctx.drawImage(glow(b.k === "needle" ? "#ff7ad9" : b.k === "big" ? "#b17bff" : "#ff4d7a"), b.x - 24, b.y - 24, 48, 48); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    spr(ctx, s, b.x, b.y, rot, b.k === "mine" ? 1 : 1, 1, flash ? 0.08 : 0);
  }
}

/* ---------------- the display ---------------- */
function drawHud(ctx) {
  const P = S.P, H = S.H;
  text(ctx, "SCORE", 16, 24, 14, "#4dd2ff", "left", null, false);
  text(ctx, Math.round(S.shown).toLocaleString("en-GB"), 16, 56, 36, "#fff", "left", "#4dd2ff");
  for (let i = 0; i < Math.max(S.lives, 0); i++) { ctx.font = "16px sans-serif"; ctx.textAlign = "left"; ctx.fillText("❤️", 14 + i * 21, 82); }
  text(ctx, `LEVEL ${S.level + 1}${S.practice ? " · PRACTICE" : ""}`, 16, 110, 15, "#ffcf4d", "left", null, false);
  // active power-ups as little rings that run down
  const chips = []; if (P.weapon) chips.push([P.weapon, P.wT / 16, P.tier]); [["rapid", 12], ["shield", 14], ["magnet", 14], ["freeze", 5], ["x2", 15], ["drone", 15]].forEach(([k, m]) => { const v = k === "shield" ? P.shT : P[k]; if (v > 0) chips.push([k, v / m]); });
  chips.forEach(([k, frac, tier], i) => {
    const x = 32 + i * 40, y = S.boss ? 184 : 142; ctx.fillStyle = "rgba(10,8,40,.6)"; ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.fill();
    ctx.strokeStyle = PICK[k].col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(frac, 0, 1)); ctx.stroke();
    ctx.font = "15px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.fillText(PICK[k].e, x, y + 1); ctx.textBaseline = "alphabetic";
    if (tier > 1) text(ctx, "L" + tier, x + 12, y + 18, 12, "#ffe14d", "center", null, true);
  });
  // bombs and the combo along the bottom
  ctx.font = "20px sans-serif"; ctx.textAlign = "left"; for (let i = 0; i < S.bombs; i++) ctx.fillText("💣", 14 + i * 26, H - 18);
  if (S.mult > 1) {
    const k = clamp(S.comboT / 2.2, 0, 1), pulse = 1 + Math.max(0, S.comboT - 2.0) * 1.2;
    text(ctx, "x" + S.mult, W / 2, H - 34, 46 * pulse, "#ffe14d", "center", "#ff9a3c");
    ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(W / 2 - 60, H - 24, 120, 6); ctx.fillStyle = "#ffe14d"; ctx.fillRect(W / 2 - 60, H - 24, 120 * k, 6);
    text(ctx, "COMBO", W / 2, H - 76, 13, "#fff", "center", null, false);
  }
  // boss health
  const b = S.boss; if (b && !b.dead) {
    const w = W * 0.86, x = W / 2 - w / 2, y = 128, k = clamp(b.hp / b.maxhp, 0, 1);
    text(ctx, b.name, W / 2, y - 8, 18, b.col, "center", b.col);
    ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(x - 2, y - 2, w + 4, 14); const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, "#ff5d5d"); g.addColorStop(1, "#ffcf4d"); ctx.fillStyle = g; ctx.fillRect(x, y, w * k, 10);
    ctx.fillStyle = "rgba(255,255,255,.5)"; for (const m of [0.28, 0.6]) ctx.fillRect(x + w * m - 1, y - 2, 2, 14);
  }
}

function banners(ctx) {
  const H = S.H, st = S.state;
  if (st === "intro") {
    const t = S.intro, a = Math.min(1, (2.8 - t) * 3, t * 2.2), L = LEVELS[S.level], sl = (1 - clamp(a, 0, 1));
    ctx.globalAlpha = clamp(a, 0, 1);
    text(ctx, `LEVEL ${S.level + 1}`, W / 2 - sl * 80, H * 0.36, 78, "#fff", "center", "#ff7ad9");
    text(ctx, L.name.toUpperCase(), W / 2 + sl * 80, H * 0.36 + 52, 36, "#ffcf4d", "center", "#ff9a3c");
    text(ctx, L.tag, W / 2, H * 0.36 + 92, 18, "#cfe9ff", "center", null, false);
    if (L.boss != null) text(ctx, "⚠ BOSS AT THE END", W / 2, H * 0.36 + 126, 18, "#ff7a8a", "center", null, false);
    ctx.globalAlpha = 1;
  } else if (st === "warn") {
    const on = S.calm ? true : Math.floor(S.now * 3) % 2 === 0, off = (S.now * 60) % 80;
    ctx.save(); ctx.globalAlpha = 0.9;
    for (const y of [H * 0.22, H * 0.5]) { ctx.fillStyle = "rgba(10,0,5,.7)"; ctx.fillRect(0, y, W, 46); ctx.save(); ctx.beginPath(); ctx.rect(0, y, W, 46); ctx.clip(); ctx.fillStyle = "#ff2e4d"; for (let x = -80 + off; x < W + 80; x += 80) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40, y); ctx.lineTo(x + 0, y + 46); ctx.lineTo(x - 40, y + 46); ctx.fill(); } ctx.restore(); }
    ctx.restore();
    if (on) text(ctx, "WARNING", W / 2, H * 0.36 + 26, 80, "#fff", "center", "#ff2e4d");
    text(ctx, BOSS[LEVELS[S.level].boss].name, W / 2, H * 0.36 + 70, 28, "#ffcf4d", "center", "#ff9a3c");
    text(ctx, "A huge ship is approaching", W / 2, H * 0.36 + 102, 16, "#cfe9ff", "center", null, false);
  } else if (st === "clear") {
    text(ctx, "LEVEL CLEAR!", W / 2, H * 0.4, 66, "#ffe14d", "center", "#ff9a3c");
  }
}
