/* ================================================================
   FREE KICK MASTERS: the maths
   Pure functions only (no page stuff), so the game and the tests
   share exactly the same rules.

   Screen space is the 400 x 440 SVG. The ball sits at (200, 398).
   The goal gets smaller and higher up the screen the further away
   the free kick is.
   ================================================================ */
(function (FK) {
  "use strict";

  const BX = 200, BY = 398;
  const GOAL_H_WORLD = 71;       // crossbar height in "world" units
  const WALL_H = 56, WALL_JUMP = 14;   // matches the wall drawing (defender art x1.15)
  const DEF_W = 19;              // wall defender width (world units)

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // How far along the screen a point is, for a depth t (0 = goal line, 1 = ball).
  const persp = (t) => Math.pow(clamp(t, 0, 1), 1.45);

  /* Where everything sits on screen for one free kick.
     kick: { dist (yards, 18-32), side (-1 left ... 1 right), wallN, keeperSkill, wind (mph, + = blowing right) } */
  function layout(kick) {
    const k = 19 / kick.dist;
    const gW = 210 * k;
    const gH = GOAL_H_WORLD * k;
    const gx = 200 - kick.side * 70;
    const gy = 140 + 72 * k;
    const tw = 1 - 10 / kick.dist;            // the wall is 10 yards from the ball
    const fw = persp(tw);
    const sw = lerp(k, 1, fw);
    const wallY = gy + (BY - gy) * fw;
    // The wall covers the near post. Straight on, it covers the middle.
    let nearU, inward;
    if (kick.side < -0.2) { nearU = -gW / 2; inward = 1; }
    else if (kick.side > 0.2) { nearU = gW / 2; inward = -1; }
    else { nearU = -gW * 0.12; inward = 1; }
    const npx = lerp(gx + nearU, BX, fw);
    const defenders = [];
    const n = kick.wallN;
    const start = Math.abs(kick.side) <= 0.2 ? npx - inward * ((n - 1) / 2) * DEF_W * sw : npx - inward * 0.35 * DEF_W * sw;
    for (let i = 0; i < n; i++) defenders.push(start + inward * i * DEF_W * sw);
    const keeperX = gx - nearU * 0.22;
    return { k, gW, gH, gx, gy, left: gx - gW / 2, right: gx + gW / 2, bar: gy - gH, tw, fw, sw, wallY, defenders, keeperX };
  }

  // Green zone for the power bar, depends on distance.
  function idealPower(dist) { return clamp(38 + (dist - 18) * 2, 38, 68); }

  /* Work out what happens.
     aim:   {x, y} tapped on the goal plane (screen coords)
     curl:  -1 (bend left) ... 1 (bend right)
     power: 0-100
     rng:   random number function (so tests can fix it) */
  function shoot(kick, aim, curl, power, rng) {
    rng = rng || Math.random;
    const L = layout(kick);
    const ideal = idealPower(kick.dist);
    const apex = 18 + power * 0.55;
    // Wind pushes the ball sideways, more the further it travels.
    const windPx = (kick.wind || 0) * 0.9 * L.k * (kick.dist / 22);
    const tx = aim.x + windPx;
    let hEnd = (L.gy - aim.y) / L.k + (power - ideal) * 1.4;
    hEnd = Math.max(2, hEnd);
    const curlPx = curl * 38;

    // Did it clear the wall?
    const tauW = 10 / kick.dist;
    const f = persp(1 - tauW);
    const s = lerp(L.k, 1, f);
    const hW = 4 * apex * tauW * (1 - tauW) + hEnd * tauW;
    const bxW = lerp(tx, BX, f) + curlPx * 4 * tauW * (1 - tauW) * s;
    const wallJumps = rng() < 0.8;
    const wallTop = WALL_H + (wallJumps ? WALL_JUMP : 0);
    const reach = (DEF_W / 2 + 4) * s;
    const hitsWall = hW < wallTop && L.defenders.some((dx) => Math.abs(bxW - dx) < reach);

    const out = { tx, ty: L.gy - hEnd * L.k, hEnd, apex, curlPx, wallJumps, hW, bxW, L, power, ideal, curl };
    if (hitsWall) return Object.assign(out, { result: "wall" });

    const postL = L.left, postR = L.right;
    const inside = tx > postL && tx < postR;
    const woodSide = Math.min(Math.abs(tx - postL), Math.abs(tx - postR)) / L.k < 4 && hEnd < GOAL_H_WORLD + 3;
    const woodBar = Math.abs(hEnd - GOAL_H_WORLD) < 4 && tx > postL - 3 && tx < postR + 3;
    if (woodSide || woodBar) {
      return Object.assign(out, { result: rng() < 0.35 ? "post-in" : "post", woodwork: woodBar ? "bar" : "post" });
    }
    if (!inside) return Object.assign(out, { result: "wide" });
    if (hEnd > GOAL_H_WORLD) return Object.assign(out, { result: "over" });

    // Keeper
    const dxW = Math.abs(tx - L.keeperX) / L.k;
    const dyW = Math.max(0, hEnd - 35);
    const d = Math.sqrt(dxW * dxW + dyW * dyW * 0.6);
    const R = 58 + kick.keeperSkill * 22;
    const cornerGap = Math.min(tx - postL, postR - tx) / L.k;
    const topBins = hEnd > 48 && cornerGap < 24;
    let saveP = d > R ? 0 : kick.keeperSkill * Math.pow(1 - d / R, 0.6);
    if (d < 22) saveP = Math.max(saveP, 0.55 + kick.keeperSkill * 0.35);   // right at the keeper
    if (Math.abs(curl) > 0.55) saveP *= 0.8;          // bending shots are harder to read
    if (!hitsWall && hW < wallTop + 25) saveP *= 0.85; // ball came out of the wall late
    if (power < ideal - 14) saveP = Math.min(0.95, saveP + 0.35);   // soft shot
    if (topBins) saveP *= 0.3;
    const saved = rng() < saveP;
    return Object.assign(out, { result: saved ? "saved" : "goal", topBins, saveP });
  }

  // Bezier-free flight path: position at progress tau (0 = at George's foot, 1 = at the goal).
  function flightPoint(shot, tau) {
    const L = shot.L;
    const f = persp(1 - tau);
    const s = lerp(L.k, 1, f);
    const h = 4 * shot.apex * tau * (1 - tau) + shot.hEnd * tau;
    const gx = lerp(shot.tx, BX, f);
    const gy = L.gy + (BY - L.gy) * f;
    const c = shot.curlPx * 4 * tau * (1 - tau);
    return { x: gx + c * s, y: gy - h * s, gx: gx + c * s, gy, s };
  }

  FK.BX = BX; FK.BY = BY; FK.GOAL_H_WORLD = GOAL_H_WORLD; FK.WALL_H = WALL_H; FK.WALL_JUMP = WALL_JUMP;
  FK.persp = persp; FK.layout = layout; FK.idealPower = idealPower; FK.shoot = shoot; FK.flightPoint = flightPoint;
})(typeof window !== "undefined" ? (window.FKP = window.FKP || {}) : (module.exports = {}));
