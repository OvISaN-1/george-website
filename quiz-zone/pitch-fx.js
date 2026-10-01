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

  let svg = null, stage = null, fxG = null, ghostG = null, beamG = null, flashG = null, spotEl = null;
  let flashTimer = null, ghostTimer = null, night = true;
  const cam = { z: 1, sx: 0, sy: 0, ox: 50, oy: 42, raf: 0 };
  let shakeAmp = 0, shakeRaf = 0;

  function mk(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }

  /* ---------------- set up ---------------- */
  FX.init = function (o) {
    svg = o.svg; stage = o.stage;
    if (o.camOrigin) { cam.ox = o.camOrigin[0]; cam.oy = o.camOrigin[1]; }
    svg.style.transformOrigin = `${cam.ox}% ${cam.oy}%`;
    svg.style.willChange = "transform";

    const defs = svg.querySelector("defs") || svg.insertBefore(mk("defs", {}), svg.firstChild);
    const bg = mk("linearGradient", { id: "fxBeam", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    mk("stop", { offset: 0, "stop-color": "#fff6d8", "stop-opacity": 0.2 }, bg);
    mk("stop", { offset: 1, "stop-color": "#fff6d8", "stop-opacity": 0 }, bg);
    const pool = mk("radialGradient", { id: "fxPool", cx: 0.5, cy: 0.5, r: 0.5 }, defs);
    mk("stop", { offset: 0, "stop-color": "#fff6d8", "stop-opacity": 0.2 }, pool);
    mk("stop", { offset: 1, "stop-color": "#fff6d8", "stop-opacity": 0 }, pool);

    // Floodlight beams and a pool of light round the goal, laid over the grass.
    beamG = mk("g", { class: "fx-beams", "pointer-events": "none" });
    const before = o.beforeId && document.getElementById(o.beforeId);
    (before && before.parentNode ? before.parentNode : svg).insertBefore(beamG, before || null);
    mk("polygon", { points: "40,16 70,16 220,330 -90,330", fill: "url(#fxBeam)", class: "fx-beam a" }, beamG);
    mk("polygon", { points: "330,16 366,16 500,330 190,330", fill: "url(#fxBeam)", class: "fx-beam b" }, beamG);
    mk("ellipse", { cx: 200, cy: o.poolY || 205, rx: 230, ry: 70, fill: "url(#fxPool)", class: "fx-pool" }, beamG);

    // Twinkling stars on the floodlights.
    const tw = mk("g", { class: "fx-twinkles", "pointer-events": "none" });
    const crowd = o.crowdId && document.getElementById(o.crowdId);
    if (crowd) crowd.parentNode.insertBefore(tw, crowd); else svg.appendChild(tw);
    [[-74, 14, 0], [52, 14, 0.7], [348, 14, 1.4], [474, 14, 2.1]].forEach(([x, y, d]) => {
      mk("path", { d: `M${x} ${y - 9} L${x + 1.6} ${y - 1.6} L${x + 9} ${y} L${x + 1.6} ${y + 1.6} L${x} ${y + 9} L${x - 1.6} ${y + 1.6} L${x - 9} ${y} L${x - 1.6} ${y - 1.6} Z`,
        fill: "#fff6d8", class: "fx-twinkle", style: `animation-delay:${d}s` }, tw);
    });

    // Camera flashes pop up in the stands; more of them when a goal goes in.
    flashG = mk("g", { class: "fx-flashes", "pointer-events": "none" });
    if (crowd && crowd.nextSibling) crowd.parentNode.insertBefore(flashG, crowd.nextSibling); else svg.appendChild(flashG);

    // Soft pulsing ring under the ball while the player lines up the kick.
    ghostG = mk("g", { class: "fx-ghosts", "pointer-events": "none" });
    const ball = o.ballEl;
    ball.parentNode.insertBefore(ghostG, ball);
    spotEl = mk("circle", { r: 13, class: "fx-spot", opacity: 0 }, ghostG);

    // Sparks, rings and dust go on top of everything in the scene.
    fxG = mk("g", { class: "fx-top", "pointer-events": "none" }, svg);

    // Stage overlays: vignette for depth, white flash and burst rays for goals.
    ["fx-vignette", "fx-flash", "fx-rays"].forEach((c) => {
      const d = document.createElement("div"); d.className = c; d.setAttribute("aria-hidden", "true"); stage.appendChild(d);
    });

    if (!reduced) {
      const loop = () => {
        if (!document.hidden) spawnFlash(1 + (rand() < 0.4 ? 1 : 0));
        flashTimer = setTimeout(loop, 280 + rand() * 520);
      };
      loop();
    }
  };

  FX.setNight = function (on) {
    night = !!on;
    if (beamG) beamG.style.opacity = night ? 1 : 0.15;
    document.querySelectorAll(".fx-twinkles").forEach((g) => { g.style.opacity = night ? 1 : 0.2; });
  };

  /* ---------------- crowd ---------------- */
  // Groups the dots into small blocks so they can bob in a wave.
  FX.waveCrowd = function (crowdG) {
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

  function spawnFlash(n) {
    if (!flashG || reduced) return;
    for (let i = 0; i < n; i++) {
      const c = mk("circle", { cx: (-110 + rand() * 620).toFixed(1), cy: (60 + rand() * 72).toFixed(1), r: 1.7, class: "fx-cam" }, flashG);
      c.addEventListener("animationend", () => c.remove());
      if (flashG.childNodes.length > 40) flashG.firstChild.remove();
    }
  }

  FX.cheer = function (ms) {
    if (reduced || !svg) return;
    svg.classList.add("fx-cheer");
    for (let i = 0; i < 22; i++) setTimeout(() => spawnFlash(2), i * 60);
    setTimeout(() => svg.classList.remove("fx-cheer"), ms || 2400);
  };

  FX.groan = function () {
    if (reduced || !svg) return;
    svg.classList.add("fx-groan");
    setTimeout(() => svg.classList.remove("fx-groan"), 1600);
  };

  /* ---------------- idle life for the players ---------------- */
  // kind: breathe (striker), pace (keeper on his line), bounce (penalty keeper), shuffle (wall).
  FX.idle = function (html, kind, delay) {
    return `<g class="fx-idle fx-${kind}" style="animation-delay:${(delay == null ? -rand() * 2 : delay).toFixed(2)}s">${html}</g>`;
  };
  // While the ball is in flight the characters snap back to neutral so dives start clean.
  FX.shot = function (on) {
    if (!stage) return;
    stage.classList.toggle("fx-shot", !!on);
    if (on && spotEl) spotEl.setAttribute("opacity", 0);
  };

  /* ---------------- ball ---------------- */
  FX.spot = function (x, y) {
    if (!spotEl || reduced) return;
    spotEl.setAttribute("cx", x); spotEl.setAttribute("cy", y);
    spotEl.setAttribute("opacity", 1);
  };

  const ghosts = [];
  let lastBall = null;
  // Called every frame the ball moves. Leaves a fading streak of ball shapes behind it.
  FX.trail = function (x, y, s) {
    if (reduced || !ghostG) return;
    const prev = lastBall; lastBall = { x, y, s };
    if (!prev) return;
    const d = Math.hypot(x - prev.x, y - prev.y);
    if (d > 140) { clearGhosts(); return; }
    if (d < 2.4) return;
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
      c.setAttribute("r", (8.2 * g.s).toFixed(2));
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
  FX.burst = function (x, y, o) {
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

  FX.ring = function (x, y, o) {
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
  FX.kickDust = function (x, y) {
    FX.burst(x, y, { n: 12, colors: ["#6fbf6a", "#4f9a4a", "#8a6b3f", "#c9e8b0"], speed: 2.6, grav: 0.14, life: 600, size: 2, a0: -Math.PI * 0.95, a1: -Math.PI * 0.05 });
  };
  FX.hit = function (x, y, kind) {
    const gold = ["#f5b942", "#ffe08a", "#ffffff"], white = ["#ffffff", "#dfe8ff"], red = ["#ff5a6e", "#ffffff"];
    if (kind === "goal") { FX.ring(x, y, { r1: 52, ms: 650, color: "#ffffff" }); FX.ring(x, y, { r1: 30, ms: 450, color: "#f5b942", w: 2 }); FX.burst(x, y, { n: 26, colors: gold.concat(white), speed: 4.4, grav: 0.1, life: 750, a0: -Math.PI, a1: Math.PI }); FX.shake(4); }
    else if (kind === "save") { FX.ring(x, y, { r1: 34, ms: 420, color: "#ffe08a" }); FX.burst(x, y, { n: 16, colors: gold, speed: 3.4, life: 550, a0: -Math.PI, a1: Math.PI }); FX.shake(3); }
    else if (kind === "post") { FX.ring(x, y, { r1: 38, ms: 480, color: "#ffffff", w: 4 }); FX.burst(x, y, { n: 14, colors: white, speed: 3.8, life: 500, a0: -Math.PI, a1: Math.PI }); FX.shake(5); }
    else if (kind === "wall") { FX.burst(x, y, { n: 12, colors: red, speed: 2.6, life: 500, a0: -Math.PI, a1: 0 }); FX.shake(2.5); }
  };

  /* ---------------- camera ---------------- */
  function applyCam() {
    if (!svg) return;
    const z = shakeAmp > 0.2 ? Math.max(cam.z, 1.035) : cam.z;
    svg.style.transform = z === 1 && !shakeAmp ? "" : `translate(${cam.sx.toFixed(1)}px,${cam.sy.toFixed(1)}px) scale(${z.toFixed(4)})`;
  }
  // t runs 0 to 1 along the ball's flight: a gentle push in towards the goal.
  FX.follow = function (t) {
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
  FX.release = function (ms) { if (!reduced) camTo(1, ms || 700); };
  FX.punch = function () {
    if (reduced) return;
    cam.z = Math.max(cam.z, 1.1); applyCam();
    setTimeout(() => FX.release(900), 320);
  };

  FX.shake = function (amp) {
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
  FX.goal = function (gold) {
    if (!stage || reduced) return;
    const flash = stage.querySelector(".fx-flash"), rays = stage.querySelector(".fx-rays");
    [flash, rays].forEach((el) => { if (!el) return; el.classList.remove("on"); void el.offsetWidth; });
    if (flash) flash.classList.add("on");
    if (rays) { rays.classList.toggle("gold", !!gold); rays.classList.add("on"); }
    FX.cheer(2600);
    FX.shake(gold ? 7 : 5);
    FX.punch();
  };

  /* ---------------- tidy up between kicks ---------------- */
  FX.reset = function () {
    clearGhosts();
    if (stage) {
      stage.classList.remove("fx-shot");
      stage.querySelectorAll(".fx-flash,.fx-rays").forEach((el) => el.classList.remove("on"));
    }
    if (svg) svg.classList.remove("fx-cheer", "fx-groan");
    shakeAmp = 0; cam.sx = cam.sy = 0;
    if (!reduced) camTo(1, 350);
  };

  FX.stop = function () { clearTimeout(flashTimer); };
})(window.PitchFX = window.PitchFX || {});
