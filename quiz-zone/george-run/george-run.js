/* ================================================================
   GEORGE'S RUN (3D endless runner)
   George runs down a road that never ends and gets faster and faster.
   Swipe or use the arrow keys: left/right = change lane, up = jump, down = slide.
   Pick up coins. Toys give power-ups. A football gets kicked ahead and
   collects every coin in front of George.
   He wears the shirt, hair and boots chosen in My Player, and the shirts
   he wins here can be worn in the other games too.
   Everything is made in the browser: the models, the music and the sounds.
   The player moves on the spot (z = 0) and the world comes towards him (+z).
   ================================================================ */
import * as THREE from "../line-striker/three.module.min.js";

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

const LANES = [-2.6, 0, 2.6];
const TOP_KEY = "gz_run_top3_v1", RUN_KEY = "gz_run_v1";
const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

/* ---------------- renderer, scene, camera ---------------- */
const stage = $("stage"), canvas = $("gl");
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
catch (e) { $("start-lede").textContent = "Sorry, this game needs 3D graphics (WebGL) and your browser could not start it."; $("btn-start").disabled = true; throw e; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
const scene = new THREE.Scene();
const SKY = 0x7db4ee;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 45, 170);
const camera = new THREE.PerspectiveCamera(62, 1, 0.3, 300);
scene.add(new THREE.HemisphereLight(0xffffff, 0x4a9a3a, 2.4));
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(10, 30, 10); scene.add(sun);
function resize() {
  const w = stage.clientWidth || 360, h = stage.clientHeight || 600;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 72 : 60; camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);

/* ---------------- textures ---------------- */
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const roadTex = canvasTex(128, 256, (g, w, h) => {
  g.fillStyle = "#26262c"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#ffffff"; g.fillRect(2, 0, 4, h); g.fillRect(w - 6, 0, 4, h);                  // edge lines
  g.fillStyle = "#c9ccd2"; for (const x of [w / 3, (2 * w) / 3]) { g.fillRect(x - 2, 24, 4, 70); g.fillRect(x - 2, 152, 4, 70); }  // lane dashes
}, [1, 40]);
const stripeTex = canvasTex(64, 32, (g, w, h) => { g.fillStyle = "#f2c230"; g.fillRect(0, 0, w, h); g.fillStyle = "#222"; for (let i = -2; i < 8; i++) { g.beginPath(); g.moveTo(i * 16, h); g.lineTo(i * 16 + 8, h); g.lineTo(i * 16 + 24, 0); g.lineTo(i * 16 + 16, 0); g.fill(); } });

/* ---------------- the world ---------------- */
const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 700), new THREE.MeshLambertMaterial({ color: 0x2f9a35 }));
ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, -200); scene.add(ground);
const road = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 700), new THREE.MeshLambertMaterial({ map: roadTex }));
road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -200); scene.add(road);
roadTex.repeat.set(1, 700 / 8);

function mountain(x, z, s) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(s * 0.6, s, 6), new THREE.MeshLambertMaterial({ color: 0xcfe6fb, flatShading: true }));
  m.position.set(x, s / 2 - 1, z); m.rotation.y = rand(0, 6); scene.add(m);
}
for (let i = 0; i < 9; i++) mountain(-120 + i * 30 + rand(-6, 6), -250 + rand(-20, 10), rand(28, 60));

const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3820 }), leafMats = [0x1f7a2a, 0x2a8f33, 0x3a9d3b].map((c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
const trees = [];
for (let i = 0; i < 44; i++) {
  const g = new THREE.Group(), h = rand(2.4, 4.2);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, h, 6), trunkMat); tr.position.y = h / 2; g.add(tr);
  const lm = pick(leafMats), c1 = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.6, 7), lm); c1.position.y = h + 0.6; g.add(c1);
  const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2, 7), lm); c2.position.y = h + 1.8; g.add(c2);
  g.userData = { side: i % 2 ? 1 : -1 };
  g.position.set(g.userData.side * rand(6.5, 22), 0, -rand(0, 230)); g.scale.setScalar(rand(0.8, 1.5)); scene.add(g); trees.push(g);
}
const blobCols = [0xf2c230, 0xd96ad8, 0x4aa8ff, 0xff7a3a];
const dots = [];
for (let i = 0; i < 70; i++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(rand(0.15, 0.3), 6, 5), new THREE.MeshLambertMaterial({ color: pick(blobCols) }));
  m.position.set((i % 2 ? 1 : -1) * rand(5.5, 26), 0.15, -rand(0, 230)); scene.add(m); dots.push(m);
}

