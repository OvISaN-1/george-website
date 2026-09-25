/* ================================================================
   MATCHDAY: penalties and free kicks, Free Kick Masters style.
   The camera cuts to behind George. Tap the goal to aim, lock the
   curl (free kicks only), then hit SHOOT in the green.

   Uses the same maths as Free Kick Masters (free-kick-physics.js)
   and the same George drawings (george-kit.js).

   MDSP.play(opts)  -> Promise<{ result, goal, shot }>
   MDSP.replay()    -> slow-motion replay of the last kick
   MDSP.close()     -> hide the close-up (also stops everything)
   ================================================================ */
(function (MDSP) {
  "use strict";
  const { util } = GK;
  const { rand, pick, sleep, lerp, clamp, tween } = util;
  const BX = FKP.BX, BY = FKP.BY;
  const HOME = { x: 160, y: 438, s: 1 };
  const KICK = { x: 186, y: 430, s: 0.95 };

  let el = null;        // the overlay
  let st = null;        // state for the current kick
  let token = 0;        // bumps on close(), so old animations stop

  const q = (sel) => el.querySelector(sel);

  function build(root) {
    if (el) return;
    el = document.createElement("div");
    el.className = "sp";
    el.hidden = true;
    el.innerHTML = `
      <svg class="sp-svg" viewBox="0 0 400 440" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Close-up: George lines up the kick. Tap in the goal to aim.">
        <defs>
          <linearGradient id="sp-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b7fb0"/><stop offset="1" stop-color="#b9c9de"/></linearGradient>
          <linearGradient id="sp-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0b12"/><stop offset="1" stop-color="#2a1830"/></linearGradient>
          <linearGradient id="sp-grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f7a3a"/><stop offset="1" stop-color="#3f9a49"/></linearGradient>
          <radialGradient id="sp-light" cx="0.5" cy="0" r="0.8"><stop offset="0" stop-color="#fff6d8" stop-opacity="0.35"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient>
          <pattern id="sp-net" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 0 L7 7 M7 0 L0 7" stroke="#ffffff" stroke-opacity="0.35" stroke-width="0.7"/></pattern>
        </defs>
        <rect class="sp-skyr" x="-300" width="1000" height="160"/>
        <path d="M-300 22 L700 22 L700 38 L-300 50 Z" fill="#1b1720"/>
        <path class="sp-stand" d="M-300 50 L700 38 L700 138 L-300 138 Z" fill="#3a0e18"/>
        <g class="sp-crowd"></g>
        <rect x="-300" y="0" width="1000" height="160" fill="url(#sp-light)" pointer-events="none"/>
        <rect x="-300" y="136" width="1000" height="16" fill="#0f0d12"/>
        <text class="sp-led" x="-280" y="148" font-family="Rajdhani, Arial Narrow, sans-serif" font-weight="700" font-size="11" fill="#ff4d62" letter-spacing="1.5"></text>
        <rect x="-300" y="152" width="1000" height="288" fill="url(#sp-grass)"/>
        <g fill="#ffffff" fill-opacity="0.06">
          <rect x="-300" y="152" width="1000" height="18"/><rect x="-300" y="190" width="1000" height="24"/>
          <rect x="-300" y="240" width="1000" height="32"/><rect x="-300" y="306" width="1000" height="42"/><rect x="-300" y="392" width="1000" height="48"/>
        </g>
        <g class="sp-lines" stroke="#ffffff" stroke-opacity="0.8" stroke-width="1.6" fill="none"></g>
        <g class="sp-goal"></g>
        <g class="sp-keeper"></g>
        <path class="sp-guide" d="" fill="none" stroke="#f5b942" stroke-width="2" stroke-dasharray="3 5" stroke-linecap="round" opacity=".85"/>
        <g class="sp-wall"></g>
        <g class="sp-aim" opacity="0">
          <circle r="11" fill="none" stroke="#ffffff" stroke-width="2.5"/>
          <circle r="3" fill="#ffffff"/>
          <path d="M-16 0 H-8 M8 0 H16 M0 -16 V-8 M0 8 V16" stroke="#ffffff" stroke-width="2.5"/>
        </g>
        <path class="sp-trail" d="" fill="none" stroke="#f5b942" stroke-width="5" stroke-linecap="round" opacity="0"/>
        <ellipse class="sp-shadow" cx="200" cy="405" rx="9" ry="3" fill="#000" fill-opacity="0.35"/>
        <g class="sp-ball" transform="translate(200 398)">
          <circle r="9" fill="#fff" stroke="#1b1720" stroke-width="1"/>
          <path d="M0 -3.5 L3.3 -1 L2 3 L-2 3 L-3.3 -1 Z" fill="#1b1720"/>
          <path d="M0 -3.5 L0 -8.5 M3.3 -1 L8 -2.8 M2 3 L5 7 M-2 3 L-5 7 M-3.3 -1 L-8 -2.8" stroke="#1b1720" stroke-width="1"/>
        </g>
        <g class="sp-striker" transform="translate(160 438)"></g>
      </svg>
      <span class="sp-tag" aria-hidden="true"></span>`;
    root.appendChild(el);
    const svg = q(".sp-svg");
    svg.addEventListener("pointerdown", (e) => {
      if (!st) return;
      if (st.phase === "aim") {
        const p = svgPoint(e), L = st.L;
        if (p.y < L.bar - 40 || p.y > L.gy + 20 || p.x < L.left - 50 || p.x > L.right + 50) { instr("Tap on or near the goal to aim."); return; }
        st.aim = clampAim(p.x, p.y);
        showAim();
        afterAim();
      } else if (st.phase === "curl") lockCurl();
      else if (st.phase === "power") shoot();
    });
  }

  function svgPoint(evt) {
    const svg = q(".sp-svg");
    const p = svg.createSVGPoint(); p.x = evt.clientX; p.y = evt.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }

  /* ---------------- drawing ---------------- */
  function setBall(x, y, s, spin) { q(".sp-ball").setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)}) rotate(${(spin || 0).toFixed(0)})`); }
  function setShadow(x, y, s, o) {
    const sh = q(".sp-shadow");
    sh.setAttribute("cx", x.toFixed(1)); sh.setAttribute("cy", y.toFixed(1));
    sh.setAttribute("rx", (9 * s).toFixed(2)); sh.setAttribute("ry", (3 * s).toFixed(2));
    sh.setAttribute("fill-opacity", o == null ? 0.35 : o);
  }
  function setStriker(x, y, s) { q(".sp-striker").setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`); }
  function setKickLeg(a) { const leg = q("#kick-leg"); if (leg) leg.setAttribute("transform", `rotate(${a.toFixed(1)} 9 -42)`); }
  function setKeeper(x, y, s, dx, dy, rot) {
    q(".sp-keeper").setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`);
    const body = q("#keeper-body");
    if (body) body.setAttribute("transform", `translate(${(dx || 0).toFixed(1)} ${(dy || 0).toFixed(1)}) rotate(${(rot || 0).toFixed(1)})`);
  }
  function setWallJump(j) {
    el.querySelectorAll(".sp-def").forEach((d) => {
      const bx = +d.dataset.x, by = +d.dataset.y, s = +d.dataset.s;
      d.setAttribute("transform", `translate(${bx.toFixed(1)} ${(by - j * s).toFixed(1)}) scale(${s.toFixed(3)})`);
    });
  }

  function fitView() {
    const svg = q(".sp-svg");
    // Crop to the goal, the wall and George so everything is big enough to tap.
    const w = el.clientWidth || 700, h = el.clientHeight || 470;
    const vy = 108, vh = 440 - vy;
    const vw = Math.max(360, (vh * w) / h);
    svg.setAttribute("viewBox", `${(200 - vw / 2).toFixed(1)} ${vy} ${vw.toFixed(1)} ${vh}`);
  }

  function drawScene(o) {
    const K = st.kick, L = FKP.layout(K);
    st.L = L;
    q(".sp-skyr").setAttribute("fill", o.night ? "url(#sp-night)" : "url(#sp-sky)");
    q(".sp-stand").setAttribute("fill", o.home ? "#3a0e18" : "#1d2233");
    let crowd = "";
    const cols = o.crowd || ["#e1102c", "#ffffff"];
    for (let row = 0; row < 7; row++) {
      const y = 56 + row * 11.5;
      for (let x = -296 + (row % 2) * 4; x < 700; x += 8.2) {
        const col = !o.home && x < -100 ? pick(["#e1102c", "#e1102c", "#f4efe9"]) : pick(cols);
        crowd += `<circle cx="${x.toFixed(1)}" cy="${(y + (rand() - 0.5) * 3).toFixed(1)}" r="3.1" fill="${col}"/>`;
      }
    }
    q(".sp-crowd").innerHTML = crowd;
    q(".sp-led").textContent = ("COME ON YOU REDS ★ GEORGE 10 ★ " + (o.ground || "").toUpperCase() + " ★ ").repeat(6);
    const k = L.k, back = 12 * k;
    q(".sp-goal").innerHTML = `
      <path d="M${L.left} ${L.bar} L${L.left + back} ${L.bar + back * 0.8} L${L.right - back} ${L.bar + back * 0.8} L${L.right} ${L.bar} Z" fill="url(#sp-net)"/>
      <rect x="${L.left + back}" y="${L.bar + back * 0.8}" width="${L.gW - back * 2}" height="${L.gH - back * 1.2}" fill="#ffffff" fill-opacity=".06"/>
      <rect class="sp-netback" x="${L.left + back}" y="${L.bar + back * 0.8}" width="${L.gW - back * 2}" height="${L.gH - back * 1.2}" fill="url(#sp-net)"/>
      <path d="M${L.left} ${L.bar} L${L.left + back} ${L.bar + back * 0.8} L${L.left + back} ${L.gy - back * 0.4} L${L.left} ${L.gy} Z" fill="url(#sp-net)"/>
      <path d="M${L.right} ${L.bar} L${L.right - back} ${L.bar + back * 0.8} L${L.right - back} ${L.gy - back * 0.4} L${L.right} ${L.gy} Z" fill="url(#sp-net)"/>
      <path d="M${L.left} ${L.gy} L${L.left} ${L.bar} L${L.right} ${L.bar} L${L.right} ${L.gy}" stroke="#fff" stroke-width="${Math.max(2.5, 5 * k)}" stroke-linecap="round" fill="none"/>`;
    const lineY = (yards) => L.gy + (BY - L.gy) * FKP.persp(yards / K.dist);
    const lineX = (u, yards) => lerp(L.gx + u, BX, FKP.persp(yards / K.dist));
    const box = (halfW, depth) => {
      const y = lineY(depth);
      return `M${lineX(-halfW, 0)} ${L.gy} L${lineX(-halfW, depth)} ${y} L${lineX(halfW, depth)} ${y} L${lineX(halfW, 0)} ${L.gy}`;
    };
    q(".sp-lines").innerHTML = `<line x1="-300" y1="${L.gy}" x2="700" y2="${L.gy}"/>
      <path d="${box(L.gW * 0.83, 6)}"/>
      ${K.dist > 18.5 ? `<path d="${box(L.gW * 1.83, 18)}"/>` : `<path d="${box(L.gW * 1.83, Math.min(18, K.dist + 4))}"/>`}
      ${K.dist > 21 ? `<path d="M${lineX(-L.gW * 0.45, 18)} ${lineY(18)} Q ${lineX(0, 21.5)} ${lineY(21.5)} ${lineX(L.gW * 0.45, 18)} ${lineY(18)}"/>` : ""}`;
    const sw = L.sw;
    const skins = ["#f1c7a0", "#d9a67f", "#8d5a3b", "#5c3a24", "#e8b48f"];
    q(".sp-wall").innerHTML = K.wallN ? L.defenders.map((x) =>
      `<g class="sp-def" data-x="${x}" data-y="${L.wallY}" data-s="${sw * 1.15}" transform="translate(${x.toFixed(1)} ${L.wallY.toFixed(1)}) scale(${(sw * 1.15).toFixed(3)})">${GK.defender(o.oppKit.shirt, o.oppKit.shorts, pick(skins), "#231914")}</g>`
    ).join("") : "";
    q(".sp-keeper").innerHTML = GK.keeper(o.keeperKit, false);
    setKeeper(L.keeperX, L.gy, L.k * 1.05, 0, 0, 0);
    q(".sp-striker").innerHTML = GK.georgeStriker(o.kitKey, o.boots);
    setStriker(HOME.x, HOME.y, HOME.s);
    setKickLeg(0);
    q(".sp-ball").style.opacity = 1;
    setBall(BX, BY, 1); setShadow(BX, BY + 7, 1);
    q(".sp-trail").setAttribute("d", ""); q(".sp-trail").style.opacity = 0;
    q(".sp-aim").setAttribute("opacity", 0);
    q(".sp-guide").setAttribute("d", "");
  }

  /* ---------------- controls (in the side panel) ---------------- */
  function instr(t) { const i = st && st.panel.querySelector("#sp-instr"); if (i) i.textContent = t; }
  function controls(which) {
    ["curl", "power"].forEach((c) => { const m = st.panel.querySelector("#sp-" + c); if (m) m.hidden = c !== which; });
  }
  function clampAim(x, y) {
    const L = st.L;
    return { x: clamp(x, L.left - 30 * L.k, L.right + 30 * L.k), y: clamp(y, L.bar - 18 * L.k, L.gy - 3) };
  }
  function showAim() {
    q(".sp-aim").setAttribute("transform", `translate(${st.aim.x.toFixed(1)} ${st.aim.y.toFixed(1)}) scale(${Math.max(0.7, Math.min(1.3, st.L.k)).toFixed(2)})`);
    q(".sp-aim").setAttribute("opacity", 1);
    drawGuide();
  }
  function drawGuide() {
    if (!st.guide) { q(".sp-guide").setAttribute("d", ""); return; }
    const kick = Object.assign({}, st.kick, { wind: 0 });
    const shot = FKP.shoot(kick, st.aim, st.curl, FKP.idealPower(kick.dist), () => 0.99);
    let d = "";
    for (let i = 0; i <= 24; i++) { const p = FKP.flightPoint(shot, i / 24); d += (i ? " L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1); }
    q(".sp-guide").setAttribute("d", d);
  }

  function afterAim() {
    if (!st.curlPhase) { st.curl = 0; startPower(); }
    else startCurl();
  }

  function startCurl() {
    st.phase = "curl";
    controls("curl");
    instr(st.kind === "shot" ? "Curl: tap LOCK when the bend is right. Bend it into the corner!" : "Curl: tap LOCK when the bend is right. Bend it round the wall!");
    const start = performance.now(), period = 1500;
    const needle = st.panel.querySelector("#sp-curl-needle");
    const my = token;
    (function frame(now) {
      if (!st || st.phase !== "curl" || my !== token) return;
      const t = ((now - start) % (period * 2)) / period;
      st.curl = (t <= 1 ? t : 2 - t) * 2 - 1;
      needle.style.left = ((st.curl + 1) * 50) + "%";
      drawGuide();
      requestAnimationFrame(frame);
    })(start);
    const b = st.panel.querySelector("#sp-btn-curl"); if (b) b.focus({ preventScroll: true });
  }
  function lockCurl() {
    if (!st || st.phase !== "curl") return;
    st.sfx.tick();
    startPower();
  }

  function startPower() {
    st.phase = "power";
    controls("power");
    const ideal = FKP.idealPower(st.kick.dist);
    // Right answer: big green zone. Wrong answer: a smaller one, and the needle is quicker.
    // George's shooting stat makes the green zone a bit bigger.
    const bonus = Math.min(6, st.zoneBonus || 0);
    const g = (st.advantage ? 12 : 6) + bonus, ok = (st.advantage ? 21 : 14) + bonus;
    const z = (id, a, w) => { const e = st.panel.querySelector(id); e.style.left = clamp(a, 0, 100) + "%"; e.style.width = w + "%"; };
    z("#sp-ok", ideal - ok, ok * 2);
    z("#sp-good", ideal - g, g * 2);
    instr("Power: tap SHOOT in the green!");
    const start = performance.now();
    const period = st.advantage ? 1400 : 1050;
    const needle = st.panel.querySelector("#sp-power-needle");
    const my = token;
    (function frame(now) {
      if (!st || st.phase !== "power" || my !== token) return;
      const t = ((now - start) % (period * 2)) / period;
      st.power = (t <= 1 ? t : 2 - t) * 100;
      needle.style.left = st.power + "%";
      requestAnimationFrame(frame);
    })(start);
    const b = st.panel.querySelector("#sp-btn-shoot"); if (b) b.focus({ preventScroll: true });
  }

  async function shoot() {
    if (!st || st.phase !== "power") return;
    st.phase = "flying";
    controls(null);
    q(".sp-guide").setAttribute("d", "");
    instr("");
    const shot = FKP.shoot(st.kick, st.aim, st.curl, st.power);
    // Penalties: the keeper guesses. Right answer = he usually guesses wrong.
    if (st.kind === "penalty" && shot.result === "saved" && st.advantage && rand() < 0.5) shot.result = "goal";
    st.lastShot = shot;
    await runUp();
    st.sfx.kick();
    await animateShot(shot, 1);
    st.done({ result: shot.result, goal: shot.result === "goal" || shot.result === "post-in", shot, topBins: !!shot.topBins, curl: st.curl });
  }

  async function runUp() {
    await tween(st.reduced ? 250 : 650, (t) => {
      const bob = Math.abs(Math.sin(t * Math.PI * 4)) * 3;
      setStriker(lerp(HOME.x, KICK.x, t), lerp(HOME.y, KICK.y, t) - bob, lerp(HOME.s, KICK.s, t));
      setKickLeg(t > 0.7 ? lerp(0, 38, (t - 0.7) / 0.3) : Math.sin(t * Math.PI * 4) * 12);
    }, (t) => t);
    await tween(st.reduced ? 60 : 110, (t) => setKickLeg(lerp(38, -30, t)));
  }

  async function animateShot(shot, speed) {
    const L = shot.L;
    const dur = (lerp(1100, 750, clamp(shot.power / 90, 0, 1)) * (st.reduced ? 0.6 : 1)) / speed;
    const wallTau = st.kick.wallN ? 10 / st.kick.dist : 0.3;
    const stopTau = shot.result === "wall" ? wallTau : 1;
    const trail = [];
    const trailEl = q(".sp-trail");
    if (shot.wallJumps && st.kick.wallN) tween(260 / speed, (t) => setWallJump(Math.sin(t * Math.PI) * FKP.WALL_JUMP), (t) => t);
    const keeperDive = (async () => {
      await sleep(dur * Math.min(0.9, wallTau + 0.12));
      if (shot.result === "wall") return;
      let dx = clamp((shot.tx - L.keeperX) / L.k, -80, 80);
      // A beaten penalty keeper dives the wrong way.
      if (st.kind === "penalty" && shot.result !== "saved") dx = Math.abs(dx) < 20 ? (rand() < 0.5 ? -70 : 70) : -dx * 0.8;
      const reach = shot.result === "saved" ? 1 : 0.75;
      const high = shot.hEnd > 38;
      const rot = clamp(dx * 1.2, -80, 80);
      await tween(dur * 0.45, (t) => setKeeper(L.keeperX, L.gy, L.k * 1.05, dx * 0.55 * reach * t, (high ? -24 : -6) * Math.sin(t * Math.PI / 2), rot * t), util.easeOut);
    })();
    await tween(dur * stopTau, (t) => {
      const tau = t * stopTau;
      const p = FKP.flightPoint(shot, tau);
      setBall(p.x, p.y, p.s, tau * 900 * Math.sign(shot.curl || 1));
      setShadow(p.gx, p.gy + 6 * p.s, p.s, 0.35 * (1 - tau * 0.6));
      trail.push(`${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
      trailEl.setAttribute("d", "M" + trail.slice(-14).join(" L"));
      trailEl.style.opacity = speed < 1 ? 0.75 : 0.45;
    }, (t) => 1 - Math.pow(1 - t, 1.5));
    const end = FKP.flightPoint(shot, stopTau);
    const ball = q(".sp-ball");
    if (shot.result === "wall") {
      st.sfx.thud();
      await tween(450 / speed, (t) => setBall(end.x + (shot.curl >= 0 ? 1 : -1) * 40 * t, end.y + 60 * t * t - 30 * t, end.s + 0.2 * t, 0));
    } else if (shot.result === "saved") {
      st.sfx.save();
      const dir = shot.tx < L.gx ? -1 : 1;
      await tween(420 / speed, (t) => setBall(end.x + dir * 50 * t, end.y + 40 * t * t - 10 * t, end.s + 0.1 * t, 0));
    } else if (shot.result === "post" || shot.result === "post-in") {
      st.sfx.post();
      const inward = shot.result === "post-in";
      const dirX = shot.tx < L.gx ? (inward ? 1 : -1) : (inward ? -1 : 1);
      await tween(420 / speed, (t) => setBall(end.x + dirX * 26 * L.k * t, end.y + (inward ? 14 : 30) * L.k * t, end.s, 0));
      if (inward) rippleNet();
    } else if (shot.result === "over" || shot.result === "wide") {
      await tween(350 / speed, (t) => { setBall(end.x + (end.x - BX) * 0.15 * t, end.y - 40 * t, end.s * (1 - 0.3 * t), 0); ball.style.opacity = 1 - t; });
    } else {
      rippleNet();
    }
    await keeperDive;
    trailEl.style.opacity = 0;
  }

  function rippleNet() {
    if (st.reduced) return;
    const net = q(".sp-netback");
    if (!net) return;
    const L = st.L, cx = L.gx, cy = L.gy - L.gH / 2;
    tween(500, (t) => {
      const k = Math.sin(t * Math.PI * 4) * (1 - t) * 0.06;
      net.setAttribute("transform", `translate(${cx} ${cy}) scale(${1 + k} ${1 - k}) translate(${-cx} ${-cy})`);
    }, (t) => t).then(() => net.setAttribute("transform", ""));
  }

  function onKey(e) {
    if (!st || !el || el.hidden) return;
    if (st.phase === "aim") {
      const s = 8 * Math.max(0.6, st.L.k);
      const mv = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
      if (mv) { e.preventDefault(); st.aim = clampAim(st.aim.x + mv[0], st.aim.y + mv[1]); showAim(); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showAim(); afterAim(); }
    } else if ((st.phase === "curl" || st.phase === "power") && (e.key === " " || e.key === "Enter")) {
      e.preventDefault(); st.phase === "curl" ? lockCurl() : shoot();
    }
  }

  /* ---------------- public ---------------- */
  /* opts: { root, panel, kind: "penalty"|"freekick", kick: {dist, side, wallN, keeperSkill, wind},
             advantage, oppKit: {shirt, shorts}, keeperKit, kitKey, boots, night, home, crowd,
             ground, sfx, reduced, title } */
  MDSP.play = function (opts) {
    build(opts.root);
    token += 1;
    return new Promise((resolve) => {
      st = {
        kind: opts.kind, kick: Object.assign({ wind: 0 }, opts.kick), advantage: !!opts.advantage,
        guide: opts.guide != null ? !!opts.guide : !!opts.advantage, zoneBonus: opts.zoneBonus || 0,
        curlPhase: opts.curl != null ? !!opts.curl : opts.kind === "freekick",
        panel: opts.panel, sfx: opts.sfx, reduced: !!opts.reduced, phase: "aim", curl: 0, power: 0, aim: null,
        done: (r) => { document.removeEventListener("keydown", onKey); resolve(r); },
      };
      el.classList.remove("replaying");
      el.hidden = false;
      q(".sp-tag").textContent = "";
      fitView();
      drawScene(opts);
      const L = st.L;
      st.aim = { x: (L.left + L.right) / 2 + (opts.kind === "penalty" ? L.gW * 0.3 : 0), y: L.bar + L.gH * 0.45 };
      const pen = opts.kind === "penalty", shotKind = opts.kind === "shot";
      const kicker = pen ? "Penalty" : shotKind ? "George's shot · " + Math.round(st.kick.dist) + " yards" : "Free kick · " + Math.round(st.kick.dist) + " yards";
      const perk = shotKind ? "✅ Right answer: it's your shot!" : st.advantage ? "✅ Right answer: aim line, big green zone" : "❌ No aim line, small green zone";
      opts.panel.innerHTML = `
        <div class="md-q setpiece${shotKind ? " shot" : ""}">
          <div class="md-q-head"><span class="md-kicker">${kicker}</span>
            <span class="md-level">${perk}</span></div>
          <h3 class="md-q-title">${opts.title || (pen ? "George steps up..." : "Bend it round the wall!")}</h3>
          ${opts.timeLimit ? `<div class="md-timer sp-clock" aria-hidden="true"><span id="sp-timer"></span></div>` : ""}
          <p class="md-q-text" id="sp-instr">Tap in the goal where you want to aim.${pen || shotKind ? " Corners are hardest to save." : ""}</p>
          <div class="fk-meter" id="sp-curl" hidden>
            <div class="fk-track curl"><span class="lab l">↶ Bend left</span><span class="lab c">straight</span><span class="lab r">Bend right ↷</span><div class="fk-needle" id="sp-curl-needle"></div></div>
            <button class="btn-primary fk-lock-btn" id="sp-btn-curl" type="button">Lock curl</button>
          </div>
          <div class="fk-meter" id="sp-power" hidden>
            <div class="fk-track"><div class="fk-zone ok" id="sp-ok"></div><div class="fk-zone good" id="sp-good"></div><span class="lab l">soft</span><span class="lab r">blast</span><div class="fk-needle" id="sp-power-needle"></div></div>
            <button class="btn-primary fk-lock-btn" id="sp-btn-shoot" type="button">⚽ Shoot!</button>
          </div>
          <p class="md-small">Keys: arrows to aim, Enter to lock, Space for ${st.curlPhase ? "curl and " : ""}shoot.</p>
        </div>`;
      opts.panel.hidden = false;
      opts.panel.querySelector("#sp-btn-curl").addEventListener("click", lockCurl);
      opts.panel.querySelector("#sp-btn-shoot").addEventListener("click", shoot);
      showAim();
      document.addEventListener("keydown", onKey);
      if (opts.timeLimit) startShotClock(opts.timeLimit);
    });
  };

  /* Open-play shots: a defender is closing in, so George can't wait forever.
     If the bar runs out he has to hit it there and then. */
  function startShotClock(ms) {
    const my = token, start = performance.now();
    const bar = st.panel.querySelector("#sp-timer");
    (function frame(now) {
      if (!st || my !== token || st.phase === "flying" || st.phase === "closed") return;
      const left = Math.max(0, 1 - (now - start) / ms);
      if (bar) { bar.style.width = left * 100 + "%"; bar.classList.toggle("low", left < 0.3); }
      if (left > 0) { requestAnimationFrame(frame); return; }
      instr("Too slow! The defender's closing in, George has to hit it now!");
      if (st.phase === "aim") showAim();
      if (st.phase !== "power") { st.phase = "power"; st.power = 25 + Math.random() * 60; }
      shoot();
    })(start);
  }

  MDSP.replay = async function () {
    if (!st || !st.lastShot) return;
    const shot = st.lastShot, L = shot.L;
    el.classList.add("replaying");
    q(".sp-tag").textContent = "▶ REPLAY";
    q(".sp-ball").style.opacity = 1;
    setBall(BX, BY, 1); setShadow(BX, BY + 7, 1);
    setKeeper(L.keeperX, L.gy, L.k * 1.05, 0, 0, 0);
    setStriker(HOME.x, HOME.y, HOME.s);
    setKickLeg(0);
    await runUp();
    await animateShot(shot, 0.35);
    await sleep(400);
    el.classList.remove("replaying");
    q(".sp-tag").textContent = "";
  };

  MDSP.close = function () {
    token += 1;
    if (st) { document.removeEventListener("keydown", onKey); st.phase = "closed"; }
    if (el) { el.hidden = true; el.classList.remove("replaying"); }
  };
})(window.MDSP = window.MDSP || {});
