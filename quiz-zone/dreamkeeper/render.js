/* Dreamkeeper: drawing. A soft night garden: slow, low-contrast, warm, and easy on the eyes. Nothing flashes. */
import { S, SAVE, W, TAU, clamp } from "./core.js";
import { TOWER, TILE, COLS, ROWS, GY, LEVELS, BOSS } from "./data.js";
import { glow } from "./sprites.js";
import { canBuild } from "./game.js";

const FONT = 'Manrope, "Segoe UI", sans-serif';
const INK = "#e9e0cf";
const flies = Array.from({ length: 14 }, (_, i) => ({ x: (i * 97) % 600, y: 90 + ((i * 151) % 700), p: i * 1.7, s: 0.4 + (i % 4) * 0.12 }));

function text(ctx, t, x, y, size, col = INK, align = "left", weight = 700, outline = true) {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = "alphabetic";
  if (outline) { ctx.lineWidth = Math.max(2, size / 6); ctx.strokeStyle = "rgba(14,10,36,.7)"; ctx.lineJoin = "round"; ctx.strokeText(t, x, y); }
  ctx.fillStyle = col; ctx.fillText(t, x, y);
}
function wrap(ctx, t, maxW) {
  const words = t.split(" "), lines = []; let cur = "";
  for (const w of words) { const test = cur ? cur + " " + w : w; if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; }
  if (cur) lines.push(cur); return lines;
}
function bubble(ctx, x, y, t, fill, ink, alpha, small) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.font = `700 ${small ? 21 : 22}px ${FONT}`;
  const lines = wrap(ctx, t, 230), w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 28, h = lines.length * 28 + 20;
  let bx = clamp(x - w / 2, 6, W - w - 6), by = Math.max(GY - 20, y - h);
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(bx, by, w, h, 16); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 8, by + h - 1); ctx.lineTo(x, by + h + 9); ctx.lineTo(x + 8, by + h - 1); ctx.fill();
  ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 28 + i * 28)); ctx.restore();
}