/* ---------------- George ---------------- */
function makeGeorge() {
  const mats = [];
  const M = (c) => { const m = new THREE.MeshLambertMaterial({ color: c }); mats.push(m); return m; };
  const cyl = (rt, rb, h, c, x, y, z, seg) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10), M(c)); m.position.set(x, y, z); return m; };
  const sph = (r, c, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), M(c)); m.position.set(x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1); return m; };
  const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); return m; };
  const hex = (s, d) => { try { return parseInt(String(s).replace("#", ""), 16); } catch (e) { return d; } };
  let kit = { shirt: "#d7102b", shorts: "#f4f1ee", socks: "#d7102b", sockTop: "#ffffff", trim: "#ffffff", text: "#ffffff" }, hairC = "#a57d52", style = "fringe", boots = "#15121a", num = 10;
  try { if (window.GL && window.GK) { kit = GK.KITS[GL.pick("kit", "home")] || GK.KITS.home || kit; hairC = GL.hairColour().base; style = GL.get().hair; boots = GL.bootsColour(GL.pick("boots", "black")); num = GL.number(); } } catch (e) {}
  const o = { shirt: hex(kit.shirt, 0xd7102b), shorts: hex(kit.shorts, 0xf4f1ee), socks: hex(kit.socks, 0xd7102b), band: hex(kit.sockTop || kit.trim, 0xffffff), collar: hex(kit.trim, 0xffffff), skin: 0xf3c9a4, hair: hex(hairC, 0xa57d52), boots: hex(boots, 0x151515) };
  const g = new THREE.Group();
  const leg = (sx) => {
    const hip = new THREE.Group(); hip.position.set(sx * 0.1, 0.96, 0);
    hip.add(cyl(0.088, 0.072, 0.46, o.skin, 0, -0.23, 0), cyl(0.118, 0.126, 0.27, o.shorts, 0, -0.12, 0));
    const knee = new THREE.Group(); knee.position.set(0, -0.46, 0);
    knee.add(sph(0.068, o.skin, 0, 0, 0), cyl(0.064, 0.05, 0.42, o.socks, 0, -0.21, 0), cyl(0.067, 0.067, 0.04, o.band, 0, -0.1, 0));
    const foot = new THREE.Group(); foot.position.set(0, -0.43, 0); foot.add(box(0.1, 0.07, 0.26, o.boots, 0, -0.03, 0.06), sph(0.05, o.socks, 0, 0.01, -0.01));
    knee.add(foot); hip.add(knee); g.add(hip); return { hip, knee };
  };
  const arm = (sx) => {
    const sh = new THREE.Group(); sh.position.set(sx * 0.235, 1.66, 0);
    sh.add(sph(0.065, o.shirt, 0, 0, 0), cyl(0.058, 0.05, 0.22, o.shirt, 0, -0.11, 0), cyl(0.048, 0.043, 0.1, o.skin, 0, -0.25, 0));
    const elbow = new THREE.Group(); elbow.position.set(0, -0.3, 0);
    elbow.add(sph(0.044, o.skin, 0, 0, 0), cyl(0.043, 0.036, 0.27, o.skin, 0, -0.14, 0), sph(0.045, o.skin, 0, -0.3, 0));
    sh.add(elbow); g.add(sh); return { sh, elbow };
  };
  const lL = leg(-1), lR = leg(1), aL = arm(-1), aR = arm(1);
  const chest = cyl(0.205, 0.155, 0.58, o.shirt, 0, 1.4, 0, 14); chest.scale.z = 0.62; g.add(chest);
  const waist = cyl(0.165, 0.175, 0.22, o.shorts, 0, 1.06, 0, 14); waist.scale.z = 0.7; g.add(waist);
  g.add(cyl(0.075, 0.085, 0.035, o.collar, 0, 1.7, 0));
  const head = new THREE.Group(); head.position.set(0, 1.72, 0);
  head.add(cyl(0.055, 0.06, 0.1, o.skin, 0, 0.04, 0), sph(0.115, o.skin, 0, 0.19, 0, 0.95, 1.18, 1.05), sph(0.025, o.skin, -0.113, 0.19, 0), sph(0.025, o.skin, 0.113, 0.19, 0));
  head.add(sph(0.013, 0x2a1d12, -0.04, 0.21, 0.108), sph(0.013, 0x2a1d12, 0.04, 0.21, 0.108));
  if (style === "crop" || style === "slick") head.add(sph(0.12, o.hair, 0, 0.25, -0.01, 1, 0.62, 1.08));
  else if (style === "curly") head.add(sph(0.155, o.hair, 0, 0.27, -0.01, 1, 0.9, 1));
  else if (style === "long") { head.add(sph(0.127, o.hair, 0, 0.26, -0.01, 1, 0.72, 1.1)); head.add(sph(0.11, o.hair, 0, 0.1, -0.075, 1, 1.5, 0.55)); }
  else if (style === "mohawk") head.add(sph(0.05, o.hair, 0, 0.32, -0.01, 0.5, 1.1, 1.8));
  else head.add(sph(0.127, o.hair, 0, 0.26, -0.01, 1, 0.74, 1.1));
  if (style === "fringe") head.add(sph(0.1, o.hair, 0, 0.3, 0.07, 1.05, 0.38, 0.5));
  g.add(head);
  const nt = canvasTex(64, 64, (c) => { c.fillStyle = kit.text || "#fff"; c.font = "700 52px Rajdhani, Arial Black, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(num), 32, 34); });
  const nm = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: nt, transparent: true })); nm.position.set(0, 1.42, -0.1); nm.rotation.y = Math.PI; g.add(nm);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 4, 32, 32, 30); gr.addColorStop(0, "rgba(0,0,0,.5)"); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03;
  const root = new THREE.Group(); root.add(g, blob); root.rotation.y = Math.PI;   // he runs away from the camera (towards -z)
  return { root, body: g, head, legL: lL.hip, legR: lR.hip, kneeL: lL.knee, kneeR: lR.knee, armL: aL.sh, armR: aR.sh, elbowL: aL.elbow, elbowR: aR.elbow, mats, blob };
}
let george = makeGeorge(); scene.add(george.root);

