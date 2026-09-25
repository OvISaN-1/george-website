/* ================================================================
   PENALTY SHOOTOUT: THE GEORGE CUP
   George takes Forest's penalties, then goes in goal for theirs.
   Deliberately easy: a big green power zone, keepers who guess
   wrong a lot, opponents who miss more when Forest are behind,
   and a Forest question for a retake after a miss.
   ================================================================ */
(function () {
  "use strict";

  /* ---------------- Settings you might want to tweak ---------------- */
  const SUPABASE_URL = "https://hucnucpfyjltlhmvprso.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Y251Y3BmeWpsdGxobXZwcnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDgzNjEsImV4cCI6MjEwMzU4NDM2MX0.DSjLCkiUWB47wVd4wnW_2RvWFoISbH80JI9ukB1bBdg";
  const GAME_ID = "penalty-shootout";
  const LEADERBOARD_SIZE = 10;

  // One entry per round of the George Cup. Higher numbers = harder.
  //   save:    chance the keeper saves when he guesses the right side
  //   guess:   chance the keeper guesses the right side
  //   oppMiss: chance their penalty-taker misses by himself
  //   period:  milliseconds for the power bar to go end to end
  const ROUNDS = [
    { stage: "Round of 16",   opp: "Everton",        short: "EVERTON",   shirt: "#274488", shorts: "#ffffff", socks: "#ffffff", hair: "#2b1d14", keeperKit: "#f2c200", save: 0.35, guess: 0.33, oppMiss: 0.30, period: 1700 },
    { stage: "Quarter-final", opp: "Aston Villa",    short: "VILLA",     shirt: "#670e36", shorts: "#ffffff", socks: "#95bfe5", hair: "#3a2414", keeperKit: "#ff7a1a", save: 0.40, guess: 0.36, oppMiss: 0.27, period: 1600 },
    { stage: "Semi-final",    opp: "Tottenham",      short: "SPURS",     shirt: "#f4f4f4", shorts: "#132257", socks: "#132257", hair: "#1c1410", keeperKit: "#7ee04a", save: 0.45, guess: 0.39, oppMiss: 0.24, period: 1500 },
    { stage: "Final",         opp: "Man City",       short: "MAN CITY",  shirt: "#6cabdd", shorts: "#ffffff", socks: "#1c2c5b", hair: "#4a3020", keeperKit: "#b44cff", save: 0.50, guess: 0.42, oppMiss: 0.22, period: 1400 },
  ];

  // Forest questions live in forest-questions.js (shared with Free Kick Masters).
  const QUESTIONS = window.FOREST_QUESTIONS.easy;


  /* ---------------- Little helpers ---------------- */
  const $ = (id) => document.getElementById(id);
  const rand = Math.random;
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  function tween(ms, fn, ease) {
    return new Promise((resolve) => {
      const start = performance.now();
      function frame(now) {
        const t = Math.min(1, (now - start) / ms);
        fn((ease || easeOut)(t));
        if (t < 1) requestAnimationFrame(frame); else resolve();
      }
      requestAnimationFrame(frame);
    });
  }
  function escapeHtml(str) { const d = document.createElement("div"); d.textContent = String(str); return d.innerHTML; }

  /* ---------------- Drawing: George and friends ----------------
     The drawings live in george-kit.js (shared with Free Kick Masters). */
  const { HAIR, HAIR_LIGHT, FOREST_RED } = GK.C;
  const georgeAvatar = (celebrate) => GK.avatar({ pose: celebrate ? "up" : "idle" });
  const strikerMarkup = GK.striker;
  const keeperMarkup = GK.keeper;

  /* ---------------- Sound + confetti (from george-kit.js) ---------------- */
  const SOUND = GK.createSound("gz_penalty_sound");
  let soundOn = SOUND.isOn();
  const audio = () => SOUND.wake();
  const sfx = SOUND.sfx;
  const confettiCanvas = $("confetti");
  function confetti(amount) { GK.confetti(confettiCanvas, amount); }

  function pop(text, cls) {
    const el = $("pop");
    el.className = "ps-pop";
    void el.offsetWidth;
    el.textContent = text;
    el.className = "ps-pop show " + (cls || "");
  }

  /* ---------------- Scene setup ---------------- */
  const svg = $("pitch");
  const stage = $("stage");
  const ballEl = $("ball"), shadowEl = $("ball-shadow"), aimEl = $("aim");
  const keeperEl = $("keeper"), strikerEl = $("striker"), netEl = $("net");
  const instructionEl = $("instruction");

  (function drawCrowd() {
    const g = $("crowd"); let html = "";
    for (let row = 0; row < 7; row++) {
      const y = 56 + row * 11.5;
      for (let x = -116 + (row % 2) * 4; x < 520; x += 8.2) {
        const r = rand();
        const col = r < 0.62 ? "#e1102c" : r < 0.86 ? "#f4efe9" : r < 0.93 ? "#7a0d20" : "#f5b942";
        html += `<circle cx="${x.toFixed(1)}" cy="${(y + (rand() - 0.5) * 3).toFixed(1)}" r="3.1" fill="${col}" class="fan"/>`;
      }
    }
    g.innerHTML = html;
  })();

  function crowdJump() {
    if (reduced) return;
    const fans = $("crowd").querySelectorAll(".fan");
    const offs = Array.from(fans, () => rand() * 4 + 2);
    tween(700, (t) => {
      const k = Math.sin(t * Math.PI * 3) * (1 - t);
      fans.forEach((f, i) => f.setAttribute("transform", `translate(0 ${(-offs[i] * Math.abs(k)).toFixed(2)})`));
    }, (t) => t);
  }

  /* Show more of the stadium on wide screens, so the pitch fills the
     card instead of sitting in a narrow strip. */
  function fitView() {
    const w = stage.clientWidth || 360;
    const h = Math.min(w * 1.1, window.innerHeight * 0.66);
    const vw = Math.max(400, Math.min(640, (440 * w) / h));
    svg.setAttribute("viewBox", `${(200 - vw / 2).toFixed(1)} 0 ${vw.toFixed(1)} 440`);
  }
  window.addEventListener("resize", fitView);

  const GEORGE_KIT = { shirt: FOREST_RED, shorts: "#f4f1ee", socks: FOREST_RED, sockTop: "#ffffff", hair: HAIR, hairLight: HAIR_LIGHT, text: "#ffffff", name: "GEORGE", number: "10" };
  function oppKit(r) {
    const light = r.shirt === "#f4f4f4" || r.shirt === "#6cabdd";
    return { shirt: r.shirt, shorts: r.shorts, socks: r.socks, sockTop: r.socks, hair: r.hair, text: light ? "#132257" : "#ffffff", name: "", number: "9" };
  }

  const BALL_HOME = { x: 200, y: 356 };
  const STRIKER_HOME = { x: 150, y: 432, s: 1 };
  const STRIKER_KICK = { x: 184, y: 394, s: 0.9 };

  function setBall(x, y, s) {
    ballEl.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`);
  }
  function setShadow(x, y, s, o) {
    shadowEl.setAttribute("cx", x.toFixed(1)); shadowEl.setAttribute("cy", y.toFixed(1));
    shadowEl.setAttribute("rx", (9 * s).toFixed(2)); shadowEl.setAttribute("ry", (3 * s).toFixed(2));
    shadowEl.setAttribute("fill-opacity", o == null ? 0.35 : o);
  }
  function setStriker(x, y, s) { strikerEl.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`); }
  function setKeeperPose(dx, dy, rot) {
    const body = $("keeper-body");
    if (body) body.setAttribute("transform", `translate(${dx.toFixed(1)} ${dy.toFixed(1)}) rotate(${rot.toFixed(1)})`);
  }
  function setKickLeg(a) {
    const leg = $("kick-leg");
    if (leg) leg.setAttribute("transform", `rotate(${a.toFixed(1)} 9 -42)`);
  }

  function resetScene(forestShooting) {
    const r = ROUNDS[S.round];
    strikerEl.innerHTML = strikerMarkup(forestShooting ? GEORGE_KIT : oppKit(r));
    keeperEl.innerHTML = keeperMarkup(forestShooting ? r.keeperKit : "#1f9d55", !forestShooting);
    setStriker(STRIKER_HOME.x, STRIKER_HOME.y, STRIKER_HOME.s);
    setBall(BALL_HOME.x, BALL_HOME.y, 1); setShadow(200, 364, 1);
    ballEl.style.opacity = 1;
    setKeeperPose(0, 0, 0);
    netEl.setAttribute("transform", "");
    aimEl.setAttribute("opacity", 0);
    $("stage-desc").textContent = forestShooting
      ? `George, in Forest red with GEORGE 10 on his back, stands over the ball. ${r.opp}'s keeper waits on the line.`
      : `George is in goal in green. ${r.opp}'s penalty taker steps up.`;
  }

  /* ---------------- Game state ---------------- */
  const S = {
    round: 0, forest: [], opp: [], retakeUsed: false, phase: "idle",
    target: { x: 200, y: 205 }, power: 0, powerRaf: null,
    cup: { goals: 0, saves: 0, retakes: 0, topBins: 0, maxSaves: 0, roundsWon: 0, won: false },
    roundStart: null, matchSaves: 0, usedQuestions: [],
  };
  const goals = (arr) => arr.filter(Boolean).length;

  function decided() {
    const f = S.forest.length, o = S.opp.length, fg = goals(S.forest), og = goals(S.opp);
    if (f <= 5 && o <= 5) {
      if (fg + (5 - f) < og) return "opp";
      if (og + (5 - o) < fg) return "forest";
      if (f === 5 && o === 5 && fg !== og) return fg > og ? "forest" : "opp";
      return null;
    }
    if (f === o && fg !== og) return fg > og ? "forest" : "opp";
    return null;
  }
  const suddenDeath = () => S.forest.length >= 5 && S.opp.length >= 5;

  function renderScoreboard() {
    const r = ROUNDS[S.round];
    $("round-label").textContent = `The George Cup · ${r.stage}`;
    $("opp-name").textContent = r.short;
    $("score-forest").textContent = goals(S.forest);
    $("score-opp").textContent = goals(S.opp);
    const n = Math.max(5, S.forest.length, S.opp.length);
    const dots = (arr) => Array.from({ length: n }, (_, i) =>
      `<span class="ps-dot ${i < arr.length ? (arr[i] ? "scored" : "missed") : ""}" aria-hidden="true"></span>`).join("");
    $("dots-forest").innerHTML = dots(S.forest);
    $("dots-opp").innerHTML = dots(S.opp);
  }

  function renderBracket(el) {
    el.innerHTML = ROUNDS.map((r, i) => {
      const cls = i < S.round ? "done" : i === S.round && S.phase !== "idle" ? "now" : "";
      return `<span class="ps-chip ${cls}">${r.stage}: ${r.opp}</span>`;
    }).join("");
  }

  function say(text) { instructionEl.textContent = text; }
  function showControls(which) {
    $("power").hidden = which !== "power";
    $("dive").hidden = which !== "dive";
  }

  /* ---------------- Forest penalty (George shoots) ---------------- */
  function setupForestKick() {
    S.phase = "aim";
    resetScene(true);
    renderScoreboard();
    showControls(null);
    stage.classList.add("aiming");
    const late = S.forest.length >= 4 ? " Big moment!" : "";
    say(S.retakeUsed ? "Retake! Tap in the goal where you want to shoot." : `Your penalty, George.${late} Tap in the goal where you want to shoot.`);
  }

  function svgPoint(evt) {
    const p = svg.createSVGPoint(); p.x = evt.clientX; p.y = evt.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  function clampTarget(x, y) {
    return { x: Math.max(108, Math.min(292, x)), y: Math.max(166, Math.min(242, y)) };
  }
  function showAim() {
    aimEl.setAttribute("transform", `translate(${S.target.x.toFixed(1)} ${S.target.y.toFixed(1)})`);
    aimEl.setAttribute("opacity", 1);
  }

  function chooseTarget(x, y) {
    S.target = clampTarget(x, y);
    showAim();
    startPower();
  }

  function startPower() {
    S.phase = "power";
    stage.classList.remove("aiming");
    showControls("power");
    say("Tap SHOOT when the bar is in the green!");
    $("btn-shoot").focus({ preventScroll: true });
    const period = ROUNDS[S.round].period;
    const start = performance.now();
    const needle = $("needle");
    cancelAnimationFrame(S.powerRaf);
    (function frame(now) {
      if (S.phase !== "power") return;
      const t = ((now - start) % (period * 2)) / period;
      S.power = (t <= 1 ? t : 2 - t) * 100;
      needle.style.left = S.power + "%";
      S.powerRaf = requestAnimationFrame(frame);
    })(start);
  }

  async function shoot() {
    if (S.phase !== "power") return;
    S.phase = "shooting";
    cancelAnimationFrame(S.powerRaf);
    showControls(null);
    const r = ROUNDS[S.round];
    const { x: tx, y: ty } = S.target;
    const p = S.power;
    const zone = tx < 160 ? "L" : tx > 240 ? "R" : "C";
    const topBins = ty < 184 && (tx < 136 || tx > 264);
    const behind = goals(S.forest) < goals(S.opp);
    // When the keeper guesses wrong he usually dives the other way.
    const wrongWays = zone === "C" ? ["L", "R"] : zone === "L" ? ["R", "R", "C"] : ["L", "L", "C"];
    let keeperZone = rand() < r.guess ? zone : pick(wrongWays);
    let outcome;
    if (p >= 88) outcome = "over";
    else if (p < 14) { outcome = "saved"; keeperZone = zone; }
    else if (keeperZone === zone && !topBins && rand() < r.save * (behind ? 0.35 : 1)) outcome = "saved";
    else outcome = "goal";

    say("");
    await runUp();
    sfx.kick();
    await Promise.all([ballFlight(tx, ty, outcome, p), keeperDive(keeperZone, ty, outcome === "saved" ? { x: tx, y: ty } : null)]);

    if (outcome === "goal") {
      S.forest.push(true);
      S.cup.goals++;
      if (topBins) S.cup.topBins++;
      renderScoreboard();
      rippleNet();
      sfx.roar(); crowdJump(); confetti(topBins ? 170 : 110);
      pop(topBins ? "TOP BINS!" : pick(["GOAL!", "GOAL!", "WHAT A PEN!", "GET IN!"]), topBins ? "gold" : "");
      say(topBins ? "Right in the top corner. Unstoppable!" : pick(["Back of the net!", "The City Ground goes wild!", "Cool as you like, George!"]));
      await sleep(1700);
      nextTurn();
    } else {
      sfx.aww();
      pop(outcome === "over" ? "OVER THE BAR!" : "SAVED!", "soft");
      say(outcome === "over" ? "Too much power, it flew over." : (p < 14 ? "Not enough power, the keeper got it." : "The keeper guessed right."));
      await sleep(1400);
      if (!S.retakeUsed) {
        const correct = await askQuestion();
        if (correct) {
          S.retakeUsed = true;
          S.cup.retakes++;
          sfx.whistle();
          pop("RETAKE!", "gold");
          await sleep(1100);
          setupForestKick();
          return;
        }
      }
      S.forest.push(false);
      renderScoreboard();
      nextTurn();
    }
  }

  async function runUp() {
    const from = STRIKER_HOME, to = STRIKER_KICK;
    const dur = reduced ? 250 : 600;
    await tween(dur, (t) => {
      const bob = Math.abs(Math.sin(t * Math.PI * 4)) * 3;
      setStriker(lerp(from.x, to.x, t), lerp(from.y, to.y, t) - bob, lerp(from.s, to.s, t));
      setKickLeg(t > 0.7 ? lerp(0, 38, (t - 0.7) / 0.3) : Math.sin(t * Math.PI * 4) * 12);
    }, (t) => t);
    await tween(reduced ? 60 : 110, (t) => setKickLeg(lerp(38, -30, t)));
  }

  function ballFlight(tx, ty, outcome, power) {
    const x0 = BALL_HOME.x, y0 = BALL_HOME.y;
    let x1 = tx, y1 = ty;
    if (outcome === "over") { y1 = 118; x1 = tx + (tx - 200) * 0.2; }
    const speed = power < 14 ? 900 : lerp(640, 420, Math.min(1, power / 88));
    const cy = Math.min(y0, y1) - (outcome === "over" ? 80 : 30);
    return tween(reduced ? speed * 0.6 : speed, (t) => {
      const it = 1 - t;
      const x = it * it * x0 + 2 * it * t * ((x0 + x1) / 2) + t * t * x1;
      const y = it * it * y0 + 2 * it * t * cy + t * t * y1;
      const s = lerp(1, outcome === "over" ? 0.45 : 0.6, t);
      setBall(x, y, s);
      setShadow(lerp(200, x1, t), lerp(364, 250, t), lerp(1, 0.6, t), lerp(0.35, 0.15, t));
    }, (t) => 1 - Math.pow(1 - t, 1.6)).then(async () => {
      if (outcome === "over") {
        await tween(350, (t) => { setBall(x1 + (x1 - 200) * 0.1 * t, lerp(118, 70, t), lerp(0.45, 0.3, t)); ballEl.style.opacity = 1 - t; });
      } else if (outcome === "saved") {
        const dir = tx < 200 ? -1 : 1;
        await tween(420, (t) => setBall(tx + dir * 60 * t, ty + 70 * t * t - 20 * t, lerp(0.6, 0.75, t)), easeOut);
      } else if (outcome === "post") {
        const px = tx < 200 ? 100 : 300;
        await tween(380, (t) => setBall(lerp(px, px + (tx < 200 ? -70 : 70), t), lerp(ty, 290, t), lerp(0.6, 0.8, t)));
      }
    });
  }

  function keeperDive(zone, ty, catchAt) {
    const high = ty < 195;
    let dx = 0, dy = -14, rot = 0;
    if (zone === "L") { dx = high ? -40 : -46; dy = high ? -26 : -4; rot = high ? -58 : -76; }
    if (zone === "R") { dx = high ? 40 : 46; dy = high ? -26 : -4; rot = high ? 58 : 76; }
    if (zone === "C") { dx = 0; dy = high ? -26 : -8; rot = 0; }
    if (catchAt) { dx = Math.max(-60, Math.min(60, (catchAt.x - 200) * 0.55)); }
    return (async () => {
      await sleep(reduced ? 40 : 120);
      await tween(reduced ? 220 : 380, (t) => setKeeperPose(dx * t, dy * Math.sin(t * Math.PI * 0.5), rot * t), easeOut);
      if (catchAt) sfx.save();
    })();
  }

  function rippleNet() {
    if (reduced) return;
    tween(500, (t) => {
      const k = Math.sin(t * Math.PI * 4) * (1 - t) * 0.04;
      netEl.setAttribute("transform", `translate(200 205) scale(${1 + k} ${1 - k}) translate(-200 -205)`);
    }, (t) => t).then(() => netEl.setAttribute("transform", ""));
  }

  /* ---------------- Their penalty (George in goal) ---------------- */
  function setupOppKick() {
    S.phase = "dive";
    resetScene(false);
    renderScoreboard();
    showControls("dive");
    stage.classList.remove("aiming");
    say(`You're in goal! Which way will ${ROUNDS[S.round].opp} shoot?`);
    const first = $("dive").querySelector("button");
    if (first) first.focus({ preventScroll: true });
  }

  async function dive(choice) {
    if (S.phase !== "dive") return;
    S.phase = "shooting";
    showControls(null);
    const r = ROUNDS[S.round];
    const zone = rand() < 0.2 ? "C" : rand() < 0.5 ? "L" : "R";
    let missP = r.oppMiss;
    if (goals(S.forest) <= goals(S.opp)) missP += 0.25;     // Forest behind or level: they get nervous
    if (suddenDeath()) missP += 0.1;
    const missed = rand() < missP;
    const tx = zone === "L" ? 118 + rand() * 30 : zone === "R" ? 252 + rand() * 30 : 180 + rand() * 40;
    const ty = 176 + rand() * 60;
    let outcome;
    if (missed) outcome = rand() < 0.5 ? "over" : "post";
    else if (choice === zone) outcome = "saved";
    else outcome = "goal";

    say("");
    await runUp();
    sfx.kick();
    const flightTarget = outcome === "post" ? { x: zone === "R" ? 300 : 100, y: ty } : { x: tx, y: ty };
    await Promise.all([
      ballFlight(flightTarget.x, flightTarget.y, outcome, 50),
      keeperDive(choice, ty, outcome === "saved" ? { x: tx, y: ty } : null),
    ]);

    if (outcome === "goal") {
      S.opp.push(true);
      rippleNet();
      sfx.aww();
      pop("They score", "soft");
      say("They scored that one. Shake it off, George!");
    } else {
      S.opp.push(false);
      if (outcome === "saved") {
        S.cup.saves++; S.matchSaves++;
        sfx.roar(); crowdJump(); confetti(90);
        pop(pick(["WHAT A SAVE!", "GEORGE SAVES!", "BRICK WALL!"]), "gold");
        say("Unbelievable save from George!");
      } else {
        sfx.roar(); crowdJump();
        pop(outcome === "over" ? "OVER!" : "OFF THE POST!", "gold");
        say(outcome === "over" ? "They blazed it over! The Trent End loves it." : "It hit the post and stayed out!");
      }
    }
    renderScoreboard();
    await sleep(1600);
    nextTurn();
  }

  /* ---------------- Turn order + round end ---------------- */
  function nextTurn() {
    const winner = decided();
    if (winner) { endRound(winner === "forest"); return; }
    if (S.forest.length > S.opp.length) setupOppKick();
    else { S.retakeUsed = false; setupForestKick(); }
  }

  async function endRound(won) {
    S.phase = "roundover";
    showControls(null);
    const r = ROUNDS[S.round];
    const fg = goals(S.forest), og = goals(S.opp);
    S.cup.maxSaves = Math.max(S.cup.maxSaves, S.matchSaves);
    const actions = $("r-actions");
    if (won) {
      S.cup.roundsWon++;
      sfx.fanfare(); confetti(200); crowdJump();
      pop("FOREST WIN!", "gold");
      await sleep(1300);
      const last = S.round === ROUNDS.length - 1;
      $("avatar-result").innerHTML = georgeAvatar(true);
      $("r-title").textContent = last ? "GEORGE CUP WINNERS!" : "Forest are through!";
      $("r-text").textContent = `Forest beat ${r.opp} ${fg}-${og} on penalties.` + (last ? " The cup is coming home to Nottingham!" : "");
      actions.innerHTML = last
        ? `<button class="btn-primary" id="r-next">Lift the trophy 🏆</button>`
        : `<button class="btn-primary" id="r-next">Next: ${ROUNDS[S.round + 1].stage} v ${ROUNDS[S.round + 1].opp}</button>`;
      $("result").hidden = false;
      $("r-next").focus();
      $("r-next").onclick = () => {
        $("result").hidden = true;
        if (last) { S.cup.won = true; finishCup(); }
        else { S.round++; startRound(); }
      };
    } else {
      sfx.aww();
      $("avatar-result").innerHTML = georgeAvatar(false);
      $("r-title").textContent = "So close!";
      $("r-text").textContent = `${r.opp} won it ${og}-${fg} this time. Forest never give up. Go again?`;
      actions.innerHTML = `<button class="btn-primary" id="r-retry">Replay the ${r.stage}</button>
        <button class="ps-ghost" id="r-finish">Finish the cup run</button>`;
      $("result").hidden = false;
      $("r-retry").focus();
      $("r-retry").onclick = () => {
        $("result").hidden = true;
        Object.assign(S.cup, S.roundStart);
        startRound();
      };
      $("r-finish").onclick = () => { $("result").hidden = true; finishCup(); };
    }
  }

  function startRound() {
    S.forest = []; S.opp = []; S.retakeUsed = false; S.matchSaves = 0;
    S.roundStart = { goals: S.cup.goals, saves: S.cup.saves, retakes: S.cup.retakes, topBins: S.cup.topBins, maxSaves: S.cup.maxSaves, roundsWon: S.cup.roundsWon };
    const r = ROUNDS[S.round];
    renderScoreboard();
    pop(`${r.stage.toUpperCase()}`, "gold");
    sfx.whistle();
    setupForestKick();
    say(`${r.stage} v ${r.opp}. You go first, George. Tap in the goal where you want to shoot.`);
  }

  function startCup() {
    S.round = 0;
    S.cup = { goals: 0, saves: 0, retakes: 0, topBins: 0, maxSaves: 0, roundsWon: 0, won: false };
    $("screen-start").hidden = true;
    $("screen-end").hidden = true;
    $("screen-game").hidden = false;
    fitView();
    S.phase = "starting";
    startRound();
    $("screen-game").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  /* ---------------- Second-chance question ---------------- */
  function nextQuestion() {
    if (S.usedQuestions.length >= QUESTIONS.length) S.usedQuestions = [];
    const free = QUESTIONS.map((_, i) => i).filter((i) => !S.usedQuestions.includes(i));
    const i = pick(free);
    S.usedQuestions.push(i);
    return QUESTIONS[i];
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
          await sleep(ok ? 1200 : 1800);
          $("question").hidden = true;
          resolve(ok);
        };
        box.appendChild(b);
      });
      $("question").hidden = false;
      box.querySelector("button").focus({ preventScroll: true });
    });
  }

  /* ---------------- Cup end + leaderboard ---------------- */
  function finishCup() {
    S.phase = "idle";
    const c = S.cup;
    const score = c.goals + c.saves;
    $("screen-game").hidden = true;
    $("screen-end").hidden = false;
    $("avatar-end").innerHTML = georgeAvatar(c.won);
    document.querySelector(".ps-trophy").style.display = c.won ? "" : "none";
    const reached = ROUNDS[Math.min(S.round, ROUNDS.length - 1)].stage;
    $("end-title").textContent = c.won ? "George Cup winners!" : `What a run to the ${reached}!`;
    $("end-text").textContent = c.won
      ? "Forest lift the George Cup, and George is the hero from the spot. The whole of Nottingham is celebrating."
      : "Every great team has a tough day. Have another go and bring the cup home.";
    $("end-stats").innerHTML = [
      ["Score", score], ["Goals", c.goals], ["Saves", c.saves], ["Top bins", c.topBins], ["Retakes won", c.retakes],
    ].map(([k, v]) => `<div class="ps-stat"><b>${v}</b><span>${k}</span></div>`).join("");
    $("name-form").hidden = score === 0;
    $("saved-msg").textContent = "";
    if (c.won) { sfx.fanfare(); setTimeout(() => confetti(220), 200); }
    if (window.GZ && GZ.recordPenalty) {
      const { newBadges } = GZ.recordPenalty({ score, won: c.roundsWon > 0, cupWon: c.won, topBins: c.topBins, maxSaves: c.maxSaves });
      GZ.announceBadges(newBadges);
    }
    renderLeaderboard();
    $("screen-end").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

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
    const score = S.cup.goals + S.cup.saves;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ game: GAME_ID, player_name: name, score }),
      });
      if (!res.ok) throw new Error(res.status);
      $("name-form").hidden = true;
      $("saved-msg").textContent = `Saved! ${score} points for ${name}.`;
      renderLeaderboard();
    } catch (err) {
      $("saved-msg").textContent = "Couldn't save online right now. Try again later.";
    }
  });

  /* ---------------- Input ---------------- */
  svg.addEventListener("pointerdown", (e) => {
    if (S.phase === "aim") {
      const p = svgPoint(e);
      if (p.y < 140 || p.y > 268 || p.x < 80 || p.x > 320) { say("Tap inside the goal, George!"); return; }
      chooseTarget(p.x, p.y);
    } else if (S.phase === "power") {
      shoot();
    } else if (S.phase === "dive") {
      const p = svgPoint(e);
      if (p.y > 140 && p.y < 275) dive(p.x < 165 ? "L" : p.x > 235 ? "R" : "C");
    }
  });
  $("btn-shoot").addEventListener("click", shoot);
  $("dive").addEventListener("click", (e) => {
    const b = e.target.closest("[data-zone]");
    if (b) dive(b.dataset.zone);
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (S.phase === "aim") {
      const step = 12;
      const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[e.key]) {
        e.preventDefault();
        S.target = clampTarget(S.target.x + moves[e.key][0], S.target.y + moves[e.key][1]);
        showAim();
        say("Arrow keys to aim, Enter to lock it in.");
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        chooseTarget(S.target.x, S.target.y);
      }
    } else if (S.phase === "power" && (e.key === " " || e.key === "Enter")) {
      e.preventDefault(); shoot();
    } else if (S.phase === "dive") {
      const map = { ArrowLeft: "L", ArrowUp: "C", ArrowRight: "R" };
      if (map[e.key]) { e.preventDefault(); dive(map[e.key]); }
    }
  });

  $("btn-kickoff").addEventListener("click", () => { audio(); startCup(); });
  $("btn-again").addEventListener("click", () => { audio(); startCup(); });
  function showSound() {
    $("btn-sound").textContent = soundOn ? "🔊 Sound on" : "🔇 Sound off";
    $("btn-sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("btn-sound").addEventListener("click", () => {
    soundOn = !soundOn;
    SOUND.set(soundOn);
    showSound();
  });
  showSound();

  /* ---------------- First paint ---------------- */
  fitView();
  $("avatar-start").innerHTML = georgeAvatar(false);
  renderBracket($("bracket-start"));
  resetScene(true);

  // For testing in the browser console only.
  window.__penalty = { S, ROUNDS, QUESTIONS };
})();