export function render(ctx, cv, scale) {
  const H = S.H, now = S.now, st = S.state;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (S.garden) ctx.drawImage(S.garden, 0, 0, W, H); else { ctx.fillStyle = "#1b1740"; ctx.fillRect(0, 0, W, H); }
  const L = LEVELS[clamp(S.level, 0, 9)];

  // a quiet moon and twinkling stars (very slow)
  ctx.fillStyle = "rgba(240,230,200,.9)"; ctx.beginPath(); ctx.arc(520, 36, 15, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.25; ctx.drawImage(glow("#f2e2b0"), 470, -14, 100, 100); ctx.globalAlpha = 1;
  for (let i = 0; i < 22; i++) { const a = 0.18 + 0.18 * Math.sin(now * 0.5 + i * 1.9); ctx.fillStyle = `rgba(240,232,210,${a})`; ctx.fillRect((i * 83) % 590 + 4, (i * 37) % 60 + 4, 1.8, 1.8); }
  // drifting fireflies
  ctx.globalCompositeOperation = "lighter";
  const rm = S.reduced; for (const f of flies) { const x = f.x + (rm ? 0 : Math.sin(now * 0.3 * f.s + f.p) * 22), y = f.y + (rm ? 0 : Math.cos(now * 0.25 * f.s + f.p * 1.3) * 16), a = 0.35 + 0.35 * Math.sin(now * 0.8 + f.p); ctx.globalAlpha = a * 0.7; ctx.drawImage(glow("#f2d37c"), x - 8, y - 8, 16, 16); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";

  if (st === "menu") { drawNestAndGate(ctx, now); return; }
  drawNestAndGate(ctx, now);

  // places where a helper can go (only while one is picked)
  if (S.armed) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (canBuild(c, r)) { const p = S.reduced ? 0.09 : 0.07 + 0.04 * Math.sin(now * 1.4 + c + r); ctx.fillStyle = `rgba(242,211,124,${p})`; ctx.beginPath(); ctx.roundRect(c * TILE + 8, GY + r * TILE + 8, TILE - 16, TILE - 16, 16); ctx.fill(); }
    const h = S.tileHover; if (h && canBuild(h[0], h[1])) {
      const t = TOWER[S.armed], cx = h[0] * TILE + TILE / 2, cy = GY + h[1] * TILE + TILE / 2;
      ctx.strokeStyle = "rgba(242,228,190,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, t.range[0], 0, TAU); ctx.stroke(); ctx.fillStyle = "rgba(242,228,190,.05)"; ctx.fill();
      const sp = S.spr.tower[S.armed][0]; ctx.globalAlpha = 0.6; ctx.drawImage(sp.c, cx - 50, cy - 50, 100, 100); ctx.globalAlpha = 1;
    }
  }
  // buddies: blankets show who they warm
  for (const b of S.towers) if (b.id === "blanket") { ctx.strokeStyle = "rgba(240,180,170,.18)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]); for (const t of S.towers) if (t !== b && Math.hypot(t.x - b.x, t.y - b.y) <= TOWER.blanket.range[b.lv]) { ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke(); } ctx.setLineDash([]); }
  // the helpers
  for (const t of S.towers) {
    const sel = S.sel === t, born = clamp((now - t.born) / 0.6, 0, 1), sc = (0.7 + 0.3 * (1 - Math.pow(1 - born, 3))) * (1 + Math.sin(t.anim * 1.4) * 0.012 + (t.pulse * 0.05));
    if (sel) { const r = TOWER[t.id].range[t.lv]; ctx.strokeStyle = "rgba(242,228,190,.4)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, TAU); ctx.stroke(); ctx.fillStyle = "rgba(242,228,190,.05)"; ctx.fill(); }
    ctx.save(); ctx.translate(t.x, t.y); ctx.scale(sc, sc); if (t.gloom < 1) ctx.globalAlpha = 0.7; const sp = S.spr.tower[t.id][t.lv]; ctx.drawImage(sp.c, -50, -50, 100, 100); ctx.restore();
    if (t.buff > 0) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5; ctx.drawImage(glow("#f0b0a0"), t.x - 14, t.y - 46, 28, 28); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
  }
  // the worries
  const sorted = S.enemies.slice().sort((a, b) => a.y - b.y);
  for (const e of sorted) drawWorry(ctx, e, now);
  // shots, beams
  ctx.globalCompositeOperation = "lighter";
  for (const s of S.shots) { if (s.delay > 0) continue; let y = s.y; if (s.arc) { const tot = Math.hypot(s.tx - s.tower.x, s.ty - s.tower.y) || 1, d0 = Math.hypot(s.x - s.tower.x, s.y - s.tower.y), p = clamp(d0 / tot, 0, 1); y -= Math.sin(p * Math.PI) * 38; }
    ctx.globalAlpha = 0.9; const sz = s.k === "seed" ? 18 : s.k === "mist" ? 22 : 16; ctx.drawImage(glow(s.col), s.x - sz / 2, y - sz / 2, sz, sz); }
  for (const b of S.beams) { const k = clamp(b.l / b.m, 0, 1); ctx.globalAlpha = k * 0.8; ctx.strokeStyle = b.c; ctx.lineWidth = b.w * k + 1; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke(); }
  for (const p of S.fx) { const k = clamp(p.l / p.m, 0, 1), sz = p.s * (0.5 + k * 0.7); ctx.globalAlpha = Math.min(1, k * 1.4) * 0.85; ctx.drawImage(glow(p.c), p.x - sz, p.y - sz, sz * 2, sz * 2); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  for (const r of S.rings) { const k = clamp(r.l / r.m, 0, 1); ctx.globalAlpha = k * 0.55; ctx.strokeStyle = r.c; ctx.lineWidth = r.w * k + 0.5; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // thoughts: the worried one, then the kinder one
  for (const e of S.enemies) if (e.bubOn > 0 && (!e.hidden || e.revealed > 0)) bubble(ctx, e.x, e.y - e.r - 14, e.say[0], "rgba(226,218,238,.9)", "#3b3354", clamp(Math.min(e.bubOn, 4.5 - (4.5 - e.bubOn)) * 1.2, 0, 1) * clamp(e.bubOn * 1.5, 0, 1));
  for (const b of S.bubbles) bubble(ctx, b.x, b.y, "💛 " + b.text, "rgba(255,236,204,.97)", "#4a3220", clamp(b.l / 0.8, 0, 1) * clamp((b.m - b.l) * 2.5 + 0.2, 0, 1), true);
  for (const p of S.pops) { const k = clamp(p.l / p.m, 0, 1); ctx.globalAlpha = Math.min(1, k * 2); text(ctx, p.t, p.x, p.y - (1 - k) * 26, Math.round(p.s * 1.4), p.c, "center"); } ctx.globalAlpha = 1;
  // stars that float up into the counter
  for (const f of S.flyers) { const k = 1 - f.l / f.m, x = f.x + (30 - f.x) * k * k, y = f.y + (36 - f.y) * k * k; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1 - k * 0.5; ctx.drawImage(glow("#ffd7a0"), x - 16, y - 16, 32, 32); ctx.globalCompositeOperation = "source-over"; } ctx.globalAlpha = 1;

  drawHud(ctx, L);
  // soft edges
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.78); vg.addColorStop(0, "rgba(10,8,30,0)"); vg.addColorStop(1, "rgba(10,8,30,.35)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (st === "intro") { const a = clamp(Math.min(3.6 - S.introT, S.introT) * 1.2, 0, 1); ctx.globalAlpha = a; text(ctx, `Level ${S.level + 1}`, W / 2, H * 0.34, 34, "#e3d9f5", "center", 700); text(ctx, L.name, W / 2, H * 0.34 + 56, 50, INK, "center", 800); text(ctx, L.tag, W / 2, H * 0.34 + 98, 22, "#e3d9f5", "center", 600); if (L.boss != null) text(ctx, "A big worry waits at the end", W / 2, H * 0.34 + 136, 20, "#f0c0b0", "center", 700); ctx.globalAlpha = 1; }
}

function drawNestAndGate(ctx, now) {
  const n = S.nestPos; if (!S.pts.length) return;
  ctx.drawImage(S.spr.nest.c, n.x - 55, n.y - 62, 110, 110);
  const g = S.pts[0], gx = clamp(g.x, 40, W - 40), gy = clamp(g.y, GY + 30, GY + ROWS * TILE - 30);
  ctx.globalAlpha = 0.5 + 0.1 * Math.sin(now * 0.8); ctx.drawImage(glow("#6a5a9c"), gx - 60, gy - 60, 120, 120); ctx.globalAlpha = 1;
}

function drawWorry(ctx, e, now) {
  const hiddenNow = e.hidden && !(e.revealed > 0) && !(e.d > S.plen * 0.85);
  const spr = e.boss ? S.spr.boss[e.type] : S.spr.worry[e.type]; if (!spr) return;
  const bob = Math.sin(e.wob * 1.6) * 2.4 + (e.type === "flutter" ? Math.sin(e.wob * 5) * 2 : 0), sway = e.type === "flutter" ? Math.sin(e.wob * 2.2) * 6 : 0;
  let alpha = hiddenNow ? 0.1 + 0.05 * Math.sin(now * 2 + e.id) : e.hidden ? 0.9 : 1;
  const sc = 1 + Math.sin(e.wob * 1.1) * 0.025, x = e.x + sway, y = e.y + bob;
  if (!hiddenNow) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.16; const gs = e.r * 3; ctx.drawImage(glow(e.col), x - gs / 2, y - gs / 2, gs, gs); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
  if (e.aura) { ctx.strokeStyle = "rgba(140,140,170,.18)"; ctx.lineWidth = 2; ctx.setLineDash([4, 8]); ctx.beginPath(); ctx.arc(x, y, e.aura * (1 + Math.sin(now) * 0.02), 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(sc, sc); ctx.drawImage(spr.c, -spr.w / 2, -spr.h / 2, spr.w, spr.h); if (e.flash > 0) { ctx.globalAlpha = alpha * 0.25; ctx.globalCompositeOperation = "lighter"; ctx.drawImage(spr.c, -spr.w / 2, -spr.h / 2, spr.w, spr.h); } ctx.restore(); ctx.globalAlpha = 1;
  if (hiddenNow) return;
  // what is affecting it, shown softly
  if (e.slow) { ctx.strokeStyle = "rgba(160,225,205,.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, e.r + 6, 0, TAU * 0.7); ctx.stroke(); }
  if (e.lit) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.3; const gs = e.r * 3.4; ctx.drawImage(glow("#f6c890"), x - gs / 2, y - gs / 2, gs, gs); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
  if (e.calm) { ctx.fillStyle = "rgba(200,178,240,.8)"; for (let i = 0; i < 3; i++) { const a = now * 1.5 + i * 2.1; ctx.beginPath(); ctx.arc(x + Math.cos(a) * (e.r + 5), y + Math.sin(a) * (e.r + 5), 2.4, 0, TAU); ctx.fill(); } }
  if (e.hp < e.maxhp) { const w = Math.max(26, e.r * 1.7); ctx.fillStyle = "rgba(14,10,36,.5)"; ctx.beginPath(); ctx.roundRect(x - w / 2, y - e.r - 12, w, 5, 3); ctx.fill(); ctx.fillStyle = "rgba(180,225,200,.9)"; ctx.beginPath(); ctx.roundRect(x - w / 2, y - e.r - 12, w * clamp(e.hp / e.maxhp, 0.02, 1), 5, 3); ctx.fill(); }
}

function drawHud(ctx, L) {
  const wave = clamp(S.wave + 1, 0, S.waves.length);
  text(ctx, "⭐ " + Math.round(S.stars), 14, 38, 30, "#f2d37c");
  // the calm meter: when it runs out the garden just takes a breather
  const w = 200, k = clamp(S.calm / 100, 0, 1);
  ctx.fillStyle = "rgba(14,10,36,.6)"; ctx.beginPath(); ctx.roundRect(14, 48, w, 15, 8); ctx.fill(); ctx.fillStyle = k > 0.35 ? "rgba(168,214,196,.95)" : "rgba(232,176,150,.95)"; ctx.beginPath(); ctx.roundRect(14, 48, Math.max(12, w * k), 15, 8); ctx.fill();
  text(ctx, "Calm", 22 + w, 62, 17, "#e3d9f5", "left", 700, false);
  text(ctx, `Wave ${Math.max(1, wave)} of ${S.waves.length}`, 14, 88, 18, "#e3d9f5", "left", 700, false);
  // the big worry's bar
  const b = S.bossRef; if (b && !b.dead) { const bw = 320, bx = W / 2 - bw / 2, by = GY + 26; text(ctx, b.def.name, W / 2, by - 6, 19, b.col, "center", 800); ctx.fillStyle = "rgba(14,10,36,.65)"; ctx.beginPath(); ctx.roundRect(bx, by, bw, 11, 6); ctx.fill(); ctx.fillStyle = b.col; ctx.beginPath(); ctx.roundRect(bx, by, Math.max(10, bw * clamp(b.hp / b.maxhp, 0, 1)), 11, 6); ctx.fill(); }
}