/* ---------------- sound and music ---------------- */
let ac = null;
const MKEY = "gz_music", MVOL = { loud: 1, quiet: 0.35, off: 0 };
const musicLevel = () => { try { const v = localStorage.getItem(MKEY); return MVOL[v] != null ? v : "loud"; } catch (e) { return "loud"; } };
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = false; } } return ac; }
function tone(f, d, type, vol, slide, delay) {
  const a = audio(); if (!a) return;
  const t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
  o.type = type || "sine"; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + d);
  g.gain.setValueAtTime(vol || 0.1, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + d + 0.02);
}
function noise(d, vol, lp) {
  const a = audio(); if (!a) return;
  const n = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, n, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = buf; f.type = "lowpass"; f.frequency.value = lp || 1500; g.gain.value = vol || 0.2; s.connect(f).connect(g).connect(a.destination); s.start();
}
let sfxOn = true;
const sfx = {
  coin(streak) { if (sfxOn) tone(880 + Math.min(streak, 14) * 55, 0.1, "square", 0.05); },
  jump() { if (sfxOn) tone(300, 0.18, "sine", 0.1, 620); },
  slide() { if (sfxOn) noise(0.25, 0.1, 900); },
  hit() { if (sfxOn) { tone(120, 0.35, "sawtooth", 0.14, 50); noise(0.25, 0.2, 700); } },
  power() { if (sfxOn) [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, "triangle", 0.1, 0, i * 0.06)); },
  kick() { if (sfxOn) { tone(160, 0.14, "triangle", 0.25, 60); noise(0.08, 0.15, 900); } },
  life() { if (sfxOn) [659, 880, 1175].forEach((f, i) => tone(f, 0.16, "sine", 0.1, 0, i * 0.08)); },
  milestone() { if (sfxOn) [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, "triangle", 0.1, 0, i * 0.07)); },
  over() { if (sfxOn) [392, 330, 262].forEach((f, i) => tone(f, 0.3, "triangle", 0.12, 0, i * 0.18)); },
};
// the tune: a bouncy bass line, a bright tune on top and a drum beat. It gets quicker as George does.
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const BASS = [48, 48, 55, 55, 53, 53, 55, 55, 48, 48, 55, 55, 57, 57, 55, 55];
const LEAD = [72, 0, 76, 79, 0, 76, 74, 0, 72, 0, 76, 79, 81, 0, 79, 76, 77, 0, 81, 84, 0, 81, 79, 0, 76, 0, 79, 72, 74, 76, 74, 72];
let musicOn = false, step = 0, nextT = 0, musicTimer = 0, tempoBoost = 0;
function musicTick() {
  const a = audio(); if (!a || !musicOn) return;
  const vol = MVOL[musicLevel()]; if (!vol) { nextT = a.currentTime; return; }
  const sd = 60 / (128 + tempoBoost) / 4;
  while (nextT < a.currentTime + 0.15) {
    const t = nextT - a.currentTime, i = step % 32;
    if (i % 2 === 0) tone(NOTE(BASS[(i / 2) % 16]), sd * 1.6, "triangle", 0.11 * vol, 0, t);
    if (LEAD[i]) tone(NOTE(LEAD[i]), sd * 1.4, "square", 0.045 * vol, 0, t);
    if (i % 4 === 0) tone(110, 0.1, "sine", 0.18 * vol, 45, t);                 // kick
    if (i % 4 === 2) tone(9000, 0.03, "square", 0.015 * vol, 0, t);             // hat
    if (i % 8 === 4) noise(0.1, 0.07 * vol, 3500);                              // snare
    nextT += sd; step++;
  }
}
function startMusic() { const a = audio(); if (!a) return; if (a.state === "suspended") a.resume(); musicOn = true; nextT = a.currentTime + 0.05; step = 0; clearInterval(musicTimer); musicTimer = setInterval(musicTick, 40); }
function stopMusic() { musicOn = false; clearInterval(musicTimer); }
function cycleMusic() { const order = ["loud", "quiet", "off"], nx = order[(order.indexOf(musicLevel()) + 1) % 3]; try { localStorage.setItem(MKEY, nx); } catch (e) {} showMusic(); }
function showMusic() { const l = musicLevel(); $("btn-music").textContent = "🎵 Music: " + (l === "loud" ? "Loud" : l === "quiet" ? "Quiet" : "Off"); }

/* ---------------- game state ---------------- */
const G = { phase: "menu", speed: 0, dist: 0, coins: 0, score: 0, lives: 3, t: 0, streak: 0, streakT: 0, mult: 1, invuln: 0, shield: false, nextMile: 500, usedPower: 0, pw: {} };
let laneIdx = 1, px = 0, py = 0, vy = 0, sliding = 0, grounded = true, stumble = 0, kickT = 0, hugT = 0, waddleT = 0, celeT = 0, shake = 0;
const items = [];    // everything that comes towards George: { kind, mesh, z, x, ... }
let spawnFront = -20;
let ballFly = null;

/* ---------------- things in the world ---------------- */
const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 20); coinGeo.rotateX(Math.PI / 2);
const coinMat = new THREE.MeshLambertMaterial({ color: 0xf5c518, emissive: 0x6b4a00, emissiveIntensity: 0.6 });
const rimGeo = new THREE.TorusGeometry(0.4, 0.05, 6, 20), rimMat = new THREE.MeshLambertMaterial({ color: 0xffd84a, emissive: 0x806000, emissiveIntensity: 0.6 });
function coinMesh() { const g = new THREE.Group(); g.add(new THREE.Mesh(coinGeo, coinMat), new THREE.Mesh(rimGeo, rimMat)); return g; }
function add(kind, mesh, x, y, z, extra) { mesh.position.set(x, y, z); scene.add(mesh); const it = Object.assign({ kind, mesh, x, y, z, spin: kind === "coin" || kind === "power", gone: false }, extra || {}); items.push(it); return it; }
const coinAt = (lane, y, z) => add("coin", coinMesh(), LANES[lane], y, z, { baseY: y });

const stripeMat = new THREE.MeshLambertMaterial({ map: stripeTex });
function barrier(lane, z) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 0.5), new THREE.MeshLambertMaterial({ color: 0x2c2c33 })); b.position.y = 0.4; const s = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.2, 0.52), stripeMat); s.position.y = 0.55; g.add(b, s); add("obs", g, LANES[lane], 0, z, { type: "barrier" }); }
function wall(lane, z) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 0.9), new THREE.MeshLambertMaterial({ color: 0xb3282d })); b.position.y = 1.3; const s = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.25, 0.94), stripeMat); s.position.y = 2.45; g.add(b, s); add("obs", g, LANES[lane], 0, z, { type: "wall" }); }
function bar(lane, z) {
  const g = new THREE.Group(), pm = new THREE.MeshLambertMaterial({ color: 0x555a66 });
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.7, 0.2), pm); p.position.set(sx * 1.05, 0.85, 0); g.add(p); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.55, 0.3), stripeMat); top.position.y = 1.5; g.add(top);
  add("obs", g, LANES[lane], 0, z, { type: "bar" });
}

