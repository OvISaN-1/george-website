/* ================================================================
   LINE STRIKER (3D)
   Time freezes. You draw a line from the player with the ball.
   - Line ends at a team-mate  -> a pass.
   - Line reaches the goal     -> a shot.
   Defenders try to cut the line. The keeper tries to save the shot.
   World units are metres. The goal line is z = 0 and we attack towards
   -z, so the camera sits behind George at a large +z.
   ================================================================ */
import * as THREE from "./three.module.min.js";

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const hyp = Math.hypot;
const randn = () => { let u = 0; for (let i = 0; i < 4; i++) u += Math.random(); return (u - 2) * 1.7; };
const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

const GOAL_HALF = 3.66, GOAL_H = 2.44;
const PASS_V = 21, SHOT_V = 30, POWER_V = 54;
const LOB_MIN = 22;                     // a pass longer than this (metres) is lobbed over the top
const BEST_KEY = "gz_linestriker_best2";
const PASS_HALF = 105 * Math.PI / 180;  // a pass must go within 105 degrees either side of the way the player faces (so sideways is fine)
const BIN_X = 2.6, BIN_Y = 2.05;
const MAX_LIVES = 3;

/* ---------------- renderer, scene, camera ---------------- */
const stage = $("stage"), canvas = $("gl");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch (e) {
  $("screen-start").querySelector(".ls-lede").textContent = "Sorry, this game needs 3D graphics (WebGL) and your browser could not start it.";
  $("btn-start").disabled = true;
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
const scene = new THREE.Scene();
const SKY = 0x0b1a2a;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 70, 150);
const camera = new THREE.PerspectiveCamera(58, 1, 0.5, 220);
scene.add(new THREE.HemisphereLight(0xffffff, 0x3f7a35, 2.3));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(18, 40, 26);
scene.add(sun);

function resize() {
  const w = stage.clientWidth || 360, h = stage.clientHeight || 600;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 0.75 ? 70 : 56;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);

/* ---------------- textures (all drawn with canvas, no files) ---------------- */
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

function pitchTexture() {
  const W = 1024, k = W / 76, H = Math.round(68 * k);
  return canvasTex(W, H, (g) => {
    const X = (x) => (x + 38) * k, Z = (z) => (z + 12) * k;
    for (let z0 = -12, i = 0; z0 < 56; z0 += 4, i++) { g.fillStyle = i % 2 ? "#2f8a3b" : "#38a044"; g.fillRect(0, Z(z0), W, 4 * k + 1); }
    g.strokeStyle = "rgba(255,255,255,.92)"; g.lineWidth = 3; g.lineJoin = "round";
    const line = (x1, z1, x2, z2) => { g.beginPath(); g.moveTo(X(x1), Z(z1)); g.lineTo(X(x2), Z(z2)); g.stroke(); };
    line(-34, 0, 34, 0); line(-34, 0, -34, 56); line(34, 0, 34, 56); line(-34, 52.5, 34, 52.5);
    line(-20.16, 0, -20.16, 16.5); line(20.16, 0, 20.16, 16.5); line(-20.16, 16.5, 20.16, 16.5);
    line(-9.16, 0, -9.16, 5.5); line(9.16, 0, 9.16, 5.5); line(-9.16, 5.5, 9.16, 5.5);
    g.fillStyle = "#fff"; g.beginPath(); g.arc(X(0), Z(11), 3, 0, 7); g.fill();
    const phi0 = Math.acos(5.5 / 9.15);
    g.beginPath();
    for (let i = 0; i <= 24; i++) { const p = lerp(-phi0, phi0, i / 24); const x = 9.15 * Math.sin(p), z = 11 + 9.15 * Math.cos(p); i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)); }
    g.stroke();
    g.beginPath(); g.arc(X(0), Z(52.5), 9.15 * k, 0, Math.PI); g.stroke();
  });
}

const pitch = new THREE.Mesh(new THREE.PlaneGeometry(76, 68), new THREE.MeshLambertMaterial({ map: pitchTexture() }));
pitch.rotation.x = -Math.PI / 2; pitch.position.set(0, 0, 22);
scene.add(pitch);
const apron = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x1c4a24 }));
apron.rotation.x = -Math.PI / 2; apron.position.set(0, -0.05, 22);
scene.add(apron);

// advertising boards and crowd
const adTex = canvasTex(1024, 64, (g, w, h) => {
  const names = ["GEORGE FC", "GAME ZONE", "FOREST RED", "LINE STRIKER"], cols = ["#1d3a8a", "#b3122a", "#1d3a8a", "#b3122a"];
  for (let i = 0; i < 4; i++) {
    g.fillStyle = cols[i]; g.fillRect(i * w / 4, 0, w / 4, h);
    g.fillStyle = "#fff"; g.font = "700 40px Rajdhani, Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(names[i], i * w / 4 + w / 8, h / 2 + 2);
  }
}, [3, 1]);
function board(w, x, z, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.1), new THREE.MeshBasicMaterial({ map: adTex, side: THREE.DoubleSide }));
  m.position.set(x, 0.55, z); m.rotation.y = ry; scene.add(m); return m;
}
board(76, 0, -11, 0); board(68, -38.2, 22, Math.PI / 2); board(68, 38.2, 22, -Math.PI / 2);
const crowdTex = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = "#1a1a24"; g.fillRect(0, 0, w, h);
  const cols = ["#d7102b", "#ffffff", "#f5b942", "#2a62d9", "#8a8a96", "#e8c9a8", "#b3122a"];
  for (let i = 0; i < 1100; i++) { g.fillStyle = cols[(Math.random() * cols.length) | 0]; g.fillRect(Math.random() * w, Math.random() * h, 9, 10); }
}, [5, 2]);
const crowdMat = new THREE.MeshBasicMaterial({ map: crowdTex, color: 0x6f6f7c });
function stand(w, x, y, z, ry, tilt) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 22), crowdMat);
  m.position.set(x, y, z); m.rotation.set(tilt, ry, 0, "YXZ"); scene.add(m); return m;
}
stand(110, 0, 9, -24, 0, -0.62);
stand(80, -48, 9, 22, Math.PI / 2, -0.62); stand(80, 48, 9, 22, -Math.PI / 2, -0.62);

// the goal
const nets = []; let netT = 99, netAmp = 1; const netAt = new THREE.Vector3();
function netHit(x, y, amp) { netAt.set(clamp(x, -GOAL_HALF, GOAL_HALF), clamp(y, 0.2, GOAL_H), -2.2); netT = 0; netAmp = amp; sfx.net(); }
function netUpdate(dt) {
  if (netT > 3) return;
  netT += dt;
  const t = netT, done = t > 2.6;
  for (const n of nets) {
    for (let i = 0; i < n.base.length; i++) {
      let z = 0;
      if (!done) {
        const d = n.base[i].distanceTo(netAt);
        const bulge = Math.exp(-d * d / 2.4) * Math.exp(-t * 1.7);
        const wave = 0.35 * Math.exp(-t * 2.1) * Math.cos(16 * t - 5.5 * d) * Math.exp(-d * d / 13.5) * Math.min(1, t * 8);
        z = n.sgn * n.amp * netAmp * 1.1 * (bulge + wave);
        if (n.back) { n.pos.setX(i, n.bx[i] + ((netAt.x - n.m.position.x) - n.bx[i]) * 0.45 * bulge * Math.min(1, netAmp) + 0.25 * wave); n.pos.setY(i, n.by[i] + ((netAt.y - n.m.position.y) - n.by[i]) * 0.45 * bulge * Math.min(1, netAmp) + 0.2 * wave); }
      } else if (n.back) { n.pos.setX(i, n.bx[i]); n.pos.setY(i, n.by[i]); }
      n.pos.setZ(i, z);
    }
    n.pos.needsUpdate = true;
  }
  if (done) netT = 99;
}
{
  const white = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const post = (x) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, GOAL_H, 10), white); m.position.set(x, GOAL_H / 2, 0); scene.add(m); };
  post(-GOAL_HALF); post(GOAL_HALF);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, GOAL_HALF * 2 + 0.14, 10), white);
  bar.rotation.z = Math.PI / 2; bar.position.set(0, GOAL_H, 0); scene.add(bar);
  const netTex = canvasTex(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 3; g.strokeRect(0, 0, 64, 64); }, [16, 6]);
  const nm = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const addNet = (w, h, sx, sy, setup, sgn) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, sx, sy), nm); setup(m); scene.add(m); m.updateMatrixWorld(true);
    const pos = m.geometry.attributes.position, base = [];
    for (let i = 0; i < pos.count; i++) base.push(m.localToWorld(new THREE.Vector3(pos.getX(i), pos.getY(i), 0)));
    const isBack = sgn === -1 && m.position.z < -2, bx = [], by = [];
    for (let i = 0; i < pos.count; i++) { bx.push(pos.getX(i)); by.push(pos.getY(i)); }
    nets.push({ m, pos, base, sgn, bx, by, back: isBack, amp: isBack ? 1 : 0.45 });
  };
  addNet(GOAL_HALF * 2, GOAL_H, 24, 9, (m) => m.position.set(0, GOAL_H / 2, -2.2), -1);
  addNet(GOAL_HALF * 2, 2.3, 24, 7, (m) => { m.rotation.x = Math.PI / 2; m.position.set(0, GOAL_H, -1.1); }, -1);
  for (const sd of [-1, 1]) addNet(2.2, GOAL_H, 7, 9, (m) => { m.rotation.y = Math.PI / 2; m.position.set(sd * GOAL_HALF, GOAL_H / 2, -1.1); }, sd);
}

/* ---------------- players (built from simple shapes) ---------------- */
const matCache = {};
const mat = (c) => (matCache[c] = matCache[c] || new THREE.MeshLambertMaterial({ color: c }));
const numTexCache = {};
function numberTex(n, col) {
  const key = n + col;
  return (numTexCache[key] = numTexCache[key] || canvasTex(64, 64, (g) => { g.fillStyle = col; g.font = "700 52px Rajdhani, Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(n), 32, 34); }));
}
const blobTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 4, 32, 32, 30); gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false });

function box(w, h, d, c, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); return m; }

