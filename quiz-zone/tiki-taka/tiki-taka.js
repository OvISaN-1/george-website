/* ================================================================
   TIKI-TAKA: the page side
   The football itself (ball, passing, defenders, keeper, scoring) is
   written in Rust: see games/tiki-taka/src/lib.rs. It is compiled to
   tiki_taka.wasm. This file only:
     1. loads that engine,
     2. turns finger/mouse/keyboard into calls on it,
     3. draws what the engine says is happening,
     4. plays the sounds and saves the score.
   ================================================================ */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);

  const SUPABASE_URL = "https://hucnucpfyjltlhmvprso.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Y251Y3BmeWpsdGxobXZwcnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDgzNjEsImV4cCI6MjEwMzU4NDM2MX0.DSjLCkiUWB47wVd4wnW_2RvWFoISbH80JI9ukB1bBdg";
  const GAME_ID = "tiki-taka";
  const LEADERBOARD_SIZE = 10;
  const BEST_KEY = "gz_tikitaka_best";
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Must match the numbers in lib.rs
  const W = 680, H = 800, GOAL_L = 265, GOAL_R = 415, GOAL_C = 340;
  const I = { PHASE: 0, SCORE: 1, MATCH_T: 2, NO: 3, CHAIN: 4, RESULT: 5, PHASE_T: 6, TIME: 7, GOALS: 8, OWNER: 9, N_ATT: 10, N_DEF: 11,
    AIM: 12, AIM_LEN: 13, AIM_DX: 14, AIM_DY: 15, AIM_TARGET: 16, AIM_EX: 17, AIM_EY: 18, INTRO: 19, SHIELD: 20, SHOT: 21,
    BEST_CHAIN: 22, PASSES: 23, PRESSURE: 24, BX: 25, BY: 26, BVX: 27, BVY: 28, RECEIVER: 29, CAN_SHOOT: 30, BONUS: 31, LEVEL: 32,
    METER: 33, FREEZE: 34, CINE_T: 35, SKILL: 36, CINE_KIND: 37, SUPER_SHOT: 38, SLOW_LEFT: 39,
    AIM_SAFE: 40, AIM_KIND: 41, PASS_KIND: 42, BALL_Z: 43, SHOT_MODE: 44, POWER: 45, SHOT_X: 46, SHOT_SLOW: 47, TEAM: 48, LOB_FRAC: 49,
    SHOTS: 50, SAVES: 51, TURNOVERS: 52, TIME_UP: 53, LOB_EX: 54, LOB_EY: 55, P0: 60, STRIDE: 10 };
  const PH = { PLAY: 1, RESULT: 2, OVER: 3, CINE: 4 };
  const R = { NONE: 0, GOAL: 1, SAVED: 2, MISS: 3, BLOCKED: 4, TACKLED: 5, POST: 6, OUT: 7 };
  const E = { KICK: 1, PASS: 2, SHOT: 3, TACKLE: 4, SAVE: 5, POST: 6, GOAL: 7, MISS: 8, BLOCK: 9, START: 11, OVER: 12, SUPER: 13, FREEZE: 14, METER_FULL: 15 };
  const MATCH_SECS = 180;
  const SWEET = 0.80, SWEET_HALF = 0.10, CHARGE_SECS = 0.9;   // the shot-power zone (see lib.rs)
  // The teams, easiest first. The order and numbers match TEAMS in lib.rs.
  const TEAMS = [
    { name: "Sunday Starters", style: "Friendly and slow. A good warm-up.", shirt: "#ffd23f", trim: "#7a5a00", keeper: "#7f5cff", dots: 1 },
    { name: "Park Rovers", style: "Honest hard workers.", shirt: "#4db3ff", trim: "#124a7a", keeper: "#ff8a2a", dots: 2 },
    { name: "Red Lane United", style: "Press high and win the ball back fast.", shirt: "#ffffff", trim: "#d7102b", keeper: "#1f9d55", dots: 3 },
    { name: "Stonewall FC", style: "Park the bus. Five defenders in the way.", shirt: "#6c7a89", trim: "#222a33", keeper: "#ffd23f", dots: 4 },
    { name: "Quickfoot City", style: "Lightning quick. Pass fast!", shirt: "#7fe0d0", trim: "#0c5a4f", keeper: "#ff5a6e", dots: 4 },
    { name: "Galaxy Giants", style: "The best. A keeper who reads your shot.", shirt: "#9d5cff", trim: "#2a1260", keeper: "#00d1ff", dots: 5 },
  ];
  const LADDER_KEY = "gz_tikitaka_ladder";
  const TOP = 46;                // room above the goal line to show the net
  const SIDE = 64;               // room each side of the pitch for the supporters
  const CW = W + 2 * SIDE;       // full canvas width in pitch units
  const DRAG_K = 1.5;            // finger distance on the pitch x this = how far the ball goes

  /* ---------------- George's look, sound ---------------- */
  const look = () => (window.GL ? GL.get() : { number: 10, hairColour: "brown" });
  const kitId = () => (window.GL ? GL.pick("kit", "home") : "home");
  const kit = () => GK.KITS[kitId()] || GK.KITS.home;
  const hairColour = () => {
    const l = look();
    const c = (window.GL ? GL.HAIR_COLOURS : []).find((x) => x.id === l.hairColour);
    return c ? c.base : "#a57d52";
  };
  const SOUND = GK.createSound("gz_tikitaka_sound");
  let soundOn = SOUND.isOn();
  const sfx = SOUND.sfx;
  const MUSIC = GZMusic.attach(SOUND);

  /* ---- extra sound effects, made from scratch with the Web Audio API ---- */
  function tone(freq, dur, type, vol, when, to) {
    const a = soundOn ? SOUND.wake() : null; if (!a) return;
    const t0 = a.currentTime + (when || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(vol || 0.12, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, f0, when, f1, q) {
    const a = soundOn ? SOUND.wake() : null; if (!a) return;
    const t0 = a.currentTime + (when || 0), len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "bandpass"; f.Q.value = q || 0.8; f.frequency.setValueAtTime(f0, t0);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = a.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(a.destination); src.start(t0);
  }
  const snd = {
    pass(chain) { const k = Math.min(chain, 6); tone(520 + k * 70, 0.09, "triangle", 0.15); tone(780 + k * 100, 0.12, "sine", 0.1, 0.07); },
    combo(chain) { const base = 392; [0, 4, 7, 12, 16].slice(0, Math.min(5, chain)).forEach((st, i) => tone(base * Math.pow(2, st / 12), 0.16, "triangle", 0.12, i * 0.07)); },
    whoosh() { noise(0.4, 0.3, 300, 0, 3200, 0.5); },
    slap() { noise(0.12, 0.45, 1400, 0, 500); tone(240, 0.12, "square", 0.08, 0, 90); },
    clang() { [1568, 2349, 3136, 4186].forEach((f, i) => tone(f, 0.5 - i * 0.07, "triangle", 0.1 - i * 0.015)); noise(0.06, 0.3, 4000); },
    ooh() { tone(620, 0.7, "sine", 0.1, 0, 300); tone(630, 0.7, "triangle", 0.05, 0.02, 310); noise(0.7, 0.12, 500); },
    thump() { tone(120, 0.18, "sine", 0.4, 0, 45); noise(0.1, 0.25, 250); },
    charge() { tone(300, 0.7, "sawtooth", 0.06, 0, 1500); tone(450, 0.7, "triangle", 0.08, 0.05, 2200); },
    ready() { [880, 1175, 1568].forEach((f, i) => tone(f, 0.14, "triangle", 0.12, i * 0.08)); },
    rocket() { noise(1.1, 0.4, 200, 0, 4000, 0.4); tone(180, 1.0, "sawtooth", 0.1, 0, 1800); tone(90, 0.5, "square", 0.1); for (let i = 0; i < 5; i++) noise(0.05, 0.4, 3000 + i * 400, 0.2 + i * 0.13); },
    timestop() { tone(1100, 0.8, "sine", 0.14, 0, 70); tone(550, 0.8, "triangle", 0.08, 0, 35); for (let i = 0; i < 4; i++) tone(1400, 0.04, "square", 0.05, 0.9 + i * 0.5); },
    thaw() { tone(300, 0.4, "sine", 0.1, 0, 1200); },
    slowIn() { tone(260, 0.35, "sine", 0.1, 0, 70); noise(0.35, 0.1, 1200, 0, 200); },
    slowOut() { tone(90, 0.25, "sine", 0.1, 0, 420); noise(0.2, 0.15, 300, 0, 2400); },
    replayIn() { noise(0.5, 0.3, 4000, 0, 300, 0.4); tone(180, 0.4, "sawtooth", 0.06, 0, 700); },
    replayOut() { noise(0.35, 0.25, 300, 0, 4000, 0.4); },
    celebrate() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, "triangle", 0.12, i * 0.1)); for (let i = 0; i < 6; i++) noise(0.08, 0.3, 2500 + Math.random() * 3000, 0.1 + i * 0.22); },
    firework() { tone(900, 0.25, "sine", 0.06, 0, 2200); noise(0.35, 0.3, 1800, 0.25, 500); },
    crowd() { noise(1.0, 0.18, 700, 0, 900, 0.3); },
    pop() { tone(700, 0.08, "sine", 0.1, 0, 1400); },
  };
  GZMusic.mountToggle($("btn-music"));
  const confettiCanvas = $("confetti");

  function showSound() {
    $("btn-sound").textContent = soundOn ? "🔊 Sound on" : "🔇 Sound off";
    $("btn-sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("btn-sound").addEventListener("click", () => { soundOn = !soundOn; SOUND.set(soundOn); showSound(); if (soundOn) { SOUND.wake(); sfx.ding(); } });
  showSound();

  /* ---------------- Load the Rust engine ---------------- */
  let wasm = null;
  let mem = () => new Float32Array(wasm.memory.buffer, wasm.state_ptr(), wasm.state_len());
  let S = null;                  // the state, re-read every frame
  function refresh() { S = mem(); }

  async function loadEngine() {
    const url = new URL("tiki_taka.wasm", document.currentScript ? document.currentScript.src : location.href).href;
    let inst;
    if (WebAssembly.instantiateStreaming) {
      try { inst = await WebAssembly.instantiateStreaming(fetch(url), {}); } catch (e) { inst = null; }
    }
    if (!inst) inst = await WebAssembly.instantiate(await (await fetch(url)).arrayBuffer(), {});
    wasm = inst.instance.exports;
    window.__tt = wasm;          // handy for testing in the console
  }

  /* ---------------- The canvas ---------------- */
  const cv = $("pitch");
  const ctx = cv.getContext("2d");
  let dpr = 1;
  function fit() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(cv.getBoundingClientRect().width || 680);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(w * dpr * (H + TOP) / CW);
    $("confetti").width = cv.width; $("confetti").height = cv.height;
  }
  window.addEventListener("resize", () => { if (wasm) fit(); });

  const STRIPES = 10;
  // a faint pattern of grass blades, drawn once and re-used
  let grassTex = null;
  function makeGrass() {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2600; i++) {
      g.strokeStyle = r() < 0.5 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.05)";
      g.lineWidth = 1.2; const x = r() * W, y = r() * H;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 4); g.stroke();
    }
    return c;
  }
  function drawPitch(t) {
    // grass with mowing stripes
    if (!grassTex) grassTex = makeGrass();
    for (let i = 0; i < STRIPES; i++) {
      ctx.fillStyle = i % 2 ? "#349a47" : "#3cab50";
      ctx.fillRect(0, (H / STRIPES) * i, W, H / STRIPES + 1);
    }
    ctx.drawImage(grassTex, 0, 0);
    // a soft pool of light in the middle, darker at the edges
    const vg = ctx.createRadialGradient(W / 2, H * 0.45, 120, W / 2, H * 0.45, 560);
    vg.addColorStop(0, "rgba(255,255,220,.05)"); vg.addColorStop(1, "rgba(0,20,0,.22)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 3; ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.strokeRect(14, 14, W - 28, H - 28);
    // corner arcs
    for (const [cx, cy, a0] of [[14, 14, 0], [W - 14, 14, 0.5], [14, H - 14, 1.5], [W - 14, H - 14, 1]]) { ctx.beginPath(); ctx.arc(cx, cy, 14, a0 * Math.PI, (a0 + 0.5) * Math.PI); ctx.stroke(); }
    // box and six-yard box at the top (the goal we attack)
    ctx.strokeRect(150, 14, W - 300, 130);
    ctx.strokeRect(232, 14, W - 464, 52);
    ctx.beginPath(); ctx.arc(W / 2, 106, 3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(W / 2, 146, 52, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    // halfway line and circle at the bottom
    ctx.beginPath(); ctx.moveTo(14, H - 14); ctx.lineTo(W - 14, H - 14); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H - 14, 70, Math.PI, 0); ctx.stroke();
    // the goal: net behind the line
    ctx.fillStyle = "rgba(255,255,255,.12)";
    ctx.fillRect(GOAL_L, -TOP + 6, GOAL_R - GOAL_L, TOP + 8);
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1;
    for (let x = GOAL_L; x <= GOAL_R; x += 10) { ctx.beginPath(); ctx.moveTo(x, -(TOP - 6)); ctx.lineTo(x, 14); ctx.stroke(); }
    for (let y = -(TOP - 6); y <= 14; y += 10) { ctx.beginPath(); ctx.moveTo(GOAL_L, y); ctx.lineTo(GOAL_R, y); ctx.stroke(); }
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(GOAL_L, 18); ctx.lineTo(GOAL_L, -(TOP - 8)); ctx.lineTo(GOAL_R, -(TOP - 8)); ctx.lineTo(GOAL_R, 18); ctx.stroke();
    ctx.lineCap = "butt";
  }

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
    return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
  }

  function drawPlayer(x, y, face, shirt, trim, label, opts) {
    const o = opts || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.25, 1.25);
    // shadow
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(2, 5, 16, 11, 0, 0, 7); ctx.fill();
    if (o.ring) {
      ctx.strokeStyle = o.ring; ctx.lineWidth = 3; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(0, 0, 22 + (o.pulse || 0), 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (o.open) {   // can he take a pass? green yes, amber risky, red blocked
      const c = o.open === 1 ? "125,255,155" : o.open === 2 ? "255,210,63" : "255,93,93";
      const a = (o.openAlpha || 0.5) * (o.open === 1 ? 0.85 + 0.15 * Math.sin(clock * 6) : 0.8);
      ctx.strokeStyle = `rgba(${c},${a})`; ctx.lineWidth = 2.5; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(0, 0, 21, clock * 0.8, clock * 0.8 + 6.283); ctx.stroke(); ctx.setLineDash([]);
      if (o.open === 1) { ctx.fillStyle = `rgba(${c},${a})`; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(-6, -38); ctx.lineTo(6, -38); ctx.closePath(); ctx.fill(); }
    }
    // feet that step when he runs
    const spd = Math.hypot(o.vx || 0, o.vy || 0);
    if (spd > 15) {
      const ph = clock * (6 + spd / 14), fx = Math.cos(face), fy = Math.sin(face);
      ctx.fillStyle = "#1b1720";
      for (const sd of [-1, 1]) {
        const step = Math.sin(ph + (sd > 0 ? 0 : Math.PI)) * 6;
        ctx.beginPath(); ctx.ellipse(fx * step - fy * sd * 6, fy * step + fx * sd * 6, 4.5, 3.2, face, 0, 7); ctx.fill();
      }
    }
    // seen from above: shoulders and arms that swing as he runs, and a head with hair
    const fx = Math.cos(face), fy = Math.sin(face), px = -fy, py = fx;   // forward and sideways
    const swing = spd > 15 ? Math.sin(clock * (6 + spd / 14)) * 6 : 0;
    const skin = o.skin || "#f0c7a0";
    const reach = o.gloves ? 8 : 0;                                      // a keeper holds his arms out wide
    for (const sd of [-1, 1]) {
      const sx = px * sd * 11, sy = py * sd * 11;
      const hx = px * sd * (15 + reach) + fx * (swing * sd * -1 - reach * 0.4), hy = py * sd * (15 + reach) + fy * (swing * sd * -1 - reach * 0.4);
      ctx.strokeStyle = shirt; ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx * 0.8 + sx * 0.2, hy * 0.8 + sy * 0.2); ctx.stroke();
      ctx.fillStyle = o.gloves ? "#ffd23f" : skin; ctx.beginPath(); ctx.arc(hx, hy, o.gloves ? 4.8 : 3.4, 0, 7); ctx.fill();
    }
    ctx.lineCap = "butt";
    // torso, lit from the top left, with a stripe in the trim colour
    ctx.save(); ctx.rotate(face + Math.PI / 2);
    const bg = ctx.createRadialGradient(-5, -4, 2, 0, 0, 16);
    bg.addColorStop(0, shade(shirt.startsWith("#") ? shirt : "#888888", 1.25)); bg.addColorStop(1, shirt);
    ctx.fillStyle = bg; ctx.strokeStyle = trim; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.ellipse(0, 0, 12.5, 10, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = trim; ctx.globalAlpha = 0.55; ctx.fillRect(-12, -2.2, 24, 4.4); ctx.globalAlpha = 1;
    ctx.restore();
    // head, a little ahead of the shoulders: hair on the back, face towards where he is looking
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(fx * 3.5, fy * 3.5, 6.6, 0, 7); ctx.fill();
    ctx.fillStyle = o.hair || "#3b2616"; ctx.beginPath(); ctx.arc(fx * 1.6, fy * 1.6, 6.7, face + 0.9, face + Math.PI * 2 - 0.9); ctx.fill();
    if (label !== "") {
      ctx.fillStyle = o.text || trim; ctx.font = "700 11px Rajdhani, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, -Math.cos(face) * 6.5, -Math.sin(face) * 6.5 + 1);
    }
    ctx.restore();
  }

  function drawBall(x, y, vx, vy, t, z) {
    z = z || 0;
    ctx.fillStyle = `rgba(0,0,0,${0.3 - Math.min(0.15, z / 300)})`; ctx.beginPath(); ctx.ellipse(x + 2, y + 4, 8.5 * (1 - z / 220), 5.5 * (1 - z / 220), 0, 0, 7); ctx.fill();
    const lift = z * 0.9, r = 8.5 * (1 + z / 90);
    const cx = x, cy = y - lift;
    const g = ctx.createRadialGradient(cx - 2.5, cy - 2.5, 1, cx, cy, r);
    g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#d9d9e0");
    ctx.fillStyle = g; ctx.strokeStyle = "#1b1720"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.stroke();
    // panels that turn as it rolls
    const ang = (x + y) * 0.06 + z * 0.05;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.scale(r / 7, r / 7);
    ctx.fillStyle = "#1b1720"; ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 1.5708; ctx.lineTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#1b1720"; ctx.lineWidth = 0.9; ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 1.5708; ctx.moveTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6); ctx.lineTo(Math.cos(a) * 6.4, Math.sin(a) * 6.4); }
    ctx.stroke(); ctx.restore();
  }

  const SAFE_COL = ["#7dff9b", "#ffd23f", "#ff5d5d"];
  function drawAim(ox, oy, t) {
    const len = S[I.AIM_LEN];
    if (!S[I.AIM] || len < 20) return;
    const dx = S[I.AIM_DX], dy = S[I.AIM_DY], ex = S[I.AIM_EX], ey = S[I.AIM_EY];
    const kind = S[I.AIM_KIND] | 0, snapped = S[I.AIM_TARGET] >= 0;
    const col = SAFE_COL[S[I.AIM_SAFE] | 0];
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 4.5; ctx.lineCap = "round";
    if (kind === 1) {
      // a lob: a curve up and over, and a landing ring
      const mx = (ox + ex) / 2, my = (oy + ey) / 2 - Math.min(110, len * 0.35);
      ctx.setLineDash([2, 11]); ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(ex, ey, 20 + Math.sin(t * 8) * 2, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, ey, 4, 0, 7); ctx.fill();
    } else {
      ctx.setLineDash([2, 12]); ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
      // arrow head
      ctx.beginPath();
      ctx.moveTo(ex + dx * 12, ey + dy * 12);
      ctx.lineTo(ex - dy * 12 - dx * 8, ey + dx * 12 - dy * 8);
      ctx.lineTo(ex + dy * 12 - dx * 8, ey - dx * 12 - dy * 8);
      ctx.closePath(); ctx.fill();
      if (kind === 2) {   // a through ball: extra chevrons, it goes ahead of the runner
        for (const k of [18, 32]) {
          ctx.beginPath(); ctx.moveTo(ex - dy * 11 - dx * k, ey + dx * 11 - dy * k); ctx.lineTo(ex - dx * (k - 9), ey - dy * (k - 9)); ctx.lineTo(ex + dy * 11 - dx * k, ey - dx * 11 - dy * k); ctx.stroke();
        }
      }
    }
    ctx.lineCap = "butt";
    // a label so the player knows what is selected
    if (kind) { ctx.font = "700 20px Rajdhani, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 5; ctx.strokeStyle = "#10201a"; ctx.strokeText(kind === 1 ? "LOB" : "THROUGH BALL", ex, ey - 34); ctx.fillStyle = "#fff"; ctx.fillText(kind === 1 ? "LOB" : "THROUGH BALL", ex, ey - 34); }
    void snapped;
  }

  /* ---- shooting: the aim marker on the goal and the power bar ---- */
  let techLevel = 0;
  let inGreen = false;
  function drawShotUi(bx, by, t) {
    if (!S[I.SHOT_MODE]) { inGreen = false; return; }
    const sx = S[I.SHOT_X], p = S[I.POWER];
    // aim: a line from the ball to a marker on the goal
    ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 3; ctx.setLineDash([3, 10]); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(sx, 6); ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = "butt";
    ctx.strokeStyle = "#ffd66b"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx, 8, 12 + Math.sin(t * 9) * 1.5, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - 18, 8); ctx.lineTo(sx - 7, 8); ctx.moveTo(sx + 7, 8); ctx.lineTo(sx + 18, 8); ctx.moveTo(sx, -10); ctx.lineTo(sx, 0); ctx.stroke();
    // power bar across the bottom of the pitch
    const bw = 380, bh = 26, x0 = W / 2 - bw / 2, y0 = H - 78;
    const half = SWEET_HALF + 0.01 * techLevel, g0 = SWEET - half, g1 = SWEET + half, blaze = 0.93 + 0.004 * techLevel;
    ctx.fillStyle = "rgba(10,14,12,.78)"; ctx.beginPath(); ctx.roundRect(x0 - 8, y0 - 10, bw + 16, bh + 20, 14); ctx.fill();
    const seg = (a, b, c) => { ctx.fillStyle = c; ctx.fillRect(x0 + bw * a, y0, bw * (b - a), bh); };
    seg(0, 0.35, "#e0453f"); seg(0.35, g0, "#f5b942"); seg(g0, g1, "#3ddc97"); seg(g1, blaze, "#f5b942"); seg(blaze, 1, "#e0453f");
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, bw, bh);
    const nx = x0 + bw * p;
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#10201a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(nx, y0 - 2); ctx.lineTo(nx - 11, y0 - 16); ctx.lineTo(nx + 11, y0 - 16); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.fillRect(nx - 2, y0, 4, bh);
    ctx.font = "700 17px Rajdhani, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#e9fff3";
    ctx.fillText(p > blaze ? "TOO HARD!" : p >= g0 && p <= g1 ? "LET GO NOW!" : p < 0.35 ? "TOO SOFT" : "HOLD...", W / 2, y0 + bh + 14);
    const g = p >= g0 && p <= g1;
    if (g && !inGreen) snd.ready();
    inGreen = g;
  }

  /* ---- special effects: sparks, fireworks, comic "BAM!"s, lightning, emoji rain, screen shake ---- */
  const FX = { p: [], later: [], shake: 0 };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const PARTY = ["#ff3b4e", "#ffd23f", "#3ddc97", "#4dc3ff", "#b36bff", "#ff8fd0", "#ffffff"];
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  function fxBurst(x, y, n, cols, speed, life, size, kind) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, sp = speed * (0.35 + Math.random() * 0.8);
      FX.p.push({ k: kind || "dot", x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 220, life: life * (0.7 + Math.random() * 0.5), max: life, c: pickOne(cols), s: size * (0.6 + Math.random() * 0.8), r: Math.random() * 6 });
    }
  }
  const fxRing = (x, y, c, r) => FX.p.push({ k: "ring", x, y, c, r, life: 0.6, max: 0.6 });
  const fxText = (t, x, y, c, size, vy) => FX.p.push({ k: "text", t, x, y, vx: 0, vy: vy === undefined ? -70 : vy, c, s: size || 40, life: 1.2, max: 1.2, r: rnd(-0.18, 0.18) });
  function fxBolt(x, y) {
    for (let b = 0; b < 5; b++) {
      const a = rnd(0, 6.283), len = rnd(260, 480);
      const pts = [[x, y]];
      for (let i = 1; i <= 7; i++) pts.push([x + Math.cos(a) * len * i / 7 + rnd(-24, 24), y + Math.sin(a) * len * i / 7 + rnd(-24, 24)]);
      FX.p.push({ k: "bolt", pts, life: 0.5, max: 0.5, c: b % 2 ? "#fff6a8" : "#9fd4ff" });
    }
  }
  function fxFirework(x, y) {
    const c = [pickOne(PARTY), pickOne(PARTY), "#ffffff"];
    fxBurst(x, y, 34, c, 300, 1.3, 4, "spark");
    fxRing(x, y, c[0], 20);
  }
  function fxRain() {
    for (let i = 0; i < 12; i++) FX.p.push({ k: "emoji", e: pickOne(["⚽", "🎉", "🔥", "⭐", "🏆", "💥", "🎊"]), x: rnd(0, W), y: rnd(-TOP - 300, -TOP), vx: rnd(-40, 40), vy: rnd(160, 340), g: 0, life: 2.5, max: 2.5, s: rnd(24, 40), r: rnd(0, 6) });
  }
  const fxLater = (delay, fn) => FX.later.push({ t: delay, fn });
  function ballPos() { return [S[I.BX], S[I.BY]]; }
  function ownerPos() { const o = I.P0 + ((S[I.OWNER] | 0) < 0 ? 0 : (S[I.OWNER] | 0)) * I.STRIDE; return [S[o], S[o + 1]]; }
  function keeperPos() { const o = I.P0 + ((S[I.N_ATT] | 0) + (S[I.N_DEF] | 0)) * I.STRIDE; return [S[o], S[o + 1]]; }
  const COMBO = [null, null, ["NICE!", "#7dff9b"], ["GREAT!", "#ffd23f"], ["AMAZING!", "#ff8fd0"], ["UNREAL!", "#4dc3ff"]];
  function fxOn(e) {
    if (reduced) return;
    const [bx, by] = ballPos();
    if (e === E.KICK) fxBurst(bx, by, 6, ["#e9e2c8", "#cfe8b0"], 90, 0.45, 3);
    else if (e === E.SHOT) { fxText("WHOOSH!", bx, by - 24, "#ffffff", 34); fxRing(bx, by, "#ffffff", 10); }
    else if (e === E.PASS) {
      const chain = S[I.CHAIN] | 0, [ox, oy] = ownerPos();
      const c = COMBO[Math.min(chain, 5)];
      if (c) {
        // A team-mate shouts it, so the words never sit on top of the ball.
        const nA = S[I.N_ATT] | 0, recv = S[I.RECEIVER] | 0, own = S[I.OWNER] | 0;
        let best = -1, bd = 0;
        for (let i = 0; i < nA; i++) {
          if (i === recv || i === own) continue;
          const o = I.P0 + i * I.STRIDE, d = Math.hypot(S[o] - bx, S[o + 1] - by);
          if (d > 55 && (best < 0 || d < bd)) { best = i; bd = d; }
        }
        if (best >= 0) { const o = I.P0 + best * I.STRIDE; fxText(c[0], Math.max(60, Math.min(W - 60, S[o])), S[o + 1] - 44, c[1], 30 + chain * 2); }
        else fxText(c[0], ox, oy - 70, c[1], 34 + chain * 3);
        shoutT = Math.max(shoutT, 1.4);
      }
    }
    else if (e === E.TACKLE) { FX.shake = Math.max(FX.shake, 9); fxText("OOF!", bx, by - 22, "#ff5d5d", 44); fxText("-2.5s", bx, by + 24, "#ffb3b3", 30); fxBurst(bx, by, 14, ["#ffffff", "#ff9b9b"], 190, 0.5, 4); }
    else if (e === E.BLOCK) { FX.shake = Math.max(FX.shake, 7); fxText("THUD!", bx, by - 22, "#ffb347", 42); fxBurst(bx, by, 12, ["#ffb347", "#ffffff"], 170, 0.5, 4); }
    else if (e === E.SAVE) { const [kx, ky] = keeperPos(); FX.shake = Math.max(FX.shake, 7); fxText("BAM!", kx, ky + 50, "#7dff9b", 52); fxRing(kx, ky, "#7dff9b", 18); fxBurst(kx, ky, 18, ["#7dff9b", "#ffffff", "#ffd23f"], 220, 0.7, 4, "star"); }
    else if (e === E.POST) { FX.shake = Math.max(FX.shake, 10); fxText("CLANG!", bx, by + 40, "#d6e4ff", 54); fxBurst(bx, Math.max(by, 6), 24, ["#ffffff", "#bcd2ff"], 260, 0.7, 3, "spark"); fxRing(bx, Math.max(by, 6), "#ffffff", 14); }
    else if (e === E.MISS) { fxText("WIDE!", Math.max(60, Math.min(W - 60, bx)), Math.max(40, by + 40), "#ffb3b3", 40); }
    else if (e === E.GOAL) {
      FX.shake = 12; fxRain();
      fxRing(bx, 0, "#ffd23f", 20); fxRing(bx, 0, "#ffffff", 50);
      fxBurst(bx, 0, 40, PARTY, 340, 1.2, 5, "star");
      for (let i = 0; i < 7; i++) fxLater(0.15 + i * 0.28, () => fxFirework(rnd(90, W - 90), rnd(40, 330)));
    }
    else if (e === E.SUPER) {
      const [ox, oy] = ownerPos();
      if ((S[I.SKILL] | 0) === 1) { fxBurst(ox, oy, 40, ["#bfe3ff", "#ffffff", "#7fb8ff"], 280, 1.2, 5, "star"); fxRing(ox, oy, "#9fd4ff", 20); fxRing(ox, oy, "#ffffff", 60); }
      else { fxBolt(ox, oy); fxRing(ox, oy, "#ffd23f", 20); fxRing(ox, oy, "#ff8a2a", 60); fxBurst(ox, oy, 30, ["#ffd23f", "#ff8a2a", "#fff6a8"], 320, 1.0, 5, "spark"); }
      FX.shake = Math.max(FX.shake, 8);
    }
    else if (e === E.METER_FULL) { const [ox, oy] = ownerPos(); fxText("SUPER READY!", ox, oy - 40, "#ffd66b", 36); fxBurst(ox, oy, 20, ["#ffd66b", "#b36bff", "#ffffff"], 180, 0.9, 4, "star"); }
    else if (e === E.FREEZE) { for (let i = 0; i < 5; i++) fxLater(i * 0.08, () => fxBolt(rnd(100, W - 100), rnd(100, 500))); }
  }
  // Open team-mates call for the ball now and then.
  let shoutT = 2, lastShouter = -1;
  const SHOUTS = ["PASS!", "HERE!", "OVER HERE!", "I'M FREE!", "ON ME!"];
  function shoutUpdate(dt) {
    shoutT -= dt;
    if (shoutT > 0 || reduced) return;
    shoutT = 2.4 + Math.random() * 1.6;
    if ((S[I.PHASE] | 0) !== PH.PLAY || S[I.AIM] === 1 || S[I.SHOT_MODE] || (S[I.OWNER] | 0) < 0) return;
    const nA = S[I.N_ATT] | 0, own = S[I.OWNER] | 0, free = [];
    for (let i = 0; i < nA; i++) { const o = I.P0 + i * I.STRIDE; if (i !== own && i !== lastShouter && (S[o + 8] | 0) === 1) free.push(i); }
    if (!free.length) return;
    const i = free[Math.floor(Math.random() * free.length)], o = I.P0 + i * I.STRIDE;
    lastShouter = i;
    fxText(pickOne(SHOUTS), Math.max(60, Math.min(W - 60, S[o])), S[o + 1] - 40, "#ffffff", 24);
  }
  function fxUpdate(dt) {
    FX.shake = Math.max(0, FX.shake - dt * 36);
    for (let i = FX.later.length - 1; i >= 0; i--) { FX.later[i].t -= dt; if (FX.later[i].t <= 0) { FX.later[i].fn(); FX.later.splice(i, 1); } }
    for (let i = FX.p.length - 1; i >= 0; i--) {
      const q = FX.p[i];
      q.life -= dt;
      if (q.life <= 0) { FX.p.splice(i, 1); continue; }
      if (q.vx !== undefined) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g || 0) * dt; q.vx *= 0.985; }
      if (q.k === "ring") q.r += dt * 220;
    }
    if (FX.p.length > 600) FX.p.splice(0, FX.p.length - 600);
  }
  function drawFx() {
    for (const q of FX.p) {
      const a = Math.max(0, Math.min(1, q.life / q.max));
      ctx.save(); ctx.globalAlpha = a;
      if (q.k === "dot" || q.k === "spark") {
        ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, q.s * (q.k === "dot" ? (0.4 + a * 0.6) : 1), 0, 7); ctx.fill();
        if (q.k === "spark") { ctx.strokeStyle = q.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.05, q.y - q.vy * 0.05); ctx.stroke(); }
      } else if (q.k === "star") {
        ctx.translate(q.x, q.y); ctx.rotate(q.r + (q.max - q.life) * 4); ctx.fillStyle = q.c; ctx.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? q.s * 0.9 : q.s * 2.2, ang = i * Math.PI / 5; ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); }
        ctx.closePath(); ctx.fill();
      } else if (q.k === "ring") {
        ctx.strokeStyle = q.c; ctx.lineWidth = 5 * a + 1; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.stroke();
      } else if (q.k === "text") {
        const pop = 1 + Math.max(0, (q.life - (q.max - 0.18)) * 6);
        ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.scale(pop, pop);
        ctx.font = `700 ${q.s}px Rajdhani, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 8; ctx.strokeStyle = "#1b1720"; ctx.lineJoin = "round"; ctx.strokeText(q.t, 0, 0);
        ctx.fillStyle = q.c; ctx.fillText(q.t, 0, 0);
      } else if (q.k === "emoji") {
        ctx.translate(q.x, q.y); ctx.rotate(q.r + (q.max - q.life) * 2); ctx.font = `${q.s}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(q.e, 0, 0);
      } else if (q.k === "bolt") {
        ctx.strokeStyle = q.c; ctx.lineWidth = 5; ctx.lineJoin = "round"; ctx.shadowColor = q.c; ctx.shadowBlur = 14;
        ctx.beginPath(); q.pts.forEach((pt, i) => (i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]))); ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* ---- supporters: a handful of mums, dads, grandads and kids along the touchline, like at a 5-a-side game ---- */
  const crowd = { cheer: 0, groan: 0, tension: 0 };
  const FANS = [
    // side -1 = left, 1 = right; kind decides what they are holding
    { s: -1, y: 130, kind: "flag", shirt: "#d7102b", hair: "#3b2616", skin: "#f0c7a0", ph: 0.0 },
    { s: -1, y: 270, kind: "kid", shirt: "#ffffff", hair: "#a57d52", skin: "#f5d3b0", ph: 1.3 },
    { s: -1, y: 410, kind: "drum", shirt: "#d7102b", hair: "#17141a", skin: "#c68b5e", ph: 2.1 },
    { s: -1, y: 550, kind: "grandad", shirt: "#d7102b", hair: "#cfcfcf", skin: "#f0c7a0", ph: 0.7 },
    { s: -1, y: 690, kind: "finger", shirt: "#ffffff", hair: "#e0be6a", skin: "#f5d3b0", ph: 1.9 },
    { s: 1, y: 170, kind: "kid", shirt: "#d7102b", hair: "#3b2616", skin: "#e8b88c", ph: 0.5 },
    { s: 1, y: 300, kind: "scarf", shirt: "#ffffff", hair: "#7a4a22", skin: "#f0c7a0", ph: 1.6 },
    { s: 1, y: 440, kind: "flag", shirt: "#d7102b", hair: "#17141a", skin: "#c68b5e", ph: 2.6 },
    { s: 1, y: 580, kind: "finger", shirt: "#d7102b", hair: "#a57d52", skin: "#f5d3b0", ph: 0.9 },
    { s: 1, y: 710, kind: "grandad", shirt: "#ffffff", hair: "#e6e6e6", skin: "#f0c7a0", ph: 2.2 },
  ];
  function drawFan(f, t) {
    const x = f.s < 0 ? -SIDE / 2 - 2 : W + SIDE / 2 + 2;
    const kid = f.kind === "kid";
    const sz = (kid ? 0.78 : f.kind === "grandad" ? 0.95 : 1) * 1.12;
    const up = Math.max(crowd.cheer, crowd.tension * 0.8);       // arms in the air
    const down = crowd.groan;
    const bob = -Math.abs(Math.sin(t * (kid ? 11 : 8) + f.ph)) * Math.min(1, crowd.cheer) * 12 - Math.sin(t * 2 + f.ph) * 1.2;
    ctx.save();
    ctx.translate(x, f.y + bob);
    ctx.scale(sz * (f.s < 0 ? 1 : 1), sz);
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(0, 24 - bob / sz, 15, 5, 0, 0, 7); ctx.fill();
    // legs
    ctx.fillStyle = "#26222d"; ctx.fillRect(-8, 10, 6, 14); ctx.fillRect(2, 10, 6, 14);
    // arms: down when gloomy, up when cheering
    const lift = Math.max(0, up - down * 0.6);
    const armY = -4 - lift * 22 + down * 6;
    ctx.strokeStyle = f.skin; ctx.lineWidth = 5; ctx.lineCap = "round";
    const wave = Math.sin(t * 12 + f.ph) * 4 * lift;
    for (const sd of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(sd * 10, 0); ctx.lineTo(sd * (15 + lift * 3 + (sd > 0 ? wave : -wave)), armY); ctx.stroke();
    }
    ctx.lineCap = "butt";
    // body
    ctx.fillStyle = f.shirt; ctx.beginPath(); ctx.roundRect(-11, -8, 22, 22, 6); ctx.fill();
    ctx.fillStyle = f.shirt === "#ffffff" ? "#d7102b" : "#ffffff"; ctx.fillRect(-11, 3, 22, 3);
    // scarf
    if (f.kind !== "drum") { ctx.fillStyle = "#d7102b"; ctx.fillRect(-9, -9, 18, 5); ctx.fillStyle = "#fff"; ctx.fillRect(-9, -7, 18, 2); ctx.fillStyle = "#d7102b"; ctx.fillRect(4, -5, 5, 12 + Math.sin(t * 6 + f.ph) * 2); }
    // head
    const tilt = down * 3;
    ctx.fillStyle = f.skin; ctx.beginPath(); ctx.arc(0, -17 + tilt, 8.5, 0, 7); ctx.fill();
    ctx.fillStyle = f.hair; ctx.beginPath(); ctx.arc(0, -19 + tilt, 8.6, Math.PI, 0); ctx.fill();
    if (f.kind === "grandad") { ctx.fillStyle = "#2b3a55"; ctx.beginPath(); ctx.ellipse(1, -24 + tilt, 10, 4, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-2, -26 + tilt, 14, 3); }
    // face: smile when cheering, frown when gutted
    ctx.fillStyle = "#222"; ctx.fillRect(-4, -18 + tilt, 2, 2); ctx.fillRect(2, -18 + tilt, 2, 2);
    ctx.strokeStyle = "#7a2d2d"; ctx.lineWidth = 1.5; ctx.beginPath();
    if (up > 0.3) { ctx.arc(0, -14 + tilt, 3.5, 0.1, Math.PI - 0.1); } else if (down > 0.3) { ctx.arc(0, -10 + tilt, 3, Math.PI + 0.3, -0.3); } else { ctx.moveTo(-2.5, -12 + tilt); ctx.lineTo(2.5, -12 + tilt); }
    ctx.stroke();
    // what they are holding
    const hx = 17 + lift * 3, hy = armY;
    if (f.kind === "flag") {
      ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(hx, hy + 6); ctx.lineTo(hx, hy - 44); ctx.stroke();
      ctx.fillStyle = "#d7102b"; ctx.beginPath(); ctx.moveTo(hx, hy - 44);
      for (let i = 0; i <= 5; i++) ctx.lineTo(hx + i * 5, hy - 44 + Math.sin(t * 9 + i + f.ph) * 3);
      for (let i = 5; i >= 0; i--) ctx.lineTo(hx + i * 5, hy - 30 + Math.sin(t * 9 + i + f.ph) * 3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillRect(hx + 6, hy - 40 + Math.sin(t * 9 + 1 + f.ph) * 2, 12, 3);
    } else if (f.kind === "finger") {
      ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.roundRect(hx - 5, hy - 22, 9, 24, 4); ctx.fill();
      ctx.beginPath(); ctx.roundRect(hx - 12, hy - 12, 8, 10, 3); ctx.fill();
      ctx.fillStyle = "#d9a300"; ctx.fillRect(hx - 5, hy - 22, 9, 3);
    } else if (f.kind === "drum") {
      ctx.fillStyle = "#8a1d28"; ctx.fillRect(-12, 2, 24, 13); ctx.fillStyle = "#e6d7b8"; ctx.beginPath(); ctx.ellipse(0, 2, 12, 4, 0, 0, 7); ctx.fill();
      const hit = Math.sin(t * 14 + f.ph) > 0 && (crowd.cheer > 0.15 || crowd.tension > 0.3);
      ctx.strokeStyle = "#e6d7b8"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-14, hit ? -2 : -12); ctx.lineTo(-6, 1); ctx.moveTo(14, hit ? -12 : -2); ctx.lineTo(6, 1); ctx.stroke();
    }
    ctx.restore();
  }
  function drawStands(t) {
    // the stand behind the supporters and a low barrier between them and the pitch
    for (const sd of [-1, 1]) {
      const x0 = sd < 0 ? -SIDE : W, g = ctx.createLinearGradient(sd < 0 ? -SIDE : W + SIDE, 0, sd < 0 ? 0 : W, 0);
      g.addColorStop(0, "#120f16"); g.addColorStop(1, "#241d2b");
      ctx.fillStyle = g; ctx.fillRect(x0, -TOP, SIDE, H + TOP);
      ctx.fillStyle = "#d7102b"; ctx.fillRect(sd < 0 ? -9 : W, 0, 9, H);
      ctx.fillStyle = "rgba(255,255,255,.85)"; for (let y = 20; y < H; y += 60) ctx.fillRect(sd < 0 ? -7 : W + 2, y, 5, 18);
    }
    for (const f of FANS) drawFan(f, t);
  }

  /* ---- super skills: the cinematic, the time-stop tint, the fire trail ---- */
  function drawEffects(t, owner) {
    const phase = S[I.PHASE] | 0;
    const freeze = S[I.FREEZE];
    if (freeze > 0) {
      const a = Math.min(1, freeze * 2) * 0.22;
      ctx.fillStyle = `rgba(110,170,255,${a})`; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,.75)";
      for (let i = 0; i < 26; i++) { // slow-falling ice specks
        const x = (i * 97 + t * 8) % W, y = (i * 211 + t * 24 * (1 + (i % 3))) % H;
        ctx.fillRect(x, y, 3, 3);
      }
    }
    if (S[I.AIM] === 1 && S[I.SLOW_LEFT] > 0 && owner >= 0 && phase === PH.PLAY) { // aiming: time has almost stopped
      const o2 = I.P0 + owner * I.STRIDE, ax = S[o2], ay = S[o2 + 1];
      const v = ctx.createRadialGradient(ax, ay, 120, ax, ay, 560);
      v.addColorStop(0, "rgba(120,170,255,0)"); v.addColorStop(1, "rgba(40,70,160,.38)");
      ctx.fillStyle = v; ctx.fillRect(-SIDE, -TOP, CW, H + TOP);
      // a ring that drains as the slow-motion runs out
      const frac = Math.min(1, S[I.SLOW_LEFT] / 1.2);
      ctx.strokeStyle = "rgba(160,205,255,.95)"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(ax, ay, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke(); ctx.lineCap = "butt";
    }
    if (S[I.SUPER_SHOT]) { // a ball of fire
      const bx = S[I.BX], by = S[I.BY];
      const g = ctx.createRadialGradient(bx, by, 2, bx, by, 34);
      g.addColorStop(0, "rgba(255,240,170,.95)"); g.addColorStop(0.4, "rgba(255,150,40,.7)"); g.addColorStop(1, "rgba(255,60,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 34, 0, 7); ctx.fill();
    }
    if (phase !== PH.CINE) return;
    const kind = S[I.CINE_KIND] | 0;
    const total = kind === 0 ? 1.5 : 1.1;
    const p = Math.max(0, Math.min(1, 1 - S[I.CINE_T] / total));
    const o = I.P0 + owner * I.STRIDE, cx = S[o], cy = S[o + 1];
    const col = kind === 0 ? "255,170,40" : "120,190,255";
    // everything goes dark except a spotlight on George
    const dark = Math.min(1, p * 5) * 0.72;
    const sp = ctx.createRadialGradient(cx, cy, 30, cx, cy, 520);
    sp.addColorStop(0, "rgba(0,0,0,0)"); sp.addColorStop(0.35, `rgba(8,6,16,${dark * 0.7})`); sp.addColorStop(1, `rgba(8,6,16,${dark})`);
    ctx.fillStyle = sp; ctx.fillRect(-SIDE, -TOP, CW, H + TOP);
    // speed lines
    ctx.strokeStyle = `rgba(${col},${0.55 * Math.min(1, p * 4)})`; ctx.lineWidth = 3;
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2 + 0.07 * Math.sin(i * 12.9);
      const r0 = 70 + ((i * 53) % 90) + p * 120, r1 = r0 + 160 + ((i * 31) % 200);
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
    }
    // glow behind George, and George again on top
    const gl = ctx.createRadialGradient(cx, cy, 4, cx, cy, 70 + 20 * Math.sin(t * 14));
    gl.addColorStop(0, `rgba(${col},.9)`); gl.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, 90, 0, 7); ctx.fill();
    const k = kit();
    drawPlayer(cx, cy, S[o + 4], k.shirt, k.trim, String(look().number), { hair: hairColour(), text: k.text, ring: `rgb(${col})`, pulse: 4 });
    drawBall(S[I.BX], S[I.BY], 0, 0, t);
    // the name of the skill slams in
    const pop = p < 0.18 ? 2.4 - 1.4 * (p / 0.18) : 1 + 0.05 * Math.sin(t * 10);
    ctx.save();
    ctx.translate(W / 2, H * 0.34); ctx.rotate(-0.07); ctx.scale(pop, pop);
    ctx.globalAlpha = Math.min(1, p * 8);
    ctx.font = "700 74px Rajdhani, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 12; ctx.strokeStyle = kind === 0 ? "#7a2d00" : "#10346b"; ctx.lineJoin = "round";
    const txt = kind === 0 ? "ROCKET SHOT!" : "TIME STOP!";
    ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = kind === 0 ? "#ffd66b" : "#d6ecff"; ctx.fillText(txt, 0, 0);
    ctx.restore();
  }

  let flash = 0;      // brief white flash on a goal
  function draw(t) {
    const sc = cv.width / CW;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#15301b"; ctx.fillRect(0, 0, cv.width, cv.height);
    const shk = replay ? 0 : FX.shake;
    ctx.setTransform(sc, 0, 0, sc, (SIDE + rnd(-shk, shk)) * sc, (TOP + rnd(-shk, shk)) * sc);
    drawPitch(t);
    drawStands(t);
    if (!S) return;
    const nA = S[I.N_ATT] | 0, nD = S[I.N_DEF] | 0, owner = S[I.OWNER] | 0;
    const k = kit(), hair = hairColour(), num = look().number;
    const aimTarget = S[I.AIM_TARGET] | 0;
    const recv = S[I.RECEIVER] | 0;
    const team = TEAMS[Math.max(0, Math.min(TEAMS.length - 1, S[I.TEAM] | 0))];
    const aiming = S[I.AIM] === 1;
    const pulse = Math.sin(t * 7) * 2;
    const players = [];
    for (let i = 0; i < nA + nD + 1; i++) {
      const b = I.P0 + i * I.STRIDE;
      players.push({ x: S[b], y: S[b + 1], vx: S[b + 2], vy: S[b + 3], face: S[b + 4], kind: S[b + 5], no: S[b + 6], extra: S[b + 7], open: S[b + 8] | 0, i });
    }
    players.sort((a, b) => a.y - b.y);
    // defenders in a pale blue away kit, the keeper in green
    for (const p of players) {
      if (p.kind === 0) {
        const mine = p.i === 4; // the striker is George
        const isOwner = p.i === owner;
        const ring = isOwner ? "#ffd66b" : (p.i === aimTarget || (p.i === recv && S[I.AIM] === 0)) ? "#ffffff" : null;
        const showOpen = owner >= 0 && !isOwner && !S[I.SHOT_MODE];
        drawPlayer(p.x, p.y, p.face, k.shirt, k.trim, mine ? String(num) : String(p.no | 0), { hair: mine ? hair : "#3b2616", text: k.text, ring, pulse: isOwner ? pulse : 0, vx: p.vx, vy: p.vy, open: showOpen ? p.open : 0, openAlpha: aiming ? 1 : 0.5 });
      } else if (p.kind === 1) {
        const danger = Math.min(1, p.extra);   // how close to a tackle
        drawPlayer(p.x, p.y, p.face, team.shirt, danger > 0.05 ? "#ff5d5d" : team.trim, "", { hair: "#1a1a1a", vx: p.vx, vy: p.vy, ring: danger > 0.05 ? "rgba(255,93,93," + (0.4 + danger * 0.6) + ")" : null });
      } else {
        drawPlayer(p.x, p.y, Math.PI / 2, team.keeper, "#10201a", "1", { hair: "#222", text: "#fff", gloves: true, vx: p.vx, vy: p.vy });
      }
    }
    // pass preview and the ball on top
    const bx = S[I.BX], by = S[I.BY];
    drawAim(bx, by, t);
    drawShotUi(bx, by, t);
    drawBall(bx, by, S[I.BVX], S[I.BVY], t, S[I.BALL_Z]);
    drawEffects(t, owner);
    if (!replay) drawFx();
    // goal flash
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.35})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - 0.03); }
  }

  /* ---------------- HUD + messages ---------------- */
  const hud = { goals: $("hud-goals"), clock: $("hud-clock"), team: $("hud-team"), score: $("hud-score"), chain: $("hud-chain") };
  const fmtClock = (t) => { const n = Math.max(0, Math.ceil(t)); return Math.floor(n / 60) + ":" + String(n % 60).padStart(2, "0"); };
  let lastHud = "";
  function updateHud() {
    const score = S[I.SCORE] | 0, chain = S[I.CHAIN] | 0, goals = S[I.GOALS] | 0, t = S[I.MATCH_T];
    const key = [score, chain, goals, Math.ceil(t), S[I.TEAM]].join("|");
    if (key === lastHud) return;
    lastHud = key;
    hud.goals.textContent = goals;
    hud.score.textContent = score;
    hud.chain.textContent = "chain " + chain;
    hud.clock.textContent = fmtClock(t);
    hud.clock.classList.toggle("low", t > 0 && t <= 15);
    hud.team.textContent = "vs " + TEAMS[Math.max(0, Math.min(TEAMS.length - 1, S[I.TEAM] | 0))].name;
    const tl = Math.ceil(t);
    if (tl <= 10 && tl > 0 && tl !== lastTick && soundOn) { lastTick = tl; sfx.tick(); }
  }
  let lastTick = 99;

  const popEl = $("pop");
  function pop(text, sub, cls) {
    popEl.className = "tt-pop";
    popEl.innerHTML = text + (sub ? `<small>${sub}</small>` : "");
    void popEl.offsetWidth;
    popEl.className = "tt-pop show " + (cls || "");
  }
  const hint = $("hint");
  function say(t) { if (hint.textContent !== t) hint.textContent = t; }

  const RESULT_TEXT = {
    [R.GOAL]: ["GOAL!", "gold"], [R.SAVED]: ["SAVED!", "soft"], [R.MISS]: ["OFF TARGET", "soft"], [R.BLOCKED]: ["BLOCKED!", "soft"],
    [R.TACKLED]: ["LOST THE BALL", "soft"], [R.POST]: ["OFF THE POST!", "soft"], [R.OUT]: ["OUT OF PLAY", "soft"],
  };

  /* ---------------- Engine events -> sounds and effects ---------------- */
  let lastResult = 0;
  /* ---------------- Commentary: a box at the side, and a voice if the device has one ---------------- */
  const commList = $("comm-list");
  // The commentary box can be folded away to give the pitch more room (remembered).
  (function () {
    const box = $("comm"), btn = $("comm-toggle");
    let folded = false; try { folded = localStorage.getItem("gz_tt_comm") === "off"; } catch (e) {}
    const apply = () => { box.classList.toggle("collapsed", folded); btn.setAttribute("aria-expanded", String(!folded)); };
    apply();
    btn.addEventListener("click", () => { folded = !folded; apply(); try { localStorage.setItem("gz_tt_comm", folded ? "off" : "on"); } catch (e) {} });
  })();
  const commHistory = [];
  let lastLineAt = 0, waveTimer = 0, lastPower = 0, lastKind = 0, lastPassLen = 0, lastLocked = false, lastShotFrom = 0, lastShotSuper = false, pressedKey = "";
  function comment(text, prio, excited) {
    if (!text) return;
    const now = performance.now();
    if (!prio && now - lastLineAt < 1700) return;       // do not chatter over every pass
    lastLineAt = now;
    commHistory.unshift({ t: text, ex: !!excited });
    if (commHistory.length > 4) commHistory.length = 4;
    commList.innerHTML = commHistory.map((h, i) => `<li class="${i === 0 ? "now" : ""}${h.ex ? " ex" : ""}">${h.t.replace(/[&<>]/g, "")}</li>`).join("");
    $("comm").classList.add("talking");
    clearTimeout(waveTimer); waveTimer = setTimeout(() => $("comm").classList.remove("talking"), Math.min(4200, 900 + text.length * 55));
  }
  const C = (key, vars) => TTCommentary.say(key, vars);
  let usedSuper = false, lobGoals = 0, lastPassWasLob = false;
  function commentOn(e) {
    const chain = S[I.CHAIN] | 0;
    if (e === E.SUPER) usedSuper = true;
    if (e === E.START) {
      const no = S[I.NO] | 0;
      pressedKey = "";
      if (no === 1) comment(C("start1"), true);
      else if (no % 7 === 0) comment(C("startN", { n: no }), false);
    } else if (e === E.PASS) {
      lastPassWasLob = lastKind === 1;
      crowd.cheer = Math.min(1.2, crowd.cheer + 0.3);
      const key = lastKind === 1 ? "passLob" : lastKind === 2 ? "passThrough" : lastPassLen > 430 ? "passLong" : chain >= 5 ? "pass5" : chain >= 3 ? "pass3" : chain === 2 ? "pass2" : lastLocked && Math.random() < 0.3 ? "passLocked" : "pass1";
      comment(C(key, { n: chain }), chain >= 3 || lastKind > 0, chain >= 5);
      lastKind = 0;
      if (chain >= 5 && MUSIC.maybeChant) MUSIC.maybeChant(25000);
    } else if (e === E.SHOT) {
      lastShotFrom = S[I.BY]; lastShotSuper = S[I.SUPER_SHOT] === 1;
      crowd.tension = 1;
      if (!lastShotSuper) {
        const half = SWEET_HALF + 0.01 * techLevel, g0 = SWEET - half, g1 = SWEET + half;
        const key = lastPower > 0.93 + 0.004 * techLevel ? "shotBlazed" : lastPower < 0.4 ? "shotWeak" : lastPower >= g0 && lastPower <= g1 ? "shotPerfect" : lastShotFrom > 300 ? "shotFar" : "shot";
        comment(C(key), true, true);
      }
    } else if (e === E.SUPER) {
      comment(C((S[I.SKILL] | 0) === 1 ? "freeze" : "rocket"), true, true);
      crowd.cheer = 1;
    } else if (e === E.METER_FULL) {
      comment(C("meter"), true);
    } else if (e === E.GOAL) {
      if (lastPassWasLob) lobGoals++;
      crowd.cheer = 1.6; crowd.groan = 0; crowd.tension = 0;
      const key = lastShotSuper ? "goalSuper" : chain >= 3 ? "goalChain" : lastShotFrom > 300 ? "goalFar" : "goal";
      comment(C(key, { n: chain }), true, true);
    } else if (e === E.SAVE || e === E.MISS || e === E.POST || e === E.BLOCK || e === E.TACKLE) {
      crowd.groan = 1; crowd.cheer = 0; crowd.tension = 0;
      comment(C(e === E.SAVE ? "save" : e === E.MISS ? "miss" : e === E.POST ? "post" : e === E.BLOCK ? "block" : "tackle"), true, e === E.POST);
    }
  }

  function handleEvents() {
    const n = wasm.events_len();
    if (!n) return;
    const ev = new Uint8Array(wasm.memory.buffer, wasm.events_ptr(), n).slice();
    wasm.events_clear();
    for (const e of ev) {
      commentOn(e);
      fxOn(e);
      if (!soundOn) { if (e === E.GOAL) flash = 1; continue; }
      if (e === E.START) sfx.whistle();
      else if (e === E.KICK) sfx.kick();
      else if (e === E.SHOT) { snd.whoosh(); }
      else if (e === E.PASS) { const ch = S[I.CHAIN] | 0; snd.pass(ch); if (ch >= 2) snd.combo(ch); if (ch >= 3) snd.crowd(); }
      else if (e === E.TACKLE) { snd.thump(); sfx.aww(); }
      else if (e === E.BLOCK) { snd.thump(); }
      else if (e === E.SAVE) { snd.slap(); sfx.save(); }
      else if (e === E.POST) { snd.clang(); snd.ooh(); }
      else if (e === E.MISS) { snd.ooh(); }
      else if (e === E.GOAL) { sfx.roar(); snd.celebrate(); MUSIC.goalSong({ short: true }); for (let i = 0; i < 4; i++) setTimeout(snd.firework, 400 + i * 330); }
      else if (e === E.OVER) sfx.whistle();
      else if (e === E.SUPER) { if ((S[I.SKILL] | 0) === 1) snd.timestop(); else snd.rocket(); }
      else if (e === E.FREEZE) { snd.thaw(); }
      else if (e === E.METER_FULL) { snd.ready(); snd.charge(); }
      if (e === E.GOAL) flash = 1;
    }
  }

  /* ---------------- Input ---------------- */
  function toWorld(ev) {
    const r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * CW / r.width - SIDE, y: (ev.clientY - r.top) * (H + TOP) / r.height - TOP };
  }
  let drag = null;
  let shotGoalPtr = null;   // a finger holding the goal: charges a shot, fires on release
  let shotAimPtr = null;    // a second finger sliding across the goal while the SHOOT button is held
  function fireShot() {
    refresh();
    if (!S[I.SHOT_MODE]) return;
    lastPower = S[I.POWER];
    wasm.shot_fire();
    say("");
  }
  cv.addEventListener("pointerdown", (ev) => {
    if (!running) return;
    ev.preventDefault();
    if (replay) { skipReplay(); return; }
    SOUND.wake();
    refresh();
    if (S[I.PHASE] !== PH.PLAY || (S[I.OWNER] | 0) < 0) return;
    const p = toWorld(ev);
    if (S[I.SHOT_MODE]) {            // the SHOOT button is held: this finger aims
      shotAimPtr = ev.pointerId; wasm.shot_aim(p.x);
      try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
      return;
    }
    // holding the goal charges a shot: slide to aim, let go to fire
    if (p.y < 90 && p.x > GOAL_L - 30 && p.x < GOAL_R + 30) {
      if (wasm.shot_begin(p.x)) { shotGoalPtr = ev.pointerId; try { cv.setPointerCapture(ev.pointerId); } catch (e) {} }
      return;
    }
    drag = { id: ev.pointerId, x0: p.x, y0: p.y };
    try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    wasm.aim_begin();
  });
  cv.addEventListener("pointermove", (ev) => {
    if (ev.pointerId === shotGoalPtr || ev.pointerId === shotAimPtr) { wasm.shot_aim(toWorld(ev).x); return; }
    if (!drag || ev.pointerId !== drag.id) return;
    const p = toWorld(ev);
    wasm.aim_update((p.x - drag.x0) * DRAG_K, (p.y - drag.y0) * DRAG_K);
  });
  function endDrag(ev, cancel) {
    if (ev && ev.pointerId === shotAimPtr) { shotAimPtr = null; return; }
    if (ev && ev.pointerId === shotGoalPtr) { shotGoalPtr = null; if (cancel) wasm.shot_cancel(); else fireShot(); return; }
    if (!drag || (ev && ev.pointerId !== drag.id)) return;
    drag = null;
    if (cancel) wasm.aim_cancel();
    else if ((refresh(), lastPassLen = S[I.AIM_LEN], lastLocked = S[I.AIM_TARGET] >= 0, lastKind = S[I.AIM_KIND] | 0, wasm.aim_release())) say("");
    else say("Drag further to pass.");
  }
  cv.addEventListener("pointerup", (ev) => endDrag(ev, false));
  cv.addEventListener("pointercancel", (ev) => endDrag(ev, true));
  cv.addEventListener("lostpointercapture", (ev) => { if (drag || ev.pointerId === shotGoalPtr || ev.pointerId === shotAimPtr) endDrag(ev, true); });

  // The SHOOT button: hold to build power, let go to shoot
  const shootBtn = $("btn-shoot");
  let holdPtr = null;
  shootBtn.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    SOUND.wake(); refresh();
    if (S[I.PHASE] !== PH.PLAY || (S[I.OWNER] | 0) < 0) return;
    if (wasm.shot_begin(NaN)) { holdPtr = ev.pointerId; shootBtn.classList.add("holding"); try { shootBtn.setPointerCapture(ev.pointerId); } catch (e) {} }
  });
  function releaseShootBtn(ev, cancel) {
    if (holdPtr === null || (ev && ev.pointerId !== holdPtr)) return;
    holdPtr = null; shootBtn.classList.remove("holding");
    if (cancel) wasm.shot_cancel(); else fireShot();
  }
  shootBtn.addEventListener("pointerup", (ev) => releaseShootBtn(ev, false));
  shootBtn.addEventListener("pointercancel", (ev) => releaseShootBtn(ev, true));
  shootBtn.addEventListener("lostpointercapture", (ev) => releaseShootBtn(ev, false));
  shootBtn.addEventListener("contextmenu", (e) => e.preventDefault());

  // Pass type: ground, lob or through-ball (goes back to ground after each pass)
  function setKind(k) { if (wasm) { wasm.set_pass_kind(k); refresh(); } }
  $("kinds").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (b) { SOUND.wake(); setKind(+b.dataset.k); if (soundOn) snd.pop(); } });

  function doSuper() {
    refresh();
    if (S[I.PHASE] !== PH.PLAY || (S[I.OWNER] | 0) < 0 || S[I.METER] < 1) return;
    wasm.use_super();
  }
  $("btn-super").addEventListener("click", () => { SOUND.wake(); doSuper(); });
  let superShown = "";
  function updateSuper(canUse) {
    const m = Math.max(0, Math.min(1, S[I.METER]));
    const ready = m >= 1 && canUse;
    const name = (S[I.SKILL] | 0) === 1 ? "Time Stop" : "Rocket Shot";
    const key = [Math.round(m * 100), ready, name, m >= 1].join();
    if (key === superShown) return;
    superShown = key;
    $("super-fill").style.width = (m * 100) + "%";
    $("super-lbl").textContent = m >= 1 ? `⚡ ${name}!` : `⚡ ${name}`;
    $("btn-super").disabled = !ready;
    $("btn-super").classList.toggle("ready", ready);
  }

  // Keyboard: arrows aim a pass from the ball (hold to lengthen, let go to pass). 1, 2, 3 pick the pass type.
  // Hold Space to charge a shot (arrows slide the aim), let go to shoot. E or Shift: super skill.
  const keys = { x: 0, y: 0, held: false, len: 0 };
  let spaceHeld = false;
  document.addEventListener("keydown", (e) => {
    const onBtn = e.target.tagName === "BUTTON";
    if (!running || e.target.tagName === "INPUT" || (onBtn && e.target !== shootBtn && e.key !== "Shift" && !/^[123eE]$/.test(e.key) && !e.key.startsWith("Arrow"))) return;
    if (replay) { e.preventDefault(); skipReplay(); return; }
    const map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
    refresh();
    if (S[I.SHOT_MODE] && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "a" || e.key === "d")) {
      e.preventDefault(); wasm.shot_aim(S[I.SHOT_X] + ((e.key === "ArrowLeft" || e.key === "a") ? -7 : 7)); return;
    }
    if (e.key === "1" || e.key === "2" || e.key === "3") { setKind(+e.key - 1); if (soundOn) snd.pop(); return; }
    if (map[e.key]) {
      e.preventDefault();
      if (!keys.held) { if (S[I.PHASE] !== PH.PLAY || (S[I.OWNER] | 0) < 0 || S[I.SHOT_MODE]) return; keys.held = true; keys.len = 0; wasm.aim_begin(); }
      keys.x += map[e.key][0] * 0.0001; keys.y += map[e.key][1] * 0.0001;
      keys.dirs = keys.dirs || {}; keys.dirs[e.key] = map[e.key];
    } else if (e.key === "Shift" || e.key === "e" || e.key === "E") {
      e.preventDefault(); SOUND.wake(); doSuper();
    } else if ((e.key === " " || e.key === "Enter") && (!onBtn || e.target === shootBtn)) {
      e.preventDefault();
      if (e.repeat || spaceHeld) return;
      SOUND.wake();
      if (S[I.PHASE] === PH.PLAY && (S[I.OWNER] | 0) >= 0 && wasm.shot_begin(NaN)) spaceHeld = true;
    }
  });
  document.addEventListener("keyup", (e) => {
    if ((e.key === " " || e.key === "Enter") && spaceHeld) { spaceHeld = false; e.preventDefault(); fireShot(); return; }
    if (!keys.held || !keys.dirs || !keys.dirs[e.key]) return;
    delete keys.dirs[e.key];
    if (Object.keys(keys.dirs).length === 0) { keys.held = false; wasm.aim_release(); keys.len = 0; }
  });
  function keyAimStep(dt) {
    if (!keys.held || !keys.dirs) return;
    let dx = 0, dy = 0;
    for (const k of Object.keys(keys.dirs)) { dx += keys.dirs[k][0]; dy += keys.dirs[k][1]; }
    const l = Math.hypot(dx, dy) || 1;
    keys.len = Math.min(560, keys.len + 380 * dt + (keys.len < 60 ? 60 : 0));
    wasm.aim_update(dx / l * keys.len, dy / l * keys.len);
  }

  /* ---------------- The game loop ---------------- */
  let running = false, raf = 0, last = 0, clock = 0, finished = false;
  /* ---------------- Replay: the end of every attack, shown again ---------------- */
  const REPLAY_SECS = 3.4;       // how much of the attack to show
  const REPLAY_SPEED = 0.6;      // a little slower than real life
  const REPLAY_DELAY = 0.9;      // let the result sink in first
  let wasSlow = false, shownKind = -1;
  let rec = [], recNo = -1, resultFor = 0, replayDone = false, replay = null, celebrated = false, celebrating = false;

  function record() {
    const no = S[I.NO] | 0, phase = S[I.PHASE] | 0;
    if (no !== recNo) { rec = []; recNo = no; replayDone = false; resultFor = 0; celebrated = false; }
    if (phase !== PH.PLAY && phase !== PH.RESULT) return;
    rec.push({ t: clock, s: S.slice() });
    while (rec.length > 2 && rec[0].t < clock - 4.5) rec.shift();
  }
  function startReplay() {
    if (rec.length < 20) { replayDone = true; maybeCelebrate(); return; }
    const end = rec[rec.length - 1].t;
    const frames = rec.filter((f) => f.t >= end - REPLAY_SECS);
    replay = { frames, t0: frames[0].t, len: end - frames[0].t, pos: 0, i: 0, el: 0 };
    replayDone = true;
    popEl.className = "tt-pop";
    say("⏪ REPLAY: tap to skip");
    snd.replayIn();
  }
  // A small, cheap confetti burst for the final whistle only (the old one lagged the game).
  let confettiRaf = 0;
  function lightConfetti() {
    if (reduced || !confettiCanvas) return;
    cancelAnimationFrame(confettiRaf);
    const g = confettiCanvas.getContext("2d"), w = confettiCanvas.width, h = confettiCanvas.height;
    const cols = ["#e1102c", "#ffffff", "#f5b942", "#ff5a6e"], sz = Math.max(4, w / 90);
    const bits = Array.from({ length: 40 }, (_, i) => ({ x: w * (0.2 + 0.6 * Math.random()), y: h * 0.3, vx: (Math.random() - 0.5) * w / 60, vy: -Math.random() * h / 50 - 2, c: cols[i % 4] }));
    const t0 = performance.now();
    (function frame(now) {
      g.clearRect(0, 0, w, h);
      for (const b of bits) { b.vy += h / 2500; b.x += b.vx; b.y += b.vy; g.fillStyle = b.c; g.fillRect(b.x, b.y, sz, sz * 0.5); }
      if (now - t0 < 1400) confettiRaf = requestAnimationFrame(frame); else g.clearRect(0, 0, w, h);
    })(t0);
  }
  function skipReplay() { if (replay) { replay = null; last = performance.now(); refresh(); say(""); snd.replayOut(); maybeCelebrate(); } }
  // After a goal, George does his chosen celebration (My Player), with the crowd going wild.
  function maybeCelebrate() {
    if (celebrated || (S[I.RESULT] | 0) !== R.GOAL || !window.GL || !GL.celebrate) return;
    celebrated = true; celebrating = true;
    crowd.cheer = 1.6;
    if (!reduced) fxRain();
    GL.celebrate($("stage"), { ms: 2400, kit: kitId() }).then(() => { celebrating = false; last = performance.now(); });
  }
  function replayFrame(dt) {
    const r = replay;
    // in the last moments (the shot, the save, the goal) it slows right down
    const left = r.len - r.pos;
    const ease = left > 0 && left < 0.45 ? 0.25 + 0.75 * (left / 0.45) : 1;
    r.pos += dt * REPLAY_SPEED * ease; r.el += dt;
    if (r.pos >= r.len + 0.35) { skipReplay(); return; }      // hold the last picture for a moment
    const target = r.t0 + Math.min(r.pos, r.len);
    while (r.i < r.frames.length - 1 && r.frames[r.i + 1].t <= target) r.i++;
    S = r.frames[r.i].s.slice();
    S[I.AIM] = 0; S[I.PHASE] = PH.PLAY; S[I.INTRO] = 0;
    draw(clock);
    // broadcast look: bars, a REPLAY tag, and a hint
    // a pulsing red frame, and a big REPLAY that fades away after the first second
    ctx.strokeStyle = `rgba(255,59,78,${0.55 + 0.35 * Math.sin(clock * 6)})`; ctx.lineWidth = 8;
    ctx.strokeRect(-SIDE + 4, -TOP + 4, CW - 8, H + TOP - 8);
    if (r.el < 1.4) {
      const a = Math.min(1, (1.4 - r.el) / 0.6), z = 1 + Math.max(0, 0.5 - r.el) * 1.2;
      ctx.save(); ctx.translate(W / 2, H * 0.42); ctx.scale(z, z); ctx.globalAlpha = a;
      ctx.font = "700 110px Rajdhani, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 14; ctx.strokeStyle = "#7a0d20"; ctx.lineJoin = "round"; ctx.strokeText("REPLAY", 0, 0);
      ctx.fillStyle = "#ffffff"; ctx.fillText("REPLAY", 0, 0); ctx.restore();
    }
    ctx.fillStyle = "rgba(0,0,0,.62)";
    ctx.fillRect(-SIDE, -TOP, CW, TOP + 30); ctx.fillRect(-SIDE, H - 30, CW, 30);
    ctx.fillStyle = "#ff3b4e"; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(clock * 8);
    ctx.beginPath(); ctx.arc(34 - SIDE + 20, -TOP / 2 + 6, 8, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff"; ctx.font = "700 30px Rajdhani, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("⏪ REPLAY", 52 - SIDE + 20, -TOP / 2 + 7);
    ctx.textAlign = "right"; ctx.font = "600 17px Manrope, sans-serif"; ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.fillText("Tap to skip", W + SIDE - 14, H - 14);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000 || 0.016);
    last = now; clock += dt;
    if (replay) { replayFrame(dt); return; }
    if (celebrating) { fxUpdate(dt); crowd.cheer = Math.max(crowd.cheer, 1.2); refresh(); draw(clock); return; }
    keyAimStep(dt);
    crowd.cheer = Math.max(0, crowd.cheer - dt * 0.55); crowd.groan = Math.max(0, crowd.groan - dt * 0.5);
    wasm.tick(dt * 1000);
    refresh();
    fxUpdate(dt);
    shoutUpdate(dt);
    handleEvents();
    record();
    draw(clock);
    updateHud();
    const phase = S[I.PHASE] | 0, result = S[I.RESULT] | 0;
    const canShoot = S[I.CAN_SHOOT] === 1;
    $("btn-shoot").disabled = !canShoot && !S[I.SHOT_MODE];
    updateSuper(canShoot);
    const pk = S[I.PASS_KIND] | 0;
    if (pk !== shownKind) { shownKind = pk; document.querySelectorAll("#kinds button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.k === pk))); }
    const slowNow = S[I.AIM] === 1 && S[I.SLOW_LEFT] > 0 && phase === PH.PLAY;
    if (slowNow !== wasSlow) { wasSlow = slowNow; if (slowNow) snd.slowIn(); else snd.slowOut(); }
    if (phase === PH.PLAY) {
      lastResult = 0;
      const owner = S[I.OWNER] | 0;
      if (S[I.SHOT_MODE]) {
        say(S[I.SHOT_SLOW] > 0 ? "Slide to aim. Let go in the green!" : "Let go now!");
      } else if (owner >= 0 && S[I.AIM] === 0) {
        const pr = S[I.PRESSURE];
        if (S[I.INTRO] > 0) say("Get ready...");
        else if (pr < 70) { say("Defender closing in! Pass or shoot!"); const k = (S[I.NO] | 0) + "-" + (S[I.CHAIN] | 0); if (pressedKey !== k) { pressedKey = k; comment(C("pressure"), false); } }
        else say((S[I.CHAIN] | 0) === 0 ? "Drag to pass. Time slows while you aim." : "Keep it moving, or hold SHOOT when you are ready.");
      } else if (S[I.AIM] === 1) say(S[I.AIM_SAFE] === 2 ? "A defender is in the way! Try a lob." : S[I.SLOW_LEFT] > 0 ? (S[I.AIM_TARGET] >= 0 ? "Locked on. Let go to pass!" : "Time is slowed. Line it up!") : (S[I.AIM_TARGET] >= 0 ? "Locked on. Let go to pass!" : "Let go to pass."));
    } else if (phase === PH.CINE) {
      say("");
    } else if (phase === PH.RESULT && lastResult !== result + 100) {
      lastResult = result + 100;
      const [txt, cls] = RESULT_TEXT[result] || ["", "soft"];
      const bonus = S[I.BONUS] | 0;
      pop(txt, result === R.GOAL ? `+${bonus} points` : result === R.TACKLED ? "-2.5 seconds" : "", cls);
      say("");
    }
    if (phase === PH.RESULT) {
      resultFor += dt;
      if (!replayDone && resultFor >= REPLAY_DELAY) {
        // only the big moments get a replay; a lost ball just moves on
        if (result === R.GOAL || result === R.SAVED || result === R.POST || result === R.BLOCKED) startReplay();
        else { replayDone = true; maybeCelebrate(); }
      }
    }
    if (phase === PH.OVER && !finished) { finished = true; finish(); }
  }

  /* ---------------- Training ground: coins, upgrades, super skill ---------------- */
  const RPG_KEY = "gz_tikitaka_rpg";
  const MAX_LEVEL = 10;
  const STATS = [
    { id: "speed", icon: "🏃", name: "Speed", desc: "Team-mates run faster to meet your passes." },
    { id: "power", icon: "💪", name: "Power", desc: "Longer passes and harder shots." },
    { id: "technique", icon: "🎯", name: "Technique", desc: "Straighter shots, passes lock on easier, super bar charges faster." },
    { id: "composure", icon: "🧠", name: "Composure", desc: "More time on the ball before a defender can tackle." },
  ];
  const SKILLS = [
    { id: "rocket", icon: "🚀", name: "Rocket Shot", desc: "A screaming shot into the corner. The keeper has no chance.", cost: 0 },
    { id: "freeze", icon: "❄️", name: "Time Stop", desc: "Defenders and the keeper freeze for 4 seconds. Pass or shoot freely.", cost: 200 },
  ];
  const upgradeCost = (lvl) => 40 + 30 * lvl;
  function rpgLoad() {
    let r = null;
    try { r = JSON.parse(localStorage.getItem(RPG_KEY) || "null"); } catch (e) {}
    r = r && typeof r === "object" ? r : {};
    const shared = !!(window.GZR && GZR.ready);
    // Coins used to belong to this game alone. They now live in the shared wallet (gz-rewards.js).
    if (shared && +r.coins > 0) { GZR.earn({ coins: Math.floor(+r.coins) }); r.coins = 0; try { localStorage.setItem(RPG_KEY, JSON.stringify(r)); } catch (e) {} }
    const out = { coins: shared ? GZR.coins() : Math.max(0, +r.coins || 0), stats: {}, skills: Array.isArray(r.skills) ? r.skills.filter((x) => typeof x === "string") : ["rocket"], skill: r.skill === "freeze" ? "freeze" : "rocket" };
    for (const st of STATS) out.stats[st.id] = Math.max(0, Math.min(MAX_LEVEL, Math.floor(+(r.stats && r.stats[st.id]) || 0)));
    if (!out.skills.includes("rocket")) out.skills.push("rocket");
    if (!out.skills.includes(out.skill)) out.skill = "rocket";
    return out;
  }
  function rpgSave(r) {
    const shared = !!(window.GZR && GZR.ready);
    try { localStorage.setItem(RPG_KEY, JSON.stringify(Object.assign({}, r, { coins: shared ? 0 : r.coins }))); } catch (e) {}
  }
  // Pay from the shared wallet (or this game's own coins if the wallet could not load).
  function spendCoins(r, n) {
    if (window.GZR && GZR.ready) return GZR.spend(n);
    if (r.coins < n) return false;
    r.coins -= n; return true;
  }
  function rpgAward(score, goals) {
    const r = rpgLoad();
    const earned = Math.round(score / 20) + goals * 6 + 5;
    if (window.GZR && GZR.ready) GZR.earn({ coins: earned }); else { r.coins += earned; rpgSave(r); }
    return earned;
  }
  function trainMsg(t) { $("train-msg").textContent = t || ""; }
  function renderTraining() {
    const r = rpgLoad();
    $("coins").textContent = `🪙 ${r.coins} coins`;
    $("stat-rows").innerHTML = STATS.map((st) => {
      const lvl = r.stats[st.id], max = lvl >= MAX_LEVEL, cost = upgradeCost(lvl), can = !max && r.coins >= cost;
      const bar = Array.from({ length: MAX_LEVEL }, (_, i) => `<i class="${i < lvl ? "on" : ""}"></i>`).join("");
      return `<div class="tt-stat-row"><span class="ico" aria-hidden="true">${st.icon}</span>
        <div><div class="nm">${st.name} <span class="tt-sub">level ${lvl}</span></div><div class="ds">${st.desc}</div><div class="bar" aria-hidden="true">${bar}</div></div>
        <button class="tt-buy" type="button" data-stat="${st.id}" ${can ? "" : 'aria-disabled="true"'} aria-label="Upgrade ${st.name}">${max ? "MAX" : "🪙 " + cost}</button></div>`;
    }).join("");
    $("skill-row").innerHTML = SKILLS.map((k) => {
      const owned = r.skills.includes(k.id), on = r.skill === k.id;
      return `<button class="tt-skill" type="button" data-skill="${k.id}" aria-pressed="${on}"><b>${k.icon} ${k.name}</b>${k.desc}<br><span class="tag">${on ? "✓ Equipped" : owned ? "Tap to equip" : "🔒 Unlock for 🪙 " + k.cost}</span></button>`;
    }).join("");
  }
  $("train").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const r = rpgLoad();
    if (b.dataset.stat) {
      const id = b.dataset.stat, lvl = r.stats[id], cost = upgradeCost(lvl);
      if (lvl >= MAX_LEVEL) { trainMsg("Already at the top level."); return; }
      if (r.coins < cost) { trainMsg(`You need ${cost - r.coins} more coins. Play a match to earn them!`); return; }
      if (!spendCoins(r, cost)) return;
      r.stats[id] = lvl + 1; rpgSave(r);
      if (window.GZ && GZ.awardBadge) GZ.announceBadges(GZ.awardBadge("tt-upgrade"));
      renderTraining(); trainMsg(`${STATS.find((x) => x.id === id).name} is now level ${lvl + 1}!`);
      if (soundOn) { SOUND.wake(); sfx.unlock(); }
    } else if (b.dataset.skill) {
      const k = SKILLS.find((x) => x.id === b.dataset.skill);
      if (!r.skills.includes(k.id)) {
        if (r.coins < k.cost) { trainMsg(`${k.name} costs ${k.cost} coins. You need ${k.cost - r.coins} more.`); return; }
        if (!spendCoins(r, k.cost)) return;
        r.skills.push(k.id);
        if (soundOn) { SOUND.wake(); sfx.unlock(); }
      }
      r.skill = k.id; rpgSave(r); renderTraining(); trainMsg(`${k.name} equipped.`);
    }
  });

  /* ---------------- Start / end ---------------- */
  function bestScore() { try { return parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0; } catch (e) { return 0; } }
  function showBest() {
    const b = bestScore();
    $("best-line").innerHTML = b ? `Your best: <b>${b}</b> points` : "";
  }

  /* ---------------- The ladder: pick an opponent, earn stars, unlock the next team ---------------- */
  function ladderLoad() {
    let r = null;
    try { r = JSON.parse(localStorage.getItem(LADDER_KEY) || "null"); } catch (e) {}
    const stars = Array.isArray(r && r.stars) ? r.stars.slice(0, TEAMS.length).map((n) => Math.max(0, Math.min(3, Math.floor(+n) || 0))) : [];
    while (stars.length < TEAMS.length) stars.push(0);
    const L = { stars, pick: Math.max(0, Math.min(TEAMS.length - 1, Math.floor(r && +r.pick) || 0)) };
    if (!teamOpen(L, L.pick)) L.pick = 0;
    return L;
  }
  const ladderSave = (L) => { try { localStorage.setItem(LADDER_KEY, JSON.stringify(L)); } catch (e) {} };
  const teamOpen = (L, i) => i === 0 || L.stars[i - 1] >= 1;
  const starsFor = (goals) => (goals >= 10 ? 3 : goals >= 6 ? 2 : goals >= 3 ? 1 : 0);
  function renderLadder() {
    const L = ladderLoad();
    $("ladder").innerHTML = TEAMS.map((t, i) => {
      const open = teamOpen(L, i);
      return `<button type="button" class="tt-opp" role="radio" aria-checked="${L.pick === i}" ${open ? "" : 'aria-disabled="true"'} data-team="${i}">
        <span class="kit" style="background:${t.shirt};border-color:${t.trim}"></span><b>${escapeHtml(t.name)}</b>${escapeHtml(t.style)}
        <span class="stars" aria-label="${L.stars[i]} of 3 stars">${"★".repeat(L.stars[i])}${"☆".repeat(3 - L.stars[i])}</span>
        <span class="dots">${open ? "Difficulty " + "●".repeat(t.dots) + "○".repeat(5 - t.dots) : "🔒 Earn a ★ against " + escapeHtml(TEAMS[i - 1].name)}</span></button>`;
    }).join("");
    if (wasm) $("btn-start").textContent = "Kick off vs " + TEAMS[L.pick].name;
  }
  $("ladder").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-team]");
    if (!b) return;
    const L = ladderLoad(), i = +b.dataset.team;
    if (!teamOpen(L, i)) return;
    L.pick = i; ladderSave(L); renderLadder();
    if (soundOn) { SOUND.wake(); snd.pop(); }
  });

  function start() {
    SOUND.wake();
    const r = rpgLoad(), L = ladderLoad();
    techLevel = r.stats.technique;
    wasm.new_game((Math.random() * 4294967295) >>> 0, r.stats.speed, r.stats.power, r.stats.technique, r.stats.composure, r.skill === "freeze" ? 1 : 0, L.pick);
    lastHud = ""; finished = false; lastResult = 0; flash = 0; rec = []; recNo = -1; replay = null; replayDone = false; resultFor = 0; celebrated = false; celebrating = false;
    lastTick = 99; shownKind = -1; shotGoalPtr = shotAimPtr = holdPtr = null; spaceHeld = false;
    FX.p.length = 0; FX.later.length = 0; FX.shake = 0; usedSuper = false; lobGoals = 0; lastPassWasLob = false; commHistory.length = 0; commList.innerHTML = ""; crowd.cheer = crowd.groan = crowd.tension = 0; lastLineAt = 0;
    $("screen-start").hidden = true; $("screen-end").hidden = true; $("screen-game").hidden = false;
    fit();
    running = true;
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    MUSIC.walkOut({ ms: 4500 });
    if (window.GZWake) GZWake.on();
    $("screen-game").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  let finalScore = 0;
  function finish() {
    running = false;
    cancelAnimationFrame(raf);
    if (window.GZWake) GZWake.off();
    refresh();
    const team = Math.max(0, Math.min(TEAMS.length - 1, S[I.TEAM] | 0)), tm = TEAMS[team];
    const raw = S[I.SCORE] | 0, goals = S[I.GOALS] | 0, passes = S[I.PASSES] | 0, chain = S[I.BEST_CHAIN] | 0, shots = S[I.SHOTS] | 0, saves = S[I.SAVES] | 0;
    // harder teams are worth more points on the leaderboard
    const mult = 1 + 0.15 * team, score = Math.round(raw * mult);
    finalScore = score;
    const prev = bestScore();
    const isBest = score > prev;
    if (isBest) { try { localStorage.setItem(BEST_KEY, String(score)); } catch (e) {} }
    // stars and the next team
    const L = ladderLoad(), st = starsFor(goals), hadStar = L.stars[team] >= 1;
    let note = "";
    if (st > L.stars[team]) L.stars[team] = st;
    if (!hadStar && L.stars[team] >= 1 && team + 1 < TEAMS.length) { L.pick = team + 1; note = ` ${TEAMS[team + 1].name} are now unlocked!`; }
    ladderSave(L);
    if (goals >= 3) MUSIC.winTune({ ms: 5000 }); else MUSIC.fadeOut(500);
    $("screen-game").hidden = true; $("screen-end").hidden = false;
    $("end-title").textContent = st === 3 ? "Masterclass!" : st === 2 ? "Great match!" : st === 1 ? "Match won!" : "Full time";
    $("end-text").textContent = goals === 0
      ? `No goals against ${tm.name}. Keep the ball moving, get closer to goal, and hold SHOOT until the green. Have another go!`
      : `${goals} goal${goals === 1 ? "" : "s"} against ${tm.name}.${mult > 1 ? ` Difficulty bonus x${mult.toFixed(2)}.` : ""}${isBest && prev ? ` New personal best: ${score}!` : ""}${note}`;
    $("end-stats").innerHTML = [["Stars", "★".repeat(st) + "☆".repeat(3 - st)], ["Points", score], ["Goals", goals], ["Shots", shots], ["Saved", saves], ["Passes", passes], ["Best chain", chain]]
      .map(([k, v]) => `<div class="tt-stat"><b>${v}</b><span>${k}</span></div>`).join("");
    $("name-form").hidden = score === 0;
    $("saved-msg").textContent = "";
    if (goals >= 3 && soundOn) { sfx.fanfare(); setTimeout(lightConfetti, 200); }
    comment(C(goals === 0 ? "end0" : goals === 1 ? "end1" : goals >= 6 ? "end4" : "end3", { g: goals }), true, goals >= 3);
    if (window.GZ && GZ.recordTikiTaka) { const rec = GZ.recordTikiTaka({ score, goals, bestChain: chain, superUsed: usedSuper, team, stars: st, lobGoal: lobGoals > 0 }); GZ.announceBadges(rec.newBadges); }
    const earned = rpgAward(score, goals);
    $("end-text").textContent += ` You earned ${earned} coins.`;
    showBest();
    renderTraining();
    renderLadder();
    renderLeaderboard();
    $("screen-end").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  const escapeHtml = (s) => { const d = document.createElement("div"); d.textContent = String(s); return d.innerHTML; };
  async function renderLeaderboard() {
    const body = document.querySelector("#leaderboard tbody");
    body.innerHTML = "<tr><td colspan='3'>Loading top scores...</td></tr>";
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?game=eq.${GAME_ID}&select=player_name,score&order=score.desc&limit=${LEADERBOARD_SIZE}`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
      if (!res.ok) throw new Error(res.status);
      const rows = await res.json();
      body.innerHTML = rows.length
        ? "<tr><th>#</th><th>Name</th><th>Score</th></tr>" + rows.map((r, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(r.player_name)}</td><td>${Number(r.score)}</td></tr>`).join("")
        : "<tr><td colspan='3'>No scores yet. Be the first!</td></tr>";
    } catch (e) {
      body.innerHTML = "<tr><td colspan='3'>Couldn't load the top scores right now.</td></tr>";
    }
  }

  $("name-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("player-name").value.trim();
    if (!name) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ game: GAME_ID, player_name: name, score: finalScore }),
      });
      if (!res.ok) throw new Error(res.status);
      $("name-form").hidden = true;
      $("saved-msg").textContent = `Saved! ${finalScore} points for ${name}.`;
      renderLeaderboard();
    } catch (err) {
      $("saved-msg").textContent = "Couldn't save online right now. Try again later.";
    }
  });

  $("btn-start").addEventListener("click", start);
  $("btn-again").addEventListener("click", start);

  showBest();
  renderTraining();
  window.addEventListener("gz-rewards", renderTraining);
  renderLadder();
  loadEngine().then(() => {
    $("btn-start").disabled = false;
    renderLadder();
  }).catch((err) => {
    $("btn-start").textContent = "Couldn't load the game";
    console.error(err);
  });
})();