// toys and power-ups
const TOYS = {
  ball: { name: "Football", icon: "⚽", col: 0xffffff }, teddy: { name: "Teddy shield", icon: "🧸", col: 0xb9743a }, duck: { name: "Double coins", icon: "🦆", col: 0xffd23f },
  rocket: { name: "Rocket boost", icon: "🚀", col: 0xe5384a }, ghost: { name: "Invisible", icon: "👻", col: 0xdde6ff }, magnet: { name: "Coin magnet", icon: "🧲", col: 0xd7263d }, heart: { name: "Extra life", icon: "❤️", col: 0xff4d6d },
};
const ballTex = canvasTex(64, 32, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#222"; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(5 + i * 11, i % 2 ? 9 : 22, 4.5, 0, 7); g.fill(); } });
function toyMesh(type) {
  const g = new THREE.Group(), L = (c) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.12 });
  const S = (r, c, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), L(c)); m.position.set(x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1); g.add(m); return m; };
  if (type === "ball") { const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), new THREE.MeshLambertMaterial({ map: ballTex })); g.add(m); }
  else if (type === "teddy") { S(0.42, 0xb9743a, 0, 0, 0); S(0.28, 0xb9743a, 0, 0.55, 0); S(0.1, 0xb9743a, -0.22, 0.8, 0); S(0.1, 0xb9743a, 0.22, 0.8, 0); S(0.1, 0xe2b98a, 0, 0.5, 0.24); S(0.04, 0x222222, -0.09, 0.62, 0.24); S(0.04, 0x222222, 0.09, 0.62, 0.24); }
  else if (type === "duck") { S(0.42, 0xffd23f, 0, 0, 0, 1, 0.85, 1.2); S(0.26, 0xffd23f, 0, 0.45, 0.25); S(0.1, 0xff8a1f, 0, 0.42, 0.52, 1.4, 0.6, 1.2); S(0.04, 0x222222, -0.1, 0.55, 0.42); S(0.04, 0x222222, 0.1, 0.55, 0.42); }
  else if (type === "rocket") { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.9, 12), L(0xeeeeee)); g.add(b); const n = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 12), L(0xe5384a)); n.position.y = 0.65; g.add(n); for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.05), L(0xe5384a)); f.position.set(sx * 0.28, -0.35, 0); g.add(f); } g.rotation.z = 0.5; }
  else if (type === "ghost") { S(0.42, 0xdde6ff, 0, 0.1, 0, 1, 1.15, 1); S(0.07, 0x222222, -0.14, 0.2, 0.36); S(0.07, 0x222222, 0.14, 0.2, 0.36); S(0.1, 0x222222, 0, -0.02, 0.38, 1, 1.4, 0.5); }
  else if (type === "magnet") { const t = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.12, 8, 16, Math.PI), L(0xd7263d)); t.rotation.z = Math.PI; t.position.y = 0.1; g.add(t); for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.24), L(0xcfd5df)); e.position.set(sx * 0.34, -0.08, 0); g.add(e); } }
  else { S(0.28, 0xff4d6d, -0.17, 0.12, 0); S(0.28, 0xff4d6d, 0.17, 0.12, 0); const c = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.55, 4), L(0xff4d6d)); c.rotation.x = Math.PI; c.rotation.y = Math.PI / 4; c.position.y = -0.18; g.add(c); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.72, 24), new THREE.MeshBasicMaterial({ color: TOYS[type].col === 0xffffff ? 0x9fd0ff : TOYS[type].col, transparent: true, opacity: 0.55, side: THREE.DoubleSide })); g.add(ring);
  g.scale.setScalar(1.2); return g;
}
const toy = (type, lane, z) => add("power", toyMesh(type), LANES[lane], 1.1, z, { type, baseY: 1.1 });

/* ---------------- building the road ahead ---------------- */
const CHUNK = 34;
function difficulty() { return clamp((G.speed - 14) / 24, 0, 1); }
function makeChunk(z0) {
  const d = difficulty(), p = Math.random(), lane = Math.floor(Math.random() * 3), others = [0, 1, 2].filter((l) => l !== lane);
  const line = (l, n, from, step, y) => { for (let i = 0; i < n; i++) coinAt(l, y || 0.9, from - i * (step || 2.3)); };
  if (p < 0.2) { line(lane, 9, z0 - 4); }
  else if (p < 0.4) { barrier(lane, z0 - 14); for (let i = 0; i < 8; i++) coinAt(lane, 0.9 + Math.sin((i / 7) * Math.PI) * 1.7, z0 - 8 - i * 1.7); line(others[0], 6, z0 - 6); }
  else if (p < 0.55) { wall(others[0], z0 - 14); wall(others[1], z0 - 14); line(lane, 10, z0 - 4); }
  else if (p < 0.7) { bar(lane, z0 - 14); line(lane, 3, z0 - 7); line(lane, 3, z0 - 19); line(others[1], 6, z0 - 6); if (d > 0.3) barrier(others[0], z0 - 14); }
  else if (p < 0.85) { for (let i = 0; i < 12; i++) coinAt(Math.round(1 + Math.sin(i * 0.8)), 0.9, z0 - 3 - i * 2.4); if (d > 0.2) { barrier(0, z0 - 18); barrier(2, z0 - 18); } }
  else { for (let r = 0; r < 4; r++) for (let l = 0; l < 3; l++) coinAt(l, 0.9, z0 - 5 - r * 3); if (d > 0.1) barrier(Math.floor(Math.random() * 3), z0 - 22); }
  if (d > 0.5 && Math.random() < 0.5) wall(Math.floor(Math.random() * 3), z0 - 30);
  // a toy now and then
  if (Math.random() < 0.55) {
    const bag = ["ball", "ball", "ball", "teddy", "duck", "duck", "rocket", "ghost", "ghost", "magnet", "magnet", "heart"], t = pick(bag);
    if (t !== "heart" || G.lives < 3 || Math.random() < 0.3) toy(t, Math.floor(Math.random() * 3), z0 - rand(10, 26));
  }
}
function fillAhead() { while (spawnFront > -160) { makeChunk(spawnFront); spawnFront -= CHUNK; } }

/* ---------------- floating text and bursts ---------------- */
const popEl = $("pop");
let popT = 0;
function pop(text, sub, cls) { popEl.className = "gr-pop"; void popEl.offsetWidth; popEl.innerHTML = text + (sub ? "<small>" + sub + "</small>" : ""); popEl.className = "gr-pop show " + (cls || ""); }
const sparks = [];
const sparkGeo = new THREE.SphereGeometry(0.06, 5, 4);
function burst(x, y, z, col, n) {
  if (reduced) return;
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true })); m.position.set(x, y, z); scene.add(m); sparks.push({ m, vx: rand(-3, 3), vy: rand(1, 5), vz: rand(-3, 3), life: rand(0.4, 0.8), max: 0.8 }); }
}
function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt; s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt + G.speed * dt; s.vy -= 9 * dt; s.m.material.opacity = Math.max(0, s.life / s.max); if (s.life <= 0) { scene.remove(s.m); s.m.material.dispose(); sparks.splice(i, 1); } }
}