function makePlayer(o) {
  const g = new THREE.Group();
  const leg = (sx) => {
    const p = new THREE.Group(); p.position.set(sx * 0.1, 1.08, 0);
    p.add(box(0.17, 0.4, 0.19, o.shorts, 0, -0.19, 0), box(0.13, 0.56, 0.15, o.socks, 0, -0.66, 0), box(0.15, 0.09, 0.27, 0x111111, 0, -1.0, 0.04));
    g.add(p); return p;
  };
  const arm = (sx) => {
    const p = new THREE.Group(); p.position.set(sx * 0.29, 1.72, 0);
    p.add(box(0.11, 0.3, 0.13, o.shirt, 0, -0.14, 0), box(0.09, 0.36, 0.11, o.keeper ? 0xffe14d : o.skin, 0, -0.47, 0));
    g.add(p); return p;
  };
  const legL = leg(-1), legR = leg(1), armL = arm(-1), armR = arm(1);
  g.add(box(0.42, 0.64, 0.25, o.shirt, 0, 1.44, 0), box(0.4, 0.2, 0.25, o.shorts, 0, 1.14, 0));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), mat(o.skin)); head.position.set(0, 2.0, 0); g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.168, 14, 10), mat(o.hair)); hair.scale.set(1, 0.78, 1.02); hair.position.set(0, 2.07, -0.022); g.add(hair);
  const num = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshBasicMaterial({ map: numberTex(o.number, o.numCol || "#fff"), transparent: true }));
  num.position.set(0, 1.46, -0.128); num.rotation.y = Math.PI; g.add(num);
  g.scale.setScalar(0.9);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03;
  const root = new THREE.Group(); root.add(g, blob);
  return { root, body: g, legL, legR, armL, armR, phase: Math.random() * 6 };
}

const KITS = {
  att: { shirt: 0xd7102b, shorts: 0xf4f4f4, socks: 0xd7102b, numCol: "#fff" },
  def: { shirt: 0xe7edf5, shorts: 0xe2765a, socks: 0xf4f4f4, numCol: "#2a3a55" },
  gk: { shirt: 0x39d17a, shorts: 0x14532d, socks: 0x14532d, numCol: "#0b2a18" },
};
const SKINS = [0xf3c9a4, 0xe0ac86, 0xc68642, 0x8d5524, 0xf1d3b5];
const HAIRS = [0x2a1d12, 0xa57d52, 0x151515, 0x6b4423, 0xc9a24a];

function makeEntity(kit, number, i, extra) {
  const p = makePlayer(Object.assign({}, KITS[kit], { number, skin: extra && extra.skin || SKINS[i % SKINS.length], hair: extra && extra.hair || HAIRS[(i * 3) % HAIRS.length], keeper: kit === "gk" }));
  scene.add(p.root);
  return { p, x: 0, z: 0, vx: 0, vz: 0, face: Math.PI, speed: 0, ring: null, isDef: kit === "def" };
}
const att = [
  makeEntity("att", 10, 0, { skin: 0xf3c9a4, hair: 0xa57d52 }),
  makeEntity("att", 7, 1), makeEntity("att", 9, 2), makeEntity("att", 11, 3), makeEntity("att", 8, 5), makeEntity("att", 6, 6),
];
const defs = []; for (let i = 0; i < 8; i++) defs.push(makeEntity("def", [4, 5, 3, 6, 2, 8, 14, 15][i], i + 1));
const keeper = makeEntity("gk", 1, 4);
keeper.dive = 0; keeper.diveDir = 0;

// rings under team-mates (who can I pass to?) and a ring for George
const ringGeo = new THREE.RingGeometry(0.8, 1.05, 32);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
const tackRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff4d5e, transparent: true, opacity: 0.95, side: THREE.DoubleSide })); tackRing.rotation.x = -Math.PI / 2; tackRing.position.y = 0.06; tackRing.visible = false; scene.add(tackRing);
for (const a of att) { a.ring = new THREE.Mesh(ringGeo, ringMat.clone()); a.ring.rotation.x = -Math.PI / 2; a.ring.position.y = 0.06; scene.add(a.ring); }

// the arc a pass must start inside
const cone = new THREE.Mesh(new THREE.CircleGeometry(15, 40, Math.PI / 2 - PASS_HALF, PASS_HALF * 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }));
cone.rotation.x = -Math.PI / 2; cone.position.y = 0.05; cone.renderOrder = 2; scene.add(cone);
// the power-shot zone: shoot from here for a rocket
function goodSpot(c) { return c.z >= 8 && c.z <= 23 && Math.abs(c.x) <= 13; }
const zone = new THREE.Mesh(new THREE.PlaneGeometry(26, 15), new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
zone.rotation.x = -Math.PI / 2; zone.position.set(0, 0.045, 15.5); zone.renderOrder = 1; scene.add(zone);
// the glowing "top bins" target in the corner of the goal
const bin = new THREE.Group();
bin.add(new THREE.Mesh(new THREE.RingGeometry(0.5, 0.72, 28), new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide })), new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), new THREE.MeshBasicMaterial({ color: 0xff4d5e, transparent: true, opacity: 0.85, side: THREE.DoubleSide })));
bin.visible = false; scene.add(bin);

// a name tag so George is easy to spot
const tagTex = canvasTex(256, 90, (g, w, h) => {
  g.fillStyle = "#d7102b"; g.strokeStyle = "#fff"; g.lineWidth = 6;
  g.beginPath(); if (g.roundRect) g.roundRect(8, 6, w - 16, 52, 24); else g.rect(8, 6, w - 16, 52); g.fill(); g.stroke();
  g.fillStyle = "#fff"; g.font = "700 40px Rajdhani, Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("GEORGE", w / 2, 33);
  g.fillStyle = "#fff"; g.beginPath(); g.moveTo(w / 2 - 14, 60); g.lineTo(w / 2 + 14, 60); g.lineTo(w / 2, 84); g.closePath(); g.fill();
});
const georgeTag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex, transparent: true, depthTest: false }));
georgeTag.scale.set(3.0, 1.05, 1); georgeTag.renderOrder = 20; scene.add(georgeTag);

// ball
const ballTex = canvasTex(64, 32, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#222"; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(5 + i * 11, (i % 2) ? 9 : 22, 4.5, 0, 7); g.fill(); } });
const ball = { mesh: new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), new THREE.MeshLambertMaterial({ map: ballTex })), x: 0, y: 0.24, z: 0, spin: 0 };
scene.add(ball.mesh);
// a burning ball: a trail of flame sprites behind it, and the ball itself glowing hot
const fireTex = canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, "rgba(255,255,235,1)"); gr.addColorStop(0.25, "rgba(255,205,70,0.9)"); gr.addColorStop(0.6, "rgba(255,90,10,0.5)"); gr.addColorStop(1, "rgba(120,10,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
const fire = [];
for (let i = 0; i < 44; i++) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  sp.visible = false; scene.add(sp); fire.push({ sp, life: 0, max: 0.4, vx: 0, vy: 0, vz: 0 });
}
let fireIdx = 0, lbx = 0, lby = 0.24, lbz = 0, burnT = 0;
function fireUpdate(dt) {
  const burning = !!(run && run.power && (run.state === "fly" || run.state === "goalmouth" || run.state === "end"));
  if (burning) burnT = 0.6; else burnT = Math.max(0, burnT - dt);
  if (burning && !reduced) {
    for (let k = 1; k <= 3; k++) {
      const f = fire[fireIdx++ % fire.length], t = k / 3;
      f.sp.position.set(lerp(lbx, ball.x, t) + rand(-0.1, 0.1), lerp(lby, ball.y, t) + rand(-0.08, 0.16), lerp(lbz, ball.z, t) + rand(-0.1, 0.1));
      f.life = f.max = rand(0.3, 0.5); f.vx = rand(-0.4, 0.4); f.vy = rand(0.6, 1.6); f.vz = rand(-0.4, 0.4); f.sp.visible = true;
    }
  }
  lbx = ball.x; lby = ball.y; lbz = ball.z;
  for (const f of fire) {
    if (f.life <= 0) { f.sp.visible = false; continue; }
    f.life -= dt; const u = clamp(1 - f.life / f.max, 0, 1);
    f.sp.position.x += f.vx * dt; f.sp.position.y += f.vy * dt; f.sp.position.z += f.vz * dt;
    const sc = (0.5 + 1.1 * Math.sin(Math.min(1, u * 1.6) * Math.PI / 2)) * (1 - u * 0.55);
    f.sp.scale.set(sc, sc, 1);
    f.sp.material.opacity = Math.pow(1 - u, 1.2);
    f.sp.material.color.setRGB(1, 0.92 - 0.7 * u, 0.55 - 0.55 * u);
  }
  ball.mesh.material.emissive.setRGB(burnT > 0 ? 1.0 : 0, burnT > 0 ? 0.35 + 0.2 * Math.random() : 0, 0);
  ball.mesh.material.emissiveIntensity = burnT > 0 ? 0.9 : 0;
}
const ballBlob = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), blobMat); ballBlob.rotation.x = -Math.PI / 2; ballBlob.position.y = 0.04; scene.add(ballBlob);

// the drawn line (a flat ribbon on the grass)
const MAXV = 1200;
const ribbonGeo = new THREE.BufferGeometry();
ribbonGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAXV * 3), 3));
ribbonGeo.setIndex(new THREE.BufferAttribute(new Uint16Array((MAXV - 2) * 3), 1));
const ribbonMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
ribbon.frustumCulled = false; ribbon.renderOrder = 5; ribbon.visible = false;
scene.add(ribbon);
function setRibbon(pts, width) {
  const n = Math.min(pts.length, MAXV / 2), pos = ribbonGeo.attributes.position.array, idx = ribbonGeo.index.array;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b.x - a.x, dz = b.z - a.z; const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
    const w = width * (i === 0 ? 0.4 : 1) * (0.55 + 0.45 * Math.min(1, i / 6));
    pos.set([pts[i].x - dz * w, 0.07, pts[i].z + dx * w, pts[i].x + dz * w, 0.07, pts[i].z - dx * w], i * 6);
  }
  let k = 0;
  for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], k); k += 6; }
  ribbonGeo.setDrawRange(0, k);
  ribbonGeo.attributes.position.needsUpdate = true; ribbonGeo.index.needsUpdate = true;
  ribbon.visible = n > 1;
}

