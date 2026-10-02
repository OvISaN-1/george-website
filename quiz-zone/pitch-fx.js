/* ================================================================
   PITCH FX: the "make it feel alive" layer shared by Free Kick
   Masters and Penalty Shootout.
   It only adds things on top of each game's own drawing:
   - crowd that bobs and does a wave, camera flashes, floodlight
     beams and twinkles
   - idle life for the keeper, wall and striker
   - ball motion trail, kick dust, impact sparks and rings
   - camera that follows the ball, screen shake, goal flash and rays
   Everything is skipped for people who ask for reduced motion.
   ================================================================ */
(function (FX) {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rand = Math.random;

  function mk(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }


  function make() {
  const api = {};
  let svg = null, stage = null, fxG = null, ghostG = null, beamG = null, flashG = null, spotEl = null;
  let flashTimer = null, ghostTimer = null, night = true;
  const cam = { z: 1, sx: 0, sy: 0, ox: 50, oy: 42, raf: 0 };
  let shakeAmp = 0, shakeRaf = 0;

  /* ---------------- set up ---------------- */
  const el$ = (x) => (typeof x === "string" ? document.getElementById(x) : x);
  let opt = {};

  /* o: svg, stage, ballEl (the ball group), plus optional
       beforeId/beforeEl  where the floodlight beams go (side-on scenes)
       crowdId/crowdEl    the crowd group
       topDown            true for the overhead pitch: no beams or lamp stars
       fxLayer            an existing group for sparks and rings
       flashPos(), flashR where camera flashes appear (defaults suit the side-on stands)
       ghostJump, ghostMin, ghostScale   tuning for the ball trail
       camOrigin          [x%, y%] the camera zooms towards
     Safe to call again: Matchday rebuilds its pitch for every match. */
  api.init = function (o) {
    clearTimeout(flashTimer); clearTimeout(ghostTimer);
    parts.forEach((p) => p.el.remove()); parts.length = 0; ghosts.length = 0; lastBall = null;
    opt = o;
    svg = o.svg; stage = o.stage;
    stage.querySelectorAll(".fx-vignette,.fx-flash,.fx-rays").forEach((n) => n.remove());
    if (o.camOrigin) { cam.ox = o.camOrigin[0]; cam.oy = o.camOrigin[1]; }
    cam.z = 1; cam.sx = cam.sy = 0; shakeAmp = 0;
    svg.style.transform = "";
    svg.style.transformOrigin = `${cam.ox}% ${cam.oy}%`;
    svg.style.willChange = "transform";
    const crowd = el$(o.crowdEl || o.crowdId);

    if (!o.topDown) {
      const defs = svg.querySelector("defs") || svg.insertBefore(mk("defs", {}), svg.firstChild);
      if (!defs.querySelector("#fxBeam")) {
        const bg = mk("linearGradient", { id: "fxBeam", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
        mk("stop", { offset: 0, "stop-color": "#fff6d8", "stop-opacity": 0.2 }, bg);
        mk("stop", { offset: 1, "stop-color": "#fff6d8", "stop-opacity": 0 }, bg);
        const pool = mk("radialGradient", { id: "fxPool", cx: 0.5, cy: 0.5, r: 0.5 }, defs);
        mk("stop", { offset: 0, "stop-color": "#fff6d8", "stop-opacity": 0.2 }, pool);
        mk("stop", { offset: 1, "stop-color": "#fff6d8", "stop-opacity": 0 }, pool);
      }
      // Floodlight beams and a pool of light round the goal, laid over the grass.
      svg.querySelectorAll(".fx-beams,.fx-twinkles").forEach((n) => n.remove());
      beamG = mk("g", { class: "fx-beams", "pointer-events": "none" });
      const before = el$(o.beforeEl || o.beforeId);
      (before && before.parentNode ? before.parentNode : svg).insertBefore(beamG, before || null);
      mk("polygon", { points: "40,16 70,16 220,330 -90,330", fill: "url(#fxBeam)", class: "fx-beam a" }, beamG);
      mk("polygon", { points: "330,16 366,16 500,330 190,330", fill: "url(#fxBeam)", class: "fx-beam b" }, beamG);
      mk("ellipse", { cx: 200, cy: o.poolY || 205, rx: 230, ry: 70, fill: "url(#fxPool)", class: "fx-pool" }, beamG);
      // Twinkling stars on the floodlights.
      const tw = mk("g", { class: "fx-twinkles", "pointer-events": "none" });
      if (crowd) crowd.parentNode.insertBefore(tw, crowd); else svg.appendChild(tw);
      [[-74, 14, 0], [52, 14, 0.7], [348, 14, 1.4], [474, 14, 2.1]].forEach(([x, y, d]) => {
        mk("path", { d: `M${x} ${y - 9} L${x + 1.6} ${y - 1.6} L${x + 9} ${y} L${x + 1.6} ${y + 1.6} L${x} ${y + 9} L${x - 1.6} ${y + 1.6} L${x - 9} ${y} L${x - 1.6} ${y - 1.6} Z`,
          fill: "#fff6d8", class: "fx-twinkle", style: `animation-delay:${d}s` }, tw);
      });
    } else beamG = null;

    // Camera flashes pop up in the stands; more of them when a goal goes in.
    svg.querySelectorAll(".fx-flashes,.fx-ghosts").forEach((n) => n.remove());
    flashG = mk("g", { class: "fx-flashes", "pointer-events": "none" });
    if (crowd && crowd.nextSibling) crowd.parentNode.insertBefore(flashG, crowd.nextSibling); else (crowd ? crowd.parentNode : svg).appendChild(flashG);

    // Streak behind the ball, and a soft pulsing ring under it while the player lines up the kick.
    ghostG = mk("g", { class: "fx-ghosts", "pointer-events": "none" });
    const ball = el$(o.ballEl);
    ball.parentNode.insertBefore(ghostG, ball);
    spotEl = mk("circle", { r: 13, class: "fx-spot", opacity: 0 }, ghostG);

    // Sparks, rings and dust go on top of everything in the scene.
    if (o.fxLayer) fxG = el$(o.fxLayer);
    else { svg.querySelectorAll(".fx-top").forEach((n) => n.remove()); fxG = mk("g", { class: "fx-top", "pointer-events": "none" }, svg); }

    // Stage overlays: vignette for depth, white flash and burst rays for goals.
    ["fx-vignette", "fx-flash", "fx-rays"].filter((c) => !(o.topDown && c === "fx-vignette")).forEach((c) => {
      const d = document.createElement("div"); d.className = c; d.setAttribute("aria-hidden", "true"); stage.appendChild(d);
    });

    if (!reduced) {
      const loop = () => {
        if (!document.hidden && stage.isConnected && stage.offsetParent !== null) spawnFlash(1 + (rand() < 0.4 ? 1 : 0));
        flashTimer = setTimeout(loop, 280 + rand() * 520);
      };
      loop();
    }
  };

  api.setNight = function (on) {
    night = !!on;
    if (beamG) beamG.style.opacity = night ? 1 : 0.15;
    if (svg) svg.querySelectorAll(".fx-twinkles").forEach((g) => { g.style.opacity = night ? 1 : 0.2; });
  };

  /* ---------------- crowd ---------------- */
  // Groups the dots into small blocks so they can bob in a wave.
  api.waveCrowd = function (crowdG) {
    crowdG.classList.add("fx-crowd");
    const fans = Array.from(crowdG.querySelectorAll(".fan"));
    const blocks = new Map();
    fans.forEach((f) => {
      const cx = +f.getAttribute("cx"), cy = +f.getAttribute("cy");
      const row = Math.max(0, Math.min(6, Math.round((cy - 56) / 11.5)));
      const col = Math.floor((cx + 120) / 64);
      const key = row + ":" + col;
      let g = blocks.get(key);
      if (!g) {
        g = mk("g", { class: "wv", style: `animation-delay:${(-(col * 0.24 + row * 0.08)).toFixed(2)}s` });
        blocks.set(key, g);
      }
      g.appendChild(f);
    });
    blocks.forEach((g) => crowdG.appendChild(g));
  };

  // Overhead pitch: the stands run along all four sides, so group the dots by side and position.
  // ph is the pitch height, used to tell the top stand from the bottom one.
  api.waveStands = function (crowdG, ph) {
    crowdG.classList.add("fx-crowd");
    const blocks = new Map();
    Array.from(crowdG.children).forEach((f) => {
      if (f.tagName !== "circle") return;
      const cx = +f.getAttribute("cx"), cy = +f.getAttribute("cy");
      const side = cy < -4 ? "t" : cy > ph + 4 ? "b" : cx < 0 ? "l" : "r";
      const along = side === "t" || side === "b" ? cx : cy;
      const col = Math.floor((along + 12) / 9);
      const key = side + col;
      let g = blocks.get(key);
      if (!g) {
        const lap = side === "t" ? col : side === "r" ? 14 + col * 0.8 : side === "b" ? 26 - col : 40 - col * 0.8;
        g = mk("g", { class: "wv", style: `animation-delay:${(-lap * 0.18).toFixed(2)}s` });
        blocks.set(key, g);
      }
      g.appendChild(f);
    });
    blocks.forEach((g) => crowdG.appendChild(g));
  };

  function spawnFlash(n) {
    if (!flashG || reduced) return;
    for (let i = 0; i < n; i++) {
      const p = opt.flashPos ? opt.flashPos() : { x: -110 + rand() * 620, y: 60 + rand() * 72 };
      const c = mk("circle", { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: opt.flashR || 1.7, class: "fx-cam" }, flashG);
      c.addEventListener("animationend", () => c.remove());
      if (flashG.childNodes.length > 40) flashG.firstChild.remove();
    }
  }

  api.cheer = function (ms) {
    if (reduced || !svg) return;
    svg.classList.add("fx-cheer");
    for (let i = 0; i < 22; i++) setTimeout(() => spawnFlash(2), i * 60);
    setTimeout(() => svg.classList.remove("fx-cheer"), ms || 2400);
  };

  api.groan = function () {
    if (reduced || !svg) return;
    svg.classList.add("fx-groan");
    setTimeout(() => svg.classList.remove("fx-groan"), 1600);
  };

  /* ---------------- idle life for the players ---------------- */
  // kind: breathe (striker), pace (keeper on his line), bounce (penalty keeper), shuffle (wall).
  api.idle = function (html, kind, delay) {
    return `<g class="fx-idle fx-${kind}" style="animation-delay:${(delay == null ? -rand() * 2 : delay).toFixed(2)}s">${html}</g>`;
  };
  // While the ball is in flight the characters snap back to neutral so dives start clean.
  api.shot = function (on) {
    if (!stage) return;
    stage.classList.toggle("fx-shot", !!on);
    if (on && spotEl) spotEl.setAttribute("opacity", 0);
  };

  /* ---------------- ball ---------------- */
  api.spot = function (x, y) {
    if (!spotEl || reduced) return;
    spotEl.setAttribute("cx", x); spotEl.setAttribute("cy", y);
    spotEl.setAttribute("opacity", 1);
  };

  const ghosts = [];
  let lastBall = null;
  // Called every frame the ball moves. Leaves a fading streak of ball shapes behind it.
  api.trail = function (x, y, s) {
    if (reduced || !ghostG) return;
    const prev = lastBall; lastBall = { x, y, s };
    if (!prev) return;
    const d = Math.hypot(x - prev.x, y - prev.y);
    if (d > (opt.ghostJump || 140)) { clearGhosts(); return; }
    if (d < (opt.ghostMin || 2.4)) return;
    ghosts.push({ x: prev.x, y: prev.y, s: prev.s });
    if (ghosts.length > 7) ghosts.shift();
    drawGhosts();
    clearTimeout(ghostTimer);
    ghostTimer = setTimeout(clearGhosts, 140);
  };
  function drawGhosts() {
    while (ghostG.childNodes.length - 1 < ghosts.length) mk("circle", { fill: "#ffffff" }, ghostG);
    const kids = Array.from(ghostG.childNodes).filter((n) => n !== spotEl);
    kids.forEach((c, i) => {
      const g = ghosts[i];
      if (!g) { c.setAttribute("opacity", 0); return; }
      c.setAttribute("cx", g.x.toFixed(1)); c.setAttribute("cy", g.y.toFixed(1));
      c.setAttribute("r", (8.2 * (opt.ghostScale || 1) * g.s).toFixed(2));
      c.setAttribute("opacity", ((i + 1) / ghosts.length * 0.22).toFixed(3));
    });
  }
  function clearGhosts() {
    ghosts.length = 0; lastBall = null;
    if (ghostG) Array.from(ghostG.childNodes).forEach((c) => { if (c !== spotEl) c.setAttribute("opacity", 0); });
  }

  /* ---------------- particles + rings ---------------- */
  const parts = [];
  let partRaf = 0;
  function runParts() {
    if (partRaf) return;
    let last = performance.now();
    const step = (now) => {
      const k = Math.min(3, (now - last) / 16.7); last = now;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age = now - p.t0;
        const t = Math.min(1, p.age / p.life);
        p.update(t, k);
        if (t >= 1) { p.el.remove(); parts.splice(i, 1); }
      }
      partRaf = parts.length ? requestAnimationFrame(step) : 0;
    };
    partRaf = requestAnimationFrame(step);
  }
  function addPart(el, life, update) {
    parts.push({ el, life, age: 0, t0: performance.now(), update });
    if (parts.length > 120) { const p = parts.shift(); p.el.remove(); }
    runParts();
  }

  // opts: n, colors, speed, grav, life, size, a0/a1 (angle range, radians; -PI/2 is straight up)
  api.burst = function (x, y, o) {
    if (reduced || !fxG) return;
    o = o || {};
    const n = o.n || 14, cols = o.colors || ["#fff"], sp = o.speed || 3, grav = o.grav == null ? 0.16 : o.grav;
    const a0 = o.a0 == null ? -Math.PI : o.a0, a1 = o.a1 == null ? 0 : o.a1;
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * rand(), v = sp * (0.4 + rand() * 0.9);
      const c = mk("circle", { cx: x, cy: y, r: ((o.size || 2.2) * (0.6 + rand() * 0.8)).toFixed(2), fill: cols[Math.floor(rand() * cols.length)] }, fxG);
      let px = x, py = y, vx = Math.cos(a) * v, vy = Math.sin(a) * v;
      addPart(c, (o.life || 650) * (0.7 + rand() * 0.5), (t, k) => {
        px += vx * k; py += vy * k; vy += grav * k; vx *= 0.985;
        c.setAttribute("cx", px.toFixed(1)); c.setAttribute("cy", py.toFixed(1));
        c.setAttribute("opacity", (1 - t * t).toFixed(2));
      });
    }
  };

  api.ring = function (x, y, o) {
    if (reduced || !fxG) return;
    o = o || {};
    const r0 = o.r0 || 4, r1 = o.r1 || 40;
    const c = mk("circle", { cx: x, cy: y, r: r0, fill: "none", stroke: o.color || "#fff", "stroke-width": o.w || 3 }, fxG);
    addPart(c, o.ms || 500, (t) => {
      const e = 1 - Math.pow(1 - t, 3);
      c.setAttribute("r", (r0 + (r1 - r0) * e).toFixed(1));
      c.setAttribute("opacity", (1 - t).toFixed(2));
      c.setAttribute("stroke-width", ((o.w || 3) * (1 - t * 0.7)).toFixed(2));
    });
  };

  // Ready-made effects the games call.
  api.kickDust = function (x, y) {
    api.burst(x, y, { n: 12, colors: ["#6fbf6a", "#4f9a4a", "#8a6b3f", "#c9e8b0"], speed: 2.6, grav: 0.14, life: 600, size: 2, a0: -Math.PI * 0.95, a1: -Math.PI * 0.05 });
  };
  api.hit = function (x, y, kind) {
    const gold = ["#f5b942", "#ffe08a", "#ffffff"], white = ["#ffffff", "#dfe8ff"], red = ["#ff5a6e", "#ffffff"];
    if (kind === "goal") { api.ring(x, y, { r1: 52, ms: 650, color: "#ffffff" }); api.ring(x, y, { r1: 30, ms: 450, color: "#f5b942", w: 2 }); api.burst(x, y, { n: 26, colors: gold.concat(white), speed: 4.4, grav: 0.1, life: 750, a0: -Math.PI, a1: Math.PI }); api.shake(4); }
    else if (kind === "save") { api.ring(x, y, { r1: 34, ms: 420, color: "#ffe08a" }); api.burst(x, y, { n: 16, colors: gold, speed: 3.4, life: 550, a0: -Math.PI, a1: Math.PI }); api.shake(3); }
    else if (kind === "post") { api.ring(x, y, { r1: 38, ms: 480, color: "#ffffff", w: 4 }); api.burst(x, y, { n: 14, colors: white, speed: 3.8, life: 500, a0: -Math.PI, a1: Math.PI }); api.shake(5); }
    else if (kind === "wall") { api.burst(x, y, { n: 12, colors: red, speed: 2.6, life: 500, a0: -Math.PI, a1: 0 }); api.shake(2.5); }
  };

  /* ---------------- camera ---------------- */
  function applyCam() {
    if (!svg) return;
    const z = shakeAmp > 0.2 ? Math.max(cam.z, 1.035) : cam.z;
    svg.style.transform = z === 1 && !shakeAmp ? "" : `translate(${cam.sx.toFixed(1)}px,${cam.sy.toFixed(1)}px) scale(${z.toFixed(4)})`;
  }
  // t runs 0 to 1 along the ball's flight: a gentle push in towards the goal.
  api.follow = function (t) {
    if (reduced) return;
    cancelAnimationFrame(cam.raf);
    cam.z = 1 + 0.075 * Math.min(1, t);
    applyCam();
  };
  function camTo(z, ms) {
    cancelAnimationFrame(cam.raf);
    const z0 = cam.z, t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms), e = t * t * (3 - 2 * t);
      cam.z = z0 + (z - z0) * e; applyCam();
      if (t < 1) cam.raf = requestAnimationFrame(step);
    };
    cam.raf = requestAnimationFrame(step);
  }
  api.release = function (ms) { if (!reduced) camTo(1, ms || 700); };
  api.punch = function () {
    if (reduced) return;
    cam.z = Math.max(cam.z, 1.1); applyCam();
    setTimeout(() => api.release(900), 320);
  };

  api.shake = function (amp) {
    if (reduced || !svg) return;
    shakeAmp = Math.max(shakeAmp, amp);
    cancelAnimationFrame(shakeRaf);
    const step = () => {
      shakeAmp *= 0.86;
      if (shakeAmp < 0.25) { shakeAmp = 0; cam.sx = cam.sy = 0; applyCam(); return; }
      cam.sx = (rand() - 0.5) * 2 * shakeAmp; cam.sy = (rand() - 0.5) * 2 * shakeAmp;
      applyCam();
      shakeRaf = requestAnimationFrame(step);
    };
    shakeRaf = requestAnimationFrame(step);
  };

  /* ---------------- goal moment ---------------- */
  api.goal = function (gold) {
    if (!stage || reduced) return;
    const flash = stage.querySelector(".fx-flash"), rays = stage.querySelector(".fx-rays");
    [flash, rays].forEach((el) => { if (!el) return; el.classList.remove("on"); void el.offsetWidth; });
    if (flash) flash.classList.add("on");
    if (rays) { rays.classList.toggle("gold", !!gold); rays.classList.add("on"); }
    api.cheer(2600);
    stage.classList.add("fx-goalmoment");
    api.shake(gold ? 7 : 5);
    api.punch();
  };

  /* ---------------- tidy up between kicks ---------------- */
  api.reset = function () {
    clearGhosts();
    if (stage) {
      stage.classList.remove("fx-shot", "fx-goalmoment");
      stage.querySelectorAll(".fx-flash,.fx-rays").forEach((el) => el.classList.remove("on"));
    }
    if (svg) svg.classList.remove("fx-cheer", "fx-groan");
    shakeAmp = 0; cam.sx = cam.sy = 0;
    if (!reduced) camTo(1, 350);
  };

  api.stop = function () { clearTimeout(flashTimer); };

  return api;
  }

  // Replays a CSS animation class on an element (score pops, commentary slide-ins).
  FX.retrigger = function (el, cls) {
    if (!el || reduced) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  };

  /* ---- Character movement. These set transform attributes on the parts drawn in george-kit.js,
     so they only work while the CSS idle animations are paused (stage has .fx-shot). ---- */
  const part = (root, sel, tf) => { const e = root && root.querySelector(sel); if (e) e.setAttribute("transform", tf); };
  const swing = (root, side, deg) => part(root, ".s-arm." + side, `rotate(${deg.toFixed(1)} ${side === "l" ? -22 : 22} -100)`);

  // The run-up: arms swing against the legs. t is 0 to 1.
  FX.stride = function (root, t) {
    if (reduced) return;
    const s = Math.sin(t * Math.PI * 4);
    swing(root, "l", s * 24); swing(root, "r", -s * 24);
    part(root, ".s-leg", `rotate(${(-s * 15).toFixed(1)} -9 -42)`);
  };
  // After the boot hits the ball: arms fly out for balance and he leans through it. t is 0 to 1.
  FX.followThrough = function (root, t) {
    if (reduced) return;
    const e = 1 - Math.pow(1 - t, 3);
    swing(root, "l", -8 - 34 * e); swing(root, "r", 8 + 34 * e);
    FX.lean(root, -5 * e);
  };
  // Tilt the whole figure from his feet (-ve leans forward/left).
  FX.lean = function (root, deg) {
    const w = root && root.querySelector(".fx-idle");
    if (w) { w.style.animation = "none"; w.style.transform = deg ? `rotate(${deg.toFixed(1)}deg)` : ""; }
  };
  // Both arms up, for a celebration. k is 0 to 1.
  FX.armsUp = function (root, k) {
    if (reduced) return;
    swing(root, "l", 160 * k); swing(root, "r", -160 * k);
  };
  FX.armsDown = function (root) { swing(root, "l", 0); swing(root, "r", 0); part(root, ".s-leg", ""); FX.lean(root, 0); };

  // Keeper: gets low and ready as the striker runs up, then stretches in the dive.
  FX.keeperReady = function (root, k) {
    if (reduced) return;
    const b = root && root.querySelector("#keeper-body");
    if (b) b.setAttribute("transform", `translate(0 0) rotate(0) scale(${(1 + 0.03 * k).toFixed(3)} ${(1 - 0.07 * k).toFixed(3)})`);
    ["l", "r"].forEach((s) => part(root, ".k-arm." + s, `rotate(${((s === "l" ? -1 : 1) * 14 * k).toFixed(1)} ${s === "l" ? -12 : 12} -52)`));
  };
  FX.keeperStretch = function (root, k) {
    if (reduced) return;
    ["l", "r"].forEach((s) => part(root, ".k-arm." + s, `rotate(${((s === "l" ? 1 : -1) * 22 * k).toFixed(1)} ${s === "l" ? -12 : 12} -52)`));
  };

  // Words pop in one letter at a time.
  FX.popText = function (el, text) {
    el.textContent = "";
    String(text).split("").forEach((c, i) => {
      const sp = document.createElement("span");
      sp.className = "ch"; sp.style.setProperty("--i", i);
      sp.textContent = c === " " ? "\u00a0" : c;
      el.appendChild(sp);
    });
    el.setAttribute("aria-label", text);
  };

  // Numbers on a results screen count up to their value.
  FX.countUps = function (root, sel) {
    if (reduced || !root) return;
    root.querySelectorAll(sel).forEach((el) => {
      const raw = el.textContent.trim();
      if (!/^\d[\d,]*$/.test(raw)) return;
      const end = parseInt(raw.replace(/,/g, ""), 10);
      if (!(end > 0)) return;
      const fmt = raw.includes(",") ? (n) => n.toLocaleString("en-GB") : (n) => String(n);
      const t0 = performance.now(), ms = Math.min(1100, 350 + end * 6);
      el.textContent = fmt(0);
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 3);
        el.textContent = fmt(Math.round(end * e));
        if (t < 1) requestAnimationFrame(step); else el.textContent = fmt(end);
      };
      requestAnimationFrame(step);
    });
  };

  const def = make();
  Object.keys(def).forEach((k) => { FX[k] = def[k]; });
  FX.create = make;
})(window.PitchFX = window.PitchFX || {});