/* ---------------- power-ups ---------------- */
const P = { magnet: 0, duck: 0, ghost: 0, rocket: 0 };
const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.25, 18, 12), new THREE.MeshBasicMaterial({ color: 0x9fe3ff, transparent: true, opacity: 0.28 })); bubble.visible = false; scene.add(bubble);
const flame = []; for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); m.visible = false; scene.add(m); flame.push({ m, life: 0 }); }
let flameIdx = 0;
function setGhost(on) { for (const m of george.mats) { m.transparent = on; m.opacity = on ? 0.32 : 1; m.needsUpdate = true; } }
function givePower(type) {
  G.usedPower++; sfx.power(); burst(px, 1.2, 0, TOYS[type].col, 16);
  if (type === "ball") { kickT = 0.45; sfx.kick(); ballFly = { z: -1.5, t: 0, last: -1.5, got: 0 }; pop("KICK!", "The ball collects every coin ahead", "gold"); }
  else if (type === "teddy") { G.shield = true; hugT = 0.9; pop("TEDDY SHIELD!", "It saves you from one hit", "gold"); }
  else if (type === "duck") { P.duck = 10; waddleT = 1.4; pop("DOUBLE COINS!", "Quack! 10 seconds", "gold"); }
  else if (type === "rocket") { P.rocket = 4.5; pop("ROCKET BOOST!", "Fly over everything", "gold"); }
  else if (type === "ghost") { P.ghost = 8; setGhost(true); pop("INVISIBLE!", "Walk straight through things", "gold"); }
  else if (type === "magnet") { P.magnet = 10; pop("COIN MAGNET!", "Coins fly to you", "gold"); }
  else if (type === "heart") { if (G.lives < 3) G.lives++; sfx.life(); pop("EXTRA LIFE!", "", "gold"); }
}
function takeCoin(it, bonus) {
  it.gone = true; G.streak++; G.streakT = 1.4; G.mult = Math.min(5, 1 + Math.floor(G.streak / 10));
  const n = (P.duck > 0 ? 2 : 1); G.coins += n; G.score += 10 * n * G.mult * (bonus || 1); sfx.coin(G.streak); burst(it.mesh.position.x, it.mesh.position.y, it.mesh.position.z, 0xffd84a, 3);
}

/* ---------------- input ---------------- */
function goLane(d) { const n = clamp(laneIdx + d, 0, 2); if (n !== laneIdx) { laneIdx = n; } }
function jump() { if (G.phase !== "play") return; if (grounded && !(P.rocket > 0)) { vy = 10.2; grounded = false; sliding = 0; sfx.jump(); } }
function slide() { if (G.phase !== "play") return; if (!grounded) vy = Math.min(vy, -14); if (!(P.rocket > 0)) { sliding = 0.7; sfx.slide(); } }
window.addEventListener("keydown", (e) => {
  if (G.phase !== "play") return;
  const k = e.key;
  if (k === "ArrowLeft" || k === "a" || k === "A") goLane(-1); else if (k === "ArrowRight" || k === "d" || k === "D") goLane(1);
  else if (k === "ArrowUp" || k === "w" || k === "W" || k === " ") { jump(); e.preventDefault(); } else if (k === "ArrowDown" || k === "s" || k === "S") { slide(); e.preventDefault(); }
});
let sx = 0, sy = 0, st = 0, swiping = false;
canvas.addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; st = performance.now(); swiping = true; canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
canvas.addEventListener("pointermove", (e) => {
  if (!swiping || G.phase !== "play") return;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) { goLane(dx > 0 ? 1 : -1); sx = e.clientX; sy = e.clientY; }
  else if (dy < -34 && Math.abs(dy) > Math.abs(dx)) { jump(); sx = e.clientX; sy = e.clientY; }
  else if (dy > 34 && Math.abs(dy) > Math.abs(dx)) { slide(); sx = e.clientX; sy = e.clientY; }
});
canvas.addEventListener("pointerup", () => { swiping = false; }); canvas.addEventListener("pointercancel", () => { swiping = false; });

