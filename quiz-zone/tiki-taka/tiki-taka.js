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
  const I = { PHASE: 0, SCORE: 1, LEFT: 2, NO: 3, CHAIN: 4, RESULT: 5, PHASE_T: 6, TIME: 7, GOALS: 8, OWNER: 9, N_ATT: 10, N_DEF: 11,
    AIM: 12, AIM_LEN: 13, AIM_DX: 14, AIM_DY: 15, AIM_TARGET: 16, AIM_EX: 17, AIM_EY: 18, INTRO: 19, SHIELD: 20, SHOT: 21,
    BEST_CHAIN: 22, PASSES: 23, PRESSURE: 24, BX: 25, BY: 26, BVX: 27, BVY: 28, RECEIVER: 29, CAN_SHOOT: 30, BONUS: 31, LEVEL: 32,
    METER: 33, FREEZE: 34, CINE_T: 35, SKILL: 36, CINE_KIND: 37, SUPER_SHOT: 38, SLOW_LEFT: 39, P0: 40, STRIDE: 8 };
  const PH = { PLAY: 1, RESULT: 2, OVER: 3, CINE: 4 };
  const R = { NONE: 0, GOAL: 1, SAVED: 2, MISS: 3, BLOCKED: 4, TACKLED: 5, POST: 6, OUT: 7 };
  const E = { KICK: 1, PASS: 2, SHOT: 3, TACKLE: 4, SAVE: 5, POST: 6, GOAL: 7, MISS: 8, BLOCK: 9, START: 11, OVER: 12, SUPER: 13, FREEZE: 14, METER_FULL: 15 };
  const ATTACKS = 5;
  const TOP = 46;                // room above the goal line to show the net
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
    cv.height = Math.round(w * dpr * (H + TOP) / W);
    $("confetti").width = cv.width; $("confetti").height = cv.height;
  }
  window.addEventListener("resize", () => { if (wasm) fit(); });

  const STRIPES = 10;
  function drawPitch(t) {
    // grass with mowing stripes
    for (let i = 0; i < STRIPES; i++) {
      ctx.fillStyle = i % 2 ? "#2f7a3a" : "#348640";
      ctx.fillRect(0, (H / STRIPES) * i, W, H / STRIPES + 1);
    }
    ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 3; ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.strokeRect(14, 14, W - 28, H - 28);
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
    // shadow
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(2, 5, 16, 11, 0, 0, 7); ctx.fill();
    if (o.ring) {
      ctx.strokeStyle = o.ring; ctx.lineWidth = 3; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(0, 0, 22 + (o.pulse || 0), 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // body
    ctx.fillStyle = shirt; ctx.strokeStyle = trim; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill(); ctx.stroke();
    // head, on the side he is facing
    ctx.fillStyle = o.hair || "#3b2616";
    ctx.beginPath(); ctx.arc(Math.cos(face) * 9, Math.sin(face) * 9, 6.5, 0, 7); ctx.fill();
    if (label !== "") {
      ctx.fillStyle = o.text || trim; ctx.font = "700 13px Rajdhani, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, -Math.cos(face) * 3, -Math.sin(face) * 3 + 1);
    }
    ctx.restore();
  }

  function drawBall(x, y, vx, vy, t) {
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(x + 2, y + 4, 8, 5, 0, 0, 7); ctx.fill();
    const sp = Math.hypot(vx, vy);
    if (sp > 260) { // a little streak behind a fast ball
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - vx * 0.035, y - vy * 0.035); ctx.stroke(); ctx.lineCap = "butt";
    }
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#1b1720"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1b1720"; ctx.beginPath(); ctx.arc(x + Math.cos(t * 6 + x * 0.1) * 2, y + Math.sin(t * 6 + y * 0.1) * 2, 2.4, 0, 7); ctx.fill();
  }

  function drawAim(ox, oy, t) {
    const len = S[I.AIM_LEN];
    if (!S[I.AIM] || len < 20) return;
    const dx = S[I.AIM_DX], dy = S[I.AIM_DY], ex = S[I.AIM_EX], ey = S[I.AIM_EY];
    const snapped = S[I.AIM_TARGET] >= 0;
    const col = snapped ? "#ffd66b" : "#ffffff";
    // dotted path
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.setLineDash([2, 12]); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = "butt";
    // arrow head at the end
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(ex + dx * 10, ey + dy * 10);
    ctx.lineTo(ex - dy * 11 - dx * 8, ey + dx * 11 - dy * 8);
    ctx.lineTo(ex + dy * 11 - dx * 8, ey - dx * 11 - dy * 8);
    ctx.closePath(); ctx.fill();
    // the target team-mate lights up (drawn in drawPlayers via the ring)
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
      ctx.fillStyle = v; ctx.fillRect(0, -TOP, W, H + TOP);
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
    ctx.fillStyle = sp; ctx.fillRect(0, -TOP, W, H + TOP);
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
    const sc = cv.width / W;
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    ctx.fillStyle = "#15301b"; ctx.fillRect(0, 0, W, TOP + 2);
    ctx.setTransform(sc, 0, 0, sc, 0, TOP * sc);
    drawPitch(t);
    if (!S) return;
    const nA = S[I.N_ATT] | 0, nD = S[I.N_DEF] | 0, owner = S[I.OWNER] | 0;
    const k = kit(), hair = hairColour(), num = look().number;
    const aimTarget = S[I.AIM_TARGET] | 0;
    const recv = S[I.RECEIVER] | 0;
    const pulse = Math.sin(t * 7) * 2;
    const players = [];
    for (let i = 0; i < nA + nD + 1; i++) {
      const b = I.P0 + i * I.STRIDE;
      players.push({ x: S[b], y: S[b + 1], face: S[b + 4], kind: S[b + 5], no: S[b + 6], extra: S[b + 7], i });
    }
    players.sort((a, b) => a.y - b.y);
    // defenders in a pale blue away kit, the keeper in green
    for (const p of players) {
      if (p.kind === 0) {
        const mine = p.i === 4; // the striker is George
        const isOwner = p.i === owner;
        const ring = isOwner ? "#ffd66b" : (p.i === aimTarget || (p.i === recv && S[I.AIM] === 0)) ? "#ffffff" : null;
        drawPlayer(p.x, p.y, p.face, k.shirt, k.trim, mine ? String(num) : "", { hair: mine ? hair : "#3b2616", text: k.text, ring, pulse: isOwner ? pulse : 0 });
      } else if (p.kind === 1) {
        const danger = Math.min(1, p.extra);   // how close to a tackle
        drawPlayer(p.x, p.y, p.face, "#7fb3ff", danger > 0.05 ? "#ff5d5d" : "#1a3a73", "", { hair: "#1a1a1a", ring: danger > 0.05 ? "rgba(255,93,93," + (0.4 + danger * 0.6) + ")" : null });
      } else {
        drawPlayer(p.x, p.y, Math.PI / 2, "#1f9d55", "#0e5a30", "1", { hair: "#222", text: "#fff" });
      }
    }
    // pass preview and the ball on top
    const bx = S[I.BX], by = S[I.BY];
    drawAim(bx, by, t);
    drawBall(bx, by, S[I.BVX], S[I.BVY], t);
    drawEffects(t, owner);
    // goal flash
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.35})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - 0.03); }
  }

  /* ---------------- HUD + messages ---------------- */
  const hud = { score: $("hud-score"), chain: $("hud-chain"), attack: $("hud-attack"), pips: $("hud-pips") };
  let pipState = [];
  let lastHud = "";
  function updateHud() {
    const score = S[I.SCORE] | 0, chain = S[I.CHAIN] | 0, no = Math.min(ATTACKS, S[I.NO] | 0);
    const key = [score, chain, no, pipState.join("")].join("|");
    if (key === lastHud) return;
    lastHud = key;
    hud.score.textContent = score;
    hud.chain.textContent = chain;
    hud.attack.textContent = `Attack ${no} of ${ATTACKS}`;
    hud.pips.innerHTML = Array.from({ length: ATTACKS }, (_, i) => `<span class="tt-pip ${pipState[i] || (i === no - 1 ? "now" : "")}"></span>`).join("");
  }

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
    [R.TACKLED]: ["WON BY THE DEFENDER", "soft"], [R.POST]: ["OFF THE POST!", "soft"], [R.OUT]: ["OUT OF PLAY", "soft"],
  };

  /* ---------------- Engine events -> sounds and effects ---------------- */
  let lastResult = 0;
  function handleEvents() {
    const n = wasm.events_len();
    if (!n) return;
    const ev = new Uint8Array(wasm.memory.buffer, wasm.events_ptr(), n).slice();
    wasm.events_clear();
    for (const e of ev) {
      if (!soundOn) { if (e === E.GOAL) flash = 1; continue; }
      if (e === E.START) sfx.whistle();
      else if (e === E.KICK) sfx.kick();
      else if (e === E.PASS) sfx.ding();
      else if (e === E.TACKLE) sfx.thud();
      else if (e === E.BLOCK) sfx.thud();
      else if (e === E.SAVE) sfx.save();
      else if (e === E.POST) sfx.post();
      else if (e === E.MISS) sfx.aww();
      else if (e === E.GOAL) { sfx.roar(); MUSIC.goalSong({ short: true }); }
      else if (e === E.OVER) sfx.whistle();
      else if (e === E.SUPER) { sfx.unlock(); sfx.roar(); }
      else if (e === E.FREEZE) sfx.buzz();
      else if (e === E.METER_FULL) sfx.unlock();
      if (e === E.GOAL) flash = 1;
    }
  }

  /* ---------------- Input ---------------- */
  function toWorld(ev) {
    const r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * (H + TOP) / r.height - TOP };
  }
  let drag = null;
  cv.addEventListener("pointerdown", (ev) => {
    if (!running) return;
    ev.preventDefault();
    if (replay) { skipReplay(); return; }
    SOUND.wake();
    refresh();
    if (S[I.PHASE] !== PH.PLAY || (S[I.OWNER] | 0) < 0) return;
    const p = toWorld(ev);
    // a tap on the goal is a shot at that spot
    if (p.y < 70 && p.x > GOAL_L - 20 && p.x < GOAL_R + 20) { doShoot(p.x); return; }
    drag = { id: ev.pointerId, x0: p.x, y0: p.y };
    try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    wasm.aim_begin();
  });
  cv.addEventListener("pointermove", (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    const p = toWorld(ev);
    wasm.aim_update((p.x - drag.x0) * DRAG_K, (p.y - drag.y0) * DRAG_K);
  });
  function endDrag(ev, cancel) {
    if (!drag || (ev && ev.pointerId !== drag.id)) return;
    drag = null;
    if (cancel) wasm.aim_cancel();
    else if (wasm.aim_release()) say("");
    else say("Drag further to pass.");
  }
  cv.addEventListener("pointerup", (ev) => endDrag(ev, false));
  cv.addEventListener("pointercancel", (ev) => endDrag(ev, true));
  cv.addEventListener("lostpointercapture", (ev) => { if (drag) endDrag(ev, true); });

  function doShoot(x) {
    refresh();
    if (S[I.PHASE] !== PH.PLAY || (S[I.OWNER] | 0) < 0) return;
    wasm.shoot(x === undefined ? NaN : x);
    say("");
  }
  $("btn-shoot").addEventListener("click", () => { SOUND.wake(); doShoot(); });
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

  // Keyboard: arrows aim a pass from the ball (hold to lengthen, let go to pass); Space or Enter shoots.
  const keys = { x: 0, y: 0, held: false, len: 0 };
  document.addEventListener("keydown", (e) => {
    if (!running || e.target.tagName === "INPUT" || e.target.tagName === "BUTTON" && e.key !== " " && e.key !== "Enter") return;
    if (replay) { e.preventDefault(); skipReplay(); return; }
    const map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
    if (map[e.key]) {
      e.preventDefault();
      if (!keys.held) { refresh(); if (S[I.PHASE] !== PH.PLAY || (S[I.OWNER] | 0) < 0) return; keys.held = true; keys.len = 0; wasm.aim_begin(); }
      keys.x += map[e.key][0] * 0.0001; keys.y += map[e.key][1] * 0.0001;
      keys.dirs = keys.dirs || {}; keys.dirs[e.key] = map[e.key];
    } else if ((e.key === "Shift" || e.key === "e" || e.key === "E") && e.target.tagName !== "BUTTON") {
      e.preventDefault(); SOUND.wake(); doSuper();
    } else if ((e.key === " " || e.key === "Enter") && e.target.tagName !== "BUTTON") {
      e.preventDefault(); SOUND.wake(); doShoot();
    }
  });
  document.addEventListener("keyup", (e) => {
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
  const REPLAY_SECS = 2.2;       // how much of the attack to show
  const REPLAY_SPEED = 0.9;      // a little slower than real life
  const REPLAY_DELAY = 0.9;      // let the result sink in first
  let rec = [], recNo = -1, resultFor = 0, replayDone = false, replay = null;

  function record() {
    const no = S[I.NO] | 0, phase = S[I.PHASE] | 0;
    if (no !== recNo) { rec = []; recNo = no; replayDone = false; resultFor = 0; }
    if (phase !== PH.PLAY && phase !== PH.RESULT) return;
    rec.push({ t: clock, s: S.slice() });
    while (rec.length > 2 && rec[0].t < clock - 4.5) rec.shift();
  }
  function startReplay() {
    if (rec.length < 20) { replayDone = true; return; }
    const end = rec[rec.length - 1].t;
    const frames = rec.filter((f) => f.t >= end - REPLAY_SECS);
    replay = { frames, t0: frames[0].t, len: end - frames[0].t, pos: 0, i: 0 };
    replayDone = true;
    popEl.className = "tt-pop";
    say("");
  }
  function skipReplay() { if (replay) { replay = null; last = performance.now(); refresh(); } }
  function replayFrame(dt) {
    const r = replay;
    r.pos += dt * REPLAY_SPEED;
    if (r.pos >= r.len + 0.35) { skipReplay(); return; }      // hold the last picture for a moment
    const target = r.t0 + Math.min(r.pos, r.len);
    while (r.i < r.frames.length - 1 && r.frames[r.i + 1].t <= target) r.i++;
    S = r.frames[r.i].s.slice();
    S[I.AIM] = 0; S[I.PHASE] = PH.PLAY; S[I.INTRO] = 0;
    draw(clock);
    // broadcast look: bars, a REPLAY tag, and a hint
    ctx.fillStyle = "rgba(0,0,0,.62)";
    ctx.fillRect(0, -TOP, W, TOP + 30); ctx.fillRect(0, H - 30, W, 30);
    ctx.fillStyle = "#ff3b4e"; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(clock * 8);
    ctx.beginPath(); ctx.arc(34, -TOP / 2 + 6, 8, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff"; ctx.font = "700 30px Rajdhani, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("REPLAY", 52, -TOP / 2 + 7);
    ctx.textAlign = "right"; ctx.font = "600 17px Manrope, sans-serif"; ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.fillText("Tap to skip", W - 22, H - 14);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000 || 0.016);
    last = now; clock += dt;
    if (replay) { replayFrame(dt); return; }
    keyAimStep(dt);
    wasm.tick(dt * 1000);
    refresh();
    handleEvents();
    record();
    draw(clock);
    updateHud();
    const phase = S[I.PHASE] | 0, result = S[I.RESULT] | 0;
    const canShoot = S[I.CAN_SHOOT] === 1;
    $("btn-shoot").disabled = !canShoot;
    updateSuper(canShoot);
    if (phase === PH.PLAY) {
      lastResult = 0;
      const owner = S[I.OWNER] | 0;
      if (owner >= 0 && S[I.AIM] === 0) {
        const pr = S[I.PRESSURE];
        if (S[I.INTRO] > 0) say("Get ready...");
        else if (pr < 70) say("Defender closing in! Pass or shoot!");
        else say((S[I.CHAIN] | 0) === 0 ? "Drag to pass. Time slows while you aim." : "Keep it moving, or shoot when you are ready.");
      } else if (S[I.AIM] === 1) say(S[I.SLOW_LEFT] > 0 ? (S[I.AIM_TARGET] >= 0 ? "Locked on. Let go to pass!" : "Time is slowed. Line it up!") : (S[I.AIM_TARGET] >= 0 ? "Locked on. Let go to pass!" : "Let go to pass."));
    } else if (phase === PH.CINE) {
      say("");
    } else if (phase === PH.RESULT && lastResult !== result + 100) {
      lastResult = result + 100;
      const no = S[I.NO] | 0;
      pipState[no - 1] = result === R.GOAL ? "goal" : "fail";
      const [txt, cls] = RESULT_TEXT[result] || ["", "soft"];
      const bonus = S[I.BONUS] | 0;
      pop(txt, result === R.GOAL ? `+${bonus} points` : "", cls);
      if (result === R.GOAL) { GK.confetti(confettiCanvas, 120); }
      say("");
    }
    if (phase === PH.RESULT) {
      resultFor += dt;
      if (!replayDone && resultFor >= REPLAY_DELAY) startReplay();
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
    const out = { coins: Math.max(0, +r.coins || 0), stats: {}, skills: Array.isArray(r.skills) ? r.skills.filter((x) => typeof x === "string") : ["rocket"], skill: r.skill === "freeze" ? "freeze" : "rocket" };
    for (const st of STATS) out.stats[st.id] = Math.max(0, Math.min(MAX_LEVEL, Math.floor(+(r.stats && r.stats[st.id]) || 0)));
    if (!out.skills.includes("rocket")) out.skills.push("rocket");
    if (!out.skills.includes(out.skill)) out.skill = "rocket";
    return out;
  }
  function rpgSave(r) { try { localStorage.setItem(RPG_KEY, JSON.stringify(r)); } catch (e) {} }
  function rpgAward(score, goals) {
    const r = rpgLoad();
    const earned = Math.round(score / 8) + goals * 10 + 5;
    r.coins += earned;
    rpgSave(r);
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
      r.coins -= cost; r.stats[id] = lvl + 1; rpgSave(r);
      renderTraining(); trainMsg(`${STATS.find((x) => x.id === id).name} is now level ${lvl + 1}!`);
      if (soundOn) { SOUND.wake(); sfx.unlock(); }
    } else if (b.dataset.skill) {
      const k = SKILLS.find((x) => x.id === b.dataset.skill);
      if (!r.skills.includes(k.id)) {
        if (r.coins < k.cost) { trainMsg(`${k.name} costs ${k.cost} coins. You need ${k.cost - r.coins} more.`); return; }
        r.coins -= k.cost; r.skills.push(k.id);
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

  function start() {
    SOUND.wake();
    const r = rpgLoad();
    wasm.new_game((Math.random() * 4294967295) >>> 0, r.stats.speed, r.stats.power, r.stats.technique, r.stats.composure, r.skill === "freeze" ? 1 : 0);
    pipState = []; lastHud = ""; finished = false; lastResult = 0; flash = 0; rec = []; recNo = -1; replay = null; replayDone = false; resultFor = 0;
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
    const score = S[I.SCORE] | 0, goals = S[I.GOALS] | 0, passes = S[I.PASSES] | 0, chain = S[I.BEST_CHAIN] | 0;
    finalScore = score;
    const prev = bestScore();
    const isBest = score > prev;
    if (isBest) { try { localStorage.setItem(BEST_KEY, String(score)); } catch (e) {} }
    if (goals >= 3) MUSIC.winTune({ ms: 5000 }); else MUSIC.fadeOut(500);
    $("screen-game").hidden = true; $("screen-end").hidden = false;
    $("end-title").textContent = goals >= 4 ? "Tiki-Taka masterclass!" : goals >= 2 ? "Great passing!" : goals === 1 ? "A goal, well done!" : "No goals this time";
    $("end-text").textContent = goals === 0
      ? "Keep the ball moving and shoot as soon as there is a gap in front of goal. Have another go!"
      : isBest && prev ? `New personal best: ${score} points!` : `${goals} goal${goals === 1 ? "" : "s"} from ${ATTACKS} attacks.`;
    $("end-stats").innerHTML = [["Score", score], ["Goals", goals], ["Passes", passes], ["Best chain", chain]]
      .map(([k, v]) => `<div class="tt-stat"><b>${v}</b><span>${k}</span></div>`).join("");
    $("name-form").hidden = score === 0;
    $("saved-msg").textContent = "";
    if (goals >= 2 && soundOn) { sfx.fanfare(); setTimeout(() => GK.confetti(confettiCanvas, 160), 200); }
    const earned = rpgAward(score, goals);
    $("end-text").textContent += ` You earned ${earned} coins.`;
    showBest();
    renderTraining();
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
  loadEngine().then(() => {
    $("btn-start").disabled = false;
    $("btn-start").textContent = "Kick off";
  }).catch((err) => {
    $("btn-start").textContent = "Couldn't load the game";
    console.error(err);
  });
})();