/* ---------------- sound (tiny, made with the browser's audio) ---------------- */
let ac = null, soundOn = true;
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = false; } } return ac; }
function tone(f, d, type, vol, slide, delay) {
  const a = audio(); if (!a || !soundOn) return;
  const t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
  o.type = type || "sine"; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + d);
  g.gain.setValueAtTime(vol || 0.1, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + d + 0.02);
}
function noise(d, vol, lp) {
  const a = audio(); if (!a || !soundOn) return;
  const n = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, n, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = buf; f.type = "lowpass"; f.frequency.value = lp || 1500; g.gain.value = vol || 0.2;
  s.connect(f).connect(g).connect(a.destination); s.start();
}
const sfx = {
  kick() { tone(150, 0.12, "triangle", 0.25, 60); noise(0.06, 0.12, 900); },
  pass() { tone(520, 0.08, "sine", 0.1, 760); },
  draw(t) { tone(300 + t * 400, 0.04, "sine", 0.03); },
  save() { tone(220, 0.2, "square", 0.08, 110); noise(0.12, 0.15, 700); },
  post() { tone(900, 0.5, "sine", 0.12, 700); },
  lost() { tone(260, 0.3, "sawtooth", 0.07, 90); },
  net() { noise(0.35, 0.16, 1800); tone(180, 0.25, "sine", 0.07, 80); },
  power() { tone(90, 0.5, "sawtooth", 0.14, 700); noise(0.4, 0.2, 3000); },
  goal() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, "triangle", 0.12, 0, i * 0.11)); noise(1.4, 0.2, 2200); },
};

/* ---------------- game state ---------------- */
const G = { air: false, aerial: null, power: 0, armed: false, phase: "menu", level: 0, lives: MAX_LIVES, goals: 0, score: 0, bonus: 0, chain: 0, carrier: 0, timeScale: 1, nDef: 3, defSpeed: 4.8 };
let smoothP = null, rawEnd = null, releaseLob = false, releaseHold = 0, releasePw = null, holdPower = 0, lastMove = 0;
let lastLevelShown = 0, route = null, run = null, drawPts = [], drawing = false, resultTimer = 0;
const cam = { x: 0, z: 40, tx: 0, tz: 28, lx: 0, lz: 20 };

function setHud() {
  $("hud-goals").textContent = G.goals;
  $("hud-score").textContent = G.score;
  $("hud-lives").textContent = "❤".repeat(G.lives) + "♡".repeat(MAX_LIVES - G.lives);
  $("hud-lives").setAttribute("aria-label", G.lives + " lives left");
}
let popTimer = 0;
function pop(text, sub, cls) {
  const el = $("pop"); el.className = "ls-pop"; void el.offsetWidth;
  el.innerHTML = text + (sub ? "<small>" + sub + "</small>" : ""); el.className = "ls-pop show " + (cls || "");
}
const setHint = (t) => { $("hint").textContent = t; };

/* ---------------- setting up an attack ---------------- */
function place(e, x, z, face) { e.x = x; e.z = z; e.vx = e.vz = 0; e.speed = 0; e.face = face === undefined ? Math.PI : face; }
function newAttack() {
  G.nDef = Math.min(4 + (G.level >> 1), 8);
  G.defSpeed = Math.min(4.6 + G.level * 0.22, 6.8);
  G.chain = 0; G.carrier = 0;
  G.markDist = clamp(3.0 - G.level * 0.2, 1.7, 3.0);
  G.bonus = Math.random() < 0.4 ? (Math.random() < 0.5 ? -1 : 1) : 0;
  bin.visible = G.bonus !== 0; if (G.bonus) bin.position.set(G.bonus * BIN_X, BIN_Y, 0.3);
  place(att[0], rand(-7, 7), rand(33, 38));
  place(att[1], rand(-19, -15), rand(24, 30));
  place(att[2], rand(15, 19), rand(24, 30));
  place(att[3], rand(-9, -5), rand(18, 23));
  place(att[4], rand(5, 9), rand(16, 21));
  place(att[5], rand(-3, 3), rand(27, 31));
  const taken = att.map((a) => [a.x, a.z]), dTaken = [];
  defs.forEach((d, i) => {
    d.p.root.visible = i < G.nDef;
    if (i >= G.nDef) { d.x = 999; return; }
    let x, z, tries = 0;
    const sep = Math.max(6, 10 - G.nDef * 0.5);       // keep the defenders well apart so there is room to attack
    do {
      if (i === 0) { x = rand(-4, 4); z = rand(14, 22); } else { x = rand(-23, 23); z = rand(8, 31); }
      tries++;
    } while (tries < 120 && (taken.some(([ax, az]) => hyp(ax - x, az - z) < 5.5) || dTaken.some(([ax, az]) => hyp(ax - x, az - z) < sep)));
    taken.push([x, z]); dTaken.push([x, z]);
    place(d, x, z, 0);
  });
  place(keeper, rand(-1, 1), 1.1, 0); keeper.dive = 0; keeper.diveDir = 0;
  ball.x = att[0].x; ball.z = att[0].z - 0.6; ball.y = 0.24;
  run = null; route = null; ribbon.visible = false;
  cam.x = att[0].x * 0.6; cam.tz = att[0].z + 13;
  planStart();
  syncMeshes(0);
  snapCamera();
  if (G.level > 0 && G.level !== lastLevelShown) pop("LEVEL " + (G.level + 1), "Defenders are quicker now", "soft");
  lastLevelShown = G.level;
}

function planStart(aer) {
  G.phase = "plan"; ribbon.visible = false; timeScaleReset(); G.aerial = aer || null;
  const c = att[G.carrier];
  c.face = Math.PI; keeper.dive = 0; keeper.diveDir = 0; keeper.jump = 0;
  cone.visible = !aer; cone.position.set(c.x, 0.05, c.z);
  zone.visible = !aer; zone.material.opacity = goodSpot(c) ? 0.3 : 0.12;
  // Give the player a little room: nudge any defender that is right on top of the ball.
  for (const d of defs) if (d.p.root.visible) { const dd = hyp(d.x - c.x, d.z - c.z); if (dd < 3) { const k = 3.2 / (dd || 1); d.x = c.x + (d.x - c.x) * k; d.z = c.z + (d.z - c.z) * k; } }
  ball.x = c.x + Math.sin(c.face) * 0.5; ball.z = c.z + Math.cos(c.face) * 0.5; ball.y = aer ? (aer.type === "bicycle" ? 2.5 : aer.type === "volley" ? 1.0 : 2.1) : 0.24;
  if (aer) { pop(aer.special ? "GEORGE!" : (aer.type === "bicycle" ? "BICYCLE KICK!" : aer.type === "volley" ? "VOLLEY!" : "HEADER!"), aer.special ? "A spectacular " + (aer.type === "bicycle" ? "bicycle kick" : aer.type === "volley" ? "volley" : "header") + "! Aim it!" : aer.type === "bicycle" ? "What a chance! Aim it!" : aer.type === "volley" ? "Hit it first time!" : "Aim it at the goal!", "gold"); sfx.pass(); }
  setHint(!aer && goodSpot(c) ? "You are in the power zone! Shoot for a rocket." : aer ? (aer.type === "bicycle" ? "Overhead kick! Draw a line into the goal." : aer.type === "volley" ? "Volley! Draw a line into the goal." : "Header! Draw a line into the goal.") : G.chain ? "Pass or shoot! Draw a line." : G.bonus ? "Time is frozen. Hit the glowing corner for bonus points!" : "Time is frozen. Draw a line to a team-mate or into the goal.");
  buildQuick();
}