/* ---------------- George's animations ---------------- */
let phase = 0;
function animate(dt) {
  const g = george, flying = P.rocket > 0;
  const w = G.phase === "menu" ? 9 : 9 + G.speed * 0.13;
  phase += dt * w;
  const s = Math.sin(phase), run = G.phase !== "over";
  g.armL.rotation.z = g.armR.rotation.z = 0; g.legL.rotation.z = g.legR.rotation.z = 0;
  g.body.rotation.set(0, 0, 0); g.body.position.y = 0; g.elbowL.rotation.x = g.elbowR.rotation.x = -(0.9 + 0.3 * Math.abs(s));
  // the running stride
  g.legL.rotation.x = -s * 1.0; g.legR.rotation.x = s * 1.0;
  g.kneeL.rotation.x = 1.2 * Math.max(0, Math.cos(phase)); g.kneeR.rotation.x = 1.2 * Math.max(0, -Math.cos(phase));
  g.armL.rotation.x = s * 0.9; g.armR.rotation.x = -s * 0.9;
  g.body.rotation.x = 0.22; g.body.rotation.y = s * 0.15; g.body.position.y = Math.abs(Math.cos(phase)) * 0.08;
  if (!grounded && !flying) {                                          // in the air: tuck the knees, arms up
    const up = clamp(vy / 10, -1, 1);
    g.legL.rotation.x = -1.1; g.kneeL.rotation.x = 1.4; g.legR.rotation.x = 0.35; g.kneeR.rotation.x = 0.6;
    g.armL.rotation.x = g.armR.rotation.x = -2.5 + 0.5 * up; g.armL.rotation.z = -0.4; g.armR.rotation.z = 0.4; g.body.rotation.x = 0.12 - 0.2 * up; g.body.position.y = 0;
  }
  if (sliding > 0) {                                                    // slide on the back, feet first
    g.body.rotation.x = -1.15; g.body.position.y = -0.62; g.legL.rotation.x = g.legR.rotation.x = -1.5; g.kneeL.rotation.x = g.kneeR.rotation.x = 0.1;
    g.armL.rotation.x = g.armR.rotation.x = 0.6; g.armL.rotation.z = -0.3; g.armR.rotation.z = 0.3;
  }
  if (kickT > 0) { kickT -= dt; const u = 1 - kickT / 0.45; g.legR.rotation.x = -0.4 - 1.5 * Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.8); g.kneeR.rotation.x = u < 0.3 ? 1.3 : 0.1; g.body.rotation.x = 0.1; g.armL.rotation.z = -0.8; g.armR.rotation.z = 0.8; }
  if (hugT > 0) { hugT -= dt; const ps = Math.sin(Math.min(1, (1 - hugT / 0.9)) * Math.PI); g.armL.rotation.x = g.armR.rotation.x = -0.9 * ps - (1 - ps) * 0.2; g.elbowL.rotation.x = g.elbowR.rotation.x = -2.1 * ps; g.armL.rotation.z = 0.7 * ps; g.armR.rotation.z = -0.7 * ps; g.body.rotation.x = 0.35 * ps; }
  if (waddleT > 0) { waddleT -= dt; g.body.rotation.z = Math.sin(phase * 1.1) * 0.28; g.armL.rotation.z = -(0.9 + 0.5 * Math.sin(phase * 3)); g.armR.rotation.z = 0.9 + 0.5 * Math.sin(phase * 3); g.armL.rotation.x = g.armR.rotation.x = 0; g.body.position.y = Math.abs(Math.sin(phase * 1.1)) * 0.2; }
  if (P.magnet > 0 && !flying) { g.armL.rotation.z = -1.5; g.armR.rotation.z = 1.5; g.armL.rotation.x = g.armR.rotation.x = -0.4; }
  if (P.ghost > 0 && waddleT <= 0) { g.armL.rotation.x = g.armR.rotation.x = -1.35 + 0.15 * s; g.elbowL.rotation.x = g.elbowR.rotation.x = -0.2; g.body.rotation.x = 0.3; g.body.rotation.y = s * 0.4; }
  if (flying) { g.body.rotation.x = 1.3; g.body.position.y = 0.6; g.armL.rotation.x = g.armR.rotation.x = -3.0; g.elbowL.rotation.x = g.elbowR.rotation.x = -0.1; g.legL.rotation.x = g.legR.rotation.x = 0.7; g.kneeL.rotation.x = g.kneeR.rotation.x = 0.1; g.body.rotation.y = s * 0.08; }
  if (celeT > 0) { celeT -= dt; g.armL.rotation.x = g.armR.rotation.x = -3.0; g.armL.rotation.z = -0.4; g.armR.rotation.z = 0.4; g.body.position.y = Math.abs(Math.sin(clock * 12)) * 0.25; }
  if (stumble > 0) { stumble -= dt; const u = 1 - stumble / 0.9; g.body.rotation.x = 0.4 + Math.sin(u * Math.PI) * 1.0; g.armL.rotation.x = g.armR.rotation.x = -1.2; g.armL.rotation.z = -1.0; g.armR.rotation.z = 1.0; g.legL.rotation.x = 0.8; g.legR.rotation.x = -0.6; g.body.rotation.y = u * 2.2; }
  if (!run) { g.body.rotation.set(1.1, 0, 0); g.body.position.y = -0.5; g.legL.rotation.x = g.legR.rotation.x = 0.4; g.armL.rotation.z = -1.1; g.armR.rotation.z = 1.1; g.armL.rotation.x = g.armR.rotation.x = -0.3; }
  g.head.rotation.x = 0.12 * -1;
}

