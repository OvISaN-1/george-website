/* ================================================================
   MATCHDAY
   A full Forest match against the computer. Every big moment is a
   quiz question: pick how to attack (tap-in, cross or long shot),
   answer to make the tackle, win penalties, survive VAR checks.
   George plays up front, scores most of Forest's goals, and is
   Player of the Match every time Forest win.

   Files:  matchday-squads.js    squads, kits, grounds, referees
           matchday-questions.js question bank + the learning brain
           george-kit.js         George drawings, sounds, voice
   ================================================================ */
(function () {
  "use strict";
  const { util } = GK;
  const { rand, pick, shuffle, sleep, lerp, clamp, tween, escapeHtml } = util;
  const reduced = util.reduced;
  const $ = (id) => document.getElementById(id);

  const GAME_ID = "matchday";
  const SAVE_KEY = "gz_matchday_v1";
  const SOUND = GK.createSound("gz_matchday_sound");
  const sfx = SOUND.sfx;
  const VOICE = GK.createVoice("gz_matchday_voice");

  const PW = 105, PH = 68;           // pitch size in metres
  const U = 10;                       // SVG units per metre
  const GOAL_TOP = 34 - 3.66, GOAL_BOT = 34 + 3.66;

  /* How hard each type of opponent is. tier 1 / 2 / 3 */
  const TIERS = {
    1: { attacks: 6, defends: 3, defendLevels: [1, 1, 2], timer: 0, goalIfWrong: 0.5, saveIfRight: 0.12, poss: 0.6 },
    2: { attacks: 5, defends: 4, defendLevels: [1, 2, 2], timer: 1, goalIfWrong: 0.58, saveIfRight: 0.22, poss: 0.52 },
    3: { attacks: 5, defends: 5, defendLevels: [2, 2, 3], timer: 2, goalIfWrong: 0.66, saveIfRight: 0.32, poss: 0.44 },
  };
  // Seconds on the clock for each question level, before the opponent's tier knocks some off.
  const LEVEL_TIME = { 1: 15, 2: 13, 3: 11 };

  const CELES = {
    armsup: { pose: "up", anim: "cele-jump", shout: "GET IN!" },
    slide: { pose: "out", anim: "cele-slide", shout: "KNEE SLIDE!" },
    siuuu: { pose: "out", anim: "cele-siuuu", shout: "SIUUUU!" },
    badge: { pose: "point", anim: "cele-zoom", shout: "FOREST!" },
    robot: { pose: "out", anim: "cele-robot", shout: "BEEP BOOP GOAL" },
  };

  /* ================================================================
     Save data (this device only)
     ================================================================ */
  function defaults() {
    return { results: {}, subjects: Object.keys(MQ.SUBJECTS), played: 0, wins: 0, draws: 0, losses: 0, georgeGoals: 0, best: 0, zoom: "auto" };
  }
  function loadSave() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) return Object.assign(defaults(), s); } catch (e) {}
    return defaults();
  }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} }
  let SAVE = loadSave();

  // George's kit and celebration come from Free Kick Masters.
  function freeKickSave() { try { return JSON.parse(localStorage.getItem("gz_freekick_v1")) || {}; } catch (e) { return {}; } }
  function georgeGear() {
    const sel = (freeKickSave().selected) || {};
    return { kit: GK.KITS[sel.kit] ? sel.kit : "home", cele: CELES[sel.celebration] ? sel.celebration : "armsup" };
  }

  const FIXTURES = (((window.SITE || {}).football || {}).fixtures || [])
    .map((f, i) => Object.assign({ index: i }, f))
    .filter((f) => MD.OPPONENTS[f.opponent]);
  function kickoffOf(f) { return new Date(`${f.date}T${f.time || "15:00"}:00`); }
  function nextFixture() {
    const now = Date.now();
    return FIXTURES.find((f) => kickoffOf(f).getTime() + 2 * 3600 * 1000 > now) || FIXTURES[FIXTURES.length - 1];
  }
  const fixtureKey = (f) => `${f.date}-${f.opponent}`;
  const fmtDate = (f) => kickoffOf(f).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  /* ================================================================
     Colours
     ================================================================ */
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function clash(a, b) { const x = hexRgb(a), y = hexRgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 130; }

  /* ================================================================
     Match state
     ================================================================ */
  let S = null;

  /* Each match gets a number. If George quits mid-match, anything still
     running from the old match simply stops at its next pause. */
  let GEN = 0;
  const never = new Promise(() => {});
  async function wait(ms) { const g = GEN; await sleep(ms); if (g !== GEN) await never; }
  async function guardedTween(ms, fn, ease) { const g = GEN; await tween(ms, (k) => { if (g === GEN) fn(k); }, ease); if (g !== GEN) await never; }

  function blankStats() { return { poss: 0, shots: 0, onTarget: 0, xg: 0, corners: 0, fouls: 0, yellows: 0, reds: 0, offsides: 0, passes: 0, tackles: 0, saves: 0 }; }

  function setupMatch(oppKey, venue, fixture) {
    const opp = MD.OPPONENTS[oppKey];
    const home = venue === "H";
    let forestKit = MD.FOREST.kit, oppKit = opp.kit;
    if (clash(forestKit.shirt, oppKit.shirt)) {
      if (home && opp.alt) oppKit = opp.alt; else forestKit = MD.FOREST.away;
    }
    const gear = georgeGear();
    const gk = GK.KITS[gear.kit];
    // Home or away: George matches the team. Special kits (1979, Legend) he wears anyway.
    const georgeKit = gear.kit === "home" || gear.kit === "away"
      ? forestKit
      : { shirt: gk.shirt, trim: gk.trim, shorts: gk.shorts, text: gk.text };

    const kickoffTime = fixture ? fixture.time : "15:00";
    const night = parseInt(kickoffTime, 10) >= 17;
    const rain = rand() < 0.25;
    const refs = shuffle(MD.REFEREES);
    const tier = TIERS[opp.tier];

    S = {
      opp, oppKey, home, fixture, venue,
      ground: home ? MD.FOREST.ground : opp.ground,
      forestKit, oppKit, georgeKit, gear,
      night, rain, temp: 8 + Math.floor(rand() * 12),
      ref: refs[0], varRef: refs[1], fourth: refs[2],
      attendance: home ? 30000 + Math.floor(rand() * 400) : 20000 + Math.floor(rand() * 40000),
      tier, tierN: opp.tier,
      min: 0, half: 1, clockBase: 0, clockT0: 0, clockRunning: false, minuteMs: reduced ? 380 : 600,
      added1: 1 + Math.floor(rand() * 3), added2: 3 + Math.floor(rand() * 3),
      score: { f: 0, o: 0 }, goals: [], events: [], mom: [],
      stats: { f: blankStats(), o: blankStats() },
      used: new Set(), powers: { gw: true, murillo: true, neco: true },
      asked: 0, right: 0, levels: { 1: [0, 0], 2: [0, 0], 3: [0, 0] },
      varWins: 0, penaltiesWon: 0, bigChances: 0,
      heat: new Array(21 * 14).fill(0),
      players: [], carrier: null, poss: "f", phase: "kickoff",
      ball: { x: 52.5, y: 34, h: 0 },
      cam: { x: 0, y: 0, w: 1130, h: 760 },
      subsDone: 0, over: false, quit: false,
      rating: {},
    };
    buildPlayers();
    buildSchedule();
  }

  function buildPlayers() {
    const fForm = MD.FORMATIONS[MD.FOREST.formation];
    const oForm = MD.FORMATIONS[S.opp.formation] || MD.FORMATIONS["4-3-3"];
    const lineOf = (pos) => (/GK/.test(pos) ? "gk" : /CB|RB|LB|WB/.test(pos) ? "def" : /ST/.test(pos) ? "fwd" : /W|AM|CAM/.test(pos) ? "att" : "mid");
    S.players = [];
    MD.FOREST.xi.forEach((pl, i) => {
      const [x, y] = fForm[i];
      S.players.push(Object.assign({}, pl, { id: "f" + i, team: "f", idx: i, base: { x, y }, x, y, line: lineOf(pl.pos), gk: i === 0, seed: rand() * 10, cards: 0, goals: 0, assists: 0, on: true }));
    });
    S.opp.xi.forEach((pl, i) => {
      const [x, y] = oForm[i];
      S.players.push(Object.assign({}, pl, { id: "o" + i, team: "o", idx: i, base: { x: PW - x, y: PH - y }, x: PW - x, y: PH - y, line: lineOf(pl.pos), gk: i === 0, seed: rand() * 10, cards: 0, goals: 0, assists: 0, on: true }));
    });
    S.george = S.players.find((p) => p.george);
    S.benchF = MD.FOREST.subs.map((s) => Object.assign({}, s));
  }

  const team = (t) => S.players.filter((p) => p.team === t && p.on);
  const byIdx = (t, i) => S.players.find((p) => p.team === t && p.idx === i);
  const outfield = (t) => team(t).filter((p) => !p.gk);
  const keeperOf = (t) => team(t).find((p) => p.gk);
  const oppAbbr = () => S.opp.abbr;
  const other = (t) => (t === "f" ? "o" : "f");

  /* Spread the big moments across the 90 minutes. */
  function buildSchedule() {
    const T = S.tier;
    const moments = [];
    for (let i = 0; i < T.attacks; i++) moments.push("attack");
    for (let i = 0; i < T.defends; i++) moments.push("defend");
    if (rand() < 0.5) moments.push("penalty");
    if (rand() < 0.55) moments.push("freekick");
    let order = shuffle(moments);
    // Start with a Forest chance so there's something to do straight away.
    const firstAttack = order.indexOf("attack");
    order.splice(firstAttack, 1);
    order.unshift("attack");
    const n = order.length;
    const slots = [];
    for (let i = 0; i < n; i++) {
      const lo = 4 + Math.floor((i * 84) / n), hi = 4 + Math.floor(((i + 1) * 84) / n) - 2;
      slots.push(lo + Math.floor(rand() * Math.max(1, hi - lo)));
    }
    S.schedule = order.map((type, i) => ({ type, min: slots[i], half: slots[i] <= 45 ? 1 : 2, done: false }));
  }

  /* ================================================================
     Drawing the pitch
     ================================================================ */
  function pitchSVG() {
    const night = S.night;
    const g1 = night ? "#1f5a2c" : "#2e7d3a", g2 = night ? "#246634" : "#378c44";
    const stripes = Array.from({ length: 18 }, (_, i) => `<rect x="${(i * PW) / 18}" y="0" width="${PW / 18 + 0.02}" height="${PH}" fill="${i % 2 ? g1 : g2}"/>`).join("");
    const cross = Array.from({ length: 6 }, (_, i) => `<rect x="0" y="${(i * PH) / 6}" width="${PW}" height="${PH / 12}" fill="#fff" opacity="0.025"/>`).join("");
    const homeCols = S.home ? ["#d7102b", "#ffffff", "#d7102b", "#b30d24"] : [S.oppKit.shirt, S.oppKit.trim, S.oppKit.shirt];
    const awayCols = S.home ? [S.oppKit.shirt, S.oppKit.trim] : ["#d7102b", "#ffffff"];
    // Crowd: little dots in the stands, home colours everywhere, away fans in one corner.
    let crowd = "";
    const dot = (x, y, cols) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.35 + rand() * 0.2).toFixed(2)}" fill="${pick(cols)}"/>`;
    for (let x = -9; x < PW + 9; x += 1.1) {
      for (const y of [-7.6, -6.6, -5.6]) crowd += dot(x + rand() * 0.5, y + rand() * 0.3, x > 78 ? awayCols : homeCols);
      for (const y of [PH + 5.6, PH + 6.6, PH + 7.6]) crowd += dot(x + rand() * 0.5, y + rand() * 0.3, homeCols);
    }
    for (let y = -3; y < PH + 3; y += 1.1) {
      for (const x of [-7.6, -6.6]) crowd += dot(x + rand() * 0.3, y + rand() * 0.5, homeCols);
      for (const x of [PW + 6.6, PW + 7.6]) crowd += dot(x + rand() * 0.3, y + rand() * 0.5, awayCols.concat(homeCols));
    }
    const led = "COME ON YOU REDS ★ GEORGE 10 ★ NOTTINGHAM FOREST ★ ";
    const L = `stroke="#fff" stroke-opacity="${night ? 0.92 : 0.85}" stroke-width="0.14" fill="none"`;
    const box = (x0, dir) => {
      const pa = dir > 0 ? x0 : x0 - 16.5, ga = dir > 0 ? x0 : x0 - 5.5, spot = x0 + dir * 11;
      const arcX = x0 + dir * 16.5;
      // The "D": the part of the 9.15m circle round the spot that sits outside the box.
      const dy = Math.sqrt(9.15 * 9.15 - 5.5 * 5.5);
      return `<rect x="${pa}" y="13.84" width="16.5" height="40.32" ${L}/>
        <rect x="${ga}" y="24.84" width="5.5" height="18.32" ${L}/>
        <circle cx="${spot}" cy="34" r="0.22" fill="#fff"/>
        <path d="M${arcX} ${34 - dy} A9.15 9.15 0 0 ${dir > 0 ? 1 : 0} ${arcX} ${34 + dy}" ${L}/>`;
    };
    const goal = (x0, dir) => `<g>
        <rect x="${dir > 0 ? x0 - 2.2 : x0}" y="${GOAL_TOP}" width="2.2" height="7.32" fill="url(#p-net)" stroke="#fff" stroke-width="0.12"/>
        <rect class="net-flash" id="net-${dir > 0 ? "l" : "r"}" x="${dir > 0 ? x0 - 2.2 : x0}" y="${GOAL_TOP}" width="2.2" height="7.32" fill="#fff" opacity="0"/>
        <path d="M${x0} ${GOAL_TOP} v7.32" stroke="#fff" stroke-width="0.35"/></g>`;
    const dugout = (x) => `<g><rect x="${x}" y="-3.4" width="9" height="2" rx="0.5" fill="#15121a" stroke="#555" stroke-width="0.1"/><rect x="${x + 0.4}" y="-3.1" width="8.2" height="1.1" fill="#3a3540"/></g>
      <rect x="${x - 1}" y="-1.2" width="11" height="1" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="0.08" stroke-dasharray="0.4 0.4"/>`;
    const lights = night ? [[-6, -6], [PW + 6, -6], [-6, PH + 6], [PW + 6, PH + 6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="42" fill="url(#g-flood)"/>`).join("") : "";
    return `
      <defs>
        <pattern id="p-net" width="0.6" height="0.6" patternUnits="userSpaceOnUse"><path d="M0 0 L0.6 0.6 M0.6 0 L0 0.6" stroke="#fff" stroke-opacity=".55" stroke-width="0.07"/></pattern>
        <radialGradient id="g-flood"><stop offset="0" stop-color="#fff6d8" stop-opacity="${night ? 0.28 : 0}"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient>
        <radialGradient id="g-vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${night ? 0.45 : 0.25}"/></radialGradient>
        <linearGradient id="g-led" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2a0710"/><stop offset="1" stop-color="#12040a"/></linearGradient>
        <filter id="f-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.8"/></filter>
      </defs>
      <g transform="scale(${U})">
        <rect x="-14" y="-12" width="${PW + 28}" height="${PH + 24}" fill="${night ? "#0d0b12" : "#1b1720"}"/>
        <g opacity="${night ? 0.8 : 0.95}">${crowd}</g>
        <rect x="-4.6" y="-4.6" width="${PW + 9.2}" height="${PH + 9.2}" fill="${night ? "#1a4d26" : "#276b33"}"/>
        <!-- LED boards -->
        <rect x="-4.6" y="-4.9" width="${PW + 9.2}" height="1.1" fill="url(#g-led)"/>
        <rect x="-4.6" y="${PH + 3.8}" width="${PW + 9.2}" height="1.1" fill="url(#g-led)"/>
        <svg x="-4.6" y="-4.9" width="${PW + 9.2}" height="1.1" viewBox="0 0 ${PW + 9.2} 1.1" overflow="hidden"><g class="md-led"><text x="0" y="0.85" font-family="Rajdhani, Arial Narrow, sans-serif" font-weight="700" font-size="0.95" fill="#ff4d62" letter-spacing="0.2">${led.repeat(6)}</text></g></svg>
        <svg x="-4.6" y="${PH + 3.8}" width="${PW + 9.2}" height="1.1" viewBox="0 0 ${PW + 9.2} 1.1" overflow="hidden"><g class="md-led rev"><text x="0" y="0.85" font-family="Rajdhani, Arial Narrow, sans-serif" font-weight="700" font-size="0.95" fill="#f5b942" letter-spacing="0.2">${(`${S.ground.toUpperCase()} ★ ${MD.FOREST.abbr} v ${S.opp.abbr} ★ `).repeat(8)}</text></g></svg>
        ${dugout(PW / 2 - 14)}${dugout(PW / 2 + 5)}
        <rect x="${PW / 2 - 1}" y="-3.3" width="2" height="1.4" fill="#15121a" stroke="#888" stroke-width="0.08"/>
        <rect x="0" y="0" width="${PW}" height="${PH}" fill="${g1}"/>
        ${stripes}${cross}
        <rect x="0" y="0" width="${PW}" height="${PH}" ${L}/>
        <line x1="${PW / 2}" y1="0" x2="${PW / 2}" y2="${PH}" ${L}/>
        <circle cx="${PW / 2}" cy="34" r="9.15" ${L}/>
        <circle cx="${PW / 2}" cy="34" r="0.25" fill="#fff"/>
        ${box(0, 1)}${box(PW, -1)}
        <path d="M0 1 A1 1 0 0 0 1 0 M${PW - 1} 0 A1 1 0 0 0 ${PW} 1 M0 ${PH - 1} A1 1 0 0 1 1 ${PH} M${PW - 1} ${PH} A1 1 0 0 1 ${PW} ${PH - 1}" ${L}/>
        ${[[0, 0], [PW, 0], [0, PH], [PW, PH]].map(([x, y]) => `<path d="M${x} ${y} l0 -1.6 l${x ? -1 : 1} 0.5 l${x ? 1 : -1} 0.5" fill="#f5b942" stroke="#fff" stroke-width="0.06"/>`).join("")}
        ${goal(0, 1)}${goal(PW, -1)}
        <polygon points="0,0 ${PW},0 ${PW},${PH * 0.18} 0,${PH * 0.32}" fill="#000" opacity="${night ? 0.0 : 0.09}"/>
        ${lights}
        <rect x="-14" y="-12" width="${PW + 28}" height="${PH + 24}" fill="url(#g-vig)"/>
        <g id="fx-pitch"></g>
      </g>
      <g id="tokens"></g>
      <g id="ball-g">
        <ellipse id="ball-sh" rx="7" ry="3" fill="#000" opacity=".35"/>
        <g id="ball-b"><circle r="6.5" fill="#fff" stroke="#15121a" stroke-width="1.2"/><path d="M-2.6 -1.8 L0 -3.8 L2.6 -1.8 L1.6 1.6 L-1.6 1.6 Z" fill="#15121a"/></g>
      </g>
      <g id="carrier-label" opacity="0"><rect id="cl-bg" x="-40" y="-14" width="80" height="18" rx="9" fill="#0d0b10" fill-opacity=".82" stroke="#fff" stroke-opacity=".25"/><text id="cl-text" x="0" y="0" text-anchor="middle" font-family="Rajdhani, Arial Narrow, sans-serif" font-weight="700" font-size="13" fill="#fff"></text></g>
      <g id="fx-top"></g>`;
  }

  function tokenSVG(p) {
    const kit = p.team === "f" ? (p.george ? S.georgeKit : S.forestKit) : S.oppKit;
    const keeperFill = p.team === "f" ? MD.FOREST.keeperKit : S.opp.keeperKit;
    const fill = p.gk ? keeperFill : kit.shirt;
    const stroke = p.gk ? "#15121a" : kit.trim;
    const txt = p.gk ? "#15121a" : kit.text;
    const r = p.george ? 21 : 16;
    return `<g class="md-tok${p.george ? " george" : ""}" id="tok-${p.id}">
      <ellipse cx="3" cy="${r * 0.75}" rx="${r}" ry="${r * 0.42}" fill="#000" opacity=".28"/>
      ${p.george ? `<circle class="g-ring" r="${r + 6}" fill="none" stroke="#f5b942" stroke-width="3"/>` : ""}
      <circle r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${p.george ? 3.5 : 2.5}"/>
      <text class="tok-num" y="${p.george ? 6 : 5}" text-anchor="middle" font-family="Rajdhani, Arial Narrow, sans-serif" font-weight="700" font-size="${p.george ? 18 : 15}" fill="${txt}">${p.num}</text>
      ${p.captain ? `<rect x="${-r - 3}" y="-4" width="7" height="8" rx="1.5" fill="#f5b942" stroke="#15121a" stroke-width=".8"/>` : ""}
      <rect class="tok-card" x="${r - 4}" y="${-r - 6}" width="9" height="12" rx="1.5" fill="#f5d000" stroke="#15121a" stroke-width=".8" opacity="0"/>
      ${p.george ? `<g><rect x="-31" y="${r + 5}" width="62" height="17" rx="8.5" fill="#f5b942"/><text y="${r + 18}" text-anchor="middle" font-family="Rajdhani, Arial Narrow, sans-serif" font-weight="700" font-size="13" letter-spacing="1" fill="#241f29">GEORGE</text></g>` : ""}
    </g>`;
  }

  function officialSVG(id) {
    return `<g class="md-tok ref" id="tok-${id}">
      <ellipse cx="2" cy="10" rx="12" ry="5" fill="#000" opacity=".28"/>
      <circle r="11" fill="#15121a" stroke="#c6f432" stroke-width="2.5"/>
      <rect class="flag" x="6" y="-26" width="10" height="8" fill="#f5d000" stroke="#ff4d62" stroke-width="1" opacity="0"/>
      <path class="flag" d="M6 -26 V-4" stroke="#fff" stroke-width="1.6" opacity="0"/>
    </g>`;
  }

  function buildStage() {
    const svg = $("pitch");
    svg.innerHTML = pitchSVG();
    const tokens = $("tokens");
    tokens.innerHTML = S.players.map(tokenSVG).join("") + officialSVG("ref") + officialSVG("la1") + officialSVG("la2");
    S.players.forEach((p) => { p.el = $("tok-" + p.id); });
    // George on top of everyone else.
    tokens.appendChild(S.george.el);
    S.refP = { x: 48, y: 40, el: $("tok-ref") };
    S.la1 = { x: 70, y: -1.2, el: $("tok-la1") };
    S.la2 = { x: 30, y: PH + 1.2, el: $("tok-la2") };
    S.ballEl = $("ball-g");
    S.ballB = $("ball-b");
    S.ballSh = $("ball-sh");
    $("stage").classList.toggle("rain", S.rain);
    $("stage").classList.toggle("night", S.night);
    setZoom();
  }

  function setZoom() {
    const stageW = $("stage").clientWidth || 700;
    const pref = SAVE.zoom;
    S.zoomed = pref === "zoom" || (pref === "auto" && stageW < 620);
    $("btn-zoom").textContent = S.zoomed ? "🔭 Whole pitch" : "🎥 Zoom in";
  }

  /* ================================================================
     Movement: where everyone wants to be, every frame
     ================================================================ */
  function kickoffSpot(p) {
    const b = p.base;
    if (p.team === "f") {
      let x = Math.min(b.x, 50);
      if (p.george && S.kickoffTeam === "f") return { x: 52.2, y: 34.2 };
      if (p.idx === 8 && S.kickoffTeam === "f") return { x: 51, y: 38 };
      return { x: p.gk ? 4 : x * 0.9, y: b.y };
    }
    let x = Math.max(b.x, 55);
    if (p.line === "fwd" && S.kickoffTeam === "o") return { x: 52.8, y: 33.8 };
    return { x: p.gk ? PW - 4 : PW - (PW - x) * 0.9, y: b.y };
  }

  function targetFor(p, t) {
    if (p.hold) return p.hold;
    if (S.phase === "kickoff") return kickoffSpot(p);
    const dir = p.team === "f" ? 1 : -1;
    const attacking = S.poss === p.team;
    const b = S.ball;
    if (p.gk) return { x: p.base.x + dir * (attacking ? 7 : 1.5) + (attacking ? 0 : 0), y: 34 + (b.y - 34) * 0.18 };
    let x = p.base.x, y = p.base.y;
    const push = attacking ? { def: 13, mid: 12, att: 9, fwd: 7 }[p.line] : { def: -3, mid: -7, att: -12, fwd: -10 }[p.line];
    // How far up the pitch the ball is, from this team's point of view (-1 to 1).
    const adv = ((dir > 0 ? b.x : PW - b.x) - 52.5) / 52.5;
    x += dir * (push + adv * (attacking ? 8 : 10));
    y += (b.y - y) * (attacking ? 0.14 : 0.26);
    if (!attacking) x += (b.x - x) * 0.1;
    x += Math.sin(t / 900 + p.seed) * 0.9;
    y += Math.cos(t / 1100 + p.seed * 1.3) * 0.9;
    return { x: clamp(x, 1.5, PW - 1.5), y: clamp(y, 1.5, PH - 1.5) };
  }

  // Second-last defender line, for the linesman and the VAR lines.
  function lastLine(defTeam) {
    const xs = team(defTeam).map((p) => p.x).sort((a, b) => (defTeam === "o" ? b - a : a - b));
    return xs[1] != null ? xs[1] : defTeam === "o" ? 80 : 25;
  }

  let lastT = 0;
  function startLoop() {
    const g = GEN;
    lastT = 0;
    (function loop(t) {
      if (g !== GEN || !S || S.over) return;
      frame(t);
      requestAnimationFrame(loop);
    })(performance.now());
  }
  function frame(t) {
    const dt = Math.min(64, t - (lastT || t));
    lastT = t;
    const k = 1 - Math.exp(-dt / 520);
    S.players.forEach((p) => {
      if (!p.on) return;
      const tg = targetFor(p, t);
      const kk = p.hold ? 1 - Math.exp(-dt / (p.fast ? 170 : 300)) : k;
      p.x += (tg.x - p.x) * kk;
      p.y += (tg.y - p.y) * kk;
      p.el.setAttribute("transform", `translate(${(p.x * U).toFixed(1)} ${(p.y * U).toFixed(1)})`);
    });
    // Ball follows whoever has it.
    if (S.carrier && !S.ballFlying) {
      const dir = S.carrier.team === "f" ? 1 : -1;
      S.ball.x += (S.carrier.x + dir * 1.3 - S.ball.x) * 0.35;
      S.ball.y += (S.carrier.y + 0.7 - S.ball.y) * 0.35;
      S.ball.h = 0;
    }
    const bx = S.ball.x * U, by = S.ball.y * U, lift = S.ball.h * 6;
    S.ballSh.setAttribute("cx", bx + lift * 0.3);
    S.ballSh.setAttribute("cy", by + 4);
    S.ballB.setAttribute("transform", `translate(${bx.toFixed(1)} ${(by - lift).toFixed(1)}) scale(${(1 + S.ball.h * 0.09).toFixed(2)}) rotate(${((S.ball.x + S.ball.y) * 40) % 360})`);
    // Officials
    const r = S.refP;
    const rt = { x: clamp(S.ball.x - 9, 12, PW - 12), y: clamp(S.ball.y + (S.ball.y < 34 ? 10 : -10), 6, PH - 6) };
    r.x += (rt.x - r.x) * k * 0.8; r.y += (rt.y - r.y) * k * 0.8;
    r.el.setAttribute("transform", `translate(${(r.x * U).toFixed(1)} ${(r.y * U).toFixed(1)})`);
    const l1 = clamp(lastLine("o"), PW / 2, PW), l2 = clamp(lastLine("f"), 0, PW / 2);
    S.la1.x += (l1 - S.la1.x) * k; S.la2.x += (l2 - S.la2.x) * k;
    S.la1.el.setAttribute("transform", `translate(${(S.la1.x * U).toFixed(1)} ${(-1.3 * U).toFixed(1)})`);
    S.la2.el.setAttribute("transform", `translate(${(S.la2.x * U).toFixed(1)} ${((PH + 1.3) * U).toFixed(1)})`);
    // Name of whoever has the ball.
    const cl = $("carrier-label");
    if (S.carrier && !S.carrier.george) {
      cl.setAttribute("opacity", "1");
      cl.setAttribute("transform", `translate(${(S.carrier.x * U).toFixed(1)} ${(S.carrier.y * U - 24).toFixed(1)})`);
      if (cl._who !== S.carrier.id) {
        cl._who = S.carrier.id;
        $("cl-text").textContent = S.carrier.short;
        const w = Math.max(50, S.carrier.short.length * 7.4 + 16);
        $("cl-bg").setAttribute("x", -w / 2); $("cl-bg").setAttribute("width", w);
      }
    } else cl.setAttribute("opacity", "0");
    // Camera
    const svg = $("pitch");
    const fullW = 1270, fullH = 860;
    const tw = S.zoomed ? 700 : fullW, th = S.zoomed ? 474 : fullH;
    const cx = S.zoomed ? clamp(bx - tw / 2, -90, fullW - 90 - tw) : -80;
    const cy = S.zoomed ? clamp(by - th / 2, -90, fullH - 90 - th) : -90;
    const c = S.cam;
    const ck = 1 - Math.exp(-dt / 380);
    c.x += (cx - c.x) * ck; c.y += (cy - c.y) * ck; c.w += (tw - c.w) * ck; c.h += (th - c.h) * ck;
    svg.setAttribute("viewBox", `${c.x.toFixed(1)} ${c.y.toFixed(1)} ${c.w.toFixed(1)} ${c.h.toFixed(1)}`);
    // Clock
    if (S.clockRunning) drawClock(S.clockBase + (performance.now() - S.clockT0) / S.minuteMs);
    // Heat map: where George has been.
    if (S.phase === "play" && S.george.on) {
      const hx = clamp(Math.floor(S.george.x / 5), 0, 20), hy = clamp(Math.floor(S.george.y / 5), 0, 13);
      S.heat[hy * 21 + hx] += dt;
    }
  }

  /* ================================================================
     Ball movement helpers
     ================================================================ */
  async function passTo(p, ms, lob) {
    const from = { x: S.ball.x, y: S.ball.y };
    const dir = p.team === "f" ? 1 : -1;
    const to = { x: p.x + dir * 2, y: p.y };
    S.ballFlying = true;
    S.carrier = null;
    await guardedTween(reduced ? 60 : ms || 480, (k) => {
      S.ball.x = lerp(from.x, to.x, k); S.ball.y = lerp(from.y, to.y, k);
      S.ball.h = lob ? Math.sin(Math.PI * k) * lob : 0;
    }, util.easeInOut);
    S.ballFlying = false;
    S.carrier = p;
    S.poss = p.team;
    S.stats[p.team].passes += 1;
  }
  async function ballTo(x, y, ms, lift) {
    const from = { x: S.ball.x, y: S.ball.y };
    S.ballFlying = true; S.carrier = null;
    await guardedTween(reduced ? 60 : ms, (k) => {
      S.ball.x = lerp(from.x, x, k); S.ball.y = lerp(from.y, y, k);
      S.ball.h = lift ? Math.sin(Math.PI * Math.min(1, k * 1.1)) * lift : 0;
    }, (k) => k);
    S.ballFlying = false;
  }
  function holdAt(p, x, y, fast) { p.hold = { x, y }; p.fast = !!fast; }
  function releaseAll() { S.players.forEach((p) => { p.hold = null; p.fast = false; }); }

  function trail(from, to, colour) {
    const fx = $("fx-pitch");
    const id = "tr" + Date.now();
    fx.insertAdjacentHTML("beforeend", `<path id="${id}" d="M${from.x} ${from.y} Q${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - 4} ${to.x} ${to.y}" fill="none" stroke="${colour || "#f5b942"}" stroke-width="0.35" stroke-linecap="round" stroke-dasharray="1 0.8" opacity=".9"/>`);
    setTimeout(() => { const el = $(id); if (el) el.remove(); }, 1600);
  }

  /* ================================================================
     Scoreboard, clock, commentary
     ================================================================ */
  function drawClock(m) {
    const half1 = S.half === 1;
    const cap = half1 ? 45 + S.added1 : 90 + S.added2;
    const mm = Math.min(m, cap + 0.99);
    const whole = Math.floor(mm), secs = Math.floor((mm - whole) * 60);
    $("sb-clock").textContent = `${String(whole).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  function drawScore() {
    $("sb-f").textContent = S.score.f;
    $("sb-o").textContent = S.score.o;
    const f = S.goals.filter((g) => g.team === "f" && !g.disallowed).map((g) => `${g.who} ${g.minLabel}'`);
    const o = S.goals.filter((g) => g.team === "o" && !g.disallowed).map((g) => `${g.who} ${g.minLabel}'`);
    $("sb-scorers").textContent = [f.join(", "), o.join(", ")].filter(Boolean).join("  |  ");
  }
  const ICON = { goal: "⚽", yellow: "🟨", red: "🟥", var: "📺", sub: "🔁", save: "🧤", whistle: "📣", offside: "🚩", penalty: "🎯", chance: "💥", info: "🎙️" };
  function say(text, opts) {
    const o = opts || {};
    $("commentary").innerHTML = `<span aria-hidden="true">${ICON[o.icon] || "🎙️"}</span> ${escapeHtml(text)}`;
    if (o.log) logEvent(o.icon || "info", text, o.team);
    if (o.voice) VOICE.say(o.voiceText || text, o.excited);
  }
  function logEvent(icon, text, t, minText) {
    S.events.push({ min: minText || minuteLabel(Math.max(1, S.min)), icon, text, team: t || "" });
    renderTimeline();
  }
  const minuteLabel = (m) => (S.half === 1 && m > 45 ? `45+${m - 45}` : S.half === 2 && m > 90 ? `90+${m - 90}` : `${m}`);

  function pop(text, cls) {
    const el = $("pop");
    el.className = "ps-pop" + (cls ? " " + cls : "");
    el.textContent = text;
    void el.offsetWidth;
    el.classList.add("show");
  }

  function banner(kind, title, sub) {
    const el = $("banner");
    el.className = "md-banner " + kind;
    el.innerHTML = `<b>${escapeHtml(title)}</b>${sub ? `<span>${escapeHtml(sub)}</span>` : ""}`;
    el.hidden = false;
  }
  function hideBanner() { $("banner").hidden = true; }

  function momentum(v) {
    const i = Math.min(Math.floor((Math.max(1, S.min) - 1) / 5), 19);
    S.mom[i] = (S.mom[i] || 0) + v;
    renderMomentum();
  }

  /* ================================================================
     The clock: run minutes until something happens
     ================================================================ */
  function startClock() { S.clockBase = S.min; S.clockT0 = performance.now(); S.clockRunning = true; }
  function stopClock() { if (S.clockRunning) { S.clockRunning = false; drawClock(S.min); } }

  async function playMinute() {
    startClock();
    const t0 = performance.now();
    // Keep the ball moving: a pass or two each minute.
    const T = S.tier;
    if (!S.carrier) S.carrier = pick(outfield(S.poss));
    if (rand() < 0.45) {
      // Who has the ball this minute. Over a match Forest end up with about T.poss of it.
      S.poss = rand() < T.poss + (S.oppDown || 0) * 0.08 ? "f" : "o";
    }
    const mates = outfield(S.poss).filter((p) => p !== S.carrier);
    const tgt = pick(mates.filter((p) => (S.poss === "f" ? p.x > S.ball.x - 12 : p.x < S.ball.x + 12)).concat(mates.slice(0, 1)));
    await passTo(tgt, S.minuteMs * 0.75, rand() < 0.2 ? 3 : 0);
    S.stats[S.poss].poss += 1;
    const elapsed = performance.now() - t0;
    if (elapsed < S.minuteMs) await wait(S.minuteMs - elapsed);
    S.min += 1;
    stopClock();
    const deep = S.poss === "f" ? S.ball.x > 60 : S.ball.x < 45;
    momentum((S.poss === "f" ? 1 : -1) * (deep ? 1 : 0.4));
    renderStats();
  }

  /* Things that just happen: fouls, cards, offsides, corners, subs. */
  async function ambient() {
    const m = S.min;
    const near = S.schedule.some((x) => !x.done && Math.abs(x.min - m) <= 1);
    if (S.half === 2 && S.subsDone < 2 && ((m >= 61 && S.subsDone === 0) || (m >= 73 && S.subsDone === 1))) return forestSubs();
    if (near) return;
    const r = rand();
    if (r < 0.06) return foul();
    if (r < 0.08) return offside(S.poss);
    if (r < 0.105) {
      S.stats[S.poss].corners += 1;
      say(S.poss === "f" ? `Corner to Forest. ${pick(outfield("f").filter((p) => !p.george)).short} swings it in... cleared.` : `${S.opp.name} win a corner. Sels punches it clear.`, { icon: "info" });
      momentum(S.poss === "f" ? 1.5 : -1.5);
      return;
    }
    if (r < 0.13) {
      // Forest shots are mostly George's.
      const shooter = S.poss === "f" && rand() < 0.7 ? S.george : pick(outfield(S.poss).filter((p) => p.line !== "def"));
      S.stats[S.poss].shots += 1;
      S.stats[S.poss].xg += 0.04;
      say(`${shooter.george ? "George" : shooter.short} tries his luck from distance... ${pick(["over the bar", "wide of the post", "straight into the crowd"])}.`, { icon: "info" });
      momentum(S.poss === "f" ? 1.5 : -1.5);
    }
  }

  async function foul() {
    const offenderTeam = rand() < 0.62 ? "o" : "f";
    const victimTeam = other(offenderTeam);
    const offender = pick(outfield(offenderTeam).filter((p) => p.line !== "fwd"));
    const victim = offenderTeam === "o" && rand() < 0.5 ? S.george : pick(outfield(victimTeam));
    S.stats[offenderTeam].fouls += 1;
    await passTo(victim, 300);
    sfx.whistle();
    const card = rand() < 0.38;
    if (!card) { say(`Free kick. ${offender.short} catches ${victim.george ? "George" : victim.short}. ${S.ref} has a word.`, { icon: "whistle" }); return; }
    await showCard(offender, "yellow", `for a late tackle on ${victim.george ? "George" : victim.short}`);
  }

  async function showCard(p, colour, why) {
    stopClock();
    p.cards += colour === "yellow" ? 1 : 2;
    let c = colour;
    if (colour === "yellow" && p.cards >= 2) c = "second";
    const t = p.team;
    if (c === "yellow") S.stats[t].yellows += 1; else S.stats[t].reds += 1;
    const cardEl = p.el.querySelector(".tok-card");
    cardEl.setAttribute("fill", c === "yellow" ? "#f5d000" : "#e1102c");
    cardEl.setAttribute("opacity", "1");
    const teamName = t === "f" ? "Forest" : S.opp.name;
    $("card-overlay").className = "md-card-pop " + (c === "yellow" ? "yellow" : "red");
    $("card-who").textContent = `${p.name} (${t === "f" ? "NFO" : S.opp.abbr})`;
    $("card-kind").textContent = c === "yellow" ? "YELLOW CARD" : c === "second" ? "SECOND YELLOW · RED CARD" : "RED CARD";
    $("card-ref").textContent = `Referee: ${S.ref}`;
    $("card-overlay").hidden = false;
    sfx.whistle();
    say(`${c === "yellow" ? "Yellow card" : "Red card"}! ${S.ref} books ${p.short} ${why}.`, { icon: c === "yellow" ? "yellow" : "red", log: true, team: t, voice: c !== "yellow", voiceText: `Red card for ${p.short}!` });
    await wait(reduced ? 500 : 1700);
    $("card-overlay").hidden = true;
    if (c !== "yellow") {
      p.on = false;
      p.el.style.display = "none";
      if (t === "o") S.oppDown = (S.oppDown || 0) + 1;
      say(`${p.short} is off. ${teamName} are down to ${team(t).length} men.`, { icon: "red" });
    }
  }

  async function offside(t) {
    const runner = pick(outfield(t).filter((p) => p.line === "fwd" || p.line === "att")) || pick(outfield(t));
    S.stats[t].offsides += 1;
    const la = t === "f" ? S.la1 : S.la2;
    la.el.querySelectorAll(".flag").forEach((f) => f.setAttribute("opacity", "1"));
    say(`Flag's up! ${runner.george ? "George" : runner.short} was offside.`, { icon: "offside" });
    sfx.whistle();
    await wait(reduced ? 300 : 1100);
    la.el.querySelectorAll(".flag").forEach((f) => f.setAttribute("opacity", "0"));
    S.poss = other(t);
  }

  async function forestSubs() {
    const batch = S.subsDone === 0 ? S.benchF.filter((s) => s.for === 9 || s.for === 7) : S.benchF.filter((s) => s.for === 6);
    S.subsDone += 1;
    stopClock();
    for (const sub of batch) {
      const out = byIdx("f", sub.for);
      if (!out || !out.on) continue;
      const wasName = out.short;
      out.subbedOff = { name: out.name, short: out.short, num: out.num };
      Object.assign(out, { num: sub.num, name: sub.name, short: sub.short, pos: sub.pos, subOn: S.min, cards: 0 });
      // A striker coming on plays up top next to George.
      if (sub.pos === "ST") { out.base = { x: 74, y: 22 }; out.line = "fwd"; }
      out.el.querySelector(".tok-num").textContent = sub.num;
      out.el.querySelector(".tok-card").setAttribute("opacity", "0");
      out.el.classList.add("sub-flash");
      setTimeout(() => out.el.classList.remove("sub-flash"), 1600);
      say(`Forest change: ${sub.short} on, ${wasName} off.`, { icon: "sub", log: true, team: "f" });
      renderLineups();
      await wait(reduced ? 300 : 1300);
    }
  }

  /* ================================================================
     Questions
     ================================================================ */
  let answerKeyHandler = null;
  // Make sure the question is on screen without losing the pitch.
  function revealPanel() {
    const r = $("panel").getBoundingClientRect();
    if (r.bottom > window.innerHeight) window.scrollBy({ top: r.bottom - window.innerHeight + 12, behavior: reduced ? "auto" : "smooth" });
  }
  function askQuestion(level, opts) {
    const o = opts || {};
    const g = GEN;
    return new Promise((resolve) => {
      const q = MQ.nextQuestion(level, SAVE.subjects, S.used);
      S.used.add(q.id);
      S.currentQ = q;
      const secs = Math.max(6, LEVEL_TIME[level] - S.tier.timer);
      const panel = $("panel");
      const powers = (o.powers || []).filter((k) => S.powers[k]);
      const POWER = {
        gw: { img: "gibbs-white", name: "Gibbs-White", what: "Magic pass: counts as right" },
        murillo: { img: "murillo", name: "Murillo", what: "Last-ditch block: counts as right" },
        neco: { img: "neco-williams", name: "Neco Williams", what: "+10 seconds" },
      };
      const stars = "★".repeat(level) + "☆".repeat(3 - level);
      panel.innerHTML = `
        <div class="md-q ${o.kind || ""}">
          <div class="md-q-head">
            <span class="md-kicker">${escapeHtml(o.kicker || "Question")}</span>
            <span class="md-level" title="Difficulty">${stars} · ${MQ.SUBJECTS[q.subject] ? MQ.SUBJECTS[q.subject].emoji : ""} ${escapeHtml(MQ.SUBJECTS[q.subject] ? MQ.SUBJECTS[q.subject].label : "")}</span>
          </div>
          <h3 class="md-q-title">${escapeHtml(o.title || "")}</h3>
          <p class="md-q-text" id="q-text">${escapeHtml(q.q)}</p>
          <div class="md-timer" aria-hidden="true"><span id="q-timer"></span></div>
          <div class="md-options n${q.options.length}" id="q-options">
            ${q.options.map((opt, i) => `<button type="button" class="md-opt" data-i="${i}"><kbd>${i + 1}</kbd> ${escapeHtml(opt)}</button>`).join("")}
          </div>
          ${powers.length ? `<div class="md-powers">${powers.map((k) => `<button type="button" class="md-power" data-power="${k}"><img src="../assets/images/players/${POWER[k].img}.webp" alt=""><span><b>${POWER[k].name}</b><small>${POWER[k].what}</small></span></button>`).join("")}</div>` : ""}
          <p class="md-feedback" id="q-feedback" role="status"></p>
        </div>`;
      panel.hidden = false;
      revealPanel();
      const first = panel.querySelector(".md-opt");
      if (first) first.focus({ preventScroll: true });
      let left = secs * 1000, last = performance.now(), done = false;
      const bar = $("q-timer");
      function tick(now) {
        if (done || g !== GEN) return;
        left -= now - last; last = now;
        bar.style.width = Math.max(0, (left / (secs * 1000)) * 100) + "%";
        bar.classList.toggle("low", left < 4000);
        if (left <= 0) return finish(-1, "time");
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      function finish(i, how) {
        if (done) return;
        done = true;
        document.removeEventListener("keydown", answerKeyHandler);
        const buttons = panel.querySelectorAll(".md-opt");
        buttons.forEach((b) => { b.disabled = true; });
        panel.querySelectorAll(".md-power").forEach((b) => { b.disabled = true; });
        const rightIdx = q.options.indexOf(q.a);
        const correct = how === "power" || (i >= 0 && q.options[i] === q.a);
        if (buttons[rightIdx]) buttons[rightIdx].classList.add("right");
        if (i >= 0 && !correct && buttons[i]) buttons[i].classList.add("wrong");
        const fb = $("q-feedback");
        if (how === "power") fb.textContent = "Power-up used!";
        else if (correct) { fb.textContent = pick(["Yes! Spot on.", "Correct!", "Nailed it!", "Brilliant!"]); sfx.ding(); }
        else { fb.textContent = how === "time" ? `Out of time! It was ${q.a}.` : `Not quite. It was ${q.a}.`; sfx.buzz(); }
        if (how !== "power") {
          MQ.record(q, correct);
          S.asked += 1; S.levels[level][1] += 1;
          if (correct) { S.right += 1; S.levels[level][0] += 1; }
        }
        setTimeout(() => { if (g !== GEN) return; panel.hidden = true; panel.innerHTML = ""; resolve(correct); }, reduced ? 350 : correct ? 900 : 1500);
      }
      panel.querySelectorAll(".md-opt").forEach((b) => b.addEventListener("click", () => finish(Number(b.dataset.i), "click")));
      panel.querySelectorAll(".md-power").forEach((b) => b.addEventListener("click", () => {
        const k = b.dataset.power;
        S.powers[k] = false;
        renderPowers();
        sfx.unlock();
        if (k === "neco") { left += 10000; b.disabled = true; b.classList.add("used"); $("q-feedback").textContent = "Neco buys you 10 more seconds!"; return; }
        finish(-1, "power");
      }));
      answerKeyHandler = (e) => {
        const n = Number(e.key);
        if (n >= 1 && n <= q.options.length) { e.preventDefault(); finish(n - 1, "key"); }
      };
      document.addEventListener("keydown", answerKeyHandler);
    });
  }

  function choose(title, text, choices) {
    const g = GEN;
    return new Promise((resolve) => {
      const panel = $("panel");
      panel.innerHTML = `
        <div class="md-q choose">
          <div class="md-q-head"><span class="md-kicker">${escapeHtml(title)}</span></div>
          <p class="md-q-text">${escapeHtml(text)}</p>
          <div class="md-choices">
            ${choices.map((c, i) => `<button type="button" class="md-choice" data-i="${i}"><span class="t">${c.icon} ${escapeHtml(c.label)}</span><span class="s">${escapeHtml(c.sub)}</span>${c.xg != null ? `<span class="xg">xG ${c.xg.toFixed(2)}</span>` : ""}</button>`).join("")}
          </div>
        </div>`;
      panel.hidden = false;
      revealPanel();
      panel.querySelector(".md-choice").focus({ preventScroll: true });
      const onKey = (e) => {
        const n = Number(e.key);
        if (n >= 1 && n <= choices.length) { e.preventDefault(); done(n - 1); }
      };
      function done(i) {
        document.removeEventListener("keydown", onKey);
        if (g !== GEN) return;
        panel.hidden = true; panel.innerHTML = "";
        resolve(choices[i].id);
      }
      panel.querySelectorAll(".md-choice").forEach((b) => b.addEventListener("click", () => done(Number(b.dataset.i))));
      document.addEventListener("keydown", onKey);
    });
  }

  function waitButton(title, text, label) {
    const g = GEN;
    return new Promise((resolve) => {
      const panel = $("panel");
      panel.innerHTML = `<div class="md-q choose"><div class="md-q-head"><span class="md-kicker">${escapeHtml(title)}</span></div>
        ${text}<button type="button" class="btn-primary md-continue" id="btn-continue">${escapeHtml(label)}</button></div>`;
      panel.hidden = false;
      revealPanel();
      $("btn-continue").focus({ preventScroll: true });
      $("btn-continue").addEventListener("click", () => { if (g !== GEN) return; panel.hidden = true; panel.innerHTML = ""; resolve(); });
    });
  }

  /* ================================================================
     Goals, saves and misses
     ================================================================ */
  function goalTarget(t, corner) {
    const x = t === "f" ? PW + 0.8 : -0.8;
    const y = corner === "left" ? GOAL_TOP + 1 : corner === "right" ? GOAL_BOT - 1 : corner === "middle" ? 34 : GOAL_TOP + 0.8 + rand() * 5.7;
    return { x, y };
  }

  async function shoot(shooter, t, result, opts) {
    const o = opts || {};
    const target = goalTarget(t, o.corner);
    const keeper = keeperOf(other(t));
    S.stats[t].shots += 1;
    S.stats[t].xg += o.xg || 0.2;
    if (result === "goal" || result === "save" || result === "post") S.stats[t].onTarget += result === "post" ? 0 : 1;
    trail({ x: S.ball.x, y: S.ball.y }, target, t === "f" ? "#f5b942" : "#ff5d5d");
    sfx.kick();
    if (result === "save") {
      holdAt(keeper, keeper.x, target.y, true);
      await ballTo(t === "f" ? PW - 2.5 : 2.5, target.y, o.ms || 520, o.lift || 1.2);
      sfx.save();
      S.stats[other(t)].saves += 1;
      await ballTo(t === "f" ? PW + 1 : -1, target.y < 34 ? -1 : PH + 1, 420, 1.5);
      return "save";
    }
    if (result === "post") {
      await ballTo(target.x - (t === "f" ? 1 : -1), GOAL_TOP, o.ms || 520, o.lift || 1.5);
      sfx.post();
      await ballTo(t === "f" ? PW - 14 : 14, 20, 500, 1);
      return "post";
    }
    if (result === "miss") {
      const y = rand() < 0.5 ? GOAL_TOP - 3 - rand() * 4 : GOAL_BOT + 3 + rand() * 4;
      await ballTo(t === "f" ? PW + 3 : -3, y, o.ms || 560, o.lift || 2);
      sfx.aww();
      return "miss";
    }
    // Goal!
    holdAt(keeper, keeper.x, target.y < 34 ? target.y + 3 : target.y - 3, true);
    await ballTo(target.x, target.y, o.ms || 520, o.lift || 1.2);
    const net = $(t === "f" ? "net-r" : "net-l");
    net.classList.remove("flash"); void net.getBBox(); net.classList.add("flash");
    return "goal";
  }

  async function celebrateGeorge() {
    const c = CELES[S.gear.cele];
    const cele = $("celebration");
    $("cele-avatar").innerHTML = GK.avatar({ pose: c.pose, kit: S.gear.kit, happy: true });
    const av = $("cele-avatar").querySelector("svg");
    if (av && !reduced) av.classList.add(c.anim);
    $("cele-text").textContent = c.shout;
    cele.hidden = false;
    const g = GEN;
    await new Promise((resolve) => {
      const t = setTimeout(done, reduced ? 700 : 2300);
      function done() { clearTimeout(t); cele.hidden = true; cele.removeEventListener("click", done); if (g === GEN) resolve(); }
      cele.addEventListener("click", done);
    });
  }

  async function scoreGoal(t, scorer, assister, kind) {
    const g = { team: t, min: S.min, minLabel: minuteLabel(S.min), who: scorer.george ? "George" : scorer.short, id: scorer.id, assist: assister ? assister.short : null, kind };
    S.goals.push(g);
    S.score[t] += 1;
    scorer.goals += 1;
    if (assister) assister.assists += 1;
    drawScore();
    $("scoreboard").classList.remove("goal-flash"); void $("scoreboard").offsetWidth; $("scoreboard").classList.add("goal-flash");
    if (t === "f") {
      sfx.roar();
      pop("GOAL!");
      if (!reduced) $("stage").classList.add("shake");
      setTimeout(() => $("stage").classList.remove("shake"), 600);
      GK.confetti($("confetti"), 140);
      const line = scorer.george
        ? pick([`GEORGE! What a finish! ${S.score.f}-${S.score.o} Forest!`, scorer.goals > 1 ? `It's George! Again! ${S.home ? "The City Ground erupts!" : "The away end is bouncing!"}` : `It's George! ${S.home ? "The City Ground erupts!" : "The away end goes wild!"}`, `George, you beauty! That is top class.`, `GOAL! George with the finish, cool as you like.`])
        : `GOAL! ${scorer.short} scores for Forest! ${S.score.f}-${S.score.o}.`;
      say(line + (assister ? ` Assist: ${assister.george ? "George" : assister.short}.` : ""), { icon: "goal", log: true, team: "f", voice: true, excited: true, voiceText: scorer.george ? `George scores! ${S.score.f} ${S.score.o}` : `${scorer.short} scores for Forest!` });
      momentum(5);
      await wait(reduced ? 200 : 1300);
      if (scorer.george) await celebrateGeorge();
      else await wait(reduced ? 300 : 1200);
    } else {
      sfx.aww();
      pop(`${S.opp.abbr} GOAL`, "soft");
      say(`${S.opp.name} score. ${scorer.short} finds the net. ${S.score.f}-${S.score.o}.`, { icon: "goal", log: true, team: "o", voice: true });
      momentum(-5);
      await wait(reduced ? 300 : 1500);
    }
  }

  function unscoreLast(t) {
    const g = [...S.goals].reverse().find((x) => x.team === t && !x.disallowed);
    if (!g) return;
    g.disallowed = true;
    S.score[t] -= 1;
    const p = S.players.find((x) => x.id === g.id);
    if (p) p.goals -= 1;
    const a = S.players.find((x) => x.short === g.assist && x.team === t);
    if (a) a.assists -= 1;
    drawScore();
    S.events = S.events.filter((e) => !(e.icon === "goal" && e.team === t && e.min === g.minLabel));
    renderTimeline();
  }

  /* VAR: draws the offside lines and makes a call. */
  async function varCheck(kind, verdictGood, attackTeam) {
    stopClock();
    sfx.tick();
    banner("var", "VAR CHECK", kind);
    say(`Hold on... ${S.varRef} in the VAR room at Stockley Park is checking for ${kind.toLowerCase()}.`, { icon: "var", voice: true, voiceText: "VAR check" });
    const fx = $("fx-pitch");
    const attackX = attackTeam === "f" ? clamp(S.ball.x - 12 + rand() * 3, 60, 96) : clamp(S.ball.x + 12 - rand() * 3, 9, 45);
    const defX = verdictGood === "onside"
      ? attackX + (attackTeam === "f" ? 0.4 + rand() : -(0.4 + rand()))
      : attackX + (attackTeam === "f" ? -(0.3 + rand() * 0.7) : 0.3 + rand() * 0.7);
    if (/offside/i.test(kind)) {
      fx.insertAdjacentHTML("beforeend", `<g id="var-lines" class="var-lines">
        <rect x="0" y="0" width="${PW}" height="${PH}" fill="#0a1a3a" opacity=".25"/>
        <line x1="${attackX}" y1="0" x2="${attackX}" y2="${PH}" stroke="#ff4d62" stroke-width="0.3"/>
        <line x1="${defX}" y1="0" x2="${defX}" y2="${PH}" stroke="#4db8ff" stroke-width="0.3"/>
      </g>`);
    }
    await wait(reduced ? 500 : 2400);
    const gap = Math.abs(attackX - defX).toFixed(2);
    const lines = $("var-lines");
    if (lines) lines.remove();
    return gap;
  }

  /* ================================================================
     The big moments
     ================================================================ */
  async function runMoment(m) {
    stopClock();
    if (m.type === "attack") await attackMoment();
    else if (m.type === "defend") await defendMoment();
    else if (m.type === "penalty") await penaltyMoment();
    else if (m.type === "freekick") await freeKickMoment();
    releaseAll();
    renderStats();
  }

  function pickScorer(pGeorge, alternatives) {
    if (rand() < pGeorge || !S.george.on) return S.george;
    const alts = alternatives.map((i) => byIdx("f", i)).filter((p) => p && p.on);
    return alts.length ? pick(alts) : S.george;
  }

  async function forestGoalFlow(scorer, assister, kind) {
    // Sometimes VAR has a look at George's goal. It always stands: he timed his run perfectly.
    await scoreGoal("f", scorer, assister, kind);
    if (rand() < 0.22) {
      const gap = await varCheck("Possible offside", "onside", "f");
      banner("good", "GOAL STANDS ✅", `Onside by ${gap} m`);
      sfx.roar();
      say(`Check complete. Onside by ${gap} metres! The goal stands!`, { icon: "var", log: true, team: "f", voice: true, excited: true, voiceText: "The goal stands!" });
      S.varWins += 1;
      await wait(reduced ? 400 : 1600);
      hideBanner();
    }
    await restart("o");
  }

  async function restart(kickTeam) {
    S.phase = "kickoff";
    S.kickoffTeam = kickTeam;
    releaseAll();
    S.carrier = null;
    await ballTo(52.5, 34, 500, 0);
    await wait(reduced ? 200 : 900);
    const taker = kickTeam === "f" ? S.george : outfield("o").find((p) => p.line === "fwd") || outfield("o")[0];
    S.carrier = taker;
    sfx.whistle();
    await wait(250);
    S.phase = "play";
    S.poss = kickTeam;
    const back = outfield(kickTeam).filter((p) => p.line === "mid");
    if (back.length) await passTo(pick(back), 450);
  }

  async function buildUp(t, finalBall) {
    S.poss = t;
    S.phase = "play";
    const mids = outfield(t).filter((p) => p.line === "mid" || p.line === "def");
    if (!S.carrier || S.carrier.team !== t) await passTo(pick(mids), 380);
    const chain = t === "f"
      ? [byIdx("f", 8), rand() < 0.5 ? byIdx("f", 7) : byIdx("f", 9)].filter((p) => p && p.on)
      : shuffle(outfield("o").filter((p) => p.line === "att" || p.line === "mid")).slice(0, 2);
    for (const p of chain) {
      if (t === "f") holdAt(p, clamp(p.x + 10, 55, 90), p.y, false);
      else holdAt(p, clamp(p.x - 10, 15, 50), p.y, false);
      await passTo(p, 420, rand() < 0.3 ? 2 : 0);
    }
    if (finalBall) await passTo(finalBall, 420);
    momentum(t === "f" ? 3 : -3);
  }

  async function attackMoment(counter) {
    S.bigChances += 1;
    const g = S.george;
    await buildUp("f");
    holdAt(g, 84, 34 + (rand() - 0.5) * 8, true);
    const holder = S.carrier;
    say(counter
      ? "Forest break at speed! George is away!"
      : pick([`${holder.short} drives forward. George is on the move!`, `Lovely Forest move. ${holder.short} looks up, George makes the run.`, `Forest are on the attack! ${holder.short} has options.`]), { icon: "chance" });
    const choice = counter ? "cross" : await choose("Chance for Forest!", `${holder.short} has the ball. How do you want to attack?`, [
      { id: "tapin", icon: "⚽", label: "Tap-in", sub: "Pass it around: 2 easy questions", xg: 0.58 },
      { id: "cross", icon: "🎯", label: "Cross", sub: "1 medium question: George attacks the ball", xg: 0.32 },
      { id: "long", icon: "🚀", label: "Long shot", sub: "1 hard question, less time: a worldie", xg: 0.09 },
    ]);
    const saveChance = S.tier.saveIfRight;
    if (choice === "tapin") {
      const ok1 = await askQuestion(1, { kicker: "Tap-in · pass 1 of 2", title: "Keep the ball moving", powers: ["gw", "neco"], kind: "attack" });
      if (!ok1) {
        const thief = pick(outfield("o").filter((p) => p.line !== "fwd"));
        await passTo(thief, 380);
        S.stats.o.tackles += 1;
        say(`Intercepted! ${thief.short} reads the pass and clears.`, { icon: "info" });
        return;
      }
      const cutter = byIdx("f", 8).on ? byIdx("f", 8) : holder;
      await passTo(cutter, 380);
      holdAt(cutter, 93, 20, true);
      holdAt(g, 97, 32, true);
      say(`One-two with ${cutter.short}! Into the box...`, { icon: "chance" });
      const ok2 = await askQuestion(1, { kicker: "Tap-in · pass 2 of 2", title: "Square it for the finish", powers: ["gw", "neco"], kind: "attack" });
      if (!ok2) {
        await passTo(g, 380);
        const res = await shoot(g, "f", rand() < 0.5 ? "save" : "miss", { xg: 0.58, ms: 380, lift: 0.4 });
        if (res === "save") { S.stats.f.corners += 1; say(`Point-blank save by ${keeperOf("o").short}! How has that stayed out?`, { icon: "save" }); }
        else say("George stretches... just wide! So close.", { icon: "info" });
        return;
      }
      const scorer = pickScorer(0.75, [7, 9]);
      await passTo(scorer, 360);
      const res = await shoot(scorer, "f", rand() < saveChance * 0.6 ? "save" : "goal", { xg: 0.58, ms: 360, lift: 0.3 });
      if (res === "goal") return forestGoalFlow(scorer, scorer.george ? cutter : g, "tap-in");
      S.stats.f.corners += 1;
      say(`Denied! ${keeperOf("o").short} gets down to save. Corner.`, { icon: "save" });
      return cornerMoment();
    }
    if (choice === "cross") {
      const winger = rand() < 0.5 ? byIdx("f", 7) : byIdx("f", 1);
      holdAt(winger, 92, winger.idx === 7 || winger.idx === 1 ? 60 : 8, true);
      await passTo(winger, 480);
      holdAt(g, 95, 31, true);
      say(`${winger.short} gets to the byline... here comes the cross!`, { icon: "chance" });
      const ok = await askQuestion(2, { kicker: "Cross", title: "Pick your spot", powers: ["gw", "neco"], kind: "attack" });
      const scorer = pickScorer(0.8, [9, 3, 2]);
      await passTo(scorer, 520, 3.5);
      if (!ok) {
        const res = await shoot(scorer, "f", pick(["miss", "save", "miss"]), { xg: 0.32, lift: 1.5 });
        say(res === "save" ? `Good header, better save from ${keeperOf("o").short}.` : `${scorer.george ? "George" : scorer.short} rises... and heads it over.`, { icon: res === "save" ? "save" : "info" });
        return;
      }
      const res = await shoot(scorer, "f", rand() < saveChance ? "save" : "goal", { xg: 0.32, lift: 1.3 });
      if (res === "goal") return forestGoalFlow(scorer, winger, "header");
      S.stats.f.corners += 1;
      say(`What a save! ${keeperOf("o").short} tips it over. Corner to Forest.`, { icon: "save" });
      return cornerMoment();
    }
    // Long shot: always George.
    await passTo(g, 420);
    holdAt(g, 80, g.y, false);
    say("George has space 25 yards out... he's going to shoot!", { icon: "chance" });
    const ok = await askQuestion(3, { kicker: "Long shot", title: "Hit it!", powers: ["gw", "neco"], kind: "attack" });
    if (!ok) {
      const res = await shoot(g, "f", pick(["miss", "save", "post"]), { xg: 0.09, lift: 2.5, ms: 480 });
      say(res === "post" ? "OFF THE POST! Inches away from a wonder goal!" : res === "save" ? `Fingertip save from ${keeperOf("o").short}!` : "It flies over the bar. Worth a go!", { icon: "info" });
      return;
    }
    const res = await shoot(g, "f", rand() < saveChance + 0.1 ? pick(["post", "save"]) : "goal", { xg: 0.09, lift: 2.2, ms: 460, corner: rand() < 0.5 ? "left" : "right" });
    if (res === "goal") { pop("WORLDIE!", "gold"); return forestGoalFlow(g, holder, "long shot"); }
    say(res === "post" ? "Off the woodwork! The crowd can't believe it." : `Great strike, even better save from ${keeperOf("o").short}!`, { icon: res === "post" ? "info" : "save" });
  }

  async function cornerMoment() {
    await ballTo(PW - 0.5, rand() < 0.5 ? 0.5 : PH - 0.5, 500, 0);
    const taker = byIdx("f", 8).on ? byIdx("f", 8) : byIdx("f", 7);
    holdAt(taker, S.ball.x, S.ball.y, true);
    holdAt(S.george, 94, 36, true);
    holdAt(byIdx("f", 2), 95, 30, true);
    holdAt(byIdx("f", 3), 93, 40, true);
    await wait(reduced ? 200 : 700);
    say(`${taker.short} to take the corner. Big men up!`, { icon: "info" });
    const ok = await askQuestion(2, { kicker: "Corner", title: "Attack the ball!", powers: ["neco"], kind: "attack" });
    const scorer = rand() < 0.65 ? S.george : pick([byIdx("f", 2), byIdx("f", 3)]);
    await passTo(scorer, 520, 4);
    const res = await shoot(scorer, "f", ok && rand() < 0.7 ? "goal" : pick(["miss", "save"]), { xg: 0.12, lift: 1 });
    if (res === "goal") return forestGoalFlow(scorer, taker, "header");
    say(res === "save" ? "Headed at the keeper." : "Headed wide. So close!", { icon: "info" });
  }

  async function defendMoment() {
    await buildUp("o");
    const attacker = pick(outfield("o").filter((p) => p.line === "fwd" || p.line === "att")) || pick(outfield("o"));
    holdAt(attacker, 20, 34 + (rand() - 0.5) * 16, true);
    await passTo(attacker, 460);
    const defender = pick([byIdx("f", 3), byIdx("f", 2), byIdx("f", 1), byIdx("f", 4)].filter((p) => p && p.on));
    holdAt(defender, 22, attacker.y + 2, true);
    say(`${attacker.short} is through on goal for ${S.opp.name}! Forest need a hero...`, { icon: "chance" });
    sfx.tick();
    const level = pick(S.tier.defendLevels);
    const ok = await askQuestion(level, { kicker: "Defend!", title: `Stop ${attacker.short}!`, powers: ["murillo", "neco"], kind: "defend" });
    if (ok) {
      S.stats.f.tackles += 1;
      defender.tackles = (defender.tackles || 0) + 1;
      if (rand() < 0.3) {
        const gk = keeperOf("f");
        S.stats.o.shots += 1; S.stats.o.onTarget += 1; S.stats.o.xg += 0.25; S.stats.f.saves += 1;
        gk.saves = (gk.saves || 0) + 1;
        await ballTo(3, attacker.y < 34 ? 31 : 37, 400, 0.8);
        sfx.save();
        say(pick([`Brilliant save by ${gk.short}!`, `${gk.short} spreads himself and saves! Huge moment.`]), { icon: "save", log: true, team: "f" });
        S.carrier = gk;
        await wait(reduced ? 200 : 700);
      } else {
        await passTo(defender, 260);
        sfx.thud();
        say(pick([`What a tackle from ${defender.short}!`, `${defender.short} slides in and wins it cleanly!`, `Last-ditch block from ${defender.short}!`]), { icon: "info" });
        momentum(2);
        await wait(reduced ? 200 : 600);
      }
      // Win it back and break forward sometimes.
      if (rand() < 0.18 && S.min < 88) { await attackMoment(true); }
      return;
    }
    // Wrong answer: trouble.
    if (rand() < 0.14) return oppPenalty(attacker, defender);
    const goal = rand() < S.tier.goalIfWrong;
    const res = await shoot(attacker, "o", goal ? "goal" : pick(["save", "miss", "post"]), { xg: 0.35, lift: 1 });
    if (res !== "goal") {
      if (res === "save") { const gk = keeperOf("f"); gk.saves = (gk.saves || 0) + 1; }
      say(res === "save" ? `${keeperOf("f").short} to the rescue! Great save.` : res === "post" ? "Off the post! Forest survive!" : "Wide! Phew.", { icon: res === "save" ? "save" : "info" });
      return;
    }
    await scoreGoal("o", attacker, null, "shot");
    if (rand() < 0.4) {
      banner("var", "VAR CHECK", "Possible offside");
      const ok2 = await askQuestion(2, { kicker: "VAR check", title: "Help the VAR get it right!", powers: ["neco"], kind: "var" });
      const gap = await varCheck("Possible offside", ok2 ? "offside" : "onside", "o");
      if (ok2) {
        unscoreLast("o");
        banner("good", "NO GOAL ❌", `${attacker.short} offside by ${gap} m`);
        sfx.roar();
        S.stats.o.offsides += 1;
        S.varWins += 1;
        say(`VAR says NO GOAL! ${attacker.short} was offside by ${gap} metres!`, { icon: "var", log: true, team: "f", voice: true, excited: true, voiceText: "No goal! Offside!" });
      } else {
        banner("bad", "GOAL STANDS", `Onside by ${gap} m`);
        say(`The goal stands. Onside by ${gap} metres.`, { icon: "var" });
      }
      await wait(reduced ? 400 : 1700);
      hideBanner();
    }
    await restart("f");
  }

  async function oppPenalty(attacker, defender) {
    sfx.whistle();
    holdAt(attacker, 11.5, 34, false);
    say(`PENALTY to ${S.opp.name}. ${defender.short} catches ${attacker.short} in the box.`, { icon: "penalty", log: true, team: "o" });
    banner("bad", "PENALTY", `${S.ref} points to the spot`);
    await wait(reduced ? 300 : 1200);
    hideBanner();
    releaseAll();
    await ballTo(11, 34, 400, 0);
    const taker = attacker;
    holdAt(taker, 13.5, 34, true);
    const gk = keeperOf("f");
    holdAt(gk, 0.6, 34, true);
    S.phase = "set";
    const ok = await askQuestion(2, { kicker: "Penalty save", title: `Help ${gk.short} save it!`, powers: ["neco"], kind: "defend" });
    const dive = pick(["left", "right"]);
    holdAt(gk, 0.6, dive === "left" ? GOAL_TOP + 1.2 : GOAL_BOT - 1.2, true);
    if (ok) {
      const res = await shoot(taker, "o", "save", { xg: 0.76, corner: dive, ms: 420, lift: 0.6 });
      gk.saves = (gk.saves || 0) + 1;
      pop("SAVED!", "gold");
      sfx.roar();
      say(`${gk.short} SAVES THE PENALTY! What a hero!`, { icon: "save", log: true, team: "f", voice: true, excited: true });
      S.phase = "play";
      return res;
    }
    const res = await shoot(taker, "o", rand() < 0.88 ? "goal" : "post", { xg: 0.76, corner: dive === "left" ? "right" : "left", ms: 420, lift: 0.6 });
    S.phase = "play";
    if (res === "goal") { await scoreGoal("o", taker, null, "penalty"); await restart("f"); }
    else say("It hits the post! Forest escape!", { icon: "info" });
  }

  async function penaltyMoment() {
    const g = S.george;
    await buildUp("f");
    holdAt(g, 94, 30, true);
    await passTo(g, 420);
    const fouler = pick(outfield("o").filter((p) => p.line === "def"));
    holdAt(fouler, 95, 31, true);
    await wait(reduced ? 200 : 600);
    sfx.thud();
    S.poss = "f";
    say(`George goes down in the box! ${fouler.short} was all over him! ${S.ref} waves play on...`, { icon: "chance" });
    await wait(reduced ? 300 : 1000);
    await varCheck("Possible penalty", "pen", "f");
    banner("var", "ON-FIELD REVIEW", `${S.ref} goes to the monitor`);
    say(`${S.ref} is going to the pitch-side monitor...`, { icon: "var" });
    await wait(reduced ? 300 : 1600);
    banner("good", "PENALTY! 🎯", "Decision: penalty to Forest");
    sfx.whistle();
    sfx.roar();
    say("PENALTY TO FOREST! And George will take it himself.", { icon: "penalty", log: true, team: "f", voice: true, excited: true });
    S.penaltiesWon += 1;
    await wait(reduced ? 300 : 1200);
    hideBanner();
    if (rand() < 0.5) await showCard(fouler, "yellow", "for the foul on George");
    releaseAll();
    S.phase = "set";
    await ballTo(PW - 11, 34, 400, 0);
    holdAt(g, PW - 13.5, 34, true);
    const gk = keeperOf("o");
    holdAt(gk, PW - 0.6, 34, true);
    outfield("f").concat(outfield("o")).filter((p) => !p.george).forEach((p) => holdAt(p, clamp(p.x, 60, PW - 18.5), p.y, false));
    const ok = await askQuestion(2, { kicker: "Penalty", title: "George steps up...", powers: ["neco"], kind: "attack" });
    const corner = await choose("Where does George put it?", "Pick your spot.", [
      { id: "left", icon: "↖️", label: "Top left", sub: "Into the corner" },
      { id: "middle", icon: "⬆️", label: "Down the middle", sub: "Brave!" },
      { id: "right", icon: "↗️", label: "Top right", sub: "Into the corner" },
    ]);
    // Right answer: the keeper guesses wrong nearly every time.
    const keeperGoes = ok ? pick(["left", "right", "middle"].filter((c) => c !== corner)) : corner;
    holdAt(gk, PW - 0.6, keeperGoes === "left" ? GOAL_TOP + 1.2 : keeperGoes === "right" ? GOAL_BOT - 1.2 : 34, true);
    const result = ok ? "goal" : pick(["save", "save", "post"]);
    const res = await shoot(g, "f", result, { xg: 0.76, corner, ms: 420, lift: 0.7 });
    S.phase = "play";
    if (res === "goal") return forestGoalFlow(g, null, "penalty");
    say(res === "save" ? `Saved by ${gk.short}! He guessed right.` : "Off the post! Agonising.", { icon: res === "save" ? "save" : "info" });
  }

  async function freeKickMoment() {
    const g = S.george;
    await buildUp("f");
    await passTo(g, 400);
    const fouler = pick(outfield("o").filter((p) => p.line === "mid" || p.line === "def"));
    holdAt(fouler, g.x + 1, g.y, true);
    await wait(reduced ? 200 : 500);
    sfx.whistle();
    S.stats.o.fouls += 1;
    say(`Foul on George, 22 yards out! Free kick in a dangerous area.`, { icon: "whistle" });
    if (rand() < 0.55) await showCard(fouler, "yellow", "for bringing George down");
    releaseAll();
    S.phase = "set";
    const spotY = 34 + (rand() - 0.5) * 16;
    await ballTo(PW - 21, spotY, 400, 0);
    holdAt(g, PW - 23, spotY + 1.5, true);
    // The wall: four defenders 10 yards (9.15 m) away.
    const wall = outfield("o").slice(0, 4);
    wall.forEach((p, i) => holdAt(p, PW - 21 + 9.15, spotY + (34 - spotY) * 0.3 + (i - 1.5) * 1.1, true));
    const gk = keeperOf("o");
    holdAt(gk, PW - 0.8, 34, true);
    await wait(reduced ? 200 : 900);
    say("George over the ball. The wall's lined up... this is Free Kick Masters territory!", { icon: "info" });
    const ok = await askQuestion(3, { kicker: "Free kick", title: "Bend it round the wall!", powers: ["gw", "neco"], kind: "attack" });
    const res = await shoot(g, "f", ok ? (rand() < S.tier.saveIfRight + 0.1 ? "save" : "goal") : pick(["miss", "save", "miss"]), { xg: 0.07, lift: 2.6, ms: 620, corner: spotY < 34 ? "right" : "left" });
    S.phase = "play";
    if (res === "goal") { pop("TOP BINS!", "gold"); return forestGoalFlow(g, null, "free kick"); }
    say(res === "save" ? `${gk.short} claws it away!` : "Over the wall... and over the bar.", { icon: res === "save" ? "save" : "info" });
  }

  /* ================================================================
     Half-time and full-time
     ================================================================ */
  async function addedTime(n) {
    const b = $("board");
    b.innerHTML = `<span>${escapeHtml(S.fourth)}</span><b>+${n}</b>`;
    b.hidden = false;
    say(`The fourth official, ${S.fourth}, shows ${n} added minute${n === 1 ? "" : "s"}.`, { icon: "info" });
    await wait(reduced ? 400 : 1600);
    b.hidden = true;
  }

  async function halfTime() {
    sfx.whistle();
    await wait(200);
    sfx.whistle();
    say(`Half-time at ${S.ground}. Forest ${S.score.f}-${S.score.o} ${S.opp.name}.`, { icon: "whistle", log: true, voice: true });
    S.phase = "kickoff";
    S.kickoffTeam = "o";
    const f = S.stats.f, o = S.stats.o;
    const poss = possPct();
    await waitButton("Half-time", `<p class="md-q-text"><b>Forest ${S.score.f}-${S.score.o} ${escapeHtml(S.opp.name)}</b></p>
      <div class="md-ht"><span>Possession</span><b>${poss}%</b><b>${100 - poss}%</b>
      <span>Shots</span><b>${f.shots}</b><b>${o.shots}</b>
      <span>On target</span><b>${f.onTarget}</b><b>${o.onTarget}</b>
      <span>xG</span><b>${f.xg.toFixed(2)}</b><b>${o.xg.toFixed(2)}</b></div>
      <p class="md-small">Questions right so far: ${S.right} of ${S.asked}.</p>`, "Start the second half ▶");
  }

  function possPct() {
    const f = S.stats.f.poss, o = S.stats.o.poss;
    return f + o ? Math.round((f / (f + o)) * 100) : 50;
  }

  /* ================================================================
     Main match loop
     ================================================================ */
  async function playMatch() {
    S.over = false;
    startLoop();
    drawScore(); drawClock(0); renderStats(); renderTimeline(); renderMomentum(); renderLineups(); renderPowers();
    $("sb-f-name").textContent = MD.FOREST.abbr;
    $("sb-o-name").textContent = S.opp.abbr;
    $("sb-f-kit").style.background = S.forestKit.shirt;
    $("sb-o-kit").style.background = S.oppKit.shirt;
    $("hud-venue").textContent = `${S.ground} · ${S.ref} · ${S.night ? "Floodlights" : "Daytime"}${S.rain ? " · Rain" : ""}`;
    say(`Welcome to ${S.ground}! ${S.home ? "Forest at home" : "Forest on the road"} against ${S.opp.name}. George leads the line in the number 10 shirt.`, { icon: "info", voice: true });
    S.kickoffTeam = "f";
    S.phase = "kickoff";
    S.carrier = null;
    await wait(reduced ? 300 : 1800);
    if (S.quit) return;
    await restart("f");
    logEvent("whistle", "Kick-off!", "");
    for (const half of [1, 2]) {
      S.half = half;
      if (half === 2) {
        await restart("o");
        logEvent("whistle", "Second half under way.", "", "46");
      }
      const end = half === 1 ? 45 : 90;
      const added = half === 1 ? S.added1 : S.added2;
      let boardShown = false;
      let lateChance = false;
      while (S.min < end + added) {
        if (S.quit) return;
        await playMinute();
        if (S.quit) return;
        if (S.min === end && !boardShown) { boardShown = true; await addedTime(added); }
        const m = S.schedule.find((x) => !x.done && x.min <= S.min && x.half === half);
        if (m) { m.done = true; await runMoment(m); continue; }
        // Drama: one last chance in stoppage time if Forest aren't winning.
        if (half === 2 && !lateChance && S.min >= 90 + Math.max(1, added - 1) && S.score.f <= S.score.o) {
          lateChance = true;
          say("Last chance! Everyone forward for Forest, even Sels!", { icon: "chance", voice: true });
          await attackMoment();
          releaseAll();
          continue;
        }
        await ambient();
      }
      if (S.quit) return;
      if (half === 1) { await halfTime(); if (S.quit) return; S.min = 45; }
    }
    await fullTime();
  }

  /* ================================================================
     Ratings, Player of the Match, end screen
     ================================================================ */
  function computeRatings() {
    const won = S.score.f > S.score.o, cleanSheet = S.score.o === 0;
    const ratings = {};
    team("f").concat(S.players.filter((p) => p.team === "f" && !p.on)).forEach((p) => {
      let r = 6.3 + rand() * 0.8;
      r += p.goals * 1.0 + p.assists * 0.6 + (p.tackles || 0) * 0.4 + (p.saves || 0) * 0.45;
      if (cleanSheet && (p.line === "def" || p.gk)) r += 0.6;
      if (!cleanSheet && (p.line === "def" || p.gk)) r -= 0.2 * S.score.o;
      if (won) r += 0.3;
      if (p.cards >= 2) r -= 1.5;
      if (p.george) r += (S.right / Math.max(1, S.asked)) * 1.2 + 0.3;
      ratings[p.id] = clamp(r, 4.5, 10);
    });
    let motm = null;
    const best = Object.entries(ratings).sort((a, b) => b[1] - a[1])[0];
    if (won) {
      // George is always Player of the Match when Forest win.
      const top = Math.max(...Object.values(ratings));
      ratings[S.george.id] = clamp(Math.max(ratings[S.george.id], top + 0.3), 7.5, 10);
      motm = S.george;
    } else {
      motm = S.players.find((p) => p.id === best[0]);
    }
    return { ratings, motm };
  }

  function points() {
    const mult = { 1: 1, 2: 1.25, 3: 1.5 }[S.tierN];
    const won = S.score.f > S.score.o, draw = S.score.f === S.score.o;
    const parts = [
      ["Goals", S.score.f * 100],
      [won ? "Win" : draw ? "Draw" : "Result", won ? 300 : draw ? 100 : 0],
      ["Clean sheet", S.score.o === 0 ? 150 : 0],
      ["Right answers", Math.round(S.right * 20 * mult)],
      ["George hat-trick", S.george.goals >= 3 ? 200 : 0],
      ["VAR drama", S.varWins * 50],
    ];
    return { parts: parts.filter((p) => p[1] > 0), total: parts.reduce((t, p) => t + p[1], 0) };
  }

  async function fullTime() {
    stopClock();
    sfx.whistle(); await wait(180); sfx.whistle(); await wait(180); sfx.whistle();
    const won = S.score.f > S.score.o, draw = S.score.f === S.score.o;
    say(`Full-time! Forest ${S.score.f}-${S.score.o} ${S.opp.name}.`, { icon: "whistle", log: true, voice: true, excited: won });
    if (won) { sfx.fanfare(); GK.confetti($("confetti"), 240); }
    await wait(reduced ? 300 : 1400);
    S.over = true;
    const { ratings, motm } = computeRatings();
    const pts = points();
    // Save
    SAVE.played += 1;
    if (won) SAVE.wins += 1; else if (draw) SAVE.draws += 1; else SAVE.losses += 1;
    SAVE.georgeGoals += S.george.goals;
    SAVE.best = Math.max(SAVE.best, pts.total);
    if (S.fixture) SAVE.results[fixtureKey(S.fixture)] = { f: S.score.f, o: S.score.o, george: S.george.goals };
    persist();
    let badges = [];
    if (window.GZ && GZ.recordMatchday) {
      const r = GZ.recordMatchday({ score: pts.total, won, georgeGoals: S.george.goals, cleanSheet: S.score.o === 0, giantKiller: won && S.tierN === 3, varWin: S.varWins > 0 });
      badges = r.newBadges || [];
      GZ.announceBadges(badges);
    }
    renderResult(ratings, motm, pts, won, draw);
    show("screen-result");
  }

  function statRows(compact) {
    const f = S.stats.f, o = S.stats.o;
    const poss = possPct();
    const rows = [
      ["Possession", poss + "%", 100 - poss + "%", poss, 100 - poss],
      ["Shots", f.shots, o.shots],
      ["Shots on target", f.onTarget, o.onTarget],
      ["Expected goals (xG)", f.xg.toFixed(2), o.xg.toFixed(2), f.xg, o.xg],
      ["Passes", f.passes, o.passes],
      ["Corners", f.corners, o.corners],
      ["Saves", f.saves, o.saves],
      ["Fouls", f.fouls, o.fouls],
      ["Yellow cards", f.yellows, o.yellows],
      ["Red cards", f.reds, o.reds],
      ["Offsides", f.offsides, o.offsides],
    ];
    return rows.filter((r) => !compact || r[0] !== "Red cards" || r[1] || r[2]).map(([label, a, b, na, nb]) => {
      const va = na != null ? na : Number(a), vb = nb != null ? nb : Number(b);
      const tot = va + vb || 1;
      return `<div class="md-stat"><b>${a}</b><span>${label}</span><b>${b}</b>
        <div class="md-stat-bar"><i class="f" style="width:${(va / tot) * 100}%;background:${S.forestKit.shirt === "#f4f1ee" ? "#d7102b" : S.forestKit.shirt}"></i><i class="o" style="width:${(vb / tot) * 100}%;background:${S.oppKit.shirt}"></i></div></div>`;
    }).join("");
  }

  function renderStats() { if (S) $("tab-stats").innerHTML = statRows(true); }

  function renderTimeline() {
    if (!S) return;
    const el = $("tab-timeline");
    el.innerHTML = S.events.length
      ? `<ol class="md-timeline">${S.events.slice().reverse().map((e) => `<li class="${e.team}"><span class="m">${e.min}'</span><span class="i" aria-hidden="true">${ICON[e.icon] || ""}</span><span>${escapeHtml(e.text)}</span></li>`).join("")}</ol>`
      : "<p class='md-small'>Nothing yet. Kick-off coming up!</p>";
  }

  function momentumSVG(w, h) {
    const bars = [];
    const bw = w / 20;
    const max = Math.max(4, ...S.mom.map((v) => Math.abs(v || 0)));
    for (let i = 0; i < 20; i++) {
      const v = S.mom[i] || 0;
      const bh = (Math.abs(v) / max) * (h / 2 - 4);
      const col = v >= 0 ? (S.forestKit.shirt === "#f4f1ee" ? "#d7102b" : S.forestKit.shirt) : S.oppKit.shirt;
      bars.push(`<rect x="${i * bw + 1}" y="${v >= 0 ? h / 2 - bh : h / 2}" width="${bw - 2}" height="${Math.max(1, bh)}" rx="1.5" fill="${col}" stroke="rgba(255,255,255,.25)" stroke-width=".5"/>`);
    }
    const goals = S.goals.filter((g) => !g.disallowed).map((g) => `<text x="${Math.min(19, Math.floor((g.min - 1) / 5)) * bw + bw / 2}" y="${g.team === "f" ? 10 : h - 3}" text-anchor="middle" font-size="9">⚽</text>`).join("");
    return `<svg viewBox="0 0 ${w} ${h}" class="md-mom" role="img" aria-label="Momentum through the match. Bars above the line: Forest on top.">
      <line x1="0" x2="${w}" y1="${h / 2}" y2="${h / 2}" stroke="rgba(255,255,255,.3)"/>
      <line x1="${w * 0.45}" x2="${w * 0.45}" y1="0" y2="${h}" stroke="rgba(255,255,255,.18)" stroke-dasharray="3 3"/>
      ${bars.join("")}${goals}
      <text x="2" y="${h / 2 - 3}" font-size="8" fill="#b9b2ac">NFO</text><text x="2" y="${h / 2 + 10}" font-size="8" fill="#b9b2ac">${S.opp.abbr}</text>
      <text x="${w * 0.45 + 3}" y="${h - 3}" font-size="8" fill="#8a857e">HT</text>
    </svg>`;
  }
  function renderMomentum() { if (S) $("tab-momentum").innerHTML = momentumSVG(320, 90) + `<p class="md-small">Attack momentum, 5 minutes per bar. Up = Forest on top.</p>`; }

  function lineupList(t) {
    const list = S.players.filter((p) => p.team === t);
    const icons = (p) => `${p.goals > 0 ? " " + "⚽".repeat(p.goals) : ""}${p.cards === 1 ? " 🟨" : p.cards >= 2 ? " 🟥" : ""}${p.subOn ? ` 🔁${p.subOn}'` : ""}${p.captain ? " (C)" : ""}`;
    return `<ul class="md-xi">${list.map((p) => `<li class="${p.george ? "g" : ""}${!p.on ? " off" : ""}"><span class="n">${p.num}</span><span class="nm">${escapeHtml(p.george ? "GEORGE" : p.name)}${escapeHtml(icons(p))}</span><span class="ps">${p.pos}</span></li>`).join("")}</ul>`;
  }
  function renderLineups() {
    if (!S) return;
    $("tab-lineups").innerHTML = `<div class="md-xis"><div><h4>Forest <small>${MD.FOREST.formation}</small></h4>${lineupList("f")}</div><div><h4>${escapeHtml(S.opp.name)} <small>${S.opp.formation}</small></h4>${lineupList("o")}</div></div>`;
  }

  function renderPowers() {
    const el = $("powers");
    if (!el || !S) return;
    const P = [["gw", "gibbs-white", "Gibbs-White"], ["murillo", "murillo", "Murillo"], ["neco", "neco-williams", "N. Williams"]];
    el.innerHTML = P.map(([k, img, name]) => `<span class="md-pw${S.powers[k] ? "" : " used"}" title="${name}${S.powers[k] ? " card ready" : " card used"}"><img src="../assets/images/players/${img}.webp" alt="">${name}</span>`).join("");
  }

  function heatmapSVG() {
    const max = Math.max(...S.heat) || 1;
    const blobs = S.heat.map((v, i) => {
      if (!v) return "";
      const x = (i % 21) * 5 + 2.5, y = Math.floor(i / 21) * 5 + 2.5;
      const a = v / max;
      const col = a > 0.66 ? "#ff3b3b" : a > 0.33 ? "#ffb13b" : "#ffe66b";
      return `<circle cx="${x}" cy="${y}" r="${3 + a * 4}" fill="${col}" opacity="${(0.25 + a * 0.6).toFixed(2)}"/>`;
    }).join("");
    return `<svg viewBox="-2 -2 109 72" class="md-heat" role="img" aria-label="George's heat map: where he spent the match">
      <rect x="0" y="0" width="${PW}" height="${PH}" fill="#2e7d3a" stroke="#fff" stroke-width=".4"/>
      <line x1="${PW / 2}" y1="0" x2="${PW / 2}" y2="${PH}" stroke="#fff" stroke-width=".3"/>
      <circle cx="${PW / 2}" cy="34" r="9.15" fill="none" stroke="#fff" stroke-width=".3"/>
      <rect x="0" y="13.84" width="16.5" height="40.32" fill="none" stroke="#fff" stroke-width=".3"/>
      <rect x="${PW - 16.5}" y="13.84" width="16.5" height="40.32" fill="none" stroke="#fff" stroke-width=".3"/>
      <g filter="url(#f-heat)">${blobs}</g>
      <defs><filter id="f-heat" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>
      <text x="${PW - 2}" y="${PH - 2}" text-anchor="end" font-size="4" fill="#fff" opacity=".7">Attacking →</text>
    </svg>`;
  }

  function renderResult(ratings, motm, pts, won, draw) {
    const res = won ? "WIN" : draw ? "DRAW" : "DEFEAT";
    const fScorers = S.goals.filter((g) => g.team === "f" && !g.disallowed).map((g) => `${escapeHtml(g.who)} ${g.minLabel}'${g.kind === "penalty" ? " (pen)" : ""}`).join(", ");
    const oScorers = S.goals.filter((g) => g.team === "o" && !g.disallowed).map((g) => `${escapeHtml(g.who)} ${g.minLabel}'${g.kind === "penalty" ? " (pen)" : ""}`).join(", ");
    const motmIsGeorge = motm && motm.george;
    const gr = ratings[S.george.id];
    const cardArt = motmIsGeorge
      ? GK.avatar({ pose: "up", kit: S.gear.kit, happy: true })
      : `<svg viewBox="0 0 200 230"><circle cx="100" cy="95" r="60" fill="${motm.team === "f" ? (S.forestKit.shirt === "#f4f1ee" ? "#d7102b" : S.forestKit.shirt) : S.oppKit.shirt}" stroke="#fff" stroke-width="6"/><text x="100" y="120" text-anchor="middle" font-family="Rajdhani, sans-serif" font-weight="700" font-size="70" fill="#fff">${motm.num}</text></svg>`;
    const rep = MQ.report();
    const lvlLine = [1, 2, 3].map((l) => `${"★".repeat(l)} ${S.levels[l][0]}/${S.levels[l][1]}`).join(" · ");
    const forestRated = S.players.filter((p) => p.team === "f").sort((a, b) => a.idx - b.idx);
    $("result-body").innerHTML = `
      <div class="md-ft ${won ? "won" : draw ? "draw" : "lost"}">
        <p class="md-kicker">Full-time · ${escapeHtml(S.ground)}</p>
        <div class="md-ft-score">
          <div><i style="background:${S.forestKit.shirt}"></i><span>Forest</span></div>
          <b>${S.score.f} – ${S.score.o}</b>
          <div><i style="background:${S.oppKit.shirt}"></i><span>${escapeHtml(S.opp.name)}</span></div>
        </div>
        <p class="md-ft-scorers">${fScorers ? "⚽ " + fScorers : ""}${fScorers && oScorers ? "<br>" : ""}${oScorers ? `<span class="o">${oScorers}</span>` : ""}</p>
        <span class="md-res-chip">${res}</span>
      </div>
      <div class="md-motm">
        <div class="md-motm-card ${motmIsGeorge ? "george" : ""}">
          <div class="md-motm-tag">PLAYER OF THE MATCH</div>
          <div class="md-motm-art">${cardArt}</div>
          <div class="md-motm-name">${escapeHtml(motmIsGeorge ? "GEORGE" : motm.short.toUpperCase())}</div>
          <div class="md-motm-rating">${ratings[motm.id] ? ratings[motm.id].toFixed(1) : "8.0"}</div>
        </div>
        <div class="md-motm-text">
          <h3>${motmIsGeorge ? "George, you were unreal today." : `${escapeHtml(motm.short)} takes the award.`}</h3>
          <p>${motmIsGeorge
            ? `${S.george.goals ? `${S.george.goals} goal${S.george.goals === 1 ? "" : "s"}` : "Led the line brilliantly"}${S.george.goals >= 3 ? " (HAT-TRICK! 🎩)" : ""}, ${S.right} of ${S.asked} questions right. Rating ${gr.toFixed(1)}.`
            : `George's rating: ${gr.toFixed(1)} with ${S.george.goals} goal${S.george.goals === 1 ? "" : "s"}. Win the match and the award is his!`}</p>
          <div class="md-heat-wrap"><h4>George's heat map</h4>${heatmapSVG()}</div>
        </div>
      </div>
      <div class="md-grid2">
        <section><h4>Match stats</h4>${statRows(false)}</section>
        <section><h4>Momentum</h4>${momentumSVG(320, 90)}
          <h4>Forest ratings</h4>
          <ul class="md-ratings">${forestRated.map((p) => `<li class="${p.george ? "g" : ""}"><span>${p.num}</span><span>${escapeHtml(p.george ? "GEORGE" : p.short)}${p.subbedOff ? ` <small>(for ${escapeHtml(p.subbedOff.short)})</small>` : ""}</span><b class="r${Math.floor(ratings[p.id])}">${ratings[p.id].toFixed(1)}</b></li>`).join("")}</ul>
        </section>
      </div>
      <section class="md-brain">
        <h4>🧠 What the game learned about you</h4>
        <p>Right answers by difficulty: ${lvlLine}</p>
        <p>${rep.mastered} question${rep.mastered === 1 ? "" : "s"} mastered so far (right at least 4 times out of 5) out of ${rep.total} seen. They'll come up less and count as easier for you.</p>
        ${rep.practising.length ? `<p>Coming back for practice:</p><ul>${rep.practising.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` : ""}
      </section>
      <section class="md-points">
        <h4>Points: <b>${pts.total}</b></h4>
        <p>${pts.parts.map(([k, v]) => `${escapeHtml(k)} +${v}`).join(" · ")}</p>
        <form class="fk-save" id="r-save">
          <label class="visually-hidden" for="r-name">Your name</label>
          <input type="text" id="r-name" maxlength="18" placeholder="Your name" autocomplete="off" required>
          <button type="submit">Save score</button>
        </form>
        <p class="ps-saved" id="r-saved" role="status"></p>
      </section>
      <div class="md-actions">
        ${S.fixture && nextUnplayed() ? `<button type="button" class="btn-primary" id="r-next">Next fixture ▶</button>` : ""}
        <button type="button" class="btn-primary" id="r-again">Play again</button>
        <button type="button" class="ps-ghost" id="r-menu">Menu</button>
      </div>`;
    $("r-name").value = "George";
    $("r-save").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("r-name").value.trim();
      if (!name) return;
      try {
        await DB.saveScore(GAME_ID, name.slice(0, 18), pts.total);
        $("r-save").hidden = true;
        $("r-saved").textContent = `Saved! ${pts.total} points for ${name}.`;
      } catch (err) {
        $("r-saved").textContent = "Couldn't save online right now. Try again later.";
      }
    });
    const again = { opp: S.oppKey, venue: S.venue, fixture: S.fixture };
    $("r-again").onclick = () => startMatch(again.opp, again.venue, again.fixture);
    $("r-menu").onclick = () => { renderMenu(); show("screen-menu"); };
    if ($("r-next")) $("r-next").onclick = () => { const f = nextUnplayed(); if (f) showSheet(f.opponent, f.venue, f); };
  }

  /* ================================================================
     Screens: menu, pick a team, season, team sheet
     ================================================================ */
  function show(id) {
    ["screen-menu", "screen-pick", "screen-season", "screen-sheet", "screen-match", "screen-result"].forEach((s) => { $(s).hidden = s !== id; });
    if (id !== "screen-match" && VOICE.supported) speechSynthesis.cancel();
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  function nextUnplayed() { return FIXTURES.find((f) => !SAVE.results[fixtureKey(f)]); }

  function renderMenu() {
    $("menu-avatar").innerHTML = GK.avatar({ pose: "point", kit: georgeGear().kit, happy: true });
    const f = nextFixture();
    if (f) {
      $("btn-week").hidden = false;
      $("week-sub").textContent = `${f.venue === "H" ? "Forest v " + f.opponent : f.opponent + " v Forest"} · ${fmtDate(f)} ${f.time}`;
    } else $("btn-week").hidden = true;
    const played = Object.keys(SAVE.results).length;
    $("season-sub").textContent = `${played} of ${FIXTURES.length} fixtures played`;
    $("menu-record").textContent = SAVE.played
      ? `Your record: played ${SAVE.played}, won ${SAVE.wins}, drew ${SAVE.draws}, lost ${SAVE.losses}. George has scored ${SAVE.georgeGoals} goal${SAVE.georgeGoals === 1 ? "" : "s"}. Best: ${SAVE.best} points.`
      : "No matches played yet. Your first kick-off is waiting!";
    const rep = MQ.report();
    $("menu-brain").textContent = rep.total
      ? `🧠 The game has seen you answer ${rep.total} different questions and you've mastered ${rep.mastered}.`
      : "🧠 The game learns from every answer: questions you nail get easier, ones you miss come back for practice.";
    // Subjects
    $("subjects").innerHTML = Object.entries(MQ.SUBJECTS).map(([k, s]) => `<label class="md-sub"><input type="checkbox" value="${k}" ${SAVE.subjects.includes(k) ? "checked" : ""}> <span>${s.emoji} ${escapeHtml(s.label)}</span></label>`).join("");
    $("subjects").querySelectorAll("input").forEach((cb) => cb.addEventListener("change", () => {
      const on = [...$("subjects").querySelectorAll("input:checked")].map((x) => x.value);
      if (!on.length) { cb.checked = true; return; }
      SAVE.subjects = on;
      persist();
    }));
    showToggles();
    loadBoard();
  }

  function renderPick() {
    const venue = $("pick-venue").dataset.v || "H";
    $("pick-venue").textContent = venue === "H" ? "🏟️ At the City Ground" : "🚌 Away day";
    $("pick-grid").innerHTML = Object.keys(MD.OPPONENTS).sort().map((k) => {
      const t = MD.OPPONENTS[k];
      return `<button type="button" class="md-team" data-k="${escapeHtml(k)}"><i style="background:${t.kit.shirt};border-color:${t.kit.trim}"></i><span><b>${escapeHtml(t.name)}</b><small>${"★".repeat(t.tier)}${"☆".repeat(3 - t.tier)} · ${escapeHtml(t.ground)}</small></span></button>`;
    }).join("");
    $("pick-grid").querySelectorAll(".md-team").forEach((b) => b.addEventListener("click", () => showSheet(b.dataset.k, venue, null)));
  }

  function renderSeason() {
    const pts = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    const nextF = nextUnplayed();
    $("season-list").innerHTML = FIXTURES.map((f) => {
      const r = SAVE.results[fixtureKey(f)];
      if (r) { if (r.f > r.o) pts.w++; else if (r.f === r.o) pts.d++; else pts.l++; pts.gf += r.f; pts.ga += r.o; }
      const t = MD.OPPONENTS[f.opponent];
      const cls = r ? (r.f > r.o ? "w" : r.f === r.o ? "d" : "l") : f === nextF ? "next" : "";
      return `<li class="md-fx ${cls}">
        <span class="d">${fmtDate(f)}</span>
        <span class="t"><i style="background:${t.kit.shirt}"></i>${f.venue === "H" ? "v" : "@"} ${escapeHtml(f.opponent)}</span>
        <span class="r">${r ? `${r.f}-${r.o}${r.george ? ` · G${r.george}` : ""}` : ""}</span>
        <button type="button" class="md-fx-play" data-i="${f.index}">${r ? "Replay" : "Play"}</button>
      </li>`;
    }).join("");
    const total = pts.w * 3 + pts.d;
    $("season-summary").textContent = `W${pts.w} D${pts.d} L${pts.l} · Goals ${pts.gf}-${pts.ga} · ${total} points`;
    $("season-list").querySelectorAll(".md-fx-play").forEach((b) => b.addEventListener("click", () => {
      const f = FIXTURES.find((x) => x.index === Number(b.dataset.i));
      showSheet(f.opponent, f.venue, f);
    }));
    const nextLi = $("season-list").querySelector(".md-fx.next");
    if (nextLi) setTimeout(() => nextLi.scrollIntoView({ block: "center", behavior: "auto" }), 50);
  }

  function showSheet(oppKey, venue, fixture) {
    setupMatch(oppKey, venue, fixture);
    const o = S.opp;
    const xi = (t) => S.players.filter((p) => p.team === t).map((p) => `<li class="${p.george ? "g" : ""}"><span class="n">${p.num}</span><span class="nm">${escapeHtml(p.george ? "GEORGE" : p.name)}${p.captain ? " (C)" : ""}</span><span class="ps">${p.pos}</span></li>`).join("");
    const homeName = S.home ? "Nottingham Forest" : o.name, awayName = S.home ? o.name : "Nottingham Forest";
    $("sheet-body").innerHTML = `
      <div class="md-sheet-head">
        <p class="md-kicker">${fixture ? "Premier League · " + fmtDate(fixture) + " · " + fixture.time : "Friendly"}</p>
        <h2 class="ps-h2">${escapeHtml(homeName)} v ${escapeHtml(awayName)}</h2>
        <div class="md-facts">
          <span>🏟️ ${escapeHtml(S.ground)}</span><span>🧑‍⚖️ Referee: ${escapeHtml(S.ref)}</span><span>📺 VAR: ${escapeHtml(S.varRef)}</span>
          <span>${S.night ? "🌙 Floodlights" : "☀️ Daytime"} · ${S.rain ? "🌧️ Rain" : "Dry"} · ${S.temp}°C</span><span>👥 ${S.attendance.toLocaleString("en-GB")}</span>
          <span>Difficulty ${"★".repeat(o.tier)}${"☆".repeat(3 - o.tier)}</span>
        </div>
      </div>
      <div class="md-xis">
        <div><h4><i style="background:${S.forestKit.shirt}"></i>Forest <small>${MD.FOREST.formation}</small></h4><ul class="md-xi">${xi("f")}</ul></div>
        <div><h4><i style="background:${S.oppKit.shirt}"></i>${escapeHtml(o.name)} <small>${o.formation}</small></h4><ul class="md-xi">${xi("o")}</ul></div>
      </div>
      <p class="md-small">George wears ${escapeHtml(GK.KITS[S.gear.kit].name)} kit from Free Kick Masters. Power-up cards this match: Gibbs-White (magic pass), Murillo (last-ditch block), Neco Williams (+10 seconds). One use each.</p>`;
    show("screen-sheet");
  }

  function startMatch(oppKey, venue, fixture) {
    if (!S || S.oppKey !== oppKey || S.over) setupMatch(oppKey, venue, fixture);
    S.quit = false;
    GEN += 1;
    show("screen-match");
    SOUND.wake && SOUND.wake();
    buildStage();
    setTab("stats");
    playMatch().catch((e) => { console.error(e); });
  }

  function setTab(name) {
    document.querySelectorAll(".md-tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
    ["stats", "timeline", "momentum", "lineups"].forEach((t) => { $("tab-" + t).hidden = t !== name; });
  }

  async function loadBoard() {
    const el = $("menu-board");
    try {
      const rows = await DB.topScores(GAME_ID, 5);
      el.innerHTML = rows.length
        ? `<ol>${rows.map((r) => `<li><span>${escapeHtml(r.player_name)}</span><b>${Number(r.score)}</b></li>`).join("")}</ol>`
        : "<p>No scores yet. Be the first!</p>";
    } catch (e) {
      el.innerHTML = "<p>Couldn't load the top scores right now.</p>";
    }
  }

  function showToggles() {
    $("btn-sound").textContent = SOUND.isOn() ? "🔊 Sound on" : "🔇 Sound off";
    $("btn-sound").setAttribute("aria-pressed", String(SOUND.isOn()));
    $("btn-voice").hidden = !VOICE.supported;
    $("btn-voice").textContent = VOICE.isOn() ? "🎙️ Commentary on" : "🎙️ Commentary off";
    $("btn-voice").setAttribute("aria-pressed", String(VOICE.isOn()));
  }

  /* ================================================================
     Wiring
     ================================================================ */
  $("btn-week").addEventListener("click", () => { const f = nextFixture(); showSheet(f.opponent, f.venue, f); });
  $("btn-season").addEventListener("click", () => { renderSeason(); show("screen-season"); });
  $("btn-friendly").addEventListener("click", () => { renderPick(); show("screen-pick"); });
  $("pick-venue").addEventListener("click", () => { $("pick-venue").dataset.v = ($("pick-venue").dataset.v || "H") === "H" ? "A" : "H"; renderPick(); });
  document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => { renderMenu(); show("screen-menu"); }));
  $("btn-kickoff").addEventListener("click", () => startMatch(S.oppKey, S.venue, S.fixture));
  $("btn-sound").addEventListener("click", () => { SOUND.set(!SOUND.isOn()); showToggles(); if (SOUND.isOn()) sfx.whistle(); });
  $("btn-voice").addEventListener("click", () => { VOICE.set(!VOICE.isOn()); showToggles(); if (VOICE.isOn()) VOICE.say("Commentary on. Come on you Reds!"); });
  $("btn-zoom").addEventListener("click", () => {
    SAVE.zoom = S && S.zoomed ? "full" : "zoom";
    persist();
    if (S) setZoom();
  });
  document.querySelectorAll(".md-tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
  $("btn-quit").addEventListener("click", () => {
    if (!S) return;
    if (!confirm("Leave this match? It won't count.")) return;
    S.quit = true; S.over = true;
    GEN += 1;
    document.removeEventListener("keydown", answerKeyHandler);
    $("panel").hidden = true;
    renderMenu(); show("screen-menu");
  });
  // Keep the scoreboard pinned just under the site header.
  function headerHeight() { const h = document.querySelector(".site-header"); if (h) document.documentElement.style.setProperty("--hdr", h.offsetHeight + "px"); }
  headerHeight();
  window.addEventListener("resize", () => { headerHeight(); if (S && !S.over) setZoom(); });

  renderMenu();
  show("screen-menu");

  // For testing in the browser console.
  window.__md = { get S() { return S; }, get SAVE() { return SAVE; }, MQ };
})();