/* ---------------- drawing the line ---------------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
function groundAt(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -(((ev.clientY - r.top) / r.height) * 2 - 1));
  ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
}
function lineSafety(pts) {
  let min = 99;
  for (const d of defs) { if (!d.p.root.visible) continue; for (let i = 1; i < pts.length; i += 2) min = Math.min(min, hyp(pts[i].x - d.x, pts[i].z - d.z)); }
  return min;
}
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); }
function behindRoute(r) {
  if (r.kind === "shot") return false;                       // shots are always fine
  const c = att[G.carrier], e = r.pts[r.pts.length - 1];
  return angDiff(Math.atan2(e.x - c.x, e.z - c.z), c.face) > PASS_HALF;
}
function updatePreview() {
  const r = drawPts.length >= 3 ? buildRoute(drawPts, holdPower) : null;
  setRibbon(r ? r.pts : drawPts, 0.07 + 0.07 * (r ? r.pw : 0));          // show the path the ball will really take (thicker = harder)
  if (r) { $("holdbar").hidden = false; $("hold-label").textContent = "POWER " + Math.round(r.pw * 100) + "%" + (r.kind === "pass" ? (r.lob ? " · LOB / CROSS" : r.pw > 0.6 ? " · HARD PASS, HARDER TO CONTROL" : " · GROUND PASS") : (goodSpot(att[G.carrier]) ? " · POWER SHOT" : r.pw > 0.6 ? " · HARD TO SAVE OR BLOCK" : " · DRAW LONGER = HARDER")); $("hold-fill").style.width = Math.round(r.pw * 100) + "%"; }
  if (!r) { ribbonMat.color.set(0xffffff); return; }
  if (G.aerial && r.kind !== "shot") { ribbonMat.color.set(0xff4d5e); setHint("Header! Draw the line into the goal."); return; }
  if (behindRoute(r)) { ribbonMat.color.set(0xff4d5e); setHint("Too far behind. Pass inside the glowing arc."); return; }
  let m = lineSafety(r.pts);
  if (r.lob) { const e = r.pts[r.pts.length - 1]; m = 99; for (let k = 0; k < G.nDef; k++) m = Math.min(m, hyp(defs[k].x - e.x, defs[k].z - e.z)); }   // a lob only needs a clear landing spot
  ribbonMat.color.set(r.kind === "shot" && goodSpot(att[G.carrier]) ? 0xff8a1f : r.lob ? (m < 2 ? 0xff4d5e : 0x8fc4ff) : m < 1.9 ? 0xff4d5e : m < 3.4 ? 0xffc23d : 0xffffff);
  setHint(r.kind === "shot" ? (goodSpot(att[G.carrier]) ? "Power shot! Let go to fire. (Red strip = cancel)" : "Let go to shoot! (Red strip = cancel)") : r.lob ? "Long ball: it will be lobbed. Let go to play it." : holdPower > 0.08 ? "Holding... the ball will go further." : "Let go to pass. Draw it longer for a lob.");
}
const cancelEl = $("cancelzone");
function overCancel(ev) { const r = cancelEl.getBoundingClientRect(); return ev.clientY >= r.top && ev.clientX >= r.left && ev.clientX <= r.right; }

// camera: two fingers (turn + pinch), the mouse wheel, or the buttons
const view = { yaw: 0, zoom: 1, yawT: 0, zoomT: 1 };
const ptrs = new Map(); let gest = null;
function startGesture() { const [a, b] = [...ptrs.values()]; gest = { d0: hyp(a.x - b.x, a.y - b.y) || 1, mx0: (a.x + b.x) / 2, yaw0: view.yawT, zoom0: view.zoomT }; }
function updateGesture() {
  const [a, b] = [...ptrs.values()], d = hyp(a.x - b.x, a.y - b.y) || 1;
  view.zoomT = clamp(gest.zoom0 * gest.d0 / d, 0.6, 2.4);
  view.yawT = clamp(gest.yaw0 - ((a.x + b.x) / 2 - gest.mx0) * 0.006, -1.6, 1.6);
}
canvas.addEventListener("wheel", (e) => { view.zoomT = clamp(view.zoomT * (1 + e.deltaY * 0.001), 0.6, 2.4); e.preventDefault(); }, { passive: false });
const camHold = { l: 0, r: 0, i: 0, o: 0 };
function bindCam(id, key, nudge) {
  const el = $(id), off = () => { camHold[key] = 0; };
  el.addEventListener("pointerdown", (e) => { camHold[key] = 1; e.preventDefault(); });
  el.addEventListener("pointerup", off); el.addEventListener("pointerleave", off); el.addEventListener("pointercancel", off);
  el.addEventListener("click", (e) => { if (e.detail === 0) nudge(); });   // keyboard
}
bindCam("cam-l", "l", () => { view.yawT = clamp(view.yawT + 0.3, -1.6, 1.6); });
bindCam("cam-r", "r", () => { view.yawT = clamp(view.yawT - 0.3, -1.6, 1.6); });
bindCam("cam-in", "i", () => { view.zoomT = clamp(view.zoomT * 0.85, 0.6, 2.4); });
bindCam("cam-out", "o", () => { view.zoomT = clamp(view.zoomT * 1.18, 0.6, 2.4); });
$("cam-reset").addEventListener("click", () => { view.yawT = 0; view.zoomT = 1; });

canvas.addEventListener("pointerdown", (ev) => {
  ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (ptrs.size === 2) { if (drawing) cancelDraw("Move the camera with two fingers. Draw with one."); startGesture(); return; }
  if (G.phase === "run" && run && run.state === "recover") { tackle(); return; }
  if (ptrs.size > 2 || G.phase !== "plan") return;
  const p = groundAt(ev); if (!p) return;
  drawing = true; canvas.setPointerCapture(ev.pointerId); cancelEl.hidden = false; holdPower = 0; lastMove = performance.now();
  const c = att[G.carrier];
  drawPts = [{ x: c.x, z: c.z }];
  smoothP = { x: p.x, z: p.z }; rawEnd = p;
  addDrawPoint({ x: p.x, z: p.z }); sfx.draw(0);
  ev.preventDefault();
});
canvas.addEventListener("pointermove", (ev) => {
  if (ptrs.has(ev.pointerId)) ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (gest && ptrs.size >= 2) { updateGesture(); return; }
  if (!drawing) return;
  const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
  for (const e of evs) { const p = groundAt(e); if (!p || !smoothP) continue; rawEnd = p; smoothP.x += (p.x - smoothP.x) * 0.5; smoothP.z += (p.z - smoothP.z) * 0.5; addDrawPoint({ x: smoothP.x, z: smoothP.z }); }
});
function addDrawPoint(p) {
  const last = drawPts[drawPts.length - 1];
  if (hyp(p.x - last.x, p.z - last.z) < 0.7) return;
  if (drawPts.length > 220) return;
  drawPts.push({ x: p.x, z: p.z });
  holdPower = 0; lastMove = performance.now();
  updatePreview();
}
function cancelDraw(msg) {
  holdPower = 0; $("holdbar").hidden = true;
  drawing = false; drawPts = []; ribbon.visible = false; cancelEl.hidden = true;
  if (G.phase === "plan") setHint(msg || "Cancelled. Draw again.");
}
function endDraw(ev) {
  if (!drawing) return;
  const pts = drawPts, cancel = overCancel(ev);
  if (rawEnd && pts.length > 1 && hyp(pts[pts.length - 1].x - rawEnd.x, pts[pts.length - 1].z - rawEnd.z) > 0.3) pts.push({ x: rawEnd.x, z: rawEnd.z });
  releaseHold = holdPower; holdPower = 0; $("holdbar").hidden = true;
  drawing = false; drawPts = []; cancelEl.hidden = true;
  if (cancel) { ribbon.visible = false; setHint("Cancelled. Draw again."); return; }
  if (pts.length < 3) { ribbon.visible = false; return; }
  release(pts);
}
window.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawing) cancelDraw(); });
canvas.addEventListener("pointerup", (ev) => { ptrs.delete(ev.pointerId); if (ptrs.size < 2) gest = null; endDraw(ev); });
canvas.addEventListener("pointercancel", (ev) => { ptrs.delete(ev.pointerId); gest = null; cancelDraw(); });

/* ---------------- turning a line into a pass or a shot ---------------- */
function smooth(pts) {
  let a = pts;
  for (let it = 0; it < 2; it++) {
    const b = [a[0]];
    for (let i = 0; i < a.length - 1; i++) { b.push({ x: a[i].x * 0.75 + a[i + 1].x * 0.25, z: a[i].z * 0.75 + a[i + 1].z * 0.25 }, { x: a[i].x * 0.25 + a[i + 1].x * 0.75, z: a[i].z * 0.25 + a[i + 1].z * 0.75 }); }
    b.push(a[a.length - 1]); a = b;
  }
  return a;
}
function resample(pts, step) {
  const out = [{ x: pts[0].x, z: pts[0].z }]; let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    let ax = pts[i - 1].x, az = pts[i - 1].z; const bx = pts[i].x, bz = pts[i].z;
    let seg = hyp(bx - ax, bz - az);
    while (carry + seg >= step) {
      const t = (step - carry) / seg; ax = lerp(ax, bx, t); az = lerp(az, bz, t); out.push({ x: ax, z: az }); seg = hyp(bx - ax, bz - az); carry = 0;
    }
    carry += seg;
  }
  const l = pts[pts.length - 1]; if (hyp(out[out.length - 1].x - l.x, out[out.length - 1].z - l.z) > 0.3) out.push({ x: l.x, z: l.z });
  return out;
}

// A real kick bends one way, gently. Take the start, the end and the biggest bend of what was
// drawn, and turn that into a smooth curve. A zigzag becomes one sweeping curve.
function fitCurve(raw) {
  const p0 = raw[0], p2 = raw[raw.length - 1], dx = p2.x - p0.x, dz = p2.z - p0.z, L = hyp(dx, dz);
  if (L < 0.5) return [p0, p2];
  const nx = -dz / L, nz = dx / L;
  // use the average sideways offset of everything drawn: steadier than the single biggest bend
  let sum = 0; for (const q of raw) sum += (q.x - p0.x) * nx + (q.z - p0.z) * nz;
  const lim = Math.min(0.12 * L, 3.5), h = clamp(sum / raw.length * 1.5, -lim, lim), bu = 0.5;   // a real kick only bends a little
  const co = h / (2 * bu * (1 - bu));
  const cx = p0.x + dx * bu + nx * co, cz = p0.z + dz * bu + nz * co, out = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; out.push({ x: a * p0.x + b * cx + c * p2.x, z: a * p0.z + b * cz + c * p2.z }); }
  return out;
}
function buildRoute(raw, hold) {
  const c = att[G.carrier];
  let pts = resample(smooth(raw), 0.5);
  if (pts.length < 8) return null;
  pts[0] = { x: c.x, z: c.z };
  // cut the line where it first crosses the goal line
  const gi = pts.findIndex((p) => p.z <= 0.3);
  let kind = "pass", recv = null;
  if (gi > 0) { pts = pts.slice(0, gi + 1); kind = "shot"; }
  else {
    const end = pts[pts.length - 1];
    let best = null, bd = 5.2;
    att.forEach((a, i) => { if (i === G.carrier) return; const d = hyp(a.x - end.x, a.z - end.z); if (d < bd) { bd = d; best = i; } });
    if (best !== null) { recv = best; }
    else {
      // a flick towards goal from a good distance becomes a shot
      const q = pts[Math.max(0, pts.length - 7)], tx = end.x - q.x, tz = end.z - q.z;
      if (tz < -0.4 * hyp(tx, tz) && end.z < 30) {
        const xc = end.x + tx / -tz * end.z;
        if (Math.abs(xc) < GOAL_HALF + 6) { for (let z = end.z - 0.5; z > 0.2; z -= 0.5) pts.push({ x: end.x + tx / -tz * (end.z - z), z }); pts.push({ x: xc, z: 0 }); kind = "shot"; }
      }
    }
  }
  const fitted = resample(fitCurve(pts), 0.5);
  if (fitted.length < 4) return null;
  // holding still at the end of the line pushes the ball on past it (a harder pass)
  if (kind === "pass" && hold > 0.08 && fitted.length > 6) {
    const e = fitted[fitted.length - 1], q = fitted[fitted.length - 5];
    let dx = e.x - q.x, dz = e.z - q.z; const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
    const ext = Math.min(26, routeLength(fitted) * 0.9 * hold);
    for (let d = 0.5; d <= ext; d += 0.5) {
      const x = e.x + dx * d, z = e.z + dz * d;
      if (Math.abs(x) > 33 || z > 51 || z < 7.5) break;
      fitted.push({ x, z });
    }
    const end = fitted[fitted.length - 1]; recv = null; let bd = 5.2;
    att.forEach((a, i) => { if (i === G.carrier) return; const d = hyp(a.x - end.x, a.z - end.z); if (d < bd) { bd = d; recv = i; } });
  }
  // the longer the line you drew, the harder the ball is struck
  const pw = clamp((routeLength(raw) + (fitted.length > 0 ? Math.max(0, routeLength(fitted) - routeLength(pts)) : 0) - 4) / 32, 0, 1);
  return { pts: fitted, kind, recv, pw, lob: kind === "pass" && routeLength(fitted) > LOB_MIN };
}
function release(raw) {
  const r = buildRoute(raw, releaseHold);
  if (!r) { ribbon.visible = false; setHint("Too short. Draw a longer line."); return; }
  if (G.aerial && r.kind !== "shot") { ribbon.visible = false; setHint("Header! Draw the line into the goal."); return; }
  if (behindRoute(r)) { ribbon.visible = false; setHint("Too far behind. Pass inside the glowing arc, or draw to the goal."); return; }
  releasePw = r.pw; releaseLob = r.lob; startRun(r.pts, r.kind, r.recv);
}

function routeLength(pts) { let l = 0; for (let i = 1; i < pts.length; i++) l += hyp(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); return l; }