/* ---------------- the game loop ---------------- */
let clock = 0, last = 0, raf = 0, roadScroll = 0;
const camPos = new THREE.Vector3(0, 4.2, 7.6);
function top3() { return readJSON(TOP_KEY, []).slice(0, 3); }
function renderTop(el) {
  const t = top3();
  el.innerHTML = t.length ? t.map((r, i) => `<li><b>${["🥇", "🥈", "🥉"][i]}</b><span>${r.s.toLocaleString("en-GB")}</span><small>${r.m} m</small></li>`).join("") : "<li><span>No scores yet. Be the first!</span></li>";
}
function setHud() {
  $("hud-score").textContent = Math.floor(G.score).toLocaleString("en-GB");
  $("hud-coins").textContent = G.coins; $("hud-dist").textContent = Math.floor(G.dist) + " m";
  $("hud-lives").textContent = "❤".repeat(G.lives) + "♡".repeat(3 - G.lives);
  $("hud-mult").textContent = G.mult > 1 ? "x" + G.mult : "";
  const act = []; if (G.shield) act.push("🧸"); if (P.duck > 0) act.push("🦆 " + Math.ceil(P.duck)); if (P.ghost > 0) act.push("👻 " + Math.ceil(P.ghost)); if (P.rocket > 0) act.push("🚀 " + Math.ceil(P.rocket)); if (P.magnet > 0) act.push("🧲 " + Math.ceil(P.magnet)); if (ballFly) act.push("⚽");
  $("hud-power").textContent = act.join("   ");
  // where you stand in the top three, live
  const t = top3(), n = t.filter((r) => r.s > G.score).length;
  $("hud-rank").textContent = G.phase === "play" ? (n < 3 ? "#" + (n + 1) + " right now" : "") : "";
}
function reset() {
  for (const it of items) scene.remove(it.mesh); items.length = 0;
  G.speed = 15; G.dist = 0; G.coins = 0; G.score = 0; G.lives = 3; G.t = 0; G.streak = 0; G.streakT = 0; G.mult = 1; G.invuln = 0; G.shield = false; G.nextMile = 500; G.usedPower = 0;
  P.magnet = P.duck = P.ghost = P.rocket = 0; setGhost(false); ballFly = null; laneIdx = 1; px = 0; py = 0; vy = 0; sliding = 0; grounded = true; stumble = kickT = hugT = waddleT = celeT = 0; tempoBoost = 0;
  spawnFront = -30; fillAhead();
}
function hurt(it) {
  if (G.invuln > 0) return;
  if (G.shield) { G.shield = false; G.invuln = 1.2; burst(px, 1.2, 0, 0x9fe3ff, 18); sfx.power(); pop("SHIELD POPPED!", "Phew!", "soft"); it.gone = true; scene.remove(it.mesh); return; }
  G.lives--; G.invuln = 2.4; stumble = 0.9; G.streak = 0; G.mult = 1; shake = 0.5; G.speed = Math.max(14, G.speed * 0.78); sfx.hit(); burst(px, 1, 0, 0xff6b6b, 14);
  if (G.lives <= 0) { gameOver(); return; }
  pop("OUCH!", G.lives + (G.lives === 1 ? " life left" : " lives left"), "soft");
}
function update(dt) {
  G.t += dt;
  // faster and faster
  G.speed = Math.min(44, G.speed + dt * (P.rocket > 0 ? 0 : 0.2 + difficulty() * 0.08));
  const sp = G.speed * (P.rocket > 0 ? 1.45 : 1);
  G.dist += sp * dt; G.score += sp * dt * 0.5;
  tempoBoost = Math.min(60, (G.speed - 15) * 1.6);
  if (G.dist >= G.nextMile) { pop(G.nextMile + " m!", "Keep going!", "gold"); sfx.milestone(); celeT = 0.8; G.nextMile += 500; }
  for (const k of ["magnet", "duck", "ghost", "rocket"]) if (P[k] > 0) { P[k] -= dt; if (P[k] <= 0) { P[k] = 0; if (k === "ghost") setGhost(false); } }
  G.invuln = Math.max(0, G.invuln - dt); if (G.streakT > 0) { G.streakT -= dt; if (G.streakT <= 0) { G.streak = 0; G.mult = 1; } }
  // George: lane, jump, slide
  px = lerp(px, LANES[laneIdx], 1 - Math.exp(-14 * dt));
  if (P.rocket > 0) { py = lerp(py, 3.4, 1 - Math.exp(-5 * dt)); vy = 0; grounded = false; }
  else { if (!grounded || py > 0) { vy -= 28 * dt; py += vy * dt; if (py <= 0) { py = 0; vy = 0; grounded = true; } } else grounded = true; }
  if (sliding > 0) sliding -= dt;
  // the world comes towards him
  roadScroll += sp * dt; roadTex.offset.y = (roadScroll / 8) % 1;
  for (const t of trees) { t.position.z += sp * dt; if (t.position.z > 12) { t.position.z -= 230; t.position.x = t.userData.side * rand(6.5, 22); t.scale.setScalar(rand(0.8, 1.5)); } }
  for (const d of dots) { d.position.z += sp * dt; if (d.position.z > 12) { d.position.z -= 230; d.position.x = (Math.random() < 0.5 ? 1 : -1) * rand(5.5, 26); } }
  spawnFront += sp * dt; fillAhead();
  const ballZ = ballFly ? ballFly.z : null;
  if (ballFly) { ballFly.last = ballFly.z; ballFly.z -= (sp + 85) * dt; ballFly.t += dt; if (ballFly.z < -140) { pop("BALL BONUS!", "+" + ballFly.got + " coins", "gold"); ballFly = null; } }
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]; it.z += sp * dt; it.mesh.position.z = it.z;
    if (it.spin) { it.mesh.rotation.y += dt * 3.2; if (it.baseY !== undefined) it.mesh.position.y = it.baseY + Math.sin(clock * 3 + it.z) * 0.12; }
    if (it.kind === "coin" && !it.gone) {
      if (P.magnet > 0 && it.z > -14 && it.z < 1.5 && Math.abs(it.x - px) < 6.5) { const k = 1 - Math.exp(-9 * dt); it.x = lerp(it.x, px, k); it.baseY = lerp(it.baseY, py + 0.9, k); it.mesh.position.x = it.x; }
      if (ballFly && it.z < ballFly.last + 3 && it.z > ballFly.z - 3 && it.z < 0) { takeCoin(it, 2); ballFly.got++; }
      else if (Math.abs(it.z) < 1.0 && Math.abs(it.x - px) < 1.15 && Math.abs((it.baseY || 0.9) - (py + 0.9)) < 1.5) takeCoin(it);
    } else if (it.kind === "power" && !it.gone) {
      if (Math.abs(it.z) < 1.3 && Math.abs(it.x - px) < 1.4 && Math.abs(1.1 - (py + 0.9)) < 1.8) { it.gone = true; givePower(it.type); }
    } else if (it.kind === "obs" && !it.gone && Math.abs(it.z) < 0.85 && Math.abs(it.x - px) < 1.0) {
      const ghost = P.ghost > 0 || P.rocket > 0 || G.invuln > 0;
      const standing = sliding <= 0;
      const hit = it.type === "wall" ? py < 2.5 : it.type === "barrier" ? py < 0.75 : (standing && py < 1.5);
      if (hit && !ghost) hurt(it);
      else if (hit && G.shield === false && P.ghost > 0) { /* walking through it */ }
    }
    if (it.gone && it.kind !== "obs") { scene.remove(it.mesh); items.splice(i, 1); continue; }
    if (it.z > 12) { scene.remove(it.mesh); items.splice(i, 1); }
  }
  // the football flying ahead
  if (ballFly) { ballMesh.visible = true; ballMesh.position.set(px, 0.8 + Math.abs(Math.sin(ballFly.t * 9)) * 0.5, ballFly.z); ballMesh.rotation.x -= 0.6; } else ballMesh.visible = false;
  // rocket flames
  if (P.rocket > 0 && !reduced) { for (let k = 0; k < 2; k++) { const f = flame[flameIdx++ % flame.length]; f.m.position.set(px + rand(-0.15, 0.15), py + 0.7 + rand(-0.1, 0.1), 0.9); f.life = 0.35; f.m.visible = true; } }
  for (const f of flame) { if (f.life > 0) { f.life -= dt; f.m.position.z += (sp * 0.9) * dt; f.m.material.opacity = Math.max(0, f.life / 0.35); const sc = 0.6 + (1 - f.life / 0.35); f.m.scale.setScalar(sc); if (f.life <= 0) f.m.visible = false; } }
  updateSparks(dt);
  // the figure
  george.root.position.set(px, py, 0);
  george.root.visible = !(G.invuln > 0 && P.ghost <= 0 && Math.floor(clock * 14) % 2 === 0 && G.phase === "play" && stumble <= 0);
  george.blob.position.y = 0.03 - py; george.blob.scale.setScalar(clamp(1 - py * 0.12, 0.5, 1));
  george.root.rotation.z = (px - LANES[laneIdx]) * -0.05;
  bubble.visible = G.shield; if (G.shield) { bubble.position.set(px, py + 1, 0); const bs = 1 + Math.sin(clock * 5) * 0.04; bubble.scale.set(bs, bs, bs); }
}
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshLambertMaterial({ map: ballTex, emissive: 0xffe9a8, emissiveIntensity: 0.4 })); ballMesh.visible = false; scene.add(ballMesh);

