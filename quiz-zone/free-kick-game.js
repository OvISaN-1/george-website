/* ================================================================
   FREE KICK MASTERS
   George vs the wall. Aim, pick your curl, hit the power, and bend
   it into the top bins. Season mode, daily challenge, practice,
   a FUT-style player card that levels up, unlockable kits, boots,
   balls and celebrations, commentary, slow-mo replays, wind, rain
   and night games. Missed? Answer a Forest question for a retake.
   ================================================================ */
(function () {
  "use strict";
  const { util, C } = GK;
  const { rand, pick, shuffle, sleep, lerp, clamp, tween, reduced, escapeHtml } = util;
  const $ = (id) => document.getElementById(id);

  const SUPABASE_URL = "https://hucnucpfyjltlhmvprso.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Y251Y3BmeWpsdGxobXZwcnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDgzNjEsImV4cCI6MjEwMzU4NDM2MX0.DSjLCkiUWB47wVd4wnW_2RvWFoISbH80JI9ukB1bBdg";
  const GAME_ID = "free-kick";
  const SAVE_KEY = "gz_freekick_v1";

  /* ================================================================
     SEASON: six matches, each a bit harder. Tweak numbers here.
       kicks: free kicks in the match   dist: [min, max] yards
       wallN: players in the wall       keeper: 0 (hopeless) to 1 (wall)
       wind:  max mph                   guide: show the dotted aim line
       night / rain: weather            home: true at the City Ground
     ================================================================ */
  const SEASON = [
    { id: "training", name: "Training Ground", opp: "Forest Reserves", venue: "Forest training ground", home: true, kicks: 3, dist: [18, 20], wallN: 2, keeper: 0.35, wind: 0, guide: true, night: false, rain: false,
      oppKit: { shirt: "#1f9d55", shorts: "#15121a", hair: "#3a2414" }, keeperKit: "#f2c200", intro: "Warm-up time. Learn the ropes before the big games." },
    { id: "palace", name: "Crystal Palace (A)", opp: "Crystal Palace", venue: "Selhurst Park", home: false, kicks: 5, dist: [18, 24], wallN: 3, keeper: 0.45, wind: 4, guide: true, night: false, rain: false,
      oppKit: { shirt: "#1b458f", shorts: "#1b458f", hair: "#231914" }, keeperKit: "#ff7a1a", crowd: ["#1b458f", "#c4122e"], intro: "First away trip. Silence the Palace fans." },
    { id: "arsenal", name: "Arsenal (H)", opp: "Arsenal", venue: "The City Ground", home: true, kicks: 5, dist: [19, 26], wallN: 4, keeper: 0.5, wind: 6, guide: false, night: true, rain: false,
      oppKit: { shirt: "#ef0107", shorts: "#ffffff", hair: "#1c1410" }, keeperKit: "#7ee04a", intro: "Saturday night lights at the City Ground. No aim line from now on!" },
    { id: "brentford", name: "Brentford (A)", opp: "Brentford", venue: "Gtech Community Stadium", home: false, kicks: 5, dist: [20, 27], wallN: 4, keeper: 0.55, wind: 8, guide: false, night: false, rain: true,
      oppKit: { shirt: "#e30613", shorts: "#15121a", hair: "#4a3020" }, keeperKit: "#b44cff", crowd: ["#e30613", "#ffffff"], intro: "Rain in West London. Watch the wind." },
    { id: "city", name: "Man City (H)", opp: "Man City", venue: "The City Ground", home: true, kicks: 5, dist: [20, 30], wallN: 4, keeper: 0.6, wind: 10, guide: false, night: true, rain: false,
      oppKit: { shirt: "#6cabdd", shorts: "#ffffff", hair: "#3a2414" }, keeperKit: "#ff4fa3", intro: "The champions come to Nottingham. Big wall, top keeper." },
    { id: "derby", name: "Derby Day: Brian Clough Trophy", opp: "Derby County", venue: "The City Ground", home: true, kicks: 5, dist: [22, 32], wallN: 5, keeper: 0.65, wind: 10, guide: false, night: true, rain: true,
      oppKit: { shirt: "#ffffff", shorts: "#15121a", hair: "#231914" }, keeperKit: "#f2c200", derby: true, intro: "The big one. Beat Derby and the Brian Clough Trophy stays in Nottingham." },
  ];

  /* ================================================================
     UNLOCKS: need = { stars: n } or { level: n }
     ================================================================ */
  const BALLS = [
    { id: "classic", name: "Classic", need: null, fill: "#ffffff", patch: "#1b1720", glow: null },
    { id: "red", name: "Forest Red", need: { stars: 3 }, fill: "#e1102c", patch: "#ffffff", glow: null },
    { id: "night", name: "Night Glow", need: { level: 3 }, fill: "#d9f99d", patch: "#14532d", glow: "#bef264" },
    { id: "gold", name: "Golden Ball", need: { stars: 9 }, fill: "#ffd66b", patch: "#7a4a0a", glow: "#f5b942" },
    { id: "flame", name: "Flame", need: { stars: 14 }, fill: "#ff7a1a", patch: "#7a0d20", glow: "#ff4d1a", trail: "#ff7a1a" },
    { id: "galaxy", name: "Galaxy", need: { stars: 18 }, fill: "#3b1d7a", patch: "#e9d5ff", glow: "#a264ff", trail: "#a264ff" },
  ];
  const KITS = [
    { id: "home", name: "Home red", need: null },
    { id: "away", name: "Away white", need: { stars: 5 } },
    { id: "retro", name: "1979 European Cup", need: { stars: 10 } },
    { id: "legend", name: "Forest Legend gold", need: { stars: 16 } },
  ];
  const BOOTS = [
    { id: "black", name: "Classic black", need: null, colour: "#15121a" },
    { id: "red", name: "Red", need: { level: 2 }, colour: "#e1102c" },
    { id: "neon", name: "Neon", need: { level: 4 }, colour: "#a3e635" },
    { id: "gold", name: "Gold", need: { level: 6 }, colour: "#f5b942" },
  ];
  const CELEBRATIONS = [
    { id: "armsup", name: "Arms up", need: null, pose: "up", anim: "cele-jump", shout: "GET IN!" },
    { id: "slide", name: "Knee slide", need: { stars: 2 }, pose: "out", anim: "cele-slide", shout: "KNEE SLIDE!" },
    { id: "siuuu", name: "SIUUU", need: { stars: 6 }, pose: "out", anim: "cele-siuuu", shout: "SIUUUU!" },
    { id: "badge", name: "Point to the badge", need: { level: 3 }, pose: "point", anim: "cele-zoom", shout: "FOREST!" },
    { id: "robot", name: "The Robot", need: { stars: 12 }, pose: "out", anim: "cele-robot", shout: "BEEP BOOP GOAL" },
  ];

  const LEVELS = [0, 200, 500, 900, 1400, 2000, 2800, 3800, 5000, 6500];

  /* ================================================================
     Commentary. {d} = distance, {opp} = opponent
     ================================================================ */
  const LINES = {
    setup: ["George stands over it. {d} yards out.", "Free kick to Forest, {d} yards. This is George territory.", "The wall's lined up. George takes a deep breath.", "{d} yards. The crowd are on their feet.", "Here's George. Can he bend this one?"],
    goal: ["OH, WHAT A FREE KICK!", "He's only gone and done it!", "George, you beauty!", "Into the net! The City Ground is shaking!", "Unstoppable! Absolutely unstoppable!"],
    topbins: ["TOP BINS! Right in the corner!", "Where the owl sleeps! Top corner!", "That is a WORLDIE, top bins!"],
    banana: ["Look at the bend on that! A banana kick!", "He's curled it round the wall like Beckham!"],
    long: ["From {d} yards! What a strike!"],
    postin: ["Off the post and IN!", "Kisses the post and goes in!"],
    wall: ["Straight into the wall.", "The wall does its job this time.", "Blocked! Keep it a bit higher, George."],
    saved: ["Great save by the keeper!", "The keeper gets a fingertip to it!", "Saved! He read that one."],
    over: ["Over the bar and into the crowd!", "That one's gone into orbit!", "Just too much on it."],
    wide: ["Wide of the post.", "Just past the post!"],
    post: ["Off the woodwork! So close!", "CLANG! Off the post!"],
    retake: ["The ref says RETAKE! The wall moved!", "Retake! Encroachment from the wall!"],
  };
  const fill = (s, kick) => s.replace("{d}", Math.round(kick.dist)).replace("{opp}", kick.opp || "");

  /* ================================================================
     Save data (this device only)
     ================================================================ */
  function defaults() {
    return { stars: {}, bestPoints: {}, xp: 0, goals: 0, kicks: 0, selected: { ball: "classic", kit: "home", boots: "black", celebration: "armsup" },
      daily: { doneDate: null, streak: 0, lastDate: null }, practiceBest: 0, seenUnlocks: [] };
  }
  function loadSave() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) return Object.assign(defaults(), s, { selected: Object.assign(defaults().selected, s.selected || {}), daily: Object.assign(defaults().daily, s.daily || {}) }); } catch (e) {}
    return defaults();
  }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} }
  let SAVE = loadSave();

  const totalStars = () => Object.values(SAVE.stars).reduce((a, b) => a + b, 0);
  function levelOf(xp) { let l = 1; LEVELS.forEach((t, i) => { if (xp >= t) l = i + 1; }); return l; }
  function isUnlocked(item) {
    if (!item.need) return true;
    if (item.need.stars != null) return totalStars() >= item.need.stars;
    if (item.need.level != null) return levelOf(SAVE.xp) >= item.need.level;
    return false;
  }
  const needText = (n) => !n ? "" : n.stars != null ? `${n.stars} ★` : `Level ${n.level}`;
  const allUnlockables = () => [
    ...BALLS.map((x) => ({ ...x, type: "ball", label: "ball" })), ...KITS.map((x) => ({ ...x, type: "kit", label: "kit" })),
    ...BOOTS.map((x) => ({ ...x, type: "boots", label: "boots" })), ...CELEBRATIONS.map((x) => ({ ...x, type: "celebration", label: "celebration" })),
  ];
  const selectedBall = () => BALLS.find((b) => b.id === SAVE.selected.ball) || BALLS[0];
  const selectedCele = () => CELEBRATIONS.find((c) => c.id === SAVE.selected.celebration) || CELEBRATIONS[0];
  const selectedBoots = () => (BOOTS.find((b) => b.id === SAVE.selected.boots) || BOOTS[0]).colour;

  /* ================================================================
     Player card (FUT style)
     ================================================================ */
  function cardTier(level) {
    if (level >= 10) return { id: "icon", name: "ICON" };
    if (level >= 8) return { id: "hero", name: "FOREST HERO" };
    if (level >= 5) return { id: "gold", name: "GOLD" };
    if (level >= 3) return { id: "silver", name: "SILVER" };
    return { id: "bronze", name: "BRONZE" };
  }
  function playerCard() {
    const lvl = levelOf(SAVE.xp);
    const tier = cardTier(lvl);
    const st = totalStars();
    const ovr = Math.min(99, 70 + lvl * 2 + Math.floor(st / 4));
    const stats = [
      ["PAC", Math.min(99, 78 + lvl)], ["SHO", Math.min(99, 70 + lvl * 2 + Math.floor(st / 6))], ["PAS", Math.min(99, 72 + lvl)],
      ["DRI", Math.min(99, 80 + lvl)], ["FK", Math.min(99, 66 + lvl * 3)], ["PHY", Math.min(99, 58 + lvl * 2)],
    ];
    return `<div class="fut ${tier.id}">
      <div class="fut-top"><span class="fut-ovr">${ovr}</span><span class="fut-pos">ST</span>
        <span class="fut-badge" aria-hidden="true"><svg viewBox="0 0 20 22"><path d="M10 1 L19 5 V12 C19 17 14 20 10 21 C6 20 1 17 1 12 V5 Z" fill="#d7102b" stroke="#fff" stroke-width="1.2"/><g fill="#fff"><circle cx="10" cy="8" r="2.6"/><circle cx="7.6" cy="10.4" r="2.2"/><circle cx="12.4" cy="10.4" r="2.2"/><rect x="9.3" y="11" width="1.4" height="4"/></g><path d="M5 16 Q7.5 15 10 16 T15 16" stroke="#fff" stroke-width=".9" fill="none"/></svg></span>
      </div>
      <div class="fut-face">${GK.avatar({ pose: "idle", kit: SAVE.selected.kit })}</div>
      <div class="fut-name">GEORGE</div>
      <div class="fut-stats">${stats.map(([k, v]) => `<span><b>${v}</b> ${k}</span>`).join("")}</div>
      <div class="fut-tier">${tier.name} · LVL ${lvl}</div>
    </div>`;
  }

  /* ================================================================
     Sound, voice, confetti, rain
     ================================================================ */
  const SOUND = GK.createSound("gz_freekick_sound");
  const sfx = SOUND.sfx;
  const VOICE = GK.createVoice("gz_freekick_voice");
  const confettiCanvas = $("confetti");
  const rainCanvas = $("rain");
  let rainRaf = null;
  function startRain(on) {
    cancelAnimationFrame(rainRaf);
    const g = rainCanvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = rainCanvas.width = rainCanvas.clientWidth * dpr, h = rainCanvas.height = rainCanvas.clientHeight * dpr;
    g.clearRect(0, 0, w, h);
    if (!on || reduced) return;
    const drops = Array.from({ length: 140 }, () => ({ x: rand() * w, y: rand() * h, l: (8 + rand() * 10) * dpr, v: (7 + rand() * 6) * dpr }));
    (function frame() {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = "rgba(210,225,255,0.45)"; g.lineWidth = 1 * dpr;
      g.beginPath();
      drops.forEach((d) => { d.y += d.v; d.x -= d.v * 0.25; if (d.y > h) { d.y = -d.l; d.x = rand() * w * 1.2; } g.moveTo(d.x, d.y); g.lineTo(d.x + d.l * 0.25, d.y - d.l); });
      g.stroke();
      rainRaf = requestAnimationFrame(frame);
    })();
  }

  /* ================================================================
     Scene
     ================================================================ */
  const svg = $("pitch"), stage = $("stage");
  const goalG = $("goal-g"), wallG = $("wall-g"), keeperG = $("keeper"), strikerG = $("striker");
  const ballG = $("ball"), shadowEl = $("ball-shadow"), aimEl = $("aim"), guideEl = $("guide"), targetEl = $("target-ring"), trailEl = $("trail");
  const BX = FKP.BX, BY = FKP.BY;
  const STRIKER_HOME = { x: 160, y: 438, s: 1 };
  const STRIKER_KICK = { x: 186, y: 430, s: 0.95 };

  function fitView() {
    const w = stage.clientWidth || 360;
    const h = Math.min(w * 1.1, window.innerHeight * 0.64);
    const vw = Math.max(400, Math.min(640, (440 * w) / h));
    svg.setAttribute("viewBox", `${(200 - vw / 2).toFixed(1)} 0 ${vw.toFixed(1)} 440`);
  }
  window.addEventListener("resize", fitView);

  function drawCrowd(match) {
    const cols = match.home ? ["#e1102c", "#e1102c", "#e1102c", "#f4efe9", "#7a0d20", "#f5b942"] : (match.crowd || ["#1b458f", "#ffffff"]).concat(match.crowd || []);
    let html = "";
    for (let row = 0; row < 7; row++) {
      const y = 56 + row * 11.5;
      for (let x = -116 + (row % 2) * 4; x < 520; x += 8.2) {
        // Away games: a small red Forest away end on the left.
        const col = !match.home && x < -40 ? pick(["#e1102c", "#e1102c", "#f4efe9"]) : pick(cols);
        html += `<circle cx="${x.toFixed(1)}" cy="${(y + (rand() - 0.5) * 3).toFixed(1)}" r="3.1" fill="${col}" class="fan"/>`;
      }
    }
    $("crowd").innerHTML = html;
    $("stand").setAttribute("fill", match.home ? "#3a0e18" : "#1d2233");
    $("sky").setAttribute("fill", match.night ? "url(#g-night)" : "url(#g-sky)");
    $("lights").style.opacity = match.night ? 1 : 0.35;
    $("pitch-rect").setAttribute("fill", match.rain ? "url(#g-pitch-wet)" : "url(#g-pitch)");
    $("led-text").textContent = match.derby
      ? "DERBY DAY ★ BRIAN CLOUGH TROPHY ★ COME ON YOU REDS ★ DERBY DAY ★ BRIAN CLOUGH TROPHY ★ COME ON YOU REDS ★"
      : `COME ON YOU REDS ★ ${match.venue.toUpperCase()} ★ GEORGE 10 ★ FREE KICK MASTERS ★ COME ON YOU REDS ★ ${match.venue.toUpperCase()} ★ GEORGE 10 ★`;
  }

  function crowdJump() {
    if (reduced) return;
    const fans = $("crowd").querySelectorAll(".fan");
    const offs = Array.from(fans, () => rand() * 4 + 2);
    tween(700, (t) => {
      const k = Math.sin(t * Math.PI * 3) * (1 - t);
      fans.forEach((f, i) => f.setAttribute("transform", `translate(0 ${(-offs[i] * Math.abs(k)).toFixed(2)})`));
    }, (t) => t);
  }

  function ballMarkup() {
    const b = selectedBall();
    return `${b.glow ? `<circle r="13" fill="${b.glow}" opacity=".35"/>` : ""}
      <circle r="9" fill="${b.fill}" stroke="#1b1720" stroke-width="1"/>
      <path d="M0 -3.5 L3.3 -1 L2 3 L-2 3 L-3.3 -1 Z" fill="${b.patch}"/>
      <path d="M0 -3.5 L0 -8.5 M3.3 -1 L8 -2.8 M2 3 L5 7 M-2 3 L-5 7 M-3.3 -1 L-8 -2.8" stroke="${b.patch}" stroke-width="1"/>`;
  }
  function setBall(x, y, s, spin) { ballG.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)}) rotate(${(spin || 0).toFixed(0)})`); }
  function setShadow(x, y, s, o) {
    shadowEl.setAttribute("cx", x.toFixed(1)); shadowEl.setAttribute("cy", y.toFixed(1));
    shadowEl.setAttribute("rx", (9 * s).toFixed(2)); shadowEl.setAttribute("ry", (3 * s).toFixed(2));
    shadowEl.setAttribute("fill-opacity", o == null ? 0.35 : o);
  }
  function setStriker(x, y, s) { strikerG.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`); }
  function setKickLeg(a) { const leg = $("kick-leg"); if (leg) leg.setAttribute("transform", `rotate(${a.toFixed(1)} 9 -42)`); }
  function setKeeper(x, y, s, dx, dy, rot) {
    keeperG.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`);
    const body = $("keeper-body");
    if (body) body.setAttribute("transform", `translate(${(dx || 0).toFixed(1)} ${(dy || 0).toFixed(1)}) rotate(${(rot || 0).toFixed(1)})`);
  }
  function setWallJump(j) {
    wallG.querySelectorAll(".def").forEach((d) => {
      const bx = +d.dataset.x, by = +d.dataset.y, s = +d.dataset.s;
      d.setAttribute("transform", `translate(${bx.toFixed(1)} ${(by - j * s).toFixed(1)}) scale(${s.toFixed(3)})`);
    });
  }

  function drawScene() {
    const K = S.kick, L = FKP.layout(K), m = S.match;
    S.L = L;
    // goal: net + frame + box line
    const k = L.k, back = 12 * k;
    const netPattern = `url(#p-net)`;
    goalG.innerHTML = `
      <path d="M${L.left} ${L.bar} L${L.left + back} ${L.bar + back * 0.8} L${L.right - back} ${L.bar + back * 0.8} L${L.right} ${L.bar} Z" fill="${netPattern}"/>
      <rect x="${L.left + back}" y="${L.bar + back * 0.8}" width="${L.gW - back * 2}" height="${L.gH - back * 1.2}" fill="#ffffff" fill-opacity=".06"/>
      <rect x="${L.left + back}" y="${L.bar + back * 0.8}" width="${L.gW - back * 2}" height="${L.gH - back * 1.2}" fill="${netPattern}" id="net-back"/>
      <path d="M${L.left} ${L.bar} L${L.left + back} ${L.bar + back * 0.8} L${L.left + back} ${L.gy - back * 0.4} L${L.left} ${L.gy} Z" fill="${netPattern}"/>
      <path d="M${L.right} ${L.bar} L${L.right - back} ${L.bar + back * 0.8} L${L.right - back} ${L.gy - back * 0.4} L${L.right} ${L.gy} Z" fill="${netPattern}"/>
      <path d="M${L.left} ${L.gy} L${L.left} ${L.bar} L${L.right} ${L.bar} L${L.right} ${L.gy}" stroke="#fff" stroke-width="${Math.max(2.5, 5 * k)}" stroke-linecap="round" fill="none"/>`;
    // pitch lines: goal line, six-yard box, 18-yard box
    const lineY = (yards) => L.gy + (BY - L.gy) * FKP.persp(yards / K.dist);
    const lineX = (u, yards) => lerp(L.gx + u, BX, FKP.persp(yards / K.dist));
    const box = (halfW, depth) => {
      const y = lineY(depth);
      return `M${lineX(-halfW, 0)} ${L.gy} L${lineX(-halfW, depth)} ${y} L${lineX(halfW, depth)} ${y} L${lineX(halfW, 0)} ${L.gy}`;
    };
    $("lines").innerHTML = `<line x1="-200" y1="${L.gy}" x2="600" y2="${L.gy}"/>
      <path d="${box(L.gW * 0.83, 6)}"/>
      ${K.dist > 18.5 ? `<path d="${box(L.gW * 1.83, 18)}"/>` : ""}
      ${K.dist > 21 ? `<path d="M${lineX(-L.gW * 0.45, 18)} ${lineY(18)} Q ${lineX(0, 21.5)} ${lineY(21.5)} ${lineX(L.gW * 0.45, 18)} ${lineY(18)}"/>` : ""}`;
    // wall
    const sw = L.sw;
    wallG.innerHTML = L.defenders.map((x) =>
      `<g class="def" data-x="${x}" data-y="${L.wallY}" data-s="${sw * 1.15}" transform="translate(${x.toFixed(1)} ${L.wallY.toFixed(1)}) scale(${(sw * 1.15).toFixed(3)})">${GK.defender(m.oppKit.shirt, m.oppKit.shorts, pick(["#f1c7a0", "#d9a67f", "#8d5a3b", "#5c3a24", "#e8b48f"]), m.oppKit.hair)}</g>`
    ).join("");
    // keeper
    keeperG.innerHTML = GK.keeper(m.keeperKit, false);
    setKeeper(L.keeperX, L.gy, L.k * 1.05, 0, 0, 0);
    // striker + ball
    strikerG.innerHTML = GK.georgeStriker(SAVE.selected.kit, selectedBoots());
    setStriker(STRIKER_HOME.x, STRIKER_HOME.y, STRIKER_HOME.s);
    setKickLeg(0);
    ballG.innerHTML = ballMarkup();
    ballG.style.opacity = 1;
    setBall(BX, BY, 1); setShadow(BX, BY + 7, 1);
    trailEl.setAttribute("d", ""); trailEl.style.opacity = 0;
    aimEl.setAttribute("opacity", 0);
    guideEl.setAttribute("d", "");
    // bonus target
    if (K.target) {
      targetEl.setAttribute("transform", `translate(${K.target.x.toFixed(1)} ${K.target.y.toFixed(1)}) scale(${L.k.toFixed(3)})`);
      targetEl.setAttribute("opacity", 1);
    } else targetEl.setAttribute("opacity", 0);
    // HUD
    $("cond-dist").textContent = `${Math.round(K.dist)} yds`;
    const w = Math.round(Math.abs(K.wind));
    $("cond-wind").textContent = w === 0 ? "No wind" : `Wind ${w} mph ${K.wind > 0 ? "→" : "←"}`;
    $("cond-weather").textContent = [m.night ? "🌙 Night" : "☀️ Day", m.rain ? "🌧️ Rain" : ""].filter(Boolean).join(" · ");
    $("stage-desc").textContent = `Free kick ${Math.round(K.dist)} yards out. George, in Forest ${SAVE.selected.kit} kit with GEORGE 10 on his back, stands over the ball. A wall of ${K.wallN} ${m.opp} players and their keeper stand between him and the goal.`;
  }

  /* ================================================================
     Game state
     ================================================================ */
  const S = {
    mode: null, match: null, matchIndex: 0, kickIndex: 0, kicks: [], results: [], points: 0, goals: 0,
    phase: "idle", kick: null, L: null, aim: { x: 200, y: 180 }, curl: 0, power: 0, raf: null, retakeUsed: false,
    lastShot: null, usedQ: [], streak: 0, bestStreak: 0, bonus: { topBins: 0, banana: 0, worldie: 0, targets: 0 },
  };

  function makeKick(m, seedRand) {
    const r = seedRand || rand;
    const dist = m.dist[0] + r() * (m.dist[1] - m.dist[0]);
    const side = Math.round((r() * 2 - 1) * 10) / 10;
    const wind = m.wind ? Math.round((r() * 2 - 1) * m.wind) : 0;
    const kick = { dist, side, wallN: m.wallN, keeperSkill: m.keeper, wind, opp: m.opp };
    // A glowing bonus target in one of the top corners, most of the time.
    if (r() < 0.6) {
      const L = FKP.layout(kick);
      const rightSide = side <= 0.2 ? r() < 0.75 : r() < 0.25;
      kick.target = { x: rightSide ? L.right - 16 * L.k : L.left + 16 * L.k, y: L.bar + 16 * L.k };
    }
    return kick;
  }

  /* ---------------- Screens ---------------- */
  const SCREENS = ["screen-menu", "screen-season", "screen-locker", "screen-game"];
  function show(id) {
    SCREENS.forEach((s) => { $(s).hidden = s !== id; });
    // Keep the screen on while taking free kicks.
    if (window.GZWake) { if (id === "screen-game") GZWake.on(); else GZWake.off(); }
    if (id !== "screen-game") { startRain(false); if (VOICE.supported) speechSynthesis.cancel(); }
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  function renderMenu() {
    $("menu-card").innerHTML = playerCard();
    const lvl = levelOf(SAVE.xp);
    const next = LEVELS[lvl] ?? null;
    const prev = LEVELS[lvl - 1] ?? 0;
    $("xp-label").textContent = next ? `Level ${lvl} · ${SAVE.xp - prev} / ${next - prev} XP to level ${lvl + 1}` : `Level ${lvl} · MAX LEVEL`;
    $("xp-fill").style.width = next ? `${Math.round(((SAVE.xp - prev) / (next - prev)) * 100)}%` : "100%";
    const played = SEASON.filter((m) => SAVE.stars[m.id] > 0).length;
    $("season-progress").textContent = `${played}/${SEASON.length} matches · ${totalStars()}/${SEASON.reduce((a, m) => a + 3, 0)} ★`;
    const today = todayStr();
    $("daily-status").textContent = SAVE.daily.doneDate === today ? `Done today ✓ · ${SAVE.daily.streak}-day streak 🔥` : SAVE.daily.streak ? `New challenge! Streak: ${SAVE.daily.streak} 🔥` : "A new free kick every day";
    $("practice-status").textContent = SAVE.practiceBest ? `Best streak: ${SAVE.practiceBest}` : "Endless free kicks, aim line on";
    $("menu-stats").textContent = SAVE.kicks ? `Career: ${SAVE.goals} goals from ${SAVE.kicks} free kicks (${Math.round((SAVE.goals / SAVE.kicks) * 100)}%)` : "";
    showToggles();
    loadMenuBoard();
  }

  function renderSeason() {
    $("season-stars").textContent = `${totalStars()} ★ collected`;
    $("season-list").innerHTML = SEASON.map((m, i) => {
      const unlocked = i === 0 || (SAVE.stars[SEASON[i - 1].id] || 0) > 0;
      const st = SAVE.stars[m.id] || 0;
      const icons = [m.night ? "🌙" : "☀️", m.rain ? "🌧️" : "", m.wind ? `💨 ${m.wind}mph` : "", `🧱 ${m.wallN}`].filter(Boolean).join(" ");
      return `<li class="fk-match ${unlocked ? "" : "locked"} ${m.derby ? "derby" : ""}">
        <div class="fk-match-info">
          <span class="fk-match-num">${m.derby ? "🏆" : i === 0 ? "🎓" : "⚽"} Match ${i + 1}</span>
          <strong>${escapeHtml(m.name)}</strong>
          <span class="fk-match-meta">${escapeHtml(m.venue)} · ${m.kicks} free kicks · ${icons}</span>
          <span class="fk-stars" aria-label="${st} of 3 stars">${"★".repeat(st)}<span class="dim">${"★".repeat(3 - st)}</span></span>
        </div>
        ${unlocked ? `<button class="btn-primary fk-play" data-match="${i}" type="button">${st ? "Play again" : "Play"}</button>`
          : `<span class="fk-lock">🔒 Get a star in match ${i}</span>`}
      </li>`;
    }).join("");
  }

  function renderLocker() {
    $("locker-card").innerHTML = playerCard();
    const section = (title, type, items, key) => `
      <section class="fk-locker-sec"><h3>${title}</h3><div class="fk-items">
        ${items.map((it) => {
          const open = isUnlocked(it);
          const sel = SAVE.selected[key] === it.id;
          const preview = type === "ball" ? `<svg viewBox="-14 -14 28 28" class="fk-item-art" aria-hidden="true">${(() => { const b = it; return `${b.glow ? `<circle r="13" fill="${b.glow}" opacity=".35"/>` : ""}<circle r="9" fill="${b.fill}" stroke="#1b1720"/><path d="M0 -3.5 L3.3 -1 L2 3 L-2 3 L-3.3 -1 Z" fill="${b.patch}"/>`; })()}</svg>`
            : type === "kit" ? `<span class="fk-item-art kit" style="background:${GK.KITS[it.id].shirt};color:${GK.KITS[it.id].text}">10</span>`
            : type === "boots" ? `<span class="fk-item-art boot" style="background:${it.colour}"></span>`
            : `<span class="fk-item-art cele">${{ armsup: "🙌", slide: "🦵", siuuu: "🌀", badge: "🌳", robot: "🤖" }[it.id]}</span>`;
          return `<button type="button" class="fk-item ${sel ? "selected" : ""} ${open ? "" : "locked"}" data-type="${key}" data-id="${it.id}" ${open ? "" : "aria-disabled=\"true\""} aria-pressed="${sel}">
            ${preview}<span class="fk-item-name">${escapeHtml(it.name)}</span>
            <span class="fk-item-need">${sel ? "Selected" : open ? "Tap to use" : "🔒 " + needText(it.need)}</span>
          </button>`;
        }).join("")}
      </div></section>`;
    $("locker-sections").innerHTML =
      section("Kits", "kit", KITS, "kit") + section("Balls", "ball", BALLS, "ball") + section("Boots", "boots", BOOTS, "boots") + section("Celebrations", "cele", CELEBRATIONS, "celebration");
  }

  /* ---------------- Starting things ---------------- */
  function startSeasonMatch(i) {
    S.mode = "season"; S.matchIndex = i; S.match = SEASON[i];
    S.kicks = Array.from({ length: S.match.kicks }, () => makeKick(S.match));
    beginMatch();
  }
  function startPractice() {
    S.mode = "practice";
    S.match = { id: "practice", name: "Practice", opp: "Training Squad", venue: "Forest training ground", home: true, kicks: 999, dist: [18, 30], wallN: 4, keeper: 0.5, wind: 6, guide: true, night: false, rain: false,
      oppKit: { shirt: "#1f9d55", shorts: "#15121a", hair: "#3a2414" }, keeperKit: "#f2c200" };
    S.kicks = [];
    beginMatch();
  }
  function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  function startDaily() {
    S.mode = "daily";
    const today = todayStr();
    const r = seeded(Number(today.replace(/-/g, "")));
    const pickM = SEASON[1 + Math.floor(r() * (SEASON.length - 1))];
    S.match = Object.assign({}, pickM, { id: "daily", name: "Daily Challenge", kicks: 3, guide: false, dist: [22, 30] });
    const k = makeKick(S.match, r);
    if (!k.target) { const L = FKP.layout(k); k.target = { x: L.right - 16 * L.k, y: L.bar + 16 * L.k }; }
    S.kicks = [k, Object.assign({}, k), Object.assign({}, k)];   // same free kick, three tries
    beginMatch();
  }

  function beginMatch() {
    S.kickIndex = 0; S.results = []; S.points = 0; S.goals = 0; S.streak = 0; S.bestStreak = 0;
    S.bonus = { topBins: 0, banana: 0, worldie: 0, targets: 0 };
    show("screen-game");
    fitView();
    drawCrowd(S.match);
    startRain(S.match.rain);
    $("hud-title").textContent = S.mode === "season" ? `${S.match.name}` : S.match.name;
    $("hud-venue").textContent = S.match.venue;
    $("result").hidden = true;
    const intro = S.mode === "daily" ? "Same free kick, three tries. Score it to keep your streak going!"
      : S.mode === "practice" ? "Practice mode. The dotted line shows where the ball will go." : S.match.intro;
    say(intro);
    sfx.whistle();
    setupKick(false);
  }

  function renderHud() {
    const total = S.mode === "practice" ? null : S.match.kicks;
    $("hud-kick").textContent = total ? `Free kick ${Math.min(S.kickIndex + 1, total)} of ${total}` : `Free kick ${S.kickIndex + 1}`;
    $("hud-goals").textContent = S.mode === "practice" ? `Streak ${S.streak} · Best ${Math.max(S.bestStreak, SAVE.practiceBest)}` : `${S.goals} goal${S.goals === 1 ? "" : "s"}`;
    $("hud-points").textContent = `${S.points} pts`;
    $("hud-dots").innerHTML = total ? Array.from({ length: total }, (_, i) =>
      `<span class="ps-dot ${i < S.results.length ? (S.results[i] ? "scored" : "missed") : ""}" aria-hidden="true"></span>`).join("") : "";
  }

  function say(text) { $("instruction").textContent = text; }
  function commentate(key, kick, excited) {
    const line = fill(pick(LINES[key]), kick || S.kick);
    $("commentary").textContent = "🎙️ " + line;
    VOICE.say(line, excited);
    return line;
  }
  function controls(which) {
    ["curl", "power", "next"].forEach((c) => { $("ctl-" + c).hidden = c !== which; });
  }

  /* ---------------- The kick: aim → curl → power ---------------- */
  function setupKick(isRetake) {
    if (S.mode === "practice") { if (!isRetake) S.kick = makeKick(S.match); }
    else if (!isRetake) S.kick = S.kicks[S.kickIndex];
    if (!isRetake) S.retakeUsed = false;
    S.phase = "aim";
    S.curl = 0;
    drawScene();
    renderHud();
    controls(null);
    const L = S.L;
    S.aim = { x: S.kick.target ? S.kick.target.x : (L.left + L.right) / 2, y: L.bar + L.gH * 0.45 };
    stage.classList.add("aiming");
    commentate("setup");
    say(isRetake ? "Retake! Tap in the goal where you want to aim." : "Tap in the goal where you want to aim." + (S.kick.target ? " Hit the gold target for bonus points!" : ""));
  }

  function showAim() {
    aimEl.setAttribute("transform", `translate(${S.aim.x.toFixed(1)} ${S.aim.y.toFixed(1)}) scale(${Math.max(0.7, S.L.k).toFixed(2)})`);
    aimEl.setAttribute("opacity", 1);
  }
  function clampAim(x, y) {
    const L = S.L;
    return { x: clamp(x, L.left - 30 * L.k, L.right + 30 * L.k), y: clamp(y, L.bar - 18 * L.k, L.gy - 3) };
  }
  const showGuide = () => S.match.guide || S.mode === "practice";

  function drawGuide() {
    if (!showGuide()) { guideEl.setAttribute("d", ""); return; }
    // Where the ball would go with perfect power and no wind.
    const kick = Object.assign({}, S.kick, { wind: 0 });
    const shot = FKP.shoot(kick, S.aim, S.curl, FKP.idealPower(kick.dist), () => 0.99);
    let d = "";
    for (let i = 0; i <= 24; i++) { const p = FKP.flightPoint(shot, i / 24); d += (i ? " L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1); }
    guideEl.setAttribute("d", d);
  }

  function lockAim() {
    S.phase = "curl";
    stage.classList.remove("aiming");
    showAim();
    controls("curl");
    say("Curl: tap LOCK when the bend is how you want it. Bend it round the wall!");
    const start = performance.now(), period = 1500;
    const needle = $("curl-needle");
    cancelAnimationFrame(S.raf);
    (function frame(now) {
      if (S.phase !== "curl") return;
      const t = ((now - start) % (period * 2)) / period;
      S.curl = (t <= 1 ? t : 2 - t) * 2 - 1;
      needle.style.left = ((S.curl + 1) * 50) + "%";
      drawGuide();
      S.raf = requestAnimationFrame(frame);
    })(start);
    $("btn-curl").focus({ preventScroll: true });
  }

  function lockCurl() {
    if (S.phase !== "curl") return;
    cancelAnimationFrame(S.raf);
    sfx.tick();
    S.phase = "power";
    controls("power");
    const ideal = FKP.idealPower(S.kick.dist);
    // Green zone: ideal ± 10. Yellow: ± 18.
    $("power-ok").style.left = (ideal - 18) + "%"; $("power-ok").style.width = "36%";
    $("power-good").style.left = (ideal - 10) + "%"; $("power-good").style.width = "20%";
    say("Power: tap SHOOT in the green!");
    const start = performance.now();
    const period = S.match.rain ? 1150 : 1300;
    const needle = $("power-needle");
    (function frame(now) {
      if (S.phase !== "power") return;
      const t = ((now - start) % (period * 2)) / period;
      S.power = (t <= 1 ? t : 2 - t) * 100;
      needle.style.left = S.power + "%";
      S.raf = requestAnimationFrame(frame);
    })(start);
    $("btn-shoot").focus({ preventScroll: true });
  }

  async function shoot() {
    if (S.phase !== "power") return;
    cancelAnimationFrame(S.raf);
    S.phase = "flying";
    controls(null);
    guideEl.setAttribute("d", "");
    say("");
    const shot = FKP.shoot(S.kick, S.aim, S.curl, S.power);
    S.lastShot = shot;
    await runUp();
    sfx.kick();
    await animateShot(shot, 1);
    await afterShot(shot);
  }

  async function runUp() {
    const from = STRIKER_HOME, to = STRIKER_KICK;
    await tween(reduced ? 250 : 650, (t) => {
      const bob = Math.abs(Math.sin(t * Math.PI * 4)) * 3;
      setStriker(lerp(from.x, to.x, t), lerp(from.y, to.y, t) - bob, lerp(from.s, to.s, t));
      setKickLeg(t > 0.7 ? lerp(0, 38, (t - 0.7) / 0.3) : Math.sin(t * Math.PI * 4) * 12);
    }, (t) => t);
    await tween(reduced ? 60 : 110, (t) => setKickLeg(lerp(38, -30, t)));
  }

  // Plays the flight. speed 1 = normal, 0.35 = slow-mo replay.
  async function animateShot(shot, speed) {
    const L = shot.L;
    const ballStyle = selectedBall();
    const dur = (lerp(1100, 750, clamp(shot.power / 90, 0, 1)) * (reduced ? 0.6 : 1)) / speed;
    const wallTau = 10 / S.kick.dist;
    const stopTau = shot.result === "wall" ? wallTau : 1;
    const trail = [];
    if (shot.wallJumps) tween(260 / speed, (t) => setWallJump(Math.sin(t * Math.PI) * FKP.WALL_JUMP), (t) => t);
    // keeper reacts once the ball clears the wall
    const keeperDive = (async () => {
      await sleep((dur * Math.min(0.9, wallTau + 0.12)));
      if (shot.result === "wall") return;
      const dx = clamp((shot.tx - L.keeperX) / L.k, -80, 80);
      const reachFrac = shot.result === "saved" ? 1 : 0.75;
      const high = shot.hEnd > 38;
      const rot = clamp(dx * 1.2, -80, 80);
      await tween(dur * 0.45, (t) => setKeeper(L.keeperX, L.gy, L.k * 1.05, dx * 0.55 * reachFrac * t, (high ? -24 : -6) * Math.sin(t * Math.PI / 2), rot * t), util.easeOut);
    })();
    await tween(dur * stopTau, (t) => {
      const tau = t * stopTau;
      const p = FKP.flightPoint(shot, tau);
      setBall(p.x, p.y, p.s, tau * 900 * Math.sign(shot.curl || 1));
      setShadow(p.gx, p.gy + 6 * p.s, p.s, 0.35 * (1 - tau * 0.6));
      if (ballStyle.trail) { trail.push(`${p.x.toFixed(1)} ${p.y.toFixed(1)}`); trailEl.setAttribute("d", "M" + trail.slice(-14).join(" L")); trailEl.setAttribute("stroke", ballStyle.trail); trailEl.style.opacity = 0.7; }
    }, (t) => 1 - Math.pow(1 - t, 1.5));
    const end = FKP.flightPoint(shot, stopTau);
    if (shot.result === "wall") {
      sfx.thud();
      await tween(450 / speed, (t) => setBall(end.x + (shot.curl >= 0 ? 1 : -1) * 40 * t, end.y + 60 * t * t - 30 * t, end.s + 0.2 * t, 0));
    } else if (shot.result === "saved") {
      sfx.save();
      const dir = shot.tx < L.gx ? -1 : 1;
      await tween(420 / speed, (t) => setBall(end.x + dir * 50 * t, end.y + 40 * t * t - 10 * t, end.s + 0.1 * t, 0));
    } else if (shot.result === "post" || shot.result === "post-in") {
      sfx.post();
      const inward = shot.result === "post-in";
      const dirX = shot.tx < L.gx ? (inward ? 1 : -1) : (inward ? -1 : 1);
      await tween(420 / speed, (t) => setBall(end.x + dirX * 26 * L.k * t, end.y + (inward ? 14 : 30) * L.k * t, end.s, 0));
      if (inward) rippleNet();
    } else if (shot.result === "over" || shot.result === "wide") {
      await tween(350 / speed, (t) => { setBall(end.x + (end.x - BX) * 0.15 * t, end.y - 40 * t, end.s * (1 - 0.3 * t), 0); ballG.style.opacity = 1 - t; });
    } else {
      rippleNet();
    }
    await keeperDive;
    trailEl.style.opacity = 0;
  }

  function rippleNet() {
    if (reduced) return;
    const net = $("net-back");
    if (!net) return;
    const L = S.L, cx = L.gx, cy = L.gy - L.gH / 2;
    tween(500, (t) => {
      const k = Math.sin(t * Math.PI * 4) * (1 - t) * 0.06;
      net.setAttribute("transform", `translate(${cx} ${cy}) scale(${1 + k} ${1 - k}) translate(${-cx} ${-cy})`);
    }, (t) => t).then(() => net.setAttribute("transform", ""));
  }

  function pop(text, cls) {
    const el = $("pop");
    el.className = "ps-pop"; void el.offsetWidth;
    el.textContent = text;
    el.className = "ps-pop show " + (cls || "");
  }

  async function afterShot(shot) {
    const goal = shot.result === "goal" || shot.result === "post-in";
    SAVE.kicks++;
    if (goal) {
      SAVE.goals++;
      let pts = 100; const tags = [];
      const tgt = S.kick.target;
      const hitTarget = tgt && Math.hypot(shot.tx - tgt.x, shot.ty - tgt.y) < 16 * S.L.k;
      if (shot.topBins) { pts += 50; tags.push("Top bins +50"); S.bonus.topBins++; }
      if (Math.abs(shot.curl) > 0.6) { pts += 50; tags.push("Banana kick +50"); S.bonus.banana++; }
      if (S.kick.dist >= 26) { pts += 50; tags.push(`${Math.round(S.kick.dist)}-yard worldie +50`); S.bonus.worldie++; }
      if (hitTarget) { pts += 100; tags.push("Target hit +100"); S.bonus.targets++; }
      S.points += pts; S.goals++; S.results.push(true); S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak);
      S.lastGoal = { pts, tags, shot };
      renderHud();
      sfx.roar(); crowdJump(); GK.confetti(confettiCanvas, shot.topBins || hitTarget ? 180 : 110);
      const key = shot.result === "post-in" ? "postin" : shot.topBins ? "topbins" : Math.abs(shot.curl) > 0.6 ? "banana" : S.kick.dist >= 26 ? "long" : "goal";
      commentate(key, S.kick, true);
      pop(hitTarget ? "BULLSEYE!" : shot.topBins ? "TOP BINS!" : shot.result === "post-in" ? "IN OFF THE POST!" : "GOAL!", hitTarget || shot.topBins ? "gold" : "");
      await sleep(900);
      await celebrate();
      say(`+${pts} points${tags.length ? ": " + tags.join(", ") : ""}`);
      showNext(true);
    } else {
      sfx.aww();
      const key = shot.result === "post" ? "post" : shot.result;
      commentate(key);
      pop({ wall: "BLOCKED!", saved: "SAVED!", over: "OVER THE BAR!", wide: "WIDE!", post: "OFF THE POST!" }[shot.result] || "MISSED", "soft");
      say({ wall: "It hit the wall. Try more power to go over, or curl it round.", saved: "The keeper got there. Aim nearer the corners.", over: "Too much power, or aimed too high.", wide: "Just wide. Check the wind!", post: "So close, off the woodwork!" }[shot.result] || "");
      await sleep(1500);
      if (!S.retakeUsed) {
        const ok = await askQuestion();
        if (ok) {
          S.retakeUsed = true;
          sfx.whistle();
          pop("RETAKE!", "gold");
          commentate("retake");
          await sleep(1100);
          setupKick(true);
          return;
        }
      }
      S.results.push(false); S.streak = 0;
      renderHud();
      showNext(false);
    }
    persist();
  }

  function showNext(wasGoal) {
    S.phase = "between";
    controls("next");
    $("btn-replay").hidden = !wasGoal;
    const last = S.mode !== "practice" && S.kickIndex + 1 >= S.match.kicks;
    $("btn-next").textContent = last ? "Full time ▶" : "Next free kick ▶";
    $("btn-next").focus({ preventScroll: true });
  }

  async function replay() {
    if (S.phase !== "between" || !S.lastShot) return;
    S.phase = "replay";
    controls(null);
    stage.classList.add("replaying");
    // Reset the scene without re-rolling anything.
    const shot = S.lastShot, L = shot.L;
    setBall(BX, BY, 1); ballG.style.opacity = 1; setShadow(BX, BY + 7, 1);
    setKeeper(L.keeperX, L.gy, L.k * 1.05, 0, 0, 0);
    setStriker(STRIKER_HOME.x, STRIKER_HOME.y, STRIKER_HOME.s);
    await runUp();
    await animateShot(shot, 0.35);
    stage.classList.remove("replaying");
    showNext(true);
  }

  function nextKick() {
    if (S.phase !== "between") return;
    if (S.mode === "practice") {
      if (S.bestStreak > SAVE.practiceBest) { SAVE.practiceBest = S.bestStreak; persist(); }
      S.kickIndex++;
      addXp(S.results[S.results.length - 1] ? 15 : 3);
      setupKick(false);
      return;
    }
    S.kickIndex++;
    if (S.kickIndex >= S.match.kicks) { endMatch(); return; }
    setupKick(false);
  }

  /* ---------------- Celebration ---------------- */
  async function celebrate() {
    const c = selectedCele();
    const box = $("celebration");
    $("cele-avatar").innerHTML = GK.avatar({ pose: c.pose, kit: SAVE.selected.kit, happy: true });
    $("cele-avatar").className = "fk-cele-avatar " + (reduced ? "" : c.anim);
    $("cele-text").textContent = c.shout;
    box.hidden = false;
    let skip;
    const skipped = new Promise((r) => { skip = r; });
    box.onclick = () => skip();
    await Promise.race([sleep(reduced ? 900 : 1900), skipped]);
    box.hidden = true;
  }

  /* ---------------- Second-chance question ---------------- */
  function nextQuestion() {
    const Q = window.FOREST_QUESTIONS;
    const pool = rand() < 0.6 ? Q.medium : Q.easy;
    const all = pool.filter((q) => !S.usedQ.includes(q.q));
    const q = pick(all.length ? all : pool);
    S.usedQ.push(q.q);
    if (S.usedQ.length > 50) S.usedQ = S.usedQ.slice(-20);
    return q;
  }
  function askQuestion() {
    return new Promise((resolve) => {
      S.phase = "question";
      const q = nextQuestion();
      $("q-text").textContent = q.q;
      $("q-feedback").textContent = "";
      const box = $("q-options");
      box.innerHTML = "";
      shuffle(q.o).forEach((opt) => {
        const b = document.createElement("button");
        b.type = "button"; b.textContent = opt;
        b.onclick = async () => {
          box.querySelectorAll("button").forEach((x) => { x.disabled = true; if (x.textContent === q.a) x.classList.add("right"); });
          const ok = opt === q.a;
          if (!ok) b.classList.add("wrong");
          $("q-feedback").textContent = ok ? "Correct! The ref says RETAKE!" : `Not this time. It was ${q.a}.`;
          $("q-feedback").style.color = ok ? "var(--good)" : "var(--bad)";
          ok ? sfx.ding() : sfx.buzz();
          await sleep(ok ? 1200 : 1900);
          $("question").hidden = true;
          resolve(ok);
        };
        box.appendChild(b);
      });
      $("question").hidden = false;
      box.querySelector("button").focus({ preventScroll: true });
    });
  }

  /* ---------------- XP + unlocks ---------------- */
  function unlockedIds() { return allUnlockables().filter(isUnlocked).map((x) => x.type + ":" + x.id); }
  function addXp(n) {
    const before = levelOf(SAVE.xp);
    SAVE.xp += n;
    persist();
    return levelOf(SAVE.xp) > before;
  }
  function newUnlocks() {
    const now = unlockedIds();
    const fresh = allUnlockables().filter((x) => now.includes(x.type + ":" + x.id) && x.need && !SAVE.seenUnlocks.includes(x.type + ":" + x.id));
    SAVE.seenUnlocks = Array.from(new Set(SAVE.seenUnlocks.concat(fresh.map((x) => x.type + ":" + x.id))));
    persist();
    return fresh;
  }

  /* ---------------- End of a match ---------------- */
  function starsFor(goals, kicks) {
    if (kicks <= 3) return Math.min(3, goals);
    return goals >= 4 ? 3 : goals >= 3 ? 2 : goals >= 1 ? 1 : 0;
  }

  async function endMatch() {
    S.phase = "over";
    controls(null);
    const m = S.match;
    let stars = 0, headline, text, xp = Math.round(S.points / 10) + 10, extra = "";
    const levelBefore = levelOf(SAVE.xp);
    if (S.mode === "season") {
      stars = starsFor(S.goals, m.kicks);
      const prev = SAVE.stars[m.id] || 0;
      if (stars > prev) SAVE.stars[m.id] = stars;
      SAVE.bestPoints[m.id] = Math.max(SAVE.bestPoints[m.id] || 0, S.points);
      xp += stars * 40;
      if (stars === 0) { headline = "Not this time!"; text = `No goals against ${m.opp}. Every free kick taker has days like this. Go again?`; }
      else if (m.derby) { headline = "DERBY DAY HERO!"; text = `${S.goals} free kick goal${S.goals === 1 ? "" : "s"} against Derby. The Brian Clough Trophy stays in Nottingham!`; }
      else { headline = stars === 3 ? "Man of the Match!" : "Full time!"; text = `${S.goals} free kick goal${S.goals === 1 ? "" : "s"} against ${m.opp}.`; }
    } else if (S.mode === "daily") {
      const today = todayStr();
      const success = S.goals > 0;
      if (success && SAVE.daily.doneDate !== today) {
        const y = new Date(); y.setDate(y.getDate() - 1);
        const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
        SAVE.daily.streak = SAVE.daily.doneDate === yStr ? SAVE.daily.streak + 1 : 1;
        SAVE.daily.doneDate = today;
        xp += 150;
        extra = `+150 XP daily bonus · ${SAVE.daily.streak}-day streak 🔥`;
      } else if (success) extra = "Already done today. Come back tomorrow for a new one!";
      headline = success ? "Daily Challenge done!" : "Not today... yet!";
      text = success ? `You scored ${S.goals} of 3 tries.` : "Three tries, no goal. Have another go, it's the same free kick!";
      stars = success ? Math.min(3, S.goals) : 0;
    }
    const levelUp = addXp(xp) || levelOf(SAVE.xp) > levelBefore;
    const unlocks = newUnlocks();
    persist();
    if (window.GZ && GZ.recordFreeKick) {
      const { newBadges } = GZ.recordFreeKick({ score: S.points, goals: S.goals, banana: S.bonus.banana, worldie: S.bonus.worldie, derbyWon: m.derby && stars > 0, seasonDone: SEASON.every((x) => (SAVE.stars[x.id] || 0) > 0), dailyStreak: SAVE.daily.streak });
      GZ.announceBadges(newBadges);
    }

    if (stars > 0) { sfx.fanfare(); GK.confetti(confettiCanvas, 200); crowdJump(); } else sfx.aww();
    $("r-avatar").innerHTML = GK.avatar({ pose: stars > 0 ? "up" : "idle", kit: SAVE.selected.kit, happy: stars > 0 });
    $("r-title").textContent = headline;
    $("r-text").textContent = text;
    $("r-stars").innerHTML = S.mode === "practice" ? "" : [0, 1, 2].map((i) => `<span class="fk-big-star ${i < stars ? "on" : ""}" style="animation-delay:${0.25 + i * 0.35}s">★</span>`).join("");
    $("r-stats").innerHTML = [["Goals", `${S.goals}/${S.results.length}`], ["Points", S.points], ["XP", `+${xp}`]]
      .map(([k, v]) => `<div class="ps-stat"><b>${v}</b><span>${k}</span></div>`).join("");
    $("r-extra").innerHTML = [extra, levelUp ? `⬆️ LEVEL UP! Now level ${levelOf(SAVE.xp)}. Your card got better!` : "",
      ...unlocks.map((u) => `🔓 New ${u.label}: <strong>${escapeHtml(u.name)}</strong>`)].filter(Boolean).map((x) => `<p>${x}</p>`).join("");
    if (unlocks.length) setTimeout(() => sfx.unlock(), 900);
    $("r-save").hidden = S.points === 0;
    $("r-saved").textContent = "";
    const nextOpen = S.mode === "season" && stars > 0 && S.matchIndex + 1 < SEASON.length;
    $("r-actions").innerHTML = `
      ${nextOpen ? `<button class="btn-primary" id="r-next" type="button">Next match: ${escapeHtml(SEASON[S.matchIndex + 1].name)}</button>` : ""}
      ${S.mode === "season" && S.matchIndex + 1 === SEASON.length && stars > 0 ? `<button class="btn-primary" id="r-trophy" type="button">🏆 Season complete!</button>` : ""}
      <button class="${nextOpen ? "ps-ghost" : "btn-primary"}" id="r-again" type="button">Play this again</button>
      <button class="ps-ghost" id="r-menu" type="button">Back to menu</button>`;
    $("result").hidden = false;
    const first = $("r-actions").querySelector("button"); if (first) first.focus({ preventScroll: true });
    if ($("r-next")) $("r-next").onclick = () => startSeasonMatch(S.matchIndex + 1);
    if ($("r-trophy")) $("r-trophy").onclick = () => { $("result").hidden = true; GK.confetti(confettiCanvas, 260); sfx.fanfare(); pop("CHAMPIONS!", "gold"); setTimeout(() => { renderMenu(); show("screen-menu"); }, 2200); };
    $("r-again").onclick = () => (S.mode === "season" ? startSeasonMatch(S.matchIndex) : S.mode === "daily" ? startDaily() : startPractice());
    $("r-menu").onclick = () => { renderMenu(); show("screen-menu"); };
  }

  $("r-save").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("r-name").value.trim();
    if (!name) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ game: GAME_ID, player_name: name, score: S.points }),
      });
      if (!res.ok) throw new Error(res.status);
      $("r-save").hidden = true;
      $("r-saved").textContent = `Saved! ${S.points} points for ${name}.`;
    } catch (err) {
      $("r-saved").textContent = "Couldn't save online right now. Try again later.";
    }
  });

  async function loadMenuBoard() {
    const el = $("menu-board");
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?game=eq.${GAME_ID}&select=player_name,score&order=score.desc&limit=5`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
      if (!res.ok) throw new Error(res.status);
      const rows = await res.json();
      el.innerHTML = rows.length
        ? `<ol>${rows.map((r) => `<li><span>${escapeHtml(r.player_name)}</span><b>${Number(r.score)}</b></li>`).join("")}</ol>`
        : "<p>No scores yet. Be the first!</p>";
    } catch (e) {
      el.innerHTML = "<p>Couldn't load the top scores right now.</p>";
    }
  }

  /* ---------------- Toggles ---------------- */
  function showToggles() {
    $("btn-sound").textContent = SOUND.isOn() ? "🔊 Sound on" : "🔇 Sound off";
    $("btn-sound").setAttribute("aria-pressed", String(SOUND.isOn()));
    $("btn-voice").hidden = !VOICE.supported;
    $("btn-voice").textContent = VOICE.isOn() ? "🎙️ Commentary on" : "🎙️ Commentary off";
    $("btn-voice").setAttribute("aria-pressed", String(VOICE.isOn()));
  }
  $("btn-sound").addEventListener("click", () => { SOUND.set(!SOUND.isOn()); showToggles(); });
  $("btn-voice").addEventListener("click", () => { VOICE.set(!VOICE.isOn()); showToggles(); if (VOICE.isOn()) VOICE.say("Commentary on. Let's go, George!"); });

  /* ---------------- Input ---------------- */
  function svgPoint(evt) {
    const p = svg.createSVGPoint(); p.x = evt.clientX; p.y = evt.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  svg.addEventListener("pointerdown", (e) => {
    if (S.phase === "aim") {
      const p = svgPoint(e), L = S.L;
      if (p.y < L.bar - 40 || p.y > L.gy + 20 || p.x < L.left - 50 || p.x > L.right + 50) { say("Tap on or near the goal to aim."); return; }
      S.aim = clampAim(p.x, p.y);
      showAim();
      lockAim();
    } else if (S.phase === "curl") lockCurl();
    else if (S.phase === "power") shoot();
  });
  $("btn-curl").addEventListener("click", lockCurl);
  $("btn-shoot").addEventListener("click", shoot);
  $("btn-next").addEventListener("click", nextKick);
  $("btn-replay").addEventListener("click", replay);
  $("btn-quit").addEventListener("click", () => { cancelAnimationFrame(S.raf); S.phase = "idle"; $("question").hidden = true; renderMenu(); show("screen-menu"); });
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || $("screen-game").hidden) return;
    if (S.phase === "aim") {
      const st = 8 * Math.max(0.6, S.L.k);
      const mv = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
      if (mv) { e.preventDefault(); S.aim = clampAim(S.aim.x + mv[0], S.aim.y + mv[1]); showAim(); say("Arrow keys to aim, Enter to lock it in."); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showAim(); lockAim(); }
    } else if ((S.phase === "curl" || S.phase === "power") && (e.key === " " || e.key === "Enter")) {
      e.preventDefault(); S.phase === "curl" ? lockCurl() : shoot();
    }
  });

  $("btn-season").addEventListener("click", () => { SOUND.wake(); renderSeason(); show("screen-season"); });
  $("btn-daily").addEventListener("click", () => { SOUND.wake(); startDaily(); });
  $("btn-practice").addEventListener("click", () => { SOUND.wake(); startPractice(); });
  $("btn-locker").addEventListener("click", () => { renderLocker(); show("screen-locker"); });
  $("season-back").addEventListener("click", () => { renderMenu(); show("screen-menu"); });
  $("locker-back").addEventListener("click", () => { renderMenu(); show("screen-menu"); });
  $("season-list").addEventListener("click", (e) => { const b = e.target.closest("[data-match]"); if (b) startSeasonMatch(+b.dataset.match); });
  $("locker-sections").addEventListener("click", (e) => {
    const b = e.target.closest(".fk-item");
    if (!b || b.classList.contains("locked")) { if (b) sfx.buzz(); return; }
    SAVE.selected[b.dataset.type] = b.dataset.id;
    persist();
    sfx.ding();
    renderLocker();
  });

  /* ---------------- First paint ---------------- */
  newUnlocks();   // anything already earned doesn't count as "new"
  renderMenu();
  show("screen-menu");

  // For testing in the browser console only.
  window.__fk = { S, SEASON, get SAVE() { return SAVE; }, set SAVE(v) { SAVE = v; persist(); }, levelOf };
})();