function startRun(pts, kind, recv) {
  const L = routeLength(pts);
  const pw = releasePw !== null ? releasePw : (kind === "shot" ? 0.55 : 0.4); releasePw = null;
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + hyp(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  const lobbed = kind === "pass" && releaseLob; releaseLob = false;
  const power = kind === "shot" && !G.aerial && goodSpot(att[G.carrier]);   // a shot from a good position is a power shot
  run = { pts, cum, L, kind, recv, s: 0, pw, v: kind === "shot" ? (power ? POWER_V : G.aerial ? (G.aerial.type === "bicycle" ? 42 : G.aerial.type === "volley" ? 36 : 24) : lerp(20, 44, pw)) : (lobbed ? lerp(13, 21, pw) : lerp(15, 30, pw)), lob: lobbed, apex: clamp(L * 0.3, 2.6, 8.5), aerial: kind === "shot" ? G.aerial : null, power, state: "fly", t: 0, outcome: null, wait: 0, dist0: att[G.carrier].z };
  if (kind === "pass" && recv === null) {
    const e = pts[pts.length - 1]; let bi = null, bd = 18;
    att.forEach((a, i) => { if (i === G.carrier) return; const d = hyp(a.x - e.x, a.z - e.z); if (d < bd) { bd = d; bi = i; } });
    run.recv = bi;
  }
  if (kind === "shot") planShot();
  if (run.aerial) { att[G.carrier].aer = 0.62; att[G.carrier].aerType = run.aerial.type; run.special = !!run.aerial.special; }
  G.aerial = null; releaseHold = 0; zone.visible = false;
  if (run.power) sfx.power();
  G.phase = "run"; $("quick").innerHTML = ""; cone.visible = false;
  setHint(kind === "shot" ? "" : "");
  ribbonMat.color.set(0xffffff);
  att[G.carrier].kickT = 0.25;
  sfx.kick();
  if (kind === "pass") G.chain++;
}

function planShot() {
  const end = run.pts[run.pts.length - 1], xc = end.x, power = run.power;
  const lvl = G.level, tGoal = run.L / run.v;
  const react = Math.max(0.1, 0.32 - lvl * 0.016);
  const sigma = Math.max(0.3, 2.3 - lvl * 0.28) * (1 + 0.3 * run.pw) * (run.special ? 1.3 : 1) * (power ? 1.5 : 1) * (run.aerial ? (run.aerial.type === "bicycle" ? 1.1 : run.aerial.type === "volley" ? 1.15 : 1.25) : 1);
  const aim = clamp(xc + randn() * sigma, -4.2, 4.2);            // where the keeper guesses it is going
  const kspeed = 4.6 + lvl * 0.45;
  const dx = aim - keeper.x, move = Math.min(Math.abs(dx), kspeed * Math.max(0, tGoal - react));
  const kFinal = keeper.x + Math.sign(dx) * move;                // where he really gets to in time
  const topBins = G.bonus !== 0 && Math.abs(xc - G.bonus * BIN_X) < 1.1;
  const hG = topBins ? BIN_Y : run.aerial ? (run.aerial.type === "bicycle" ? 1.3 : run.aerial.type === "volley" ? 0.6 : 1.0) + Math.random() * 0.6 : 0.55 + Math.min(run.dist0, 36) / 36 * 1.0;
  const dive = clamp(Math.abs(kFinal - keeper.x) / 2, 0, 1);
  let reach = 0.8 + 0.4 * dive;                                   // arms, plus a dive
  if (dive > 0.3 && Math.sign(kFinal - keeper.x) !== Math.sign(xc - keeper.x)) reach = 0;   // dived the wrong way
  if (hG > 1.8) reach *= 0.6;                                     // top corners are hard to reach
  reach *= 1 - 0.25 * run.pw; if (run.pw < 0.25) reach *= 1.15;   // a soft shot is easy to reach, a hard one is not
  if (power) reach *= 0.75;
  if (run.aerial && run.aerial.type === "bicycle") reach *= 0.8;
  if (run.special) reach *= 0.6;               // George's spectacular finishes are very hard to stop
  const diff = Math.abs(kFinal - xc);
  let outcome;
  if (Math.abs(xc) <= GOAL_HALF - 0.08) {
    if (diff < reach) outcome = (diff < 0.45 && !power && Math.random() < 0.7 - 0.6 * run.pw) ? "catch" : "parry";
    else outcome = (topBins && Math.random() < 0.2) ? "bar" : "goal";
  } else if (Math.abs(xc) < GOAL_HALF + 0.35) outcome = "post";
  else outcome = "wide";
  Object.assign(run, { xc, react, kspeed, kFinal, kStart: keeper.x, tGoal, outcome, topBins, hG, high: hG > 1.8 });
  // he always goes for it: towards where he is heading, otherwise towards the ball, otherwise straight up
  keeper.diveDir = Math.abs(kFinal - keeper.x) > 0.3 ? Math.sign(kFinal - keeper.x) : Math.abs(xc - keeper.x) > 0.45 ? Math.sign(xc - keeper.x) : 0;
}

/* ---------------- the simulation ---------------- */
function pointAt(s) {
  const { pts, cum } = run;
  if (s <= 0) return pts[0];
  if (s >= run.L) return pts[pts.length - 1];
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const t = (s - cum[lo]) / (cum[hi] - cum[lo] || 1);
  return { x: lerp(pts[lo].x, pts[hi].x, t), z: lerp(pts[lo].z, pts[hi].z, t) };
}
function moveTo(e, tx, tz, sp, dt) {
  const dx = tx - e.x, dz = tz - e.z, d = hyp(dx, dz);
  if (d < 0.05) { e.vx = e.vz = 0; e.speed = 0; return d; }
  const st = Math.min(d, sp * dt);
  e.x += dx / d * st; e.z += dz / d * st; e.vx = dx / d * sp; e.vz = dz / d * sp; e.speed = sp;
  e.face = Math.atan2(dx, dz);
  return d - st;
}

// Each defender picks the attacker he is closest to (nobody is marked twice). The rest cover the middle.
function assignMarks() {
  const marks = new Array(G.nDef).fill(-1), taken = new Set(), pairs = [];
  for (let i = 0; i < G.nDef; i++) for (let a = 0; a < att.length; a++) pairs.push([hyp(defs[i].x - att[a].x, defs[i].z - att[a].z), i, a]);
  pairs.sort((u, v) => u[0] - v[0]);
  for (const [, i, a] of pairs) if (marks[i] < 0 && !taken.has(a)) { marks[i] = a; taken.add(a); }
  run.marks = marks;
}
function markTarget(i) {
  const a = run.marks[i];
  if (a >= 0) {
    const m = att[a], gx = -m.x, gz = 0.5 - m.z, l = hyp(gx, gz) || 1;
    return { x: m.x + gx / l * G.markDist, z: m.z + gz / l * G.markDist };
  }
  return { x: ball.x * 0.4, z: Math.max(6, ball.z - 9) };       // cover between the ball and the goal
}

// Team-mates make runs: wide players go down the wing and then cut in, the two inside players run
// diagonally towards the box, and the support player trails behind. Everyone slips away from a
// marker who is too close and keeps clear of team-mates.
function attackMove(a, i, dt) {
  const role = i === 1 || i === 2 ? "wing" : i === 5 ? "support" : "cut";
  let tx = a.x, tz = a.z - 6.5, sp = 6;
  if (role === "wing") { tx = a.x * (a.z < 20 ? 0.8 : 0.99); sp = 6.3; }
  else if (role === "cut") { tx = clamp(a.x * 0.6 + (i === 3 ? 2 : i === 4 ? -2 : 0), -9, 9); }
  else { tz = a.z - 2.5; sp = 4.4; }
  let nr = 99, nd = null;
  for (let k = 0; k < G.nDef; k++) { const d = hyp(a.x - defs[k].x, a.z - defs[k].z); if (d < nr) { nr = d; nd = defs[k]; } }
  if (nd && nr < 2.8) { const ax = a.x - nd.x, az = a.z - nd.z, l = hyp(ax, az) || 1; tx += ax / l * 3.2; sp += 0.8; }
  for (const b of att) { if (b === a) continue; const d = hyp(a.x - b.x, a.z - b.z); if (d < 3.4 && d > 0.01) { tx += (a.x - b.x) / d * 2.2; tz += (a.z - b.z) / d; } }
  if (a.z <= (role === "support" ? 14 : 8)) { a.speed = 0; return; }
  moveTo(a, clamp(tx, -24, 24), Math.max(tz, 7), sp, dt);
}

// The ball is loose (a rebound, a block, a parry). Whoever gets to it first wins it.
function startLoose(label, sub, vx, vz, vy) {
  run.state = "loose"; run.lt = 0; run.bvx = vx; run.bvz = vz; run.bvy = vy || 2; run.press = null; run.done = false;
  G.timeScale = 1; G.chain = Math.max(G.chain, 1);
  pop(label, sub, "soft"); setHint("Rebound! Get to the loose ball!");
  $("quick").innerHTML = "";
}
function stepLoose(dt) {
  run.lt += dt;
  const f = Math.exp(-1.4 * dt); run.bvx *= f; run.bvz *= f;
  ball.x += run.bvx * dt; ball.z += run.bvz * dt;
  run.bvy -= 14 * dt; ball.y += run.bvy * dt;
  if (ball.y <= 0.24) { ball.y = 0.24; run.bvy = run.bvy < -1.5 ? -run.bvy * 0.4 : 0; }
  const rank = (arr) => arr.map((e, k) => [hyp(e.x - ball.x, e.z - ball.z), k]).sort((u, v) => u[0] - v[0]);
  run.nearAtt = rank(att).slice(0, 2).map((u) => u[1]);
  run.nearDef = rank(defs.slice(0, G.nDef)).slice(0, 2).map((u) => u[1]);
  // a rebound that goes in counts
  if (ball.z < 0.3 && ball.z > -2.4 && Math.abs(ball.x) < GOAL_HALF - 0.1 && ball.y < GOAL_H) { run.topBins = false; run.outcome = "goal"; run.state = "end"; run.bvx = run.bvz = 0; finishAttack("goal"); sfx.goal(); netHit(ball.x, ball.y, 0.8); return; }
  if (Math.abs(ball.x) > 35 || ball.z > 53 || ball.z < -8) { run.state = "end"; finishAttack("wide"); sfx.lost(); return; }
  if (run.lt > 0.4) {
    for (let k = 0; k < att.length; k++) if (!(att[k].stun > 0) && hyp(att[k].x - ball.x, att[k].z - ball.z) < 1.0) {
      G.carrier = k; att[k].face = Math.PI; sfx.pass(); pop(run.heavy ? "GOT IT!" : "REBOUND WON!", run.heavy ? "" : "Shoot again!", "gold"); run = null; planStart(); return;
    }
    if (ball.z < 7 && hyp(keeper.x - ball.x, keeper.z - ball.z) < 1.4) { run.state = "end"; finishAttack("save"); sfx.save(); return; }
    for (let k = 0; k < G.nDef; k++) if (hyp(defs[k].x - ball.x, defs[k].z - ball.z) < 1.0) { startRecover(defs[k]); return; }
  }
  if (run.lt > 4.5) startRecover(defs.slice(0, G.nDef).sort((u, v) => hyp(u.x - ball.x, u.z - ball.z) - hyp(v.x - ball.x, v.z - ball.z))[0]);
}

function interceptPoint(e, sp) {
  for (let k = Math.floor(run.s / 0.5) + 1; k < run.pts.length; k += 2) {
    const tb = (run.cum[k] - run.s) / (run.v * 0.8), dd = hyp(e.x - run.pts[k].x, e.z - run.pts[k].z);
    if (dd <= sp * tb + 0.6) return run.pts[k];
  }
  return run.pts[run.pts.length - 1];
}
// A cross arrives at head height. Near goal the attacker goes for a header; a high cross into the
// middle of the box is a chance for a bicycle kick.
function aerialFor(a, y) {
  if (!run.lob || a.z > 24 || Math.abs(a.x) > 15) return null;
  if (y < 1.4) return a.z < 20 && Math.abs(a.x) < 14 ? { type: "volley" } : null;   // a low ball: hit it first time
  if (run.apex > 5 && a.z > 5.5 && a.z < 15 && Math.abs(a.x) < 9) return { type: "bicycle" };
  return { type: "header" };
}
function receiveBall(a, aer) {
  if (aer) aer.special = a === att[0];
  if (!aer && run.kind === "pass" && run.state !== "settle" && Math.random() < clamp((run.pw - 0.5) * 1.1, 0, 0.55)) {
    // a hard pass is hard to control: the ball runs on
    const e = run.pts[run.pts.length - 1], q = run.pts[Math.max(0, run.pts.length - 4)];
    let dx = e.x - q.x, dz = e.z - q.z; const l = hyp(dx, dz) || 1;
    startLoose("HEAVY TOUCH!", "Chase it down!", dx / l * 5 + rand(-2, 2), dz / l * 5 + rand(-2, 2), 1.5); run.heavy = true; return;
  }
  G.carrier = att.indexOf(a); a.face = Math.PI;
  sfx.pass();
  const nice = G.chain;
  if (nice >= 2) pop(["", "", "NICE!", "GREAT!", "AMAZING!", "UNREAL!"][Math.min(nice, 5)], nice + " passes in a row", "gold");
  if (aer) { run = null; planStart(aer); return; }
  // let everybody play on for a moment before time freezes again
  run.state = "settle"; run.st = 0; G.timeScale = 1; setHint("");
}
// A defender has the ball. For a few seconds the attackers chase and you can try to tackle.
function startRecover(d, label) {
  run.state = "recover"; run.holder = d; run.rt = 0; run.maxT = 5.0; run.autoT = 0.7; run.tackleCd = 0; run.chaser = -1; run.chaseDist = 99;
  G.timeScale = 1; sfx.lost();
  pop(label || "INTERCEPTED!", "Chase it down!", "soft");
  setHint("Win it back! Get close, then press TACKLE (or tap the pitch).");
  const q = $("quick"); q.innerHTML = "";
  const b = document.createElement("button"); b.type = "button"; b.className = "ls-pill shoot"; b.id = "tackle-btn"; b.textContent = "🦵 TACKLE";
  b.addEventListener("click", tackle); q.appendChild(b);
}
function stepRecover(dt) {
  const h = run.holder; run.rt += dt; run.tackleCd = Math.max(0, run.tackleCd - dt);
  let bi = 0, bd = 1e9;
  att.forEach((a, i) => { const d = hyp(a.x - h.x, a.z - h.z); if (d < bd) { bd = d; bi = i; } });
  run.chaser = bi; run.chaseDist = bd;
  run.autoT -= dt;
  if (run.autoT <= 0 && bd < 1.5) { run.autoT = 0.9; if (tryTackle(false)) return; }
  const away = h.x - att[bi].x;
  moveTo(h, clamp(h.x + (away >= 0 ? 4 : -4), -28, 28), Math.min(54, h.z + 8), G.defSpeed * 0.82, dt);
  ball.x = h.x + Math.sin(h.face) * 0.5; ball.z = h.z + Math.cos(h.face) * 0.5; ball.y = 0.24;
  if (run.rt > run.maxT) { run.state = "end"; finishAttack("stolen"); }
}
function tryTackle(manual) {
  const a = att[run.chaser], d = run.chaseDist;
  if (d > (manual ? 2.6 : 1.5) || a.stun > 0) return false;
  a.kickT = 0.3;
  const chance = clamp(0.95 - (d - 0.6) * 0.38 - G.level * 0.03, 0.2, 0.92) * (manual ? 1 : 0.6);
  if (Math.random() < chance) {
    sfx.save(); pop("WON IT BACK!", "", "gold");
    G.carrier = run.chaser; a.face = Math.PI;
    run = null; planStart(); return true;
  }
  a.stun = manual ? 0.9 : 0.6; sfx.lost(); if (manual) setHint("Missed! Catch up and try again.");
  return false;
}
function tackle() {
  if (!run || run.state !== "recover" || run.tackleCd > 0) return;
  run.tackleCd = 0.7;
  if (run.chaseDist > 2.6) { setHint("Too far! Chase him first, then tackle."); return; }
  tryTackle(true);
}

// After a goal: the scorer runs towards the camera, then slides on his knees; the team runs to join him.
function celebrate(dt) {
  run.ct = (run.ct || 0) + dt;
  const sc = att[run.scorer === undefined ? G.carrier : run.scorer];
  if (!run.cs) run.cs = { side: sc.x >= 0 ? 1 : -1, z0: sc.z, x0: sc.x };
  if (run.ct < 1.0) moveTo(sc, clamp(run.cs.x0 + run.cs.side * 9, -28, 28), Math.min(run.cs.z0 + 12, 40), 8.5, dt);
  else if (run.ct < 1.9) {
    if (!sc.slideT) sc.slideT = 0.9;
    const u = Math.max(0, 1 - (run.ct - 1.0) / 0.9); sc.x += Math.sin(sc.face) * 6 * u * dt; sc.z += Math.cos(sc.face) * 6 * u * dt; sc.speed = 0;
  } else sc.speed = 0;
  att.forEach((a, i) => {
    if (a === sc) return;
    const ang = i * 1.25, d = run.ct < 1.0 ? 2.4 : 1.7;
    moveTo(a, sc.x + Math.cos(ang) * d, sc.z + 1.2 + Math.sin(ang) * d * 0.7, 7.5, dt);
  });
  for (let i = 0; i < G.nDef; i++) defs[i].speed = 0;
}

function stepRun(dt) {
  run.t += dt;
  const c = att[G.carrier];
  // ---- the ball ----
  if (run.state === "fly") {
    let v = run.v;
    if (run.kind === "pass" && !run.lob) { v = run.v * (1.12 - 0.5 * run.s / run.L); const left = run.L - run.s; if (left < 4) v = Math.max(5, v * (left / 4)); }
    run.s = Math.min(run.L, run.s + v * dt);
    const p = pointAt(run.s); ball.x = p.x; ball.z = p.z;
    ball.y = run.kind === "shot" ? 0.24 + run.hG * Math.pow(run.s / run.L, 1.4) : run.lob ? 0.24 + run.apex * 4 * (run.s / run.L) * (1 - run.s / run.L) : 0.24;
    // a shot: slow motion for the last stretch
    G.timeScale = run.special && run.s < 5 ? 0.3 : run.kind === "shot" && run.L - run.s < 9 && run.outcome !== "wide" ? 0.38 : 1;
    // defenders can cut it out
    for (let i = 0; i < G.nDef; i++) {
      const d = defs[i];
      if (hyp(d.x - ball.x, d.z - ball.z) < 1.0 * (1 - 0.3 * run.pw) && ball.y < 1.9 && run.s > 1.5) {
        if (run.kind === "shot") { sfx.save(); startLoose("BLOCKED!", "Get the rebound!", rand(-4, 4), rand(3, 7), 2); return; }
        startRecover(d); return;
      }
    }
    // a lob: whoever gets their head to it. Defenders clear it, attackers can head or volley it at goal.
    if (run.lob && run.s > run.L * 0.45 && ball.y > 0.6 && ball.y < 3.6) {
      if (ball.y > 1.1) for (let i = 0; i < G.nDef; i++) if (hyp(defs[i].x - ball.x, defs[i].z - ball.z) < 1.6) { startRecover(defs[i], "HEADED AWAY!"); return; }
      for (const a of att) {
        if (a === c || hyp(a.x - ball.x, a.z - ball.z) > (a === att[0] ? 3.2 : 2.0)) continue;   // George gets first go at a cross
        const aer = aerialFor(a, ball.y);
        if (aer) { receiveBall(a, aer); return; }
      }
    }
    // a team-mate can also reach the ball on its way (not the one who kicked it, and not straight away)
    if (run.kind === "pass" && run.s > 1.2) for (const a of att) {
      if (a === c) continue;
      if (hyp(a.x - ball.x, a.z - ball.z) < 1.0 && ball.y < 1.9) { receiveBall(a); return; }
    }
    if (run.s >= run.L - 1e-6) {
      if (run.kind === "shot") { run.state = "goalmouth"; run.gt = 0; }
      else run.state = "arrive";
    }
  } else if (run.state === "arrive") {
    // The ball has stopped near the end of the line. Whoever gets there first wins it.
    run.wait += dt;
    const end = run.pts[run.pts.length - 1]; ball.x = end.x; ball.z = end.z; ball.y = 0.24;
    let winner = null, wd = 1.0;
    for (const a of att) { if (a === c) continue; const d = hyp(a.x - end.x, a.z - end.z); if (d < wd) { wd = d; winner = a; } }
    for (let i = 0; i < G.nDef; i++) { const d = hyp(defs[i].x - end.x, defs[i].z - end.z); if (d < wd) { wd = d; winner = defs[i]; } }
    if (winner) {
      if (winner.isDef) { startRecover(winner); return; }
      receiveBall(winner); return;
    }
    if (run.wait > 3.2) { const nd = defs.slice(0, G.nDef).sort((u, v) => hyp(u.x - ball.x, u.z - ball.z) - hyp(v.x - ball.x, v.z - ball.z))[0]; startRecover(nd); return; }
  } else if (run.state === "settle") {
    run.st += dt;
    const nc = att[G.carrier]; ball.x = nc.x + Math.sin(nc.face) * 0.5; ball.z = nc.z + Math.cos(nc.face) * 0.5; ball.y = 0.24;
    if (run.st > 0.8) { run = null; planStart(); return; }
  } else if (run.state === "recover") {
    stepRecover(dt);
  } else if (run.state === "goalmouth") {
    run.gt += dt;
    const o = run.outcome;
    if (o === "goal") {
      const p = run.pts[run.pts.length - 1], q = run.pts[Math.max(0, run.pts.length - 4)];
      const dx = p.x - q.x, dz = p.z - q.z, l = hyp(dx, dz) || 1;
      const k = Math.min(1, run.gt / 0.25);
      ball.x = p.x + dx / l * 2 * k; ball.z = p.z + dz / l * 2.1 * k; ball.y = Math.max(0.24, ball.y * (1 - 0.6 * k));
      if (!run.done) { run.done = true; finishAttack("goal"); }
      if (!run.netDone && run.gt > 0.18) { run.netDone = true; netHit(ball.x, ball.y, run.power ? 1.5 : 0.8 + 0.7 * run.pw); }
    } else if (o === "catch") {
      if (!run.done) { run.done = true; run.state = "end"; finishAttack("save"); sfx.save(); }
    } else if (o === "parry") {
      sfx.save(); startLoose("SAVED... IT'S LOOSE!", "Follow it up!", rand(-5, 5) + keeper.diveDir * 3, rand(5, 9), 3);
    } else if (o === "post" || o === "bar") {
      sfx.post();
      startLoose(o === "post" ? "OFF THE POST!" : "OFF THE BAR!", "It's bouncing back!", (run.xc > 0 ? -1 : 1) * rand(1, 4), rand(6, 10), o === "bar" ? 3 : 1);
    } else {
      ball.z -= 12 * dt; if (!run.done) { run.done = true; run.state = "end"; finishAttack("wide"); sfx.lost(); }
    }
  } else if (run.state === "loose") {
    stepLoose(dt);
  } else if (run.state === "end") {
    if (run.bvx !== undefined) { ball.x += run.bvx * dt; ball.z += run.bvz * dt; run.bvx *= 0.97; run.bvz *= 0.97; }
  }

  if (!run) return;
  if (ending && ending.kind === "goal") { celebrate(dt); return; }
  // ---- everyone else moves ----
  // team-mates run forward; the receiver runs to the ball
  att.forEach((a, i) => {
    if (a.stun > 0) { a.stun -= dt; a.speed = 0; return; }
    if (run.state === "recover") { moveTo(a, run.holder.x, run.holder.z, i === run.chaser ? 8.2 : 6.6, dt); return; }
    if (run.state === "loose") { if (run.nearAtt && run.nearAtt.includes(i)) moveTo(a, ball.x, ball.z, 8.2, dt); else attackMove(a, i, dt); return; }
    if (i === G.carrier) {
      // after a pass the passer keeps running forward; after a shot he stands and watches
      if (run.kind === "pass" && run.state !== "end") attackMove(a, i, dt); else a.speed = 0;
      return;
    }
    if (run.recv === i && (run.state === "fly" || run.state === "arrive")) {
      // go and get the ball: meet it on its way if he can, otherwise run to where it will stop
      const t = run.state === "arrive" ? ball : run.lob ? run.pts[run.pts.length - 1] : interceptPoint(a, 8);
      moveTo(a, t.x, t.z, 8, dt); return;
    }
    attackMove(a, i, dt);
  });
  // defenders: try to cut the ball out, otherwise mark an attacker (standing goal-side of him)
  if (!run.marks) assignMarks();
  for (let i = 0; i < G.nDef; i++) {
    const d = defs[i], sp = G.defSpeed * (1 + (i % 3) * 0.04);
    if (run.state === "fly" && run.s < run.L) {
      let tx = null, tz = null, spd = sp;
      for (let k = Math.floor(run.s / 0.5) + 1; k < run.pts.length; k += 3) {
        const tb = (run.cum[k] - run.s) / (run.v * 0.8), dd = hyp(d.x - run.pts[k].x, d.z - run.pts[k].z);
        if (dd <= sp * tb + 0.9) { tx = run.pts[k].x; tz = run.pts[k].z; break; }
      }
      if (tx === null) { const m = markTarget(i); tx = m.x; tz = m.z; spd = sp * 0.92; }
      moveTo(d, tx, tz, spd, dt);
    } else if (run.state === "arrive") {
      if (!run.press) run.press = defs.slice(0, G.nDef).map((e, k) => [hyp(e.x - ball.x, e.z - ball.z), k]).sort((u, v) => u[0] - v[0]).slice(0, 2).map((u) => u[1]);
      if (run.press.includes(i)) moveTo(d, ball.x, ball.z, sp, dt);
      else { const m = markTarget(i); moveTo(d, m.x, m.z, sp * 0.92, dt); }
    } else if (run.state === "goalmouth" || run.state === "settle") { const m = markTarget(i); moveTo(d, m.x, m.z, sp * 0.85, dt); }
    else if (run.state === "recover") { if (d !== run.holder) { const m = markTarget(i); moveTo(d, m.x, m.z, sp * 0.9, dt); } }
    else if (run.state === "loose") { if (run.nearDef && run.nearDef.includes(i)) moveTo(d, ball.x, ball.z, sp * 1.05, dt); else { const m = markTarget(i); moveTo(d, m.x, m.z, sp * 0.9, dt); } }
    else d.speed = 0;
  }
  // keep players from standing inside each other
  for (let i = 0; i < G.nDef; i++) for (let j = i + 1; j < G.nDef; j++) {
    const dx = defs[j].x - defs[i].x, dz = defs[j].z - defs[i].z, dd = hyp(dx, dz);
    if (dd < 3 && dd > 0.001) { const k = (3 - dd) / 2 / dd * 0.5; defs[i].x -= dx * k; defs[i].z -= dz * k; defs[j].x += dx * k; defs[j].z += dz * k; }
  }
  // the keeper
  if (run.kind === "shot" && run.kFinal !== undefined && (run.state === "fly" || run.state === "goalmouth")) {
    const t = run.s / run.v, u = clamp((t - run.react) / Math.max(0.05, run.tGoal - run.react), 0, 1), e = 1 - Math.pow(1 - u, 2);
    keeper.x = run.kStart + (run.kFinal - run.kStart) * e;
    keeper.dive = e * (keeper.diveDir ? 1 : 0.25);
    keeper.jump = e * (run.high ? 1 : 0.4);
  } else if (run.state === "loose") {
    keeper.jump = 0;
    if (ball.z < 9) moveTo(keeper, clamp(ball.x, -6, 6), clamp(ball.z, 0.9, 6), 4.8, dt);
    else moveTo(keeper, clamp(ball.x * 0.12, -2.4, 2.4), 1.1, 2.5, dt);
  } else if (run.kind !== "shot") {
    keeper.x += clamp(clamp(ball.x * 0.12, -2.4, 2.4) - keeper.x, -1.5 * dt, 1.5 * dt);
  }
}

function timeScaleReset() { G.timeScale = 1; }
let ending = null, cheer = 0;
function finishAttack(kind) {
  ending = { kind, t: 0 };
  setHint("");
  const dist = run && run.dist0;
  if (kind === "goal") {
    G.goals++; sfx.goal();
    const far = dist > 30, ch = G.chain, tb = run.topBins;
    const ae = run.aerial ? run.aerial.type : null, sp = run.special ? 2 : 1;
    const pts = 10 + (far ? 10 : 0) + (tb ? 15 : 0) + (ae === "bicycle" ? 25 * sp : ae === "volley" ? 15 * sp : ae === "header" ? 10 * sp : 0) + Math.max(0, ch - 1) * 3;
    G.score += pts;
    for (const a of att) a.cele = 1.8;
    run.scorer = G.carrier; cheer = 1;
    const why = [ae === "bicycle" ? "bicycle kick +25" : ae === "volley" ? "volley +15" : ae === "header" ? "header +10" : "", tb ? "top corner +15" : "", far ? "long range +10" : "", ch > 1 ? ch - 1 + " passes +" + (ch - 1) * 3 : ""].filter(Boolean).join(" · ");
    pop(run.special && ae ? "SPECTACULAR!" : ae === "bicycle" ? "WHAT A BICYCLE KICK!" : ae === "volley" ? "WHAT A VOLLEY!" : ae === "header" ? "GREAT HEADER!" : tb ? "TOP BINS!" : far ? "IMPOSSIBLE!" : "GOAL!", "+" + pts + (why ? " · " + why : ""), "gold");
  } else {
    G.lives--;
    const t = { save: ["SAVED!", "The keeper got there"], post: ["OFF THE POST!", "So close"], wide: ["WIDE!", "Just missed"], blocked: ["BLOCKED!", "A defender got in the way"], stolen: ["LOST IT!", "A defender won the ball"] }[kind];
    pop(t[0], t[1], "soft");
  }
  setHud();
}

function afterResult() {
  ending = null;
  if (G.lives <= 0) { gameOver(); return; }
  if (G.phase === "run" && run && run.outcome === "goal") G.level++;
  setHud();
  newAttack();
}

/* ---------------- placing the 3D things each frame ---------------- */
let clock = 0;
function animateLimbs(e, dt) {
  const p = e.p, sp = e.speed, an = Math.max(sp, 1.4);
  p.phase += an * dt * 1.9;
  const amp = Math.min(1, an / 4.5), sw = Math.sin(p.phase) * amp * 1.2;
  p.legL.rotation.x = sw; p.legR.rotation.x = -sw;
  p.armL.rotation.x = -sw * 1.1; p.armR.rotation.x = sw * 1.1;
  p.body.position.y = Math.abs(Math.sin(p.phase)) * 0.1 * amp;
  p.body.rotation.x = Math.min(0.28, sp * 0.045);
  p.body.rotation.z = Math.sin(p.phase) * 0.05 * amp;
  if (e.kickT > 0) { e.kickT -= dt; p.legR.rotation.x = -1.2 * Math.min(1, e.kickT / 0.12); }
  if (e.aer > 0) {
    e.aer -= dt; const u = 1 - e.aer / 0.62;
    if (e.aerType === "volley") { p.body.position.y = Math.sin(u * Math.PI) * 0.3; p.body.rotation.x = -0.3 * Math.sin(u * Math.PI); p.legR.rotation.x = -1.9 * Math.sin(Math.min(1, u * 1.6) * Math.PI); p.legL.rotation.x = 0.3; p.armL.rotation.x = 0.8; p.armR.rotation.x = -0.9; }
    else if (e.aerType === "bicycle") { p.body.position.y = 0.35 + Math.sin(u * Math.PI) * 1.0; p.body.rotation.x = -u * Math.PI * 1.15; p.legR.rotation.x = -2.2 * Math.sin(u * Math.PI); p.legL.rotation.x = 0.8; p.armL.rotation.x = p.armR.rotation.x = -1.2; }
    else { p.body.position.y = Math.sin(u * Math.PI) * 0.8; p.body.rotation.x = 0.45 * Math.sin(u * Math.PI); p.armL.rotation.x = p.armR.rotation.x = -2.2; p.legL.rotation.x = 0.5; p.legR.rotation.x = -0.4; }
  }
  if (e.slideT > 0) { e.slideT -= dt; p.body.position.y = -0.5; p.body.rotation.x = -0.45; p.armL.rotation.z = 1.4; p.armR.rotation.z = -1.4; p.armL.rotation.x = p.armR.rotation.x = -0.3; p.legL.rotation.x = p.legR.rotation.x = 0.5; }
  else if (e.cele > 0) { e.cele -= dt; p.armL.rotation.x = p.armR.rotation.x = -Math.PI * 0.92; p.armL.rotation.z = 0.35; p.armR.rotation.z = -0.35; p.body.position.y = Math.abs(Math.sin(clock * 11)) * 0.35; }
  else { p.armL.rotation.z = 0; p.armR.rotation.z = 0; }
}
function syncMeshes(dt) {
  for (const e of att) { e.p.root.position.set(e.x, 0, e.z); e.p.root.rotation.y = e.face; animateLimbs(e, dt); }
  for (let i = 0; i < defs.length; i++) { const d = defs[i]; if (!d.p.root.visible) continue; d.p.root.position.set(d.x, 0, d.z); d.p.root.rotation.y = d.face; animateLimbs(d, dt); }
  keeper.p.root.position.set(keeper.x, 0, keeper.z === 0 ? 1.1 : keeper.z);
  keeper.p.root.rotation.y = 0;
  const dv = keeper.dive || 0;
  keeper.p.body.rotation.z = -keeper.diveDir * dv * 1.25;
  keeper.p.body.position.y = dv * 0.35 + (keeper.jump || 0) * 0.5;
  keeper.p.armL.rotation.x = keeper.p.armR.rotation.x = -Math.PI * 0.85 * dv;
  ball.mesh.position.set(ball.x, ball.y, ball.z);
  ballBlob.position.set(ball.x, 0.04, ball.z); ballBlob.scale.setScalar(1 + ball.y * 0.4);
  if (run && run.state === "fly") ball.mesh.rotation.x -= 0.5; else if (run && run.state === "goalmouth") ball.mesh.rotation.x -= 0.2;
  if (bin.visible) { const sc = 1 + Math.sin(clock * 6) * 0.12; bin.scale.set(sc, sc, sc); }
  georgeTag.position.set(att[0].x, 3.1, att[0].z);
  const planning = G.phase === "plan", rec = G.phase === "run" && run && run.state === "recover";
  att.forEach((a, i) => {
    const show = planning || (rec && i === run.chaser) || i === 0;
    a.ring.visible = show;
    if (show) { a.ring.position.x = a.x; a.ring.position.z = a.z; const sc = 1 + Math.sin(clock * 5) * 0.08; a.ring.scale.set(sc, sc, sc); a.ring.material.color.set(rec && i === run.chaser ? (run.chaseDist <= 2.6 ? 0x3ddc7c : 0xffd23f) : i === G.carrier && planning ? 0xff4d5e : i === 0 ? 0x4dd2ff : 0xffd23f); }
  });
  tackRing.visible = !!rec;
  if (rec) { tackRing.position.x = run.holder.x; tackRing.position.z = run.holder.z; const sc = 1 + Math.sin(clock * 9) * 0.12; tackRing.scale.set(sc, sc, sc); }
}

/* ---------------- camera ---------------- */
function snapCamera() { camStep(1, true); }
function camStep(dt, snap) {
  const c = att[G.carrier];
  let fx, fz, lookZ, height, back, lookK = 0.6;
  if (G.phase === "plan" || !run) { fx = c.x * 0.85; fz = c.z + 13; lookZ = c.z - 10; height = 10.5; }
  else if (ending && ending.kind === "goal" && run.scorer !== undefined) { const sc = att[run.scorer]; fx = sc.x; fz = sc.z + 8; lookZ = sc.z - 1; height = 4.8; lookK = 1; }
  else if (run.kind === "shot") { fx = ball.x * 0.5; fz = Math.max(ball.z + 12, 11); lookZ = Math.max(ball.z - 12, -2); height = 8.5; }
  else { fx = ball.x * 0.6; fz = ball.z + 13; lookZ = ball.z - 10; height = 10.5; }
  const k = snap ? 1 : 1 - Math.exp(-3.2 * dt);
  cam.x = lerp(cam.x, fx, k); cam.z = lerp(cam.z, fz, k);
  const lx = lerp(cam.lx, fx * lookK, snap ? 1 : k), lz = lerp(cam.lz, lookZ, snap ? 1 : k);
  cam.lx = lx; cam.lz = lz;
  const ox = cam.x - lx, oz = cam.z - lz, cy = Math.cos(view.yaw), sy = Math.sin(view.yaw);
  camera.position.set(lx + (ox * cy + oz * sy) * view.zoom, Math.max(2, height * Math.pow(view.zoom, 0.85)), lz + (-ox * sy + oz * cy) * view.zoom);
  camera.lookAt(lx, 0.6, lz);
  if (run && run.special && run.kind === "shot" && run.state === "fly" && run.s < 5) { const sc = att[G.carrier]; camera.position.set(sc.x + 4.2, 2.3, sc.z + 4.2); camera.lookAt(sc.x, 1.5, sc.z - 1.5); }
}

/* ---------------- quick buttons (an easier way to play, and for keyboards) ---------------- */
function buildQuick() { $("quick").innerHTML = ""; }
att.forEach((a, i) => { a.p.number = [10, 7, 9, 11, 8, 6][i]; });
function straight(from, tx, tz) {
  const pts = [], n = Math.max(2, Math.round(hyp(tx - from.x, tz - from.z) / 0.5));
  for (let i = 0; i <= n; i++) pts.push({ x: lerp(from.x, tx, i / n), z: lerp(from.z, tz, i / n) });
  return pts;
}

/* ---------------- main loop ---------------- */
let last = 0, raf = 0;
function frame(now) {
  raf = requestAnimationFrame(frame);
  const real = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; clock += real;
  if (G.phase === "run" && run) {
    const dt = real * G.timeScale; let acc = dt;
    while (acc > 0 && G.phase === "run" && run) { const h = Math.min(acc, 1 / 60); stepRun(h); acc -= h; }
    if (ending) { ending.t += real; if (ending.t > (ending.kind === "goal" ? 3.4 : 1.5)) { afterResult(); } }
  } else if (G.phase === "plan") {
    for (const e of [...att, ...defs]) { e.speed = 0; }
    keeper.x += clamp(clamp(ball.x * 0.12, -2.4, 2.4) - keeper.x, -2 * real, 2 * real);
  }
  if (drawing && drawPts.length > 2 && performance.now() - lastMove > 180) {
    const old = holdPower; holdPower = Math.min(1, holdPower + real / 1.1);
    if (holdPower !== old) updatePreview();
  } else if (!drawing) $("holdbar").hidden = true;
  view.yawT = clamp(view.yawT + (camHold.l - camHold.r) * real * 1.4, -1.6, 1.6);
  view.zoomT = clamp(view.zoomT + (camHold.o - camHold.i) * real * 0.9, 0.6, 2.4);
  const vk = 1 - Math.exp(-8 * real); view.yaw = lerp(view.yaw, view.yawT, vk); view.zoom = lerp(view.zoom, view.zoomT, vk);
  if (G.phase !== "menu") { syncMeshes(real); camStep(real); }
  cheer = Math.max(0, cheer - real * 0.35);
  crowdTex.offset.y = Math.sin(clock * 2) * 0.004 + Math.sin(clock * 16) * 0.014 * cheer;
  netUpdate(real); fireUpdate(real);
  renderer.render(scene, camera);
}

/* ---------------- screens ---------------- */
function bestGet() { try { return +localStorage.getItem(BEST_KEY) || 0; } catch (e) { return 0; } }
function bestSet(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) {} }
function showBest() { const b = bestGet(); $("best-line").innerHTML = b ? "Your best: <b>" + b + " points</b>" : ""; }
function start() {
  audio();
  G.level = 0; G.lives = MAX_LIVES; G.goals = 0; G.score = 0; lastLevelShown = 0;
  $("screen-start").hidden = true; $("screen-end").hidden = true; $("screen-game").hidden = false;
  resize(); setHud(); newAttack();
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  stage.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
}
function gameOver() {
  G.phase = "over"; run = null; ending = null; cone.visible = false; bin.visible = false;
  const goals = G.goals, score = G.score, best = bestGet(), isBest = score > best;
  if (isBest) bestSet(score);
  let coins = 0;
  if (goals > 0 && window.GZR && GZR.ready) { coins = Math.round(score / 4) + 4; try { GZR.earn({ coins, xp: goals * 6 }); } catch (e) {} }
  $("end-title").textContent = goals === 0 ? "Full time" : goals >= 5 ? "Superstar!" : "Nice one!";
  $("end-text").textContent = goals === 0 ? "No goals this time. Try curving the line round the defenders and aiming for the corners." : "You scored " + goals + (goals === 1 ? " goal" : " goals") + " and " + score + " points." + (isBest && score > 10 ? " That is a new best!" : "");
  $("end-stats").innerHTML = `<div><b>${score}</b><span>Points</span></div><div><b>${goals}</b><span>Goals</span></div><div><b>${Math.max(score, best)}</b><span>Best points</span></div>` + (coins ? `<div><b>+${coins}</b><span>Coins</span></div>` : "");
  $("screen-game").hidden = true; $("screen-end").hidden = false; showBest();
}
$("btn-start").addEventListener("click", start);
$("btn-again").addEventListener("click", start);
showBest();

// handy for testing
window.__ls = { nets, G, att, defs, keeper, ball, get run() { return run; }, release, startRun, camera, THREE };