function cameraStep(dt) {
  const tx = px * 0.55, ty = (P.rocket > 0 ? 5.6 : 4.0) + py * 0.3, tz = 7.4;
  camPos.x = lerp(camPos.x, tx, 1 - Math.exp(-6 * dt)); camPos.y = lerp(camPos.y, ty, 1 - Math.exp(-4 * dt)); camPos.z = lerp(camPos.z, tz + clamp((G.speed - 15) * 0.05, 0, 1.4), 1 - Math.exp(-3 * dt));
  let sxk = 0, syk = 0; if (shake > 0 && !reduced) { shake -= dt; sxk = rand(-0.15, 0.15) * shake * 2; syk = rand(-0.1, 0.1) * shake * 2; }
  camera.position.set(camPos.x + sxk, camPos.y + syk, camPos.z); camera.lookAt(px * 0.35, 1.5 + py * 0.3, -14);
}
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; clock += dt;
  if (G.phase === "play") update(dt);
  else if (G.phase === "menu") { roadScroll += 10 * dt; roadTex.offset.y = (roadScroll / 8) % 1; for (const t of trees) { t.position.z += 10 * dt; if (t.position.z > 12) t.position.z -= 230; } }
  animate(dt); cameraStep(dt);
  if (G.phase !== "over") setHud();
  renderer.render(scene, camera);
}

/* ---------------- screens, scores and prizes ---------------- */
const PRIZES = [
  { id: "run1000", test: (r) => r.dist >= 1000, kit: "Speedster shirt", text: "Run 1,000 m in one go" },
  { id: "run150c", test: (r) => r.coins >= 150, kit: "Golden Runner shirt", text: "Collect 150 coins in one run" },
  { id: "runghost", test: (r) => r.power >= 5, kit: "Phantom shirt", text: "Use 5 power-ups in one run" },
];
function gameOver() {
  G.phase = "over"; sfx.over(); stopMusic(); shake = 0.4;
  const score = Math.floor(G.score), meters = Math.floor(G.dist);
  const t = readJSON(TOP_KEY, []); const before = t.slice(0, 3).map((r) => r.s);
  t.push({ s: score, m: meters, d: new Date().toISOString().slice(0, 10) }); t.sort((a, b) => b.s - a.s); writeJSON(TOP_KEY, t.slice(0, 10));
  const rank = t.slice(0, 3).findIndex((r) => r.s === score && r.m === meters);
  const earned = Math.round(G.coins * 0.6 + meters / 60);
  if (window.GZR && GZR.ready) { try { GZR.earn({ coins: earned, xp: Math.round(meters / 25) }); GZR.event("game"); GZR.event("run_m", meters); } catch (e) {} }
  const save = readJSON(RUN_KEY, { ach: {}, best: 0 }); const won = [];
  for (const p of PRIZES) if (!save.ach[p.id] && p.test({ dist: meters, coins: G.coins, power: G.usedPower })) { save.ach[p.id] = true; won.push(p); }
  save.best = Math.max(save.best || 0, score); writeJSON(RUN_KEY, save);
  setTimeout(() => {
    $("screen-game").hidden = true; $("screen-end").hidden = false;
    $("end-title").textContent = rank === 0 ? "New high score!" : rank > 0 ? "You are in the top three!" : "Nice run, George!";
    $("end-stats").innerHTML = `<div><b>${score.toLocaleString("en-GB")}</b><span>Points</span></div><div><b>${meters} m</b><span>Distance</span></div><div><b>${G.coins}</b><span>Coins picked up</span></div>` + (earned ? `<div><b>+${earned}</b><span>Coins for the shop</span></div>` : "");
    $("end-prizes").innerHTML = won.length ? won.map((p) => `<li>🎽 <b>New shirt unlocked: ${p.kit}!</b> <small>${p.text}. Wear it in My Player.</small></li>`).join("") : "";
    renderTop($("end-top"));
  }, 1100);
}
function start() {
  audio(); reset(); G.phase = "play";
  $("screen-start").hidden = true; $("screen-end").hidden = true; $("screen-game").hidden = false;
  resize(); renderTop($("hud-top")); startMusic(); pop("GO GEORGE!", "Swipe to move, jump and slide", "gold");
  stage.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
}
function toMenu() { G.phase = "menu"; }
$("btn-start").addEventListener("click", start);
$("btn-again").addEventListener("click", start);
$("btn-music").addEventListener("click", () => { cycleMusic(); audio(); });
$("btn-sound").addEventListener("click", () => { sfxOn = !sfxOn; $("btn-sound").textContent = sfxOn ? "🔊 Sounds on" : "🔇 Sounds off"; });
showMusic(); renderTop($("start-top")); resize();
reset(); G.phase = "menu"; for (const it of items) scene.remove(it.mesh); items.length = 0; last = performance.now(); raf = requestAnimationFrame(frame);
$("screen-game").hidden = true;
// the start screen shows George running on the spot with the world behind him
window.__run = { G, P, items, get george() { return george; }, hurt, givePower, camera, makeChunk, setGhost, kick: () => givePower("ball"), jump, slide, goLane };
