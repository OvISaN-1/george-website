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
const SAVE_DEFAULT = { ach: {}, best: 0, runs: 0 };
const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

/* ---------------- achievements (football themed, and nothing too hard) ---------------- */
const ACH = [
  ["kickoff", "⚽", "Kick-off", "Play your first run"], ["firsttouch", "🪙", "First Touch", "Collect a coin"],
  ["fullteam", "👥", "Full Team", "Collect 11 coins without a card"], ["goldenboot", "👟", "Golden Boot", "Collect 25 coins without a card"], ["invincibles", "🛡️", "The Invincibles", "Collect 100 coins without a card"],
  ["halftime", "⏱️", "Half-time", "Run 500 m"], ["fulltime", "🔔", "Full Time", "Run 1,000 m"], ["extratime", "⏳", "Extra Time", "Run 2,000 m"], ["allseasons", "🗓️", "Four Seasons", "Reach spring in one run"],
  ["topbins", "🥅", "Top Bins", "Score a goal with the football"], ["safehands", "🧤", "Safe Hands", "Use the keeper gloves"], ["moon", "🚀", "Out of This World", "Use the rocket boots"],
  ["legend", "⭐", "Forest Legend", "Get your shirt number to 25"], ["cleansheet", "🧱", "Clean Sheet", "Run 300 m without losing a life"], ["season", "🎟️", "Season Ticket", "Play 5 runs"],
];
/* ---------------- renderer, scene, camera ---------------- */
const stage = $("stage"), canvas = $("gl");
const SAVE = Object.assign({}, SAVE_DEFAULT, readJSON(RUN_KEY, {})); SAVE.ach = SAVE.ach || {};
const achQueue = []; let achShowing = false, newAch = [];
function ach(id) {
  if (SAVE.ach[id]) return; const a = ACH.find((x) => x[0] === id); if (!a) return;
  SAVE.ach[id] = true; writeJSON(RUN_KEY, SAVE); newAch.push(a); achQueue.push(a); showAch(); renderAchList();
}
function flash(kind) { const f = $("flash"); if (!f) return; f.className = "gr-flash"; void f.offsetWidth; f.className = "gr-flash " + kind; }
let paused = false;
function showAch() {
  if (achShowing || !achQueue.length) return; const a = achQueue.shift(), el = $("ach-banner"); achShowing = true;
  $("ach-ico").textContent = a[1]; $("ach-name").textContent = a[2]; $("ach-text").textContent = a[3]; el.hidden = false; stage.classList.add("ach-on"); el.classList.remove("show"); void el.offsetWidth; el.classList.add("show"); sfx.milestone();
  setTimeout(() => { el.hidden = true; achShowing = false; if (!achQueue.length) stage.classList.remove("ach-on"); showAch(); }, 3200);
}
function renderAchList() {
  const n = ACH.filter((a) => SAVE.ach[a[0]]).length; $("ach-count").textContent = n + " of " + ACH.length;
  $("ach-list").innerHTML = ACH.map((a) => SAVE.ach[a[0]] ? `<li class="got"><i>${a[1]}</i><span><b>${a[2]}</b><small>${a[3]}</small></span></li>` : `<li><i>🔒</i><span><b>???</b><small>${a[3]}</small></span></li>`).join("");
}
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
  renderer.setSize(w, h, false); camera.aspect = w / h; baseFov = w / h < 0.8 ? 72 : 60; camera.fov = baseFov; camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);

/* ---------------- textures ---------------- */
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
// the pitch: mown stripes, with the touchlines and lane markings chalked on
const roadTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#2b8a32"; g.fillRect(0, 0, w, h); g.fillStyle = "#37a23e"; g.fillRect(0, h / 2, w, h / 2);
  g.fillStyle = "rgba(255,255,255,.95)"; g.fillRect(3, 0, 5, h); g.fillRect(w - 8, 0, 5, h);                                   // touchlines
  g.fillStyle = "rgba(255,255,255,.55)"; for (const x of [w / 3, (2 * w) / 3]) { g.fillRect(x - 2, 16, 4, 96); g.fillRect(x - 2, 144, 4, 96); }   // lane dashes
}, [1, 1]);
const grassTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = "#287a2e"; g.fillRect(0, 0, w, h); g.fillStyle = "#318f37"; g.fillRect(0, h / 2, w, h / 2); }, [1, 1]);

/* ---------------- the world: a football ground, in Nottingham Forest red and white ---------------- */
const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 700), new THREE.MeshLambertMaterial({ map: grassTex }));
ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, -200); scene.add(ground);
const road = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 700), new THREE.MeshLambertMaterial({ map: roadTex }));
road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -200); scene.add(road);
roadTex.repeat.set(1, 700 / 16); grassTex.repeat.set(1, 700 / 16);

// advertising boards along both touchlines
const boardTex = canvasTex(1024, 64, (g, w, h) => {
  const names = ["NOTTINGHAM FOREST", "CITY GROUND", "GEORGE", "TRENT END", "COME ON YOU REDS", "FOREST"], red = ["#d7102b", "#ffffff"];
  for (let i = 0; i < 6; i++) { const bg = red[i % 2]; g.fillStyle = bg; g.fillRect(i * w / 6, 0, w / 6, h); g.fillStyle = bg === "#ffffff" ? "#d7102b" : "#ffffff"; g.font = "700 30px Rajdhani, Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(names[i], i * w / 6 + w / 12, h / 2 + 2); }
}, [700 / 36, 1]);
const boardMats = [], crowdMats = [], crowdTexes = [], boardTexes = [];
function sideScenery(sd) {
  const bt = boardTex.clone(); bt.needsUpdate = true; bt.repeat.set(700 / 36, 1); bt.wrapS = bt.wrapT = THREE.RepeatWrapping;
  const bm = new THREE.MeshBasicMaterial({ map: bt, side: THREE.DoubleSide }); const b = new THREE.Mesh(new THREE.PlaneGeometry(700, 1.1), bm);
  b.position.set(sd * 8.4, 0.55, -200); b.rotation.y = sd * Math.PI / 2; scene.add(b); boardMats.push(bm); boardTexes.push(bt);
  const ct = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = "#1c1a22"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 10) for (let x = 0; x < w; x += 9) { const r = Math.random(); g.fillStyle = r < 0.55 ? "#d7102b" : r < 0.8 ? "#ffffff" : r < 0.9 ? "#8a1220" : "#e8c9a8"; g.fillRect(x + (y / 10 % 2 ? 4 : 0), y, 7, 8); }
  }, [22, 1]);
  // a proper stand: it climbs away from the pitch, so the top is further out than the bottom
  const cm = new THREE.MeshBasicMaterial({ map: ct, color: 0xffffff, side: THREE.DoubleSide });
  const stand = new THREE.Group(); stand.position.set(sd * 14.5, 0, -200); stand.rotation.y = -sd * Math.PI / 2; scene.add(stand);
  const st = new THREE.Mesh(new THREE.PlaneGeometry(700, 13), cm); st.rotation.x = -1.0; st.position.set(0, 0.9 + 6.5 * Math.cos(1.0), -6.5 * Math.sin(1.0)); stand.add(st);
  const wallM = new THREE.MeshLambertMaterial({ color: 0x7a0d20 }); crowdMats.push(cm); crowdTexes.push(ct);
  const front = new THREE.Mesh(new THREE.BoxGeometry(700, 0.9, 0.4), wallM); front.position.set(0, 0.45, 0); stand.add(front);
  const back = new THREE.Mesh(new THREE.BoxGeometry(700, 9, 0.3), new THREE.MeshLambertMaterial({ color: 0x2a1218 })); back.position.set(0, 4.5, -13 * Math.sin(1.0) - 0.3); stand.add(back);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(700, 0.25, 5), new THREE.MeshLambertMaterial({ color: 0xcfd3da })); roof.position.set(0, 9.4, -13 * Math.sin(1.0) + 1.6); stand.add(roof);
}
sideScenery(-1); sideScenery(1);
// floodlight towers
const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff1c9 });
const trees = [];
for (let i = 0; i < 12; i++) {
  const g = new THREE.Group(), sd = i % 2 ? 1 : -1;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 20, 8), new THREE.MeshLambertMaterial({ color: 0xb9bec8 })); pole.position.y = 10; g.add(pole);
  const rack = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 0.5), new THREE.MeshLambertMaterial({ color: 0x555a66 })); rack.position.y = 20.5; rack.rotation.y = sd * 0.5; g.add(rack);
  const lamps = new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.7, 0.2), lampMat); lamps.position.set(0, 20.5, sd * -0.0 + 0.3); lamps.rotation.y = sd * 0.5; g.add(lamps);
  g.userData = { side: sd }; g.position.set(sd * 13, 0, -i * 19); scene.add(g); trees.push(g);
}
// move the boards and the crowd past as George runs
function scrollWorld(d) {
  const k = d / 36, kc = d / 32; boardTexes[0].offset.x += k; boardTexes[1].offset.x -= k; crowdTexes[0].offset.x += kc; crowdTexes[1].offset.x -= kc;
}

/* ---------------- George ---------------- */
function makeGeorge() {
  const mats = [];
  const M = (c) => { const m = new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.16 }); mats.push(m); return m; };
  const cyl = (rt, rb, h, c, x, y, z, seg) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 14), M(c)); m.position.set(x, y, z); return m; };
  const sph = (r, c, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), M(c)); m.position.set(x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1); return m; };
  const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); return m; };
  const hex = (s, d) => { try { return parseInt(String(s).replace("#", ""), 16); } catch (e) { return d; } };
  let kit = { shirt: "#d7102b", shorts: "#f4f1ee", socks: "#d7102b", sockTop: "#ffffff", trim: "#ffffff", text: "#ffffff" }, hairC = "#a57d52", style = "fringe", boots = "#15121a", num = 10;
  try { if (window.GL && window.GK) { kit = GK.KITS[GL.pick("kit", "home")] || GK.KITS.home || kit; hairC = GL.hairColour().base; style = GL.get().hair; boots = GL.bootsColour(GL.pick("boots", "black")); num = GL.number(); } } catch (e) {}
  const o = { shirt: hex(kit.shirt, 0xd7102b), shorts: hex(kit.shorts, 0xf4f1ee), socks: hex(kit.socks, 0xd7102b), band: hex(kit.sockTop || kit.trim, 0xffffff), collar: hex(kit.trim, 0xffffff), skin: 0xf3c9a4, hair: hex(hairC, 0xa57d52), boots: hex(boots, 0x151515) };
  const g = new THREE.Group();
  const leg = (sx) => {
    const hip = new THREE.Group(); hip.position.set(sx * 0.095, 0.96, 0);
    const short = cyl(0.092, 0.104, 0.3, o.shorts, 0, -0.115, 0); short.scale.z = 0.95;
    hip.add(cyl(0.088, 0.072, 0.46, o.skin, 0, -0.23, 0), short, cyl(0.1, 0.108, 0.02, o.collar, 0, -0.262, 0));
    const knee = new THREE.Group(); knee.position.set(0, -0.46, 0);
    knee.add(sph(0.068, o.skin, 0, 0, 0), cyl(0.064, 0.05, 0.42, o.socks, 0, -0.21, 0), cyl(0.067, 0.067, 0.04, o.band, 0, -0.1, 0));
    const foot = new THREE.Group(); foot.position.set(0, -0.43, 0); foot.add(box(0.1, 0.07, 0.26, o.boots, 0, -0.03, 0.06), sph(0.05, o.socks, 0, 0.01, -0.01));
    knee.add(foot); hip.add(knee); g.add(hip); return { hip, knee };
  };
  const arm = (sx) => {
    const sh = new THREE.Group(); sh.position.set(sx * 0.235, 1.66, 0);
    sh.add(sph(0.065, o.shirt, 0, 0, 0), cyl(0.058, 0.05, 0.22, o.shirt, 0, -0.11, 0), cyl(0.052, 0.052, 0.025, o.collar, 0, -0.215, 0), cyl(0.048, 0.043, 0.1, o.skin, 0, -0.25, 0));
    if (sx < 0) sh.add(cyl(0.06, 0.058, 0.05, 0xffd84a, 0, -0.1, 0));   // captain's armband
    const elbow = new THREE.Group(); elbow.position.set(0, -0.3, 0);
    elbow.add(sph(0.044, o.skin, 0, 0, 0), cyl(0.043, 0.036, 0.27, o.skin, 0, -0.14, 0), sph(0.045, o.skin, 0, -0.3, 0));
    sh.add(elbow); g.add(sh); return { sh, elbow };
  };
  const lL = leg(-1), lR = leg(1), aL = arm(-1), aR = arm(1);
  const chest = cyl(0.205, 0.155, 0.58, o.shirt, 0, 1.4, 0, 14); chest.scale.z = 0.62; g.add(chest);
  const waist = sph(0.19, o.shorts, 0, 1.0, 0, 1, 0.62, 0.7); g.add(waist);
  const band = cyl(0.156, 0.16, 0.05, o.collar, 0, 1.1, 0, 14); band.scale.z = 0.68; g.add(band);
  const hem = cyl(0.158, 0.158, 0.03, o.collar, 0, 1.12, 0, 14); hem.scale.z = 0.66; g.add(hem);
  const yoke = sph(0.215, o.shirt, 0, 1.66, 0, 1, 0.22, 0.6); g.add(yoke);
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
  if (style !== "mohawk") head.add(sph(0.118, o.hair, 0, 0.2, -0.045, 1, 0.9, 0.88));
  head.scale.setScalar(1.1); g.add(head);
  const capeGeo = new THREE.PlaneGeometry(0.5, 0.85, 6, 6), capeBase = Float32Array.from(capeGeo.attributes.position.array);
  const cape = new THREE.Mesh(capeGeo, new THREE.MeshLambertMaterial({ color: o.shirt, emissive: o.shirt, emissiveIntensity: 0.2, side: THREE.DoubleSide })); cape.position.set(0, 1.28, -0.15); cape.visible = false; mats.push(cape.material); g.add(cape);
  num = clamp(Math.round(Number(num)) || 10, 1, 99);
  const numC = document.createElement("canvas"); numC.width = 256; numC.height = 256;
  const numTex = new THREE.CanvasTexture(numC); numTex.colorSpace = THREE.SRGBColorSpace;
  const drawNumber = (n) => {     // his name and number on the back of the shirt; the number is his coin multiplier
    const c = numC.getContext("2d"); c.clearRect(0, 0, 256, 256); c.fillStyle = kit.text || "#fff"; c.textAlign = "center"; c.textBaseline = "middle";
    c.font = "700 54px Rajdhani, Arial Black, sans-serif"; c.fillText("GEORGE", 128, 38);
    c.font = "700 " + (n >= 100 ? 130 : n >= 10 ? 170 : 196) + "px Rajdhani, Arial Black, sans-serif"; c.fillText(String(n), 128, 150); numTex.needsUpdate = true;
  };
  drawNumber(num);
  const nm = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: numTex, transparent: true, depthWrite: false })); nm.position.set(0, 1.37, -0.138); nm.rotation.y = Math.PI; g.add(nm);
  // a 10-year-old: shorter legs and arms and a bigger head than a grown-up footballer
  const LEG = 0.8, DROP = 0.96 * (1 - LEG);
  for (const c of g.children) if (c !== lL.hip && c !== lR.hip) c.position.y -= DROP;
  for (const h of [lL.hip, lR.hip]) { h.scale.setScalar(LEG); h.position.y = 0.96 * LEG; }
  for (const a of [aL.sh, aR.sh]) a.scale.setScalar(0.88);
  head.scale.setScalar(1.24); head.position.y -= 0.05;
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 4, 32, 32, 30); gr.addColorStop(0, "rgba(0,0,0,.5)"); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03;
  const root = new THREE.Group(); root.add(g, blob); root.scale.setScalar(1.15); root.rotation.y = Math.PI;   // a little larger than life so the shirt print reads; he runs away from the camera (towards -z)
  return { root, body: g, head, cape, capeGeo, capeBase, legL: lL.hip, legR: lR.hip, kneeL: lL.knee, kneeR: lR.knee, armL: aL.sh, armR: aR.sh, elbowL: aL.elbow, elbowR: aR.elbow, mats, blob, drawNumber, baseNum: num };
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
  season() { if (sfxOn) { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, "triangle", 0.1, 0, i * 0.07)); noise(0.6, 0.12, 6000); } },
  splash(k) { if (sfxOn) { noise(0.3, 0.22, k === "puddle" ? 1800 : 900); tone(k === "snow" ? 900 : 600, 0.12, "sine", 0.06, 300); } },
  goal() { if (sfxOn) { noise(1.6, 0.28, 1400); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, "triangle", 0.09, 0, 0.1 + i * 0.08)); } },
  over() { if (sfxOn) [392, 330, 262].forEach((f, i) => tone(f, 0.3, "triangle", 0.12, 0, i * 0.18)); },
};
// The tune: a stadium stomp-and-clap beat, a chant-like tune, and more instruments joining in as George gets faster.
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
// One song per season. Each has its own key, speed and instruments, and gets busier as George speeds up.
const SONGS = [
  { name: "Sunshine Stomp", bpm: 122, chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], roots: [48, 43, 45, 41],
    mel: [[72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 76, 0, 74, 0, 72, 0], [71, 0, 74, 0, 79, 0, 74, 0, 76, 0, 74, 0, 71, 0, 67, 0], [72, 0, 76, 0, 81, 0, 79, 0, 76, 0, 72, 0, 76, 0, 79, 0], [77, 0, 76, 0, 74, 0, 72, 0, 74, 0, 0, 0, 72, 0, 0, 0]],
    lead: { type: "square", lp: 3200, len: 1.8, vol: 0.045 }, bass: [0, 3, 6, 8, 11, 14], oct: [6, 14], pad: "triangle" },
  { name: "Autumn Chant", bpm: 112, chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]], roots: [45, 41, 48, 43],
    mel: [[76, 0, 0, 76, 79, 0, 81, 0, 79, 0, 76, 0, 74, 0, 76, 0], [77, 0, 0, 77, 81, 0, 84, 0, 81, 0, 77, 0, 76, 0, 77, 0], [76, 0, 0, 76, 79, 0, 84, 0, 83, 0, 79, 0, 76, 0, 79, 0], [74, 0, 0, 74, 79, 0, 83, 0, 81, 0, 79, 0, 74, 0, 0, 0]],
    lead: { type: "sawtooth", lp: 2600, len: 2.2, vol: 0.055 }, bass: [0, 3, 6, 8, 10, 13, 14], oct: [3, 10, 13], pad: "sawtooth" },
  { name: "Boxing Day Bells", bpm: 106, chords: [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]], roots: [38, 35, 43, 45],
    mel: [[74, 0, 78, 0, 81, 0, 78, 0, 86, 0, 0, 0, 81, 0, 0, 0], [83, 0, 81, 0, 78, 0, 74, 0, 78, 0, 0, 0, 0, 0, 0, 0], [79, 0, 83, 0, 86, 0, 83, 0, 81, 0, 79, 0, 78, 0, 79, 0], [81, 0, 0, 0, 76, 0, 79, 0, 78, 0, 0, 0, 76, 0, 0, 0]],
    lead: { type: "triangle", lp: 6000, len: 3, vol: 0.09 }, bass: [0, 8], oct: [8], pad: "triangle", bells: true },
  { name: "Spring Shower", bpm: 128, chords: [[64, 67, 71], [60, 64, 67], [55, 59, 62], [62, 66, 69]], roots: [40, 36, 43, 38],
    mel: [[76, 0, 79, 0, 83, 0, 79, 0, 81, 0, 79, 0, 76, 0, 74, 0], [72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 76, 0, 72, 0, 71, 0], [74, 0, 79, 0, 83, 0, 86, 0, 83, 0, 79, 0, 74, 0, 79, 0], [78, 0, 81, 0, 78, 0, 74, 0, 76, 0, 0, 0, 0, 0, 0, 0]],
    lead: { type: "square", lp: 2400, len: 1.1, vol: 0.05 }, bass: [0, 2, 4, 6, 8, 10, 12, 14], oct: [2, 6, 10, 14], pad: "sawtooth", claps: true },
];
let curSong = 0, wantSong = 0, songLap = 0;
let musicOn = false, step = 0, nextT = 0, musicTimer = 0, tempoBoost = 0;
// The mixing desk: everything goes through a gentle compressor; the tune gets an echo, and the pads and the crowd
// get some stadium reverb. The pads duck a little on every kick, so the beat "pumps".
let bus = null;
function mixer() {
  const a = audio(); if (!a) return null; if (bus) return bus;
  const comp = a.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = 0.01; comp.release.value = 0.2; comp.connect(a.destination);
  const main = a.createGain(); main.connect(comp);
  const rev = a.createConvolver(), len = Math.floor(a.sampleRate * 2.2), ir = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 3); }
  rev.buffer = ir; const revIn = a.createGain(), revOut = a.createGain(); revOut.gain.value = 0.3; revIn.connect(rev).connect(revOut).connect(comp);
  const dly = a.createDelay(1), fb = a.createGain(), dlyOut = a.createGain(); fb.gain.value = 0.3; dlyOut.gain.value = 0.22; dly.connect(fb).connect(dly); dly.connect(dlyOut).connect(comp);
  const pad = a.createGain(); pad.connect(main); pad.connect(revIn);
  const lead = a.createGain(); lead.connect(main); lead.connect(dly); lead.connect(revIn);
  const crowd = a.createGain(); crowd.connect(main); crowd.connect(revIn);
  bus = { main, pad, lead, crowd, revIn, dly };
  return bus;
}
function synth(f, t, dur, o) {
  const a = audio(), b = mixer(); if (!a || !b) return;
  const t0 = a.currentTime + t, g = a.createGain(), flt = a.createBiquadFilter();
  flt.type = "lowpass"; flt.frequency.setValueAtTime(o.lp || 2500, t0);
  if (o.sweep) flt.frequency.exponentialRampToValueAtTime(Math.max(120, o.lp * o.sweep), t0 + dur);
  const at = o.a || 0.005, v = o.vol || 0.05;
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + at); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const oscs = [o.detune || 0].concat(o.thick ? [-(o.thick), o.thick] : []).map((dt) => { const osc = a.createOscillator(); osc.type = o.type || "sawtooth"; osc.frequency.value = f; osc.detune.value = dt; osc.connect(flt); osc.start(t0); osc.stop(t0 + dur + 0.05); return osc; });
  if (o.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = 5.5; lg.gain.value = f * 0.006; l.connect(lg); oscs.forEach((x) => lg.connect(x.frequency)); l.start(t0 + 0.08); l.stop(t0 + dur + 0.05); }
  flt.connect(g).connect(b[o.bus || "main"]);
}
// the terrace choir: a low "oh-oh" built from a buzzy note pushed through two vowel filters
function choir(f, t, dur, vol) {
  const a = audio(), b = mixer(); if (!a || !b) return;
  const t0 = a.currentTime + t, g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.08); g.gain.setValueAtTime(vol, t0 + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  for (const dt of [-12, 0, 9]) {
    const osc = a.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = f; osc.detune.value = dt;
    for (const [fq, q] of [[650, 6], [1100, 8]]) { const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = fq; bp.Q.value = q; osc.connect(bp).connect(g); }
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  g.connect(b.crowd);
}
let noiseBuf = null;
function drum(kind, t, vol) {
  const a = audio(), b = mixer(); if (!a || !b) return;
  const t0 = a.currentTime + t;
  if (kind === "kick") {
    const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(160, t0); o.frequency.exponentialRampToValueAtTime(40, t0 + 0.14);
    g.gain.setValueAtTime(0.6 * vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24); o.connect(g).connect(b.main); o.start(t0); o.stop(t0 + 0.26);
    b.pad.gain.setValueAtTime(0.35, t0); b.pad.gain.linearRampToValueAtTime(1, t0 + 0.2);      // the pump
    kind = "click"; vol *= 0.5;
  }
  if (!noiseBuf) { const n = a.sampleRate; noiseBuf = a.createBuffer(1, n, a.sampleRate); const ch = noiseBuf.getChannelData(0); for (let k = 0; k < n; k++) ch[k] = Math.random() * 2 - 1; }
  const L = { click: 0.02, hat: 0.05, ohat: 0.22, clap: 0.18, snare: 0.2, crash: 1.1 }[kind] || 0.1;
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); src.buffer = noiseBuf;
  f.type = kind === "snare" || kind === "clap" ? "bandpass" : "highpass"; f.frequency.value = { click: 3000, hat: 8000, ohat: 7000, clap: 1400, snare: 1900, crash: 5000 }[kind] || 2000;
  const pk = { click: 0.2, hat: 0.11, ohat: 0.08, clap: 0.42, snare: 0.38, crash: 0.16 }[kind] * vol;
  if (kind === "clap") { g.gain.setValueAtTime(0.0001, t0); for (const k of [0, 0.012, 0.024]) { g.gain.setValueAtTime(pk, t0 + k); g.gain.exponentialRampToValueAtTime(pk * 0.3, t0 + k + 0.01); } g.gain.exponentialRampToValueAtTime(0.0001, t0 + L); }
  else { g.gain.setValueAtTime(pk, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + L); }
  src.connect(f).connect(g).connect(kind === "clap" || kind === "snare" || kind === "crash" ? b.revIn : b.main); if (kind === "clap" || kind === "snare" || kind === "crash") g.connect(b.main);
  src.start(t0, Math.random() * 0.5, L + 0.05);
  if (kind === "snare") { const o = a.createOscillator(), g2 = a.createGain(); o.frequency.setValueAtTime(200, t0); o.frequency.exponentialRampToValueAtTime(140, t0 + 0.1); g2.gain.setValueAtTime(0.18 * vol, t0); g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12); o.connect(g2).connect(b.main); o.start(t0); o.stop(t0 + 0.14); }
}
// Each song runs in 8-bar rounds: 4 bars of the tune, then 4 bars where the crowd sings the tune and the lead plays
// a counter-melody, with a drum fill to finish. A new season's song opens with two bars of just drums and bass.
let songStep = 0;
function musicTick() {
  const a = audio(), b = mixer(); if (!a || !b || !musicOn) return;
  const vol = MVOL[musicLevel()]; if (!vol) { nextT = a.currentTime; return; }
  b.main.gain.value = 1;
  const lvl = G.speed < 19 ? 0 : G.speed < 26 ? 1 : G.speed < 34 ? 2 : 3;
  while (nextT < a.currentTime + 0.18) {
    const t = nextT - a.currentTime;
    if (step % 16 === 0 && curSong !== wantSong) { curSong = wantSong; step = 0; songStep = 0; drum("crash", t, vol); }   // a new season starts its song on the next bar
    const S = SONGS[curSong], sd = 60 / (S.bpm + tempoBoost * 0.7 + songLap * 6) / 4;
    b.dly.delayTime.setValueAtTime(sd * 3, a.currentTime + t);
    const i = step % 16, bar8 = Math.floor(step / 16) % 8, bar = bar8 % 4, B = bar8 >= 4, intro = songStep < 32, ch = S.chords[bar], root = S.roots[bar];
    const fill = bar8 === 7 && i >= 12;
    // drums
    if (i === 0 || i === 8 || (lvl >= 1 && (i === 4 || i === 12)) || (lvl >= 3 && i === 14)) drum("kick", t, vol * (S.bells ? 0.8 : 1));
    if (fill) drum("snare", t, vol * (0.5 + (i - 12) * 0.15));
    else {
      if (i === 4 || i === 12 || (S.claps && lvl >= 1 && (i === 7 || i === 15))) drum("clap", t, vol * (i % 4 === 3 ? 0.6 : 1));
      if (lvl >= 2 && (i === 4 || i === 12)) drum("snare", t, vol * 0.6);
    }
    if (i % 2 === 0 || lvl >= 1 || S.bells) drum(lvl >= 2 && i % 4 === 2 ? "ohat" : "hat", t, vol * (i % 4 === 2 ? 1 : 0.55));
    if (S.bells && i % 4 === 0) synth(NOTE(ch[(i / 4) % 3] + 24), t, sd * 3, { type: "sine", lp: 9000, vol: 0.035 * vol, bus: "lead" });     // sleigh bells
    if ((lvl >= 3 || B) && i === 0 && bar === 0) drum("crash", t, vol);
    // bass, with a sine underneath for weight
    if (S.bass.includes(i)) {
      const n = NOTE(root + (S.oct.includes(i) ? 12 : 0)), len = sd * (S.bells ? 6 : 2.4);
      synth(n, t, len, { type: S.bells ? "triangle" : "sawtooth", lp: 650, sweep: 0.4, vol: (S.bells ? 0.15 : 0.11) * vol });
      synth(NOTE(root), t, len, { type: "sine", lp: 400, vol: 0.12 * vol });
    }
    // chord pad
    if ((lvl >= 1 || S.bells || B) && i === 0) for (const n of ch) synth(NOTE(n), t, sd * 15.5, { type: S.pad, lp: 1100, vol: 0.022 * vol, a: 0.3, thick: 9, bus: "pad" });
    // sparkly arpeggio
    if (lvl >= 2 && i % 2 === 0) synth(NOTE(ch[(i / 2) % 3] + 12), t, sd * 1.6, { type: "triangle", lp: 4000, vol: 0.04 * vol, bus: "lead" });
    if (!intro) {
      const m = S.mel[bar][i];
      if (!B) {                                                     // the tune
        if (m) { synth(NOTE(m), t, sd * S.lead.len, { type: S.lead.type, lp: S.lead.lp, vol: S.lead.vol * vol, a: 0.01, thick: 6, vib: true, bus: "lead" }); if (lvl >= 3) synth(NOTE(m + 12), t, sd * 2, { type: "square", lp: 3500, vol: 0.018 * vol, bus: "lead" }); }
      } else {                                                      // the crowd sings it, the lead answers
        if (m) choir(NOTE(m - 12), t, sd * 3, 0.05 * vol);
        if (i % 4 === 2) synth(NOTE(ch[[0, 1, 2, 1][(i - 2) / 4]] + 12), t, sd * 1.5, { type: S.lead.type, lp: S.lead.lp * 0.9, vol: S.lead.vol * 0.7 * vol, a: 0.01, bus: "lead" });
      }
    }
    nextT += sd; step++; songStep++;
  }
}
function startMusic() { const a = audio(); if (!a) return; if (a.state === "suspended") a.resume(); musicOn = true; nextT = a.currentTime + 0.05; step = 0; songStep = 0; curSong = wantSong; mixer(); clearInterval(musicTimer); musicTimer = setInterval(musicTick, 40); }
function stopMusic() { musicOn = false; clearInterval(musicTimer); }
function cycleMusic() { const order = ["loud", "quiet", "off"], nx = order[(order.indexOf(musicLevel()) + 1) % 3]; try { localStorage.setItem(MKEY, nx); } catch (e) {} showMusic(); }
function showMusic() { const l = musicLevel(); $("btn-music").textContent = "🎵 Music: " + (l === "loud" ? "Loud" : l === "quiet" ? "Quiet" : "Off"); }

/* ---------------- game state ---------------- */
const MAXL = 4;
const G = { phase: "menu", speed: 0, dist: 0, coins: 0, score: 0, lives: 4, t: 0, streak: 0, num: 10, invuln: 0, shield: false, nextMile: 500, usedPower: 0, kicks: 0, maxNum: 10, noHit: true, jumps: 0, slides: 0, lanes: 0, achT: 0 };
let laneIdx = 1, px = 0, py = 0, vy = 0, sliding = 0, grounded = true, stumble = 0, kickT = 0, celeT = 0, shake = 0;
let act = { type: "", t: 0, dur: 1 };   // a one-off pose when George picks something up
const items = [];    // everything that comes towards George: { kind, mesh, z, x, ... }
let spawnFront = -20;
let ballFly = null;

/* ---------------- things in the world ---------------- */
// a proper gold coin: shiny rim, a football stamped on both faces, and it shimmers as it turns
const coinFace = canvasTex(128, 128, (g) => {
  const gr = g.createRadialGradient(54, 50, 6, 64, 64, 62); gr.addColorStop(0, "#fff0a0"); gr.addColorStop(0.5, "#f5c518"); gr.addColorStop(1, "#b98500");
  g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
  g.lineWidth = 6; g.strokeStyle = "#d89b00"; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke();
  g.fillStyle = "#6b4a00"; g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 1.2566; g.lineTo(64 + Math.cos(a) * 17, 64 + Math.sin(a) * 17); } g.closePath(); g.fill();
  g.strokeStyle = "#6b4a00"; g.lineWidth = 4; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 1.2566; g.beginPath(); g.moveTo(64 + Math.cos(a) * 17, 64 + Math.sin(a) * 17); g.lineTo(64 + Math.cos(a) * 40, 64 + Math.sin(a) * 40); g.stroke(); }
  g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.ellipse(44, 40, 14, 7, -0.6, 0, 7); g.fill();
});
const coinGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.12, 30); coinGeo.rotateX(Math.PI / 2);
const coinSide = new THREE.MeshPhongMaterial({ color: 0xe0a800, specular: 0xffffff, shininess: 100, emissive: 0x4a3000, emissiveIntensity: 0.5 });
const coinCap = new THREE.MeshPhongMaterial({ map: coinFace, specular: 0xffffff, shininess: 80, emissive: 0x6b4a00, emissiveIntensity: 0.45 });
const rimGeo = new THREE.TorusGeometry(0.46, 0.055, 8, 30), rimMat = new THREE.MeshPhongMaterial({ color: 0xffd84a, specular: 0xffffff, shininess: 120, emissive: 0x6b4a00, emissiveIntensity: 0.5 });
function coinMesh() { const g = new THREE.Group(); g.add(new THREE.Mesh(coinGeo, [coinSide, coinCap, coinCap]), new THREE.Mesh(rimGeo, rimMat)); g.rotation.y = Math.random() * 6; return g; }
function add(kind, mesh, x, y, z, extra) { mesh.position.set(x, y, z); scene.add(mesh); const it = Object.assign({ kind, mesh, x, y, z, spin: kind === "coin" || kind === "power", gone: false }, extra || {}); items.push(it); return it; }
const coinAt = (lane, y, z) => add("coin", coinMesh(), LANES[lane], y, z, { baseY: y });

// the obstacles are referee cards: yellow ones to jump over, big red ones to go round, and one hanging overhead to slide under
function cardTex(col, edge) { return canvasTex(64, 96, (g, w, h) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); g.fillStyle = col; g.fillRect(4, 4, w - 8, h - 8); g.fillStyle = edge; g.globalAlpha = 0.22; g.fillRect(8, 8, 14, h - 16); g.globalAlpha = 1; }); }
const yellowMat = new THREE.MeshLambertMaterial({ map: cardTex("#ffd400", "#fff"), emissive: 0x4a3d00, emissiveIntensity: 0.5 });
const redMat = new THREE.MeshLambertMaterial({ map: cardTex("#e1102c", "#fff"), emissive: 0x3a0008, emissiveIntensity: 0.5 });
const cardGeo = (w, h) => new THREE.BoxGeometry(w, h, 0.14);
function barrier(lane, z) {                      // two yellow cards side by side: jump over them
  const g = new THREE.Group();
  for (const sx of [-0.55, 0.55]) { const c = new THREE.Mesh(cardGeo(1.0, 0.85), yellowMat); c.position.set(sx, 0.42, 0); c.rotation.z = sx * 0.12; g.add(c); }
  add("obs", g, LANES[lane], 0, z, { type: "barrier" });
}
function wall(lane, z) {                         // one tall red card: change lane
  const g = new THREE.Group(), c = new THREE.Mesh(cardGeo(1.5, 2.6), redMat); c.position.y = 1.3; g.add(c);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 0.6), new THREE.MeshLambertMaterial({ color: 0x333333 })); base.position.y = 0.09; g.add(base);
  add("obs", g, LANES[lane], 0, z, { type: "wall" });
}
function bar(lane, z) {                          // a yellow card hanging between two posts: slide under
  const g = new THREE.Group(), pm = new THREE.MeshLambertMaterial({ color: 0xdddddd });
  for (const sx of [-1.15, 1.15]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.9, 0.12), pm); p.position.set(sx, 0.95, 0); g.add(p); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.1), pm); top.position.y = 1.85; g.add(top);
  const c = new THREE.Mesh(cardGeo(1.7, 0.8), yellowMat); c.position.y = 1.4; g.add(c);
  add("obs", g, LANES[lane], 0, z, { type: "bar" });
}

// football-themed pick-ups. Each one helps a little, none of them gets in the way.
const TOYS = {
  ball: { name: "FOOTBALL", sub: "Kicked ahead: it collects every coin", icon: "⚽", col: 0x9fd0ff },
  boots: { name: "GOLDEN BOOTS", sub: "Sprint! Double distance points", icon: "👟", col: 0xffc933 },
  whistle: { name: "REFEREE WHISTLE", sub: "Play slows down", icon: "📣", col: 0xcfd5df },
  gloves: { name: "KEEPER GLOVES", sub: "Saves you from one card", icon: "🧤", col: 0x39d17a },
  trophy: { name: "GOLDEN TROPHY", sub: "Coins fly to you", icon: "🏆", col: 0xffc933 },
  rocket: { name: "ROCKET BOOTS", sub: "Fly over everything", icon: "🚀", col: 0xe5384a },
  scarf: { name: "FAN SCARF", sub: "An extra life", icon: "🧣", col: 0xff4d6d },
  num5: { name: "SHIRT NUMBER +5", sub: "Every coin is worth more", icon: "#", col: 0x3ddc7c },
  numx2: { name: "NUMBER DOUBLE!", sub: "Your shirt number doubles", icon: "#", col: 0xb04dff },
};
const ballTex = canvasTex(64, 32, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#222"; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(5 + i * 11, i % 2 ? 9 : 22, 4.5, 0, 7); g.fill(); } });
function badgeTex(text, col) { return canvasTex(128, 128, (g) => { g.fillStyle = "#" + col.toString(16).padStart(6, "0"); g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.lineWidth = 8; g.strokeStyle = "#fff"; g.stroke(); g.fillStyle = "#fff"; g.font = "700 62px Rajdhani, Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 64, 68); }); }
function toyMesh(type) {
  const g = new THREE.Group(), L = (c) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.15 });
  const S = (r, c, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), L(c)); m.position.set(x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1); g.add(m); return m; };
  const C = (rt, rb, h, c, x, y, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 14), L(c)); m.position.set(x, y, z); g.add(m); return m; };
  const B = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), L(c)); m.position.set(x, y, z); g.add(m); return m; };
  let billboard = false;
  if (type === "ball") g.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), new THREE.MeshLambertMaterial({ map: ballTex })));
  else if (type === "boots") { B(0.34, 0.2, 0.8, 0xffc933, 0, -0.12, 0.08); C(0.17, 0.2, 0.5, 0xffc933, 0, 0.12, -0.15); B(0.36, 0.06, 0.82, 0x6b4a00, 0, -0.25, 0.08); for (const sx of [-0.1, 0.1]) { B(0.04, 0.08, 0.06, 0xdddddd, sx, -0.3, 0.3); B(0.04, 0.08, 0.06, 0xdddddd, sx, -0.3, -0.1); } const w = B(0.04, 0.3, 0.5, 0xffffff, 0.2, 0.2, -0.2); w.rotation.z = -0.3; const w2 = B(0.04, 0.3, 0.5, 0xffffff, -0.2, 0.2, -0.2); w2.rotation.z = 0.3; g.rotation.y = 0.6; }
  else if (type === "whistle") { const b = C(0.24, 0.24, 0.5, 0x22252c, 0, 0, 0); b.rotation.z = Math.PI / 2; B(0.4, 0.2, 0.26, 0x22252c, 0.38, -0.02, 0); const r = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 6, 14), L(0xcfd5df)); r.position.set(-0.3, 0.2, 0); g.add(r); S(0.07, 0xffffff, 0, 0.22, 0.2); }
  else if (type === "gloves") { S(0.3, 0x39d17a, 0, 0, 0, 1, 1.1, 0.7); for (let k = -2; k <= 1; k++) S(0.09, 0x39d17a, k * 0.13 + 0.065, 0.36, 0, 1, 1.9, 1); S(0.1, 0x39d17a, 0.32, 0.05, 0, 1.6, 0.9, 1); B(0.5, 0.14, 0.3, 0xffffff, 0, -0.34, 0); }
  else if (type === "trophy") { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.16, 0.5, 16), L(0xffc933)); cup.position.y = 0.2; g.add(cup); C(0.06, 0.08, 0.3, 0xffc933, 0, -0.2, 0); C(0.22, 0.26, 0.1, 0xffc933, 0, -0.4, 0); for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 6, 12), L(0xffc933)); h.position.set(sx * 0.4, 0.22, 0); g.add(h); } }
  else if (type === "rocket") { C(0.22, 0.28, 0.9, 0xeeeeee, 0, 0, 0); const n = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 12), L(0xe5384a)); n.position.y = 0.65; g.add(n); for (const sx of [-1, 1]) B(0.4, 0.3, 0.05, 0xe5384a, sx * 0.28, -0.35, 0); g.rotation.z = 0.5; }
  else if (type === "scarf") { const t = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.13, 8, 18), L(0xd7102b)); g.add(t); for (let k = 0; k < 4; k++) { const st = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.135, 8, 3, 0.5), L(0xffffff)); st.rotation.z = k * 1.57; g.add(st); } B(0.2, 0.5, 0.06, 0xd7102b, 0.22, -0.4, 0.1); B(0.2, 0.5, 0.06, 0xffffff, 0.44, -0.4, 0.1); }
  else { const lab = type === "num5" ? "+5" : type === "num10" ? "+10" : "x2", col = TOYS[type].col; const tex = badgeTex(lab, col); for (const sz of [1, -1]) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.62, 28), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); m.position.z = 0.04 * sz; if (sz < 0) m.rotation.y = Math.PI; g.add(m); } billboard = true; }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.82, 24), new THREE.MeshBasicMaterial({ color: TOYS[type].col, transparent: true, opacity: 0.5, side: THREE.DoubleSide })); g.add(ring);
  g.scale.setScalar(1.25); g.userData.billboard = billboard; return g;
}
const toy = (type, lane, z) => { const m = toyMesh(type); return add("power", m, LANES[lane], 1.1, z, { type, baseY: 1.1, spin: !m.userData.billboard }); };

/* ---------------- building the road ahead ---------------- */
// The daily challenge builds the same pitch for everyone: its layout comes from a random-number
// generator seeded with today's date (UTC). Normal runs use Math.random.
let rng = Math.random, chunkNo = 0;
const R = () => rng(), rR = (a, b) => a + R() * (b - a), pR = (arr) => arr[Math.floor(R() * arr.length)];
function seeded(a) { return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seedOf(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const todayUTC = () => new Date().toISOString().slice(0, 10);
// people on the pitch: a referee crossing two lanes, a defender sliding in from the side, and a groundsman on his mower
function person(shirt, shorts, socks) {
  const g = new THREE.Group(), L = (c) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.15 });
  const part = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, L(c)); m.position.set(x, y, z); g.add(m); return m; };
  const legs = [-0.12, 0.12].map((x) => { const h = new THREE.Group(); h.position.set(x, 0.95, 0); const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.9, 8), L(socks)); sk.position.y = -0.45; h.add(sk); const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.26), L(0x151515)); b.position.set(0, -0.92, 0.05); h.add(b); g.add(h); return h; });
  part(new THREE.CylinderGeometry(0.2, 0.19, 0.28, 12), shorts, 0, 0.98, 0);
  part(new THREE.CylinderGeometry(0.23, 0.19, 0.6, 12), shirt, 0, 1.4, 0);
  part(new THREE.SphereGeometry(0.15, 14, 10), 0xf0c39c, 0, 1.86, 0); part(new THREE.SphereGeometry(0.155, 14, 10), 0x2a1d12, 0, 1.92, -0.02).scale.set(1, 0.6, 1);
  const arms = [-1, 1].map((sx) => { const h = new THREE.Group(); h.position.set(sx * 0.28, 1.65, 0); const a = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.6, 8), L(shirt)); a.position.y = -0.3; h.add(a); g.add(h); return h; });
  g.userData.legs = legs; g.userData.arms = arms; return g;
}
const warnTex = canvasTex(64, 64, (g) => { g.fillStyle = "#e1102c"; g.beginPath(); g.arc(32, 32, 29, 0, 7); g.fill(); g.lineWidth = 4; g.strokeStyle = "#fff"; g.stroke(); g.fillStyle = "#fff"; g.font = "700 44px Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", 32, 35); });
function referee(a, z) {                           // jogs back and forth across two lanes, holding up a yellow card: use the third lane
  const g = person(0x151515, 0x151515, 0x151515); g.scale.setScalar(1.2); const card = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.03), yellowMat); card.position.y = -0.66; g.userData.arms[1].add(card); g.userData.arms[1].rotation.x = -2.7;
  add("obs", g, (LANES[a] + LANES[a + 1]) / 2, 0, z, { type: "ref", laneA: a, t: R() * 6 });
}
function defender(lane, z) {                       // waits beside the pitch, then slides into the outside lane: jump over him
  const side = lane === 0 ? -1 : 1, g = person(0x6cabdd, 0xffffff, 0x6cabdd); g.scale.setScalar(1.2); g.rotation.order = "YXZ"; g.rotation.y = -side * Math.PI / 2;   // faces the middle of the pitch
  const w = new THREE.Sprite(new THREE.SpriteMaterial({ map: warnTex, depthTest: false })); w.scale.set(0.8, 0.8, 1); w.position.y = 2.6; g.add(w); g.userData.warn = w;
  add("obs", g, side * 6.2, 0, z, { type: "def", lane, side, slideT: -1 });
}
function mower(lane, z) {                          // a ride-on mower driving towards George: go round it
  const g = new THREE.Group(), M = (c) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.15 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.6, 1.6), M(0x2f8a3a)); body.position.y = 0.55; g.add(body);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.9), M(0x1d1d1d)); deck.position.set(0, 0.22, 0.55); g.add(deck);
  for (const [x, zz, r] of [[-0.62, -0.5, 0.36], [0.62, -0.5, 0.36], [-0.6, 0.6, 0.24], [0.6, 0.6, 0.24]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.22, 14), M(0x151515)); wh.rotation.z = Math.PI / 2; wh.position.set(x, r, zz); g.add(wh); }
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.5), M(0x151515)); seat.position.set(0, 0.92, -0.35); g.add(seat);
  const man = person(0xd8ff3a, 0x24324a, 0x24324a); man.scale.setScalar(0.9); man.position.set(0, 0.25, -0.35); man.userData.legs.forEach((l) => (l.rotation.x = -1.4)); g.add(man);
  add("obs", g, LANES[lane], 0, z, { type: "mower", vz: 3.5 });
}

const CHUNK = 34;
function difficulty() { return clamp((G.speed - 14) / 24, 0, 1); }
let safeChunks = 0, skyT = 0, skyLane = 1, skyN = 0;
function makeChunk(z0) {
  const safe = safeChunks > 0; if (safe) safeChunks--; chunkNo++;
  const d = G.daily ? clamp((chunkNo - 4) / 120, 0, 1) : difficulty(), p = safe ? 0.1 : R(), lane = Math.floor(R() * 3), others = [0, 1, 2].filter((l) => l !== lane);
  const line = (l, n, from, step, y) => { for (let i = 0; i < n; i++) coinAt(l, y || 0.9, from - i * (step || 2.3)); };
  const special = !safe && d > 0.08 && R() < 0.3;
  if (special) {
    const k = Math.floor(R() * 3);
    if (k === 0) { const a = Math.floor(R() * 2); referee(a, z0 - 16); line(a === 0 ? 2 : 0, 10, z0 - 4); }
    else if (k === 1) { const sl = R() < 0.5 ? 0 : 2; defender(sl, z0 - 16); for (let i = 0; i < 8; i++) coinAt(sl, 0.9 + Math.sin((i / 7) * Math.PI) * 1.7, z0 - 10 - i * 1.7); line(1, 6, z0 - 6); }
    else { const l = Math.floor(R() * 3); mower(l, z0 - 20); line(l === 1 ? 0 : 1, 8, z0 - 4); }
  }
  else if (p < 0.2) { line(lane, 9, z0 - 4); }
  else if (p < 0.4) { barrier(lane, z0 - 14); for (let i = 0; i < 8; i++) coinAt(lane, 0.9 + Math.sin((i / 7) * Math.PI) * 1.7, z0 - 8 - i * 1.7); line(others[0], 6, z0 - 6); }
  else if (p < 0.55) { wall(others[0], z0 - 14); wall(others[1], z0 - 14); line(lane, 10, z0 - 4); }
  else if (p < 0.7) { bar(lane, z0 - 14); line(lane, 3, z0 - 7); line(lane, 3, z0 - 19); line(others[1], 6, z0 - 6); if (d > 0.3) barrier(others[0], z0 - 14); }
  else if (p < 0.85) { for (let i = 0; i < 12; i++) coinAt(Math.round(1 + Math.sin(i * 0.8)), 0.9, z0 - 3 - i * 2.4); if (d > 0.2) { barrier(0, z0 - 18); barrier(2, z0 - 18); } }
  else { for (let r = 0; r < 4; r++) for (let l = 0; l < 3; l++) coinAt(l, 0.9, z0 - 5 - r * 3); if (d > 0.1) barrier(Math.floor(R() * 3), z0 - 22); }
  const extra = R() < 0.5, extraLane = Math.floor(R() * 3);
  if (!special && d > 0.5 && extra) wall(extraLane, z0 - 30);
  // a pick-up now and then: at most one per stretch of road, so it never gets crowded
  const give = R() < 0.5, bag = ["ball", "ball", "ball", "boots", "boots", "whistle", "whistle", "gloves", "gloves", "trophy", "trophy", "rocket", "rocket", "scarf", "num5", "num5", "num5", "numx2"];
  const t = pR(bag), tl = Math.floor(R() * 3), tz = z0 - rR(10, 26);
  if (give && (t !== "scarf" || G.lives < MAXL)) toy(t, tl, tz);
  const funRoll = R(), funLane = Math.floor(R() * 3), funZ = z0 - rR(6, 30), fs = SEASONS[seasonAt(G.dist - funZ) % 4].fun;   // the season George will be in when he gets here
  // never right next to another obstacle in the same lane, so there is always a way through
  if (fs && !safe && !special && funRoll < 0.55 && !items.some((o) => o.kind === "obs" && Math.abs(o.z - funZ) < 9 && Math.abs(o.x - LANES[funLane]) < 1.3)) funItem(fs, funLane, funZ);
}
function fillAhead() { while (spawnFront > -160) { makeChunk(spawnFront); spawnFront -= CHUNK; } }

/* ---------------- floating text and bursts ---------------- */
const sparks = [];
const sparkGeo = new THREE.SphereGeometry(0.06, 5, 4);
function burst(x, y, z, col, n) {
  if (reduced) return;
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true })); m.position.set(x, y, z); scene.add(m); sparks.push({ m, vx: rand(-3, 3), vy: rand(1, 5), vz: rand(-3, 3), life: rand(0.4, 0.8), max: 0.8 }); }
}
// grass kicked up when he slides
function dust(x) {
  if (reduced) return;
  const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xa9d88f, transparent: true })); m.scale.setScalar(0.55); m.position.set(x + rand(-0.25, 0.25), 0.08, 0.5); scene.add(m);
  sparks.push({ m, vx: rand(-1.2, 1.2), vy: rand(0.4, 1.6), vz: rand(0.5, 2), life: rand(0.35, 0.6), max: 0.6 });
}
function updateFx() {
  if (sliding > 0 && grounded && Math.random() < 0.7) dust(px);
}
function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt; s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt + G.speed * dt; s.vy -= 9 * dt; s.m.material.opacity = Math.max(0, s.life / s.max) * clamp((3.5 - s.m.position.z) / 2, 0, 1); if (s.life <= 0 || s.m.position.z > 3.5) { scene.remove(s.m); s.m.material.dispose(); sparks.splice(i, 1); } }
}

/* ---------------- power-ups and the top-of-screen feed ---------------- */
const P = { magnet: 0, rocket: 0, boots: 0, whistle: 0 };
const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.25, 18, 12), new THREE.MeshBasicMaterial({ color: 0x9fe3ff, transparent: true, opacity: 0.28 })); bubble.visible = false; scene.add(bubble);
const flame = []; for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); m.visible = false; scene.add(m); flame.push({ m, life: 0 }); }
let flameIdx = 0;
// short messages that slide in at the top left, one line each, and fade away on their own
const feedEl = $("feed");
function feedItem(icon, text, sub, cls) {
  const li = document.createElement("li"); li.className = "gr-fi " + (cls || "");
  li.innerHTML = `<i>${icon}</i><span><b>${text}</b>${sub ? `<small>${sub}</small>` : ""}</span>`;
  feedEl.appendChild(li); while (feedEl.children.length > 4) feedEl.firstChild.remove();
  const kill = () => { li.classList.add("out"); setTimeout(() => li.remove(), 400); }; li._timer = setTimeout(kill, 3000); li._kill = kill;
  return li;
}
function setNum(n) { G.num = clamp(Math.round(n), george.baseNum, 99); george.drawNumber(G.num); G.maxNum = Math.max(G.maxNum, G.num); }
function setAct(type, dur) { act = { type, t: dur, dur }; }
const AM = { gloves: "safehands", rocket: "moon" };
const UPG_KEY = "gz_run_upg_v1", UPG_COST = [40, 80, 140, 200], UPG_MAX = 4;
const UPG = [{ id: "rocket", icon: "🚀", name: "Rocket boots", base: 4.5, step: 1 }, { id: "trophy", icon: "🏆", name: "Golden trophy", base: 10, step: 2.5 }, { id: "boots", icon: "👟", name: "Golden boots", base: 6, step: 1.5 }];
const upgLevel = (id) => clamp(readJSON(UPG_KEY, {})[id] | 0, 0, UPG_MAX);
const powerTime = (id) => { const u = UPG.find((x) => x.id === id); return u.base + u.step * upgLevel(id); };
function shopCoins() { try { return window.GZR && GZR.ready ? GZR.coins() : 0; } catch (e) { return 0; } }
function renderUpgrades() {
  const coins = shopCoins();
  for (const el of [$("start-upg"), $("end-upg")]) if (el) el.innerHTML = `<li class="gr-upg-coins">You have <b>${coins} 🪙</b> shop coins</li>` + UPG.map((u) => { const l = upgLevel(u.id), cost = UPG_COST[l];
    return `<li><i>${u.icon}</i><span><b>${u.name}</b><small>Lasts ${powerTime(u.id)} s · ${"●".repeat(l)}${"○".repeat(UPG_MAX - l)}</small></span>${l >= UPG_MAX ? "<em>MAX</em>" : `<button class="gr-pill" type="button" data-upg="${u.id}"${coins >= cost ? "" : " disabled"}>${cost} 🪙</button>`}</li>`; }).join("");
}
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest("[data-upg]"); if (!b) return;
  const id = b.dataset.upg, l = upgLevel(id); if (l >= UPG_MAX || !window.GZR || !GZR.spend(UPG_COST[l])) return;
  const u = readJSON(UPG_KEY, {}); u[id] = l + 1; writeJSON(UPG_KEY, u); audio(); sfx.power(); renderUpgrades();
});
function givePower(type) {
  const T = TOYS[type]; if (AM[type]) ach(AM[type]); G.usedPower++; sfx.power(); burst(px, 1.2, 0, T.col, 14);
  if (type === "ball") { feedItem(T.icon, T.name, T.sub, "power"); kickT = 0.45; G.kicks++; sfx.kick(); ballFly = { z: -1.5, t: 0, last: -1.5, got: 0 }; return; }
  if (type === "boots") { P.boots = powerTime("boots"); setAct("flex", 0.6); }
  else if (type === "whistle") { P.whistle = 3; setAct("whistle", 0.9); }
  else if (type === "gloves") { G.shield = true; setAct("gloves", 0.9); }
  else if (type === "trophy") { P.magnet = powerTime("trophy"); setAct("trophy", 0.9); }
  else if (type === "rocket") { P.rocket = powerTime("rocket"); }
  else if (type === "scarf") { if (G.lives < MAXL) G.lives++; sfx.life(); setAct("cheer", 0.8); coachCheer(); }
  else {
    const before = G.num; setNum(type === "num5" ? G.num + 5 : G.num * 2); setAct("flex", 0.8);
    feedItem("#", "#" + before + " → #" + G.num, "Every coin is now worth " + G.num, "num"); return;
  }
  feedItem(T.icon, T.name, T.sub, "power");
}
function takeCoin(it, bonus) {
  it.gone = true; G.streak++;
  const n = 1, value = G.num * (bonus || 1);
  G.coins += n; G.score += value; reachT = 0.22; ach("firsttouch"); if (G.streak >= 3) ach("hattrick"); if (G.streak >= 11) ach("fullteam"); if (G.streak >= 25) ach("goldenboot"); if (G.streak >= 50) ach("unplayable"); if (G.streak >= 100) ach("invincibles"); sfx.coin(G.streak); burst(it.mesh.position.x, it.mesh.position.y, it.mesh.position.z, 0xffd84a, 3);
  if (G.streak === 25 || G.streak === 50 || G.streak === 100 || G.streak === 200) feedItem("🔥", "COIN FEVER!", G.streak + " coins without a card", "big");
}

/* ---------------- input ---------------- */
function goLane(d) { if (paused) return; const n = clamp(laneIdx + d, 0, 2); if (n !== laneIdx) { laneIdx = n; G.lanes++; } }
let jumpBuf = 0, coyote = 0, jumpStyle = "tuck";
function jump() { if (G.phase !== "play" || paused) return; if ((grounded || coyote > 0) && !(P.rocket > 0)) { coyote = 0; jumpStyle = pick(["tuck", "bicycle", "bicycle", "header", "header", "star"]); vy = 10.2; grounded = false; sliding = 0; G.jumps++; sfx.jump(); } else jumpBuf = 0.15; }
function slide() { if (G.phase !== "play" || paused) return; if (!grounded) vy = Math.min(vy, -14); if (!(P.rocket > 0)) { sliding = 0.7; G.slides++; sfx.slide(); } }
window.addEventListener("keydown", (e) => {
  if (G.phase !== "play") return;
  const k = e.key;
  if (contOpen) { if (k === "Enter" || k === " ") acceptContinue(); else if (k === "Escape") declineContinue(); e.preventDefault(); return; }
  if (k === "p" || k === "P" || k === "Escape") { setPause(!paused); return; }
  if (paused) return;
  if (k === "ArrowLeft" || k === "a" || k === "A") goLane(-1); else if (k === "ArrowRight" || k === "d" || k === "D") goLane(1);
  else if (k === "ArrowUp" || k === "w" || k === "W" || k === " ") { jump(); e.preventDefault(); } else if (k === "ArrowDown" || k === "s" || k === "S") { slide(); e.preventDefault(); }
});
let baseFov = 60;
let sx = 0, sy = 0, st = 0, swiping = false;
canvas.addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; st = performance.now(); swiping = true; canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
canvas.addEventListener("pointermove", (e) => {
  if (!swiping || G.phase !== "play" || paused) return;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) { goLane(dx > 0 ? 1 : -1); sx = e.clientX; sy = e.clientY; }
  else if (dy < -34 && Math.abs(dy) > Math.abs(dx)) { jump(); sx = e.clientX; sy = e.clientY; }
  else if (dy > 34 && Math.abs(dy) > Math.abs(dx)) { slide(); sx = e.clientX; sy = e.clientY; }
});
canvas.addEventListener("pointerup", () => { swiping = false; }); canvas.addEventListener("pointercancel", () => { swiping = false; });

/* ---------------- George's animations ---------------- */
let phase = 0, landT = 0, reachT = 0, celeFlip = false;
function animate(dt) {
  const g = george, flying = P.rocket > 0, sprint = P.boots > 0 && !flying;
  const w = G.phase === "menu" ? 9 : 9 + G.speed * 0.13 * (sprint ? 1.1 : 1);
  phase += dt * w;
  const s = Math.sin(phase), run = G.phase !== "over";
  g.armL.rotation.z = g.armR.rotation.z = 0; g.legL.rotation.z = g.legR.rotation.z = 0; g.head.rotation.set(-0.12, 0, 0);
  g.body.rotation.set(0, 0, 0); g.body.position.y = 0; g.elbowL.rotation.x = g.elbowR.rotation.x = -(0.9 + 0.3 * Math.abs(s));
  // the running stride
  g.legL.rotation.x = -s * 1.0; g.legR.rotation.x = s * 1.0;
  g.kneeL.rotation.x = 1.2 * Math.max(0, Math.cos(phase)); g.kneeR.rotation.x = 1.2 * Math.max(0, -Math.cos(phase));
  g.armL.rotation.x = s * 0.9; g.armR.rotation.x = -s * 0.9;
  g.body.rotation.x = 0.22; g.body.rotation.y = s * 0.15; g.body.position.y = Math.abs(Math.cos(phase)) * 0.08;
  if (sprint) { g.body.rotation.x = 0.5; g.legL.rotation.x = -s * 1.25; g.legR.rotation.x = s * 1.25; g.armL.rotation.x = s * 1.3; g.armR.rotation.x = -s * 1.3; g.elbowL.rotation.x = g.elbowR.rotation.x = -1.7; }
  if (!grounded && !flying) {                                          // in the air: a different move each jump
    const up = clamp(vy / 10, -1, 1), pa = clamp((10.2 - vy) / 20.4, 0, 1), arc = Math.sin(pa * Math.PI);
    if (jumpStyle === "bicycle") {                                       // overhead bicycle kick
      g.body.rotation.x = -1.25 * arc; g.body.position.y = 0.35 * arc;
      g.legR.rotation.x = -2.5 * arc - 0.3; g.kneeR.rotation.x = 0.25; g.legL.rotation.x = -0.3 * arc; g.kneeL.rotation.x = 1.5 * arc;
      g.armL.rotation.x = g.armR.rotation.x = -0.4; g.armL.rotation.z = -1.2 * arc; g.armR.rotation.z = 1.2 * arc; g.head.rotation.x = 0.35 * arc;
    } else if (jumpStyle === "header") {                                 // diving header
      g.body.rotation.x = 0.35 + 0.75 * arc; g.body.position.y = 0.1;
      g.legL.rotation.x = 0.7; g.kneeL.rotation.x = 0.9; g.legR.rotation.x = 0.95; g.kneeR.rotation.x = 0.4;
      g.armL.rotation.x = g.armR.rotation.x = 0.7; g.armL.rotation.z = -0.5; g.armR.rotation.z = 0.5; g.elbowL.rotation.x = g.elbowR.rotation.x = -0.4; g.head.rotation.x = -0.12 - 0.55 * arc;
    } else if (jumpStyle === "star") {                                   // star jump
      g.legL.rotation.x = g.legR.rotation.x = -0.1; g.legL.rotation.z = -0.55 * arc; g.legR.rotation.z = 0.55 * arc; g.kneeL.rotation.x = g.kneeR.rotation.x = 0.3;
      g.armL.rotation.x = g.armR.rotation.x = -0.2; g.armL.rotation.z = -1.7 * arc; g.armR.rotation.z = 1.7 * arc; g.elbowL.rotation.x = g.elbowR.rotation.x = -0.2; g.body.rotation.x = 0.05; g.body.position.y = 0;
    } else {
      g.legL.rotation.x = -1.1; g.kneeL.rotation.x = 1.4; g.legR.rotation.x = 0.35; g.kneeR.rotation.x = 0.6;
      g.armL.rotation.x = g.armR.rotation.x = -2.5 + 0.5 * up; g.armL.rotation.z = -0.4; g.armR.rotation.z = 0.4; g.body.rotation.x = 0.12 - 0.2 * up; g.body.position.y = 0;
    }
  }
  if (sliding > 0) {                                                    // slide tackle: one leg out straight, the other tucked under
    g.body.rotation.x = -1.0; g.body.position.y = -0.3; g.legR.rotation.x = -0.75; g.kneeR.rotation.x = 0; g.legL.rotation.x = 0.15; g.kneeL.rotation.x = 1.9;
    g.armL.rotation.x = 0.3; g.armL.rotation.z = -1.3; g.armR.rotation.x = 0.9; g.armR.rotation.z = 0.5; g.head.rotation.x = 0.25;
  }
  if (kickT > 0) { kickT -= dt; const u = 1 - kickT / 0.45; g.legR.rotation.x = -0.4 - 1.5 * Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.8); g.kneeR.rotation.x = u < 0.3 ? 1.3 : 0.1; g.body.rotation.x = 0.1; g.armL.rotation.z = -0.8; g.armR.rotation.z = 0.8; }
  if (P.magnet > 0 && !flying) { g.armL.rotation.z = -1.3; g.armR.rotation.z = 1.3; g.armL.rotation.x = g.armR.rotation.x = -0.5; }
  g.cape.visible = flying;
  if (flying) {                                                         // Superman: horizontal, fist forward, cape streaming
    const bob = Math.sin(clock * 3);
    g.body.rotation.x = 1.45 + bob * 0.05; g.body.position.y = 0.75 + bob * 0.12; g.body.rotation.y = 0;
    g.armR.rotation.x = -3.1; g.armR.rotation.z = 0.05; g.elbowR.rotation.x = -0.05; g.armL.rotation.x = -0.35; g.armL.rotation.z = -0.25; g.elbowL.rotation.x = -0.2;
    g.legL.rotation.x = g.legR.rotation.x = 0.12; g.legL.rotation.z = -0.05; g.legR.rotation.z = 0.05; g.kneeL.rotation.x = 0.35 + Math.sin(clock * 9) * 0.15; g.kneeR.rotation.x = 0.35 - Math.sin(clock * 9) * 0.15; g.head.rotation.x = -0.9;
    const pos = g.capeGeo.attributes.position, b = g.capeBase;
    for (let i = 0; i < pos.count; i++) { const y = b[i * 3 + 1], k = (0.425 - y) / 0.85; pos.setZ(i, Math.sin(clock * 18 + y * 9 + b[i * 3] * 5) * 0.09 * k - k * k * 0.12); pos.setX(i, b[i * 3] * (1 + k * 0.35)); }
    pos.needsUpdate = true; g.cape.rotation.x = -0.85; g.cape.scale.set(0.8, 0.75, 1);
  }
  if (act.t > 0) {                                                      // a pose for each thing George picks up
    act.t -= dt; const u = clamp(1 - act.t / act.dur, 0, 1), ps = Math.sin(u * Math.PI);
    if (act.type === "whistle") { g.armR.rotation.x = -2.3 * ps; g.elbowR.rotation.x = -2.4 * ps; g.armR.rotation.z = -0.25 * ps; g.head.rotation.x = -0.12 - 0.25 * ps; }
    else if (act.type === "gloves") { g.armL.rotation.z = -1.4 * ps; g.armR.rotation.z = 1.4 * ps; g.armL.rotation.x = g.armR.rotation.x = -0.9 * ps; g.body.rotation.x = 0.2 + 0.3 * ps; g.legL.rotation.z = -0.35 * ps; g.legR.rotation.z = 0.35 * ps; }
    else if (act.type === "trophy") { g.armL.rotation.x = g.armR.rotation.x = -3.0 * ps; g.armL.rotation.z = -0.3 * ps; g.armR.rotation.z = 0.3 * ps; g.body.position.y += ps * 0.2; }
    else if (act.type === "cheer") { g.armL.rotation.x = g.armR.rotation.x = -3.0 * ps; g.body.position.y = Math.abs(Math.sin(clock * 12)) * 0.25 * ps; }
    else if (act.type === "flex") { g.armL.rotation.z = -1.3 * ps; g.armR.rotation.z = 1.3 * ps; g.elbowL.rotation.x = g.elbowR.rotation.x = -2.2 * ps; g.armL.rotation.x = g.armR.rotation.x = -0.3 * ps; }
  }
  if (landT > 0) { landT -= dt; const ps = Math.sin(clamp(1 - landT / 0.22, 0, 1) * Math.PI); g.body.position.y -= 0.14 * ps; g.kneeL.rotation.x += 0.9 * ps; g.kneeR.rotation.x += 0.9 * ps; g.body.rotation.x += 0.18 * ps; }   // squash on landing
  if (reachT > 0) { reachT -= dt; const ps = Math.sin(clamp(1 - reachT / 0.22, 0, 1) * Math.PI); g.armR.rotation.x -= 0.9 * ps; g.elbowR.rotation.x += 0.7 * ps; }          // a little reach for the coin
  if (celeT > 0) {
    celeT -= dt;
    if (celeFlip) { const u = clamp(1 - celeT / 0.8, 0, 1); g.body.rotation.x = -u * Math.PI * 2; g.body.position.y = Math.sin(u * Math.PI) * 1.0; g.armL.rotation.x = g.armR.rotation.x = -2.6 * (1 - u * 0.6); g.kneeL.rotation.x = g.kneeR.rotation.x = 1.4; }   // a backflip at every 1,000 m
    else { g.armL.rotation.x = g.armR.rotation.x = -3.0; g.armL.rotation.z = -0.4; g.armR.rotation.z = 0.4; g.body.position.y = Math.abs(Math.sin(clock * 12)) * 0.25; }
  }
  if (stumble > 0) { stumble -= dt; const u = 1 - stumble / 0.9; g.body.rotation.x = 0.4 + Math.sin(u * Math.PI) * 1.0; g.armL.rotation.x = g.armR.rotation.x = -1.2; g.armL.rotation.z = -1.0; g.armR.rotation.z = 1.0; g.legL.rotation.x = 0.8; g.legR.rotation.x = -0.6; g.body.rotation.y = u * 2.2; }
  if (!run) { g.body.rotation.set(1.1, 0, 0); g.body.position.y = -0.4; g.legL.rotation.x = g.legR.rotation.x = 0.4; g.armL.rotation.z = -1.1; g.armR.rotation.z = 1.1; g.armL.rotation.x = g.armR.rotation.x = -0.3; }
}

/* ---------------- seasons: every 800 m a new season, with its own sky, pitch, weather and song ---------------- */
const SEASON_M = 800;
const SEASONS = [
  { name: "Summer", icon: "☀️", sky: 0x7db4ee, grass: 0x2f9a35, pitch: 0xffffff, hemi: 2.4, sun: 1.5, weather: null, fun: null, hint: "" },
  { name: "Autumn", icon: "🍂", sky: 0xe7a06e, grass: 0x6e8a2c, pitch: 0xf3e7c4, hemi: 2.0, sun: 1.15, weather: "leaves", fun: "leaves", hint: "Jump the leaf piles!" },
  { name: "Winter", icon: "❄️", sky: 0x101c3e, grass: 0x6f8f86, pitch: 0xdde9f2, hemi: 1.1, sun: 0.3, weather: "snow", fun: "snow", hint: "Jump the snow piles!" },
  { name: "Spring", icon: "🌧️", sky: 0x8b9db0, grass: 0x3aa245, pitch: 0xffffff, hemi: 1.9, sun: 0.9, weather: "rain", fun: "puddle", hint: "Jump the puddles!" },
];
const seasonAt = (m) => Math.floor(Math.max(0, m) / SEASON_M);
const cA = new THREE.Color(), cB = new THREE.Color(), hemi = scene.children.find((o) => o.isHemisphereLight);
let wType = null, wK = 0;
function applySky() {
  const n = seasonAt(G.dist), cur = SEASONS[n % 4], prev = n > 0 ? SEASONS[(n + 3) % 4] : cur, t = clamp((G.dist - n * SEASON_M) / 70, 0, 1);   // blend over the first 70 m
  cA.set(prev.sky); cB.set(cur.sky); cA.lerp(cB, t); scene.background.copy(cA); scene.fog.color.copy(cA);
  cA.set(prev.grass); cB.set(cur.grass); cA.lerp(cB, t); ground.material.color.copy(cA);
  const hi = lerp(prev.hemi, cur.hemi, t); if (hemi) hemi.intensity = hi; sun.intensity = lerp(prev.sun, cur.sun, t);
  const dayK = clamp((hi - 1.0) / 1.4, 0, 1);
  for (const m of crowdMats) m.color.setScalar(0.4 + 0.6 * dayK); for (const m of boardMats) m.color.setScalar(0.5 + 0.5 * dayK);
  cA.set(prev.pitch); cB.set(cur.pitch); cA.lerp(cB, t).multiplyScalar(0.55 + 0.45 * dayK); road.material.color.copy(cA);
  lampMat.color.setRGB(1, 0.85 + 0.15 * (1 - dayK), 0.6 + 0.3 * (1 - dayK)); lampMat.color.multiplyScalar(0.55 + 0.45 * (1 - dayK) * 1.2);
  if (prev.weather !== cur.weather && t < 0.5) { wType = prev.weather; wK = 1 - 2 * t; } else { wType = cur.weather; wK = prev.weather === cur.weather ? 1 : clamp(2 * t - 1, 0, 1); }
}
// falling leaves, snow and rain
const WN = 260, wPos = new Float32Array(WN * 3), wGeo = new THREE.BufferGeometry(); wGeo.setAttribute("position", new THREE.BufferAttribute(wPos, 3));
for (let i = 0; i < WN; i++) { wPos[i * 3] = rand(-16, 16); wPos[i * 3 + 1] = rand(0, 14); wPos[i * 3 + 2] = rand(-70, 8); }
const dotTex = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 15); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
const wMat = new THREE.PointsMaterial({ map: dotTex, transparent: true, depthWrite: false, size: 0.2, color: 0xffffff, opacity: 0 });
const weather = new THREE.Points(wGeo, wMat); weather.frustumCulled = false; weather.visible = false; scene.add(weather);
const WX = { leaves: { col: 0xe0782a, size: 0.34, fall: 1.4, sway: 1.4, op: 0.95 }, snow: { col: 0xffffff, size: 0.22, fall: 2.2, sway: 0.6, op: 0.95 }, rain: { col: 0xd6e6ff, size: 0.15, fall: 16, sway: 0, op: 0.9 } };
function updateWeather(dt, sp) {
  const w = WX[wType]; weather.visible = !!w && wK > 0.02 && !reduced; if (!weather.visible) return;
  wMat.color.setHex(w.col); wMat.size = w.size; wMat.opacity = wK * w.op;
  for (let i = 0; i < WN; i++) {
    const j = i * 3; wPos[j + 1] -= w.fall * dt; wPos[j] += Math.sin(clock * 1.3 + i) * w.sway * dt; wPos[j + 2] += sp * dt * 0.9;
    if (wPos[j + 1] < 0 || wPos[j + 2] > 3) { wPos[j] = rand(-16, 16); wPos[j + 1] = rand(5, 14); wPos[j + 2] = rand(-70, 0); }
  }
  wGeo.attributes.position.needsUpdate = true;
}
// a big "SEASON 2 · AUTUMN" banner, a fanfare, and the new season's song
function announceSeason(n) {
  const S = SEASONS[n % 4], el = $("season"); wantSong = n % 4; songLap = Math.floor(n / 4);
  $("season-n").textContent = "SEASON " + (n + 1); $("season-name").textContent = S.icon + " " + S.name.toUpperCase();
  $("season-sub").textContent = "♪ " + SONGS[n % 4].name + (S.hint ? " · " + S.hint : "");
  el.hidden = false; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show"); clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 2900);
  if (n > 0) { sfx.season(); if (n >= 3) ach("allseasons"); }
}
// puddles, snow piles and leaf piles: jump over them, or they cost a life
const funGeo = { puddle: new THREE.CircleGeometry(0.8, 22), mound: new THREE.SphereGeometry(0.7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), leaf: new THREE.BoxGeometry(0.22, 0.03, 0.14) };
const funMat = { puddle: new THREE.MeshPhongMaterial({ color: 0x5f8fc0, shininess: 120, specular: 0xffffff, transparent: true, opacity: 0.85 }), snow: new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x2a3a4a, emissiveIntensity: 0.6 }), leaves: new THREE.MeshLambertMaterial({ color: 0xc8641e, emissive: 0x3a1a00, emissiveIntensity: 0.4 }), leafCols: [0xe0782a, 0xc23b22, 0xf2b134].map((c) => new THREE.MeshLambertMaterial({ color: c })) };
function funItem(kind, lane, z) {
  const g = new THREE.Group();
  if (kind === "puddle") { const m = new THREE.Mesh(funGeo.puddle, funMat.puddle); m.rotation.x = -Math.PI / 2; m.scale.set(1, 1.6, 1); m.position.y = 0.025; g.add(m); }
  else { const m = new THREE.Mesh(funGeo.mound, funMat[kind]); m.scale.set(1, 0.6, 1.1); g.add(m); if (kind === "leaves") for (let k = 0; k < 7; k++) { const l = new THREE.Mesh(funGeo.leaf, funMat.leafCols[k % 3]); l.position.set(rand(-0.45, 0.45), 0.3 + rand(0, 0.12), rand(-0.45, 0.45)); l.rotation.set(rand(-0.6, 0.6), rand(0, 3), rand(-0.6, 0.6)); g.add(l); } }
  add("obs", g, LANES[lane], 0, z, { type: kind });
}

/* ---------------- goals for each run ---------------- */
const MISSIONS = [
  { id: "c40", text: "Collect 40 coins", ok: (r) => r.coins >= 40 }, { id: "c100", text: "Collect 100 coins", ok: (r) => r.coins >= 100 },
  { id: "d600", text: "Run 600 m", ok: (r) => r.dist >= 600 }, { id: "d1200", text: "Run 1,200 m", ok: (r) => r.dist >= 1200 },
  { id: "p3", text: "Pick up 3 power-ups", ok: (r) => r.power >= 3 }, { id: "k2", text: "Kick the football twice", ok: (r) => r.kicks >= 2 },
  { id: "n20", text: "Get your shirt number up to 20", ok: (r) => r.maxNum >= 20 }, { id: "nohit", text: "Run 300 m without a card", ok: (r) => r.noHit && r.dist >= 300 },
];
let goals = [];
function newGoals() { goals = MISSIONS.slice().sort(() => Math.random() - 0.5).slice(0, 3); $("missions").innerHTML = goals.map((m) => `<li>🎯 ${m.text}</li>`).join(""); }

/* ---------------- the game loop ---------------- */
let clock = 0, last = 0, raf = 0, roadScroll = 0;
const camPos = new THREE.Vector3(0, 4.2, 7.6);
function top3() { return readJSON(TOP_KEY, []).slice(0, 3); }
function renderTop(el) {
  const t = top3();
  el.innerHTML = t.length ? t.map((r, i) => `<li><b>${["🥇", "🥈", "🥉"][i]}</b><span>${r.s.toLocaleString("en-GB")}</span><small>${r.m} m</small></li>`).join("") : "<li class=\"empty\"><span>No scores yet</span></li>";
}
function chips() {
  const c = [];
  if (G.shield) c.push("🧤"); if (P.rocket > 0) c.push("🚀 " + Math.ceil(P.rocket));
  if (P.magnet > 0) c.push("🏆 " + Math.ceil(P.magnet)); if (P.boots > 0) c.push("👟 " + Math.ceil(P.boots)); if (P.whistle > 0) c.push("📣"); if (ballFly) c.push("⚽");
  return c.join("   ");
}
function setHud() {
  $("hud-score").textContent = Math.floor(G.score).toLocaleString("en-GB");
  $("hud-coins").textContent = G.coins; $("hud-dist").textContent = SEASONS[seasonAt(G.dist) % 4].icon + " " + Math.floor(G.dist) + " m";
  $("hud-lives").textContent = "❤".repeat(G.lives) + "♡".repeat(Math.max(0, MAXL - G.lives));
  $("hud-mult").textContent = "#" + G.num;
  $("hud-power").textContent = chips();
  const t = top3(), n = t.filter((r) => r.s > G.score).length;
  $("hud-rank").textContent = G.phase === "play" ? (n < 3 ? "#" + (n + 1) + " right now" : "") : "";
}
let bestShown = false, bestM = 0;
// "YOUR BEST" banner across the pitch, at the furthest George has ever run
const bestGate = new THREE.Group(); bestGate.visible = false; scene.add(bestGate);
const bestTex = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 64; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
{
  const pm = new THREE.MeshLambertMaterial({ color: 0xffffff });
  for (const x of [-4.5, 4.5]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.8, 8), pm); p.position.set(x, 1.9, 0); bestGate.add(p); }
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.1), new THREE.MeshBasicMaterial({ map: bestTex, side: THREE.DoubleSide })); ban.position.y = 3.3; bestGate.add(ban);
}
function drawBest(m) {
  const g = bestTex.image.getContext("2d"), w = 512, h = 64;
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#ffffff" : "#d7102b"; g.fillRect(i * w / 8, 0, w / 8, h); }
  g.fillStyle = "#d7102b"; g.fillRect(96, 6, 320, 52); g.fillStyle = "#fff"; g.font = "700 34px Rajdhani, Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("YOUR BEST · " + m.toLocaleString("en-GB") + " m", w / 2, h / 2 + 2); bestTex.needsUpdate = true;
}
function reset() {
  for (const it of items) scene.remove(it.mesh); items.length = 0; feedEl.innerHTML = "";
  G.speed = 15; G.dist = 0; G.coins = 0; G.score = 0; G.lives = 4; G.t = 0; G.streak = 0; G.invuln = 0; G.shield = false; G.nextMile = 1000; G.usedPower = 0; G.kicks = 0; G.noHit = true; G.jumps = G.slides = G.lanes = 0; G.achT = 0; G.funs = 0; G.season = 0; wantSong = 0; songLap = 0; jumpBuf = coyote = 0; newAch = []; landT = reachT = 0;
  P.magnet = P.rocket = P.boots = P.whistle = 0; ballFly = null; goalT = 0; goalGrp.visible = false; coach.visible = false; hintT = 0; $("hint").hidden = true; laneIdx = 1; px = 0; py = 0; vy = 0; sliding = 0; grounded = true; stumble = kickT = celeT = 0; act.t = 0; tempoBoost = 0;
  G.num = george.baseNum; G.maxNum = G.num; george.drawNumber(G.num);
  rng = G.daily ? seeded(seedOf("georges-run:" + todayUTC())) : Math.random; chunkNo = 0; G.continued = false; skyT = 0;
  safeChunks = 3; bestShown = false; bestM = SAVE.bestDist || Math.max(0, ...readJSON(TOP_KEY, []).map((r) => r.m || 0)); bestGate.visible = false; if (bestM > 100) drawBest(bestM); spawnFront = -30; fillAhead(); applySky();
}
// once per run, George can pay some of his shop coins to keep going
const CONT_COST = 50; let contOpen = false, contTimer = 0;
function canContinue() { try { return !G.continued && !!(window.GZR && GZR.ready && GZR.coins() >= CONT_COST); } catch (e) { return false; } }
function offerContinue() {
  contOpen = true; paused = true; setHud(); let n = 6; $("cont-n").textContent = n; $("cont-have").textContent = GZR.coins(); $("cont").hidden = false;
  clearInterval(contTimer); contTimer = setInterval(() => { n--; $("cont-n").textContent = n; if (n <= 0) declineContinue(); }, 1000);
}
function closeCont() { clearInterval(contTimer); contOpen = false; $("cont").hidden = true; }
function acceptContinue() {
  if (!contOpen) return; closeCont(); paused = false;
  if (!GZR.spend(CONT_COST)) { gameOver(); return; }
  G.continued = true; G.lives = 1; G.invuln = 3; stumble = 0;
  for (const it of items) if (it.kind === "obs" && !it.gone && it.z > -30) { it.gone = true; scene.remove(it.mesh); }
  feedItem("💪", "BACK IN THE GAME!", CONT_COST + " shop coins spent", "power"); sfx.life(); coachCheer();
}
function declineContinue() { if (!contOpen) return; closeCont(); paused = false; gameOver(); }
$("btn-cont").addEventListener("click", acceptContinue); $("btn-nocont").addEventListener("click", declineContinue);
const TOUCH = (() => { try { return matchMedia("(pointer: coarse)").matches; } catch (e) { return true; } })();
const HINTS = {
  barrier: [TOUCH ? "👆 Swipe UP" : "⬆️ Press UP", "to jump the yellow cards"], wall: [TOUCH ? "👈 👉 Swipe" : "⬅️ ➡️ Press", "to go round the red card"], bar: [TOUCH ? "👇 Swipe DOWN" : "⬇️ Press DOWN", "to slide under"],
  ref: ["👈 👉", "use the lane the referee isn't in"], def: [TOUCH ? "👆 Swipe UP" : "⬆️ Press UP", "to jump the sliding defender"], mower: ["👈 👉", "go round the mower"],
  puddle: [TOUCH ? "👆 Swipe UP" : "⬆️ Press UP", "to jump the puddles"], snow: [TOUCH ? "👆 Swipe UP" : "⬆️ Press UP", "to jump the snow piles"], leaves: [TOUCH ? "👆 Swipe UP" : "⬆️ Press UP", "to jump the leaf piles"],
};
let hintT = 0;
function showHint(type) {
  SAVE.hints = SAVE.hints || {}; SAVE.hints[type] = 1; writeJSON(RUN_KEY, SAVE);
  const el = $("hint"), h = HINTS[type]; el.innerHTML = "<b>" + h[0] + "</b> " + h[1]; el.hidden = false; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show"); hintT = 2.2;
}
function hurt(it) {
  if (G.phase !== "play" || G.invuln > 0) return;
  if (G.shield) { G.shield = false; G.invuln = 1.2; burst(px, 1.2, 0, 0x9fe3ff, 18); sfx.power(); feedItem("🧤", "SAVED!", "The gloves stopped the card", "power"); it.gone = true; scene.remove(it.mesh); return; }
  flash("hit"); G.lives--; try { if (navigator.vibrate) navigator.vibrate(G.lives <= 0 ? [90, 60, 180] : 120); } catch (e) {} G.noHit = false; G.invuln = 3; stumble = 0.9; G.streak = 0; shake = 0.5; G.speed = Math.max(14, G.speed * 0.78); sfx.hit(); burst(px, 1, 0, 0xff6b6b, 14);
  const was = G.num; setNum(Math.max(george.baseNum, G.num - 5));
  if (G.lives <= 0) { if (canContinue()) offerContinue(); else gameOver(); return; }
  const WX_HIT = { puddle: ["💦", "SPLASHED!", 0x7fb6ff], snow: ["☃️", "SNOWED UNDER!", 0xffffff], leaves: ["🍂", "LEAF PILE!", 0xe07a24] }[it.type];
  if (WX_HIT) { burst(px, 0.4, 0, WX_HIT[2], 16); sfx.splash(it.type); }
  feedItem(WX_HIT ? WX_HIT[0] : it.type === "wall" ? "🟥" : it.type === "ref" ? "🧑‍⚖️" : it.type === "def" ? "🦵" : it.type === "mower" ? "🚜" : "🟨", WX_HIT ? WX_HIT[1] : it.type === "def" ? "TACKLED!" : it.type === "mower" ? "MOWED DOWN!" : "CARD!", G.lives + (G.lives === 1 ? " life left" : " lives left") + (G.num < was ? " · shirt number #" + G.num : ""), "bad");
}
function update(dt) {
  G.t += dt;
  // faster and faster
  G.speed = Math.min(40, G.speed + dt * (P.rocket > 0 ? 0 : 0.15 + difficulty() * 0.06));
  const sp = G.speed * (P.rocket > 0 ? 1.45 : P.boots > 0 ? 1.35 : 1);
  G.dist += sp * dt; G.score += sp * dt * 0.5 * (P.boots > 0 ? 2 : 1);
  tempoBoost = Math.min(34, (G.speed - 15) * 1.2);
  if (bestM > 100) {
    const z = G.dist - bestM; bestGate.visible = z > -170 && z < 12; bestGate.position.z = z;
    if (!bestShown && z >= 0) { bestShown = true; feedItem("🎉", "PAST YOUR BEST!", "Further than ever before", "big"); sfx.goal(); burst(px, 2, 0, 0xffd84a, 14); burst(px, 2, 0, 0xd7102b, 14); }
  }
  G.achT -= dt; if (G.achT <= 0) { G.achT = 0.3; const d = G.dist; if (d >= 100) ach("warmup"); if (d >= 500) ach("halftime"); if (d >= 1000) ach("fulltime"); if (d >= 2000) ach("extratime"); if (d >= 3000) ach("penalties"); if (G.noHit && d >= 300) ach("cleansheet"); if (G.num >= 15) ach("squad"); if (G.num >= 25) ach("legend"); if (G.num >= 50) ach("retired"); if (G.score >= 5000) ach("bigscore"); if (G.jumps >= 20) ach("acrobat"); if (G.slides >= 10) ach("slider"); if (G.lanes >= 30) ach("dribbler"); if (G.kicks >= 3) ach("freekick"); if (G.coins >= 100) ach("century"); }
  if (G.dist >= G.nextMile) { sfx.milestone(); celeT = 0.8; celeFlip = true; if (G.lives < MAXL) { G.lives++; sfx.life(); feedItem("❤", "EXTRA LIFE!", "Reward for " + G.nextMile.toLocaleString("en-GB") + " m", "power"); coachCheer(); } G.nextMile += 1000; }
  for (const k of ["magnet", "rocket", "boots", "whistle"]) if (P[k] > 0) { P[k] -= dt; if (P[k] <= 0) P[k] = 0; }
  G.invuln = Math.max(0, G.invuln - dt);
  // George: lane, jump, slide
  px = lerp(px, LANES[laneIdx], 1 - Math.exp(-14 * dt));
  if (P.rocket > 0) { py = lerp(py, 3.4, 1 - Math.exp(-5 * dt)); vy = 0; grounded = false; }
  else { if (!grounded || py > 0) { const v0 = vy; vy -= 28 * dt; py += vy * dt; if (py <= 0) { py = 0; vy = 0; grounded = true; if (v0 < -4) { landT = 0.22; burst(px, 0.1, 0, 0x8fd18f, 5); } } } else grounded = true; }
  if (sliding > 0) sliding -= dt;
  coyote = grounded ? 0.1 : Math.max(0, coyote - dt); jumpBuf -= dt; if (jumpBuf > 0 && grounded && !(P.rocket > 0)) { jumpBuf = 0; jump(); }   // forgiving jumps: press a touch early or late and it still counts
  // the world comes towards him
  roadScroll += sp * dt; scrollWorld(sp * dt); const shim = 0.4 + 0.3 * Math.sin(clock * 6); coinCap.emissiveIntensity = shim; rimMat.emissiveIntensity = shim; roadTex.offset.y = (roadScroll / 16) % 1; grassTex.offset.y = (roadScroll / 16) % 1;
  for (const t of trees) { t.position.z += sp * dt; if (t.position.z > 14) t.position.z -= 228; }
  spawnFront += sp * dt; fillAhead(); applySky();
  if (P.rocket > 0) {                                 // a trail of coins in the sky while George flies
    skyT -= dt;
    if (skyT <= 0 && P.rocket > 72 / sp + 0.3) { skyT = 2.4 / sp; if (++skyN % 9 === 0) skyLane = clamp(skyLane + (Math.random() < 0.5 ? -1 : 1), 0, 2); coinAt(skyLane, 4.3, -72); }
  } else { skyLane = laneIdx; skyN = 0; }
  if (ballFly) { ballFly.last = ballFly.z; ballFly.z -= (sp + 85) * dt; ballFly.t += dt; if (ballFly.z < -55) { showGoal(px, ballFly.z); feedItem("⚽", "GOAL!", "+" + ballFly.got + " coins collected", "big"); sfx.goal(); ach("topbins"); ballFly = null; } }
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i], pz = it.z; it.z += (sp + (it.vz || 0)) * dt; it.mesh.position.z = it.z;
    const across = (w) => pz < w && it.z > -w;      // did it pass George since the last frame? (so nothing slips through on a slow phone)
    if (it.kind === "obs" && hintT <= 0 && HINTS[it.type] && it.z > -28 && it.z < -12 && !(SAVE.hints && SAVE.hints[it.type])) showHint(it.type);
    if (it.kind === "obs" && it.type === "ref") { it.t += dt; const u = 0.5 - 0.5 * Math.cos(it.t * 1.7); it.x = lerp(LANES[it.laneA], LANES[it.laneA + 1], u); it.mesh.position.x = it.x; const lg = it.mesh.userData.legs; lg[0].rotation.x = Math.sin(it.t * 10) * 0.6; lg[1].rotation.x = -lg[0].rotation.x; it.mesh.userData.arms[0].rotation.x = -lg[0].rotation.x; }
    else if (it.kind === "obs" && it.type === "def") {
      const m = it.mesh, ud = m.userData, lg = ud.legs, ar = ud.arms;
      ud.warn.visible = it.slideT < 0.4 && Math.floor(clock * 6) % 2 === 0;
      if (it.slideT < 0 && it.z > -30) it.slideT = 0;
      if (it.slideT >= 0 && it.slideT < 1) {
        it.slideT = Math.min(1, it.slideT + dt * 1.7);
        const run = clamp(it.slideT / 0.35, 0, 1), sl = clamp((it.slideT - 0.35) / 0.65, 0, 1), e = 1 - Math.pow(1 - sl, 3);
        if (sl <= 0) {                                   // a few quick steps in from the touchline
          it.x = lerp(it.side * 6.2, it.side * 4.6, run); const sw = Math.sin(clock * 18) * 0.9;
          lg[0].rotation.x = sw; lg[1].rotation.x = -sw; ar[0].rotation.x = -sw; ar[1].rotation.x = sw; m.rotation.x = 0.25;
        } else {                                         // then down on the grass, front leg out, back leg tucked, arm back for balance
          it.x = lerp(it.side * 4.6, LANES[it.lane], e); m.rotation.x = 0.25 - 1.25 * e; m.position.y = -0.45 * e;
          lg[0].rotation.x = -0.85 * e; lg[1].rotation.x = 0.55 * e; ar[0].rotation.x = 1.5 * e; ar[1].rotation.x = -0.4 * e; ar[1].rotation.z = 0.7 * e;
          if (!reduced && sl < 0.9 && Math.random() < 0.7) burst(it.x, 0.1, it.z, 0x9fd58a, 1);
        }
        m.position.x = it.x;
      }
    }
    else if (it.kind === "obs" && it.type === "mower") { it.mesh.children.forEach((c, k) => { if (k >= 2 && k <= 5) c.rotation.x += dt * 12; }); }
    if (it.spin) it.mesh.rotation.y += dt * 3.2; else if (it.kind === "power") it.mesh.rotation.y = Math.sin(clock * 2 + it.z) * 0.25;
    if (it.kind === "coin" && it.gone) {           // a picked-up coin pops up, grows and vanishes with a sparkle
      it.pop = (it.pop === undefined ? 0.3 : it.pop) - dt; const k = 1 - it.pop / 0.3; it.mesh.position.y += 5 * dt; it.mesh.position.x = lerp(it.mesh.position.x, px, 0.2); it.mesh.scale.setScalar(Math.max(0.01, (1 + k * 0.7) * (1 - k * k))); it.mesh.rotation.y += dt * 14;
      if (it.pop <= 0) { scene.remove(it.mesh); items.splice(i, 1); }
      continue;
    }
    if (it.kind === "power" || it.kind === "coin") if (it.baseY !== undefined) it.mesh.position.y = it.baseY + Math.sin(clock * 3 + it.z) * 0.12;
    if (it.kind === "coin" && !it.gone) {
      if (P.magnet > 0 && it.z > -14 && it.z < 1.5 && Math.abs(it.x - px) < 6.5) { const k = 1 - Math.exp(-9 * dt); it.x = lerp(it.x, px, k); it.baseY = lerp(it.baseY, py + 0.9, k); it.mesh.position.x = it.x; }
      if (ballFly && it.z < ballFly.last + 3 && it.z > ballFly.z - 3 && it.z < 0) { takeCoin(it, 2); ballFly.got++; }
      else if (across(1.0) && Math.abs(it.x - px) < 1.4 && Math.abs((it.baseY || 0.9) - (py + 0.9)) < 1.5) takeCoin(it);
    } else if (it.kind === "power" && !it.gone) {
      if (across(1.3) && Math.abs(it.x - px) < 1.4 && Math.abs(1.1 - (py + 0.9)) < 1.8) { it.gone = true; givePower(it.type); }
    } else if (it.kind === "obs" && !it.gone && across(it.type === "mower" ? 1.0 : 0.7) && Math.abs(it.x - px) < (it.type === "mower" ? 1.0 : 0.82)) {
      const safe = P.rocket > 0 || G.invuln > 0, standing = sliding <= 0;
      const hit = it.type === "wall" ? py < 2.5 : it.type === "ref" ? py < 2.2 : it.type === "mower" ? py < 1.3 : (it.type === "puddle" || it.type === "snow" || it.type === "leaves") ? py < 0.5 : (it.type === "barrier" || it.type === "def") ? py < 0.62 : (standing && py < 1.5);
      if (hit && !safe) hurt(it);
    }
    if (it.gone && it.kind !== "obs") { scene.remove(it.mesh); items.splice(i, 1); continue; }
    if (it.z > 12) { scene.remove(it.mesh); items.splice(i, 1); }
  }
  // the football flying ahead
  if (ballFly) { ballMesh.visible = true; ballMesh.position.set(px, 0.8 + Math.abs(Math.sin(ballFly.t * 9)) * 0.5, ballFly.z); ballMesh.rotation.x -= 0.6; } else ballMesh.visible = false;
  // rocket flames
  if (P.rocket > 0 && !reduced) { for (let k = 0; k < 2; k++) { const f = flame[flameIdx++ % flame.length]; f.m.position.set(px + rand(-0.15, 0.15), py + 0.7 + rand(-0.1, 0.1), 0.9); f.life = 0.35; f.m.visible = true; } }
  for (const f of flame) { if (f.life > 0) { f.life -= dt; f.m.position.z += 5 * dt; f.m.position.y -= 0.6 * dt; f.m.material.opacity = Math.max(0, f.life / 0.35); const sc = 0.5 + 0.6 * (1 - f.life / 0.35); f.m.scale.setScalar(sc); if (f.life <= 0) f.m.visible = false; } }
  updateSparks(dt); updateFx(); updateWeather(dt, sp); updateGoal(dt, sp); updateCoach(dt, sp);
  { const sn = seasonAt(G.dist); if (sn !== G.season) { G.season = sn; announceSeason(sn); } }
  // the figure
  george.root.position.set(px, py, 0);
  george.root.visible = !(G.invuln > 0 && Math.floor(clock * 14) % 2 === 0 && G.phase === "play" && stumble <= 0);
  george.blob.position.y = 0.03 - py; george.blob.scale.setScalar(clamp(1 - py * 0.12, 0.5, 1));
  george.root.rotation.z = (px - LANES[laneIdx]) * -0.07; george.root.rotation.y = Math.PI + clamp((px - LANES[laneIdx]) * 0.12, -0.35, 0.35);   // leans into a lane change
  bubble.visible = G.shield; if (G.shield) { bubble.position.set(px, py + 1, 0); const bs = 1 + Math.sin(clock * 5) * 0.04; bubble.scale.set(bs, bs, bs); }
}
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshLambertMaterial({ map: ballTex, emissive: 0xffe9a8, emissiveIntensity: 0.4 })); ballMesh.visible = false; scene.add(ballMesh);

// a goal fades in where the ball lands, the net bulges, then it fades away
const goalGrp = new THREE.Group(), goalMats = []; goalGrp.visible = false; scene.add(goalGrp);
{
  const pm = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x777777, transparent: true }); goalMats.push(pm);
  for (const x of [-2.4, 2.4]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.3, 10), pm); p.position.set(x, 1.15, 0); goalGrp.add(p); }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.9, 10), pm); bar.rotation.z = Math.PI / 2; bar.position.y = 2.3; goalGrp.add(bar);
  const nm = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true }); goalMats.push(nm);
  const net = new THREE.Group(), netBox = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.3, 1.6, 14, 7, 4), nm); netBox.position.set(0, 1.15, -0.8); net.add(netBox); goalGrp.add(net); goalGrp.userData.net = net;
  const gb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshLambertMaterial({ map: ballTex, transparent: true })); gb.position.set(0, 0.9, -1.2); goalGrp.add(gb); goalMats.push(gb.material);
}
let goalT = 0;
function showGoal(x, z) { goalGrp.position.set(x, 0, z); goalGrp.scale.setScalar(1.3); goalGrp.visible = true; goalT = 1.8; }
function updateGoal(dt, sp) {
  if (goalT <= 0) return; goalT -= dt; goalGrp.position.z += sp * dt;
  const a = 1.8 - goalT, op = clamp(a / 0.2, 0, 1) * clamp(goalT / 0.6, 0, 1);
  goalGrp.userData.net.scale.z = 1 + 0.8 * Math.exp(-a * 3) * Math.abs(Math.sin(a * 12));
  goalMats.forEach((m, i) => { m.opacity = op * (i === 1 ? 0.55 : 1); });
  if (goalT <= 0) goalGrp.visible = false;
}
// the coach on the touchline, clapping when George earns a life
const coach = person(0x1d2a44, 0x1d2a44, 0x1d2a44); coach.scale.setScalar(1.5); coach.visible = false; scene.add(coach);
{
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xd7102b })); cap.position.y = 1.9; coach.add(cap);
  const say = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(256, 64, (g, w, h) => { g.fillStyle = "#fff"; if (g.roundRect) { g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, 22); g.fill(); } else g.fillRect(2, 2, w - 4, h - 4); g.fillStyle = "#c8102e"; g.font = "700 34px Rajdhani, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Well done, George!", w / 2, h / 2 + 2); }), depthTest: false }));
  say.scale.set(2.6, 0.65, 1); say.position.y = 2.55; coach.add(say);
}
function coachCheer() { const sd = Math.random() < 0.5 ? -1 : 1; coach.position.set(sd * 5.1, 0, -40); coach.rotation.y = -sd * 0.6; coach.visible = true; }
function updateCoach(dt, sp) {
  if (!coach.visible) return; coach.position.z += sp * dt; if (coach.position.z > 6) { coach.visible = false; return; }
  const c = 0.2 + 0.35 * Math.abs(Math.sin(clock * 14)), ar = coach.userData.arms;
  ar[0].rotation.x = ar[1].rotation.x = -1.2; ar[0].rotation.z = c; ar[1].rotation.z = -c; coach.position.y = Math.abs(Math.sin(clock * 7)) * 0.08;
}
function cameraStep(dt) {
  const tx = px * 0.55, ty = (P.rocket > 0 ? 5.4 : 3.7) + py * 0.3, tz = 6.7;
  camPos.x = lerp(camPos.x, tx, 1 - Math.exp(-6 * dt)); camPos.y = lerp(camPos.y, ty, 1 - Math.exp(-4 * dt)); camPos.z = lerp(camPos.z, tz + clamp((G.speed - 15) * 0.05, 0, 1.4) + (P.boots > 0 ? 0.8 : 0), 1 - Math.exp(-3 * dt));
  let sxk = 0, syk = 0; if (shake > 0 && !reduced) { shake -= dt; sxk = rand(-0.15, 0.15) * shake * 2; syk = rand(-0.1, 0.1) * shake * 2; }
  const wantFov = baseFov + clamp((G.speed - 15) * 0.3, 0, 8) + (P.boots > 0 ? 4 : 0) + (P.rocket > 0 ? 6 : 0);
  if (Math.abs(camera.fov - wantFov) > 0.05) { camera.fov = lerp(camera.fov, wantFov, 1 - Math.exp(-3 * dt)); camera.updateProjectionMatrix(); }
  camera.position.set(camPos.x + sxk, camPos.y + syk, camPos.z); camera.lookAt(px * 0.35, 1.5 + py * 0.3, -14);
}
function setPause(on) {
  if (contOpen || on === paused || (on && G.phase !== "play")) return;
  paused = on; $("pause").hidden = !on; $("btn-pause").textContent = on ? "▶" : "⏸";
  if (ac) { try { on ? ac.suspend() : ac.resume(); } catch (e) {} }
}
$("btn-pause").addEventListener("click", () => setPause(!paused)); $("btn-quit").addEventListener("click", () => { if (G.phase !== "play") return; setPause(false); gameOver(); }); $("btn-resume").addEventListener("click", () => setPause(false));
document.addEventListener("visibilitychange", () => { if (document.hidden) setPause(true); }); window.addEventListener("blur", () => setPause(true));
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; if (paused) { renderer.render(scene, camera); return; } clock += dt;
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) $("hint").hidden = true; }
  if (G.phase === "play") update((P.whistle > 0 ? dt * 0.6 : dt) * (hintT > 0 ? 0.45 : 1));   // a tip slows the game down for a moment       // the referee's whistle slows the whole game down
  else if (G.phase === "menu") { roadScroll += 10 * dt; scrollWorld(10 * dt); roadTex.offset.y = (roadScroll / 16) % 1; grassTex.offset.y = (roadScroll / 16) % 1; for (const t of trees) { t.position.z += 10 * dt; if (t.position.z > 14) t.position.z -= 228; } }
  animate(dt); cameraStep(dt);
  if (G.phase !== "over") setHud();
  renderer.render(scene, camera);
}

/* ---------------- screens, scores and prizes ---------------- */
/* ---------------- daily challenge and the online leaderboard ---------------- */
const DAILY_KEY = "gz_run_daily_v1", NAME_KEY = "gz_run_name", GAME_ID = "georges-run", GAME_DAILY = "georges-run-daily";
const SB_URL = "https://hucnucpfyjltlhmvprso.supabase.co/rest/v1/leaderboard";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Y251Y3BmeWpsdGxobXZwcnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDgzNjEsImV4cCI6MjEwMzU4NDM2MX0.DSjLCkiUWB47wVd4wnW_2RvWFoISbH80JI9ukB1bBdg";
let lastRun = null;
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function dailyRec() { const r = readJSON(DAILY_KEY, {}); return r.date === todayUTC() ? r : { date: todayUTC(), best: 0 }; }
function showDaily() { const b = dailyRec().best; for (const id of ["daily-best", "daily-best2"]) { const el = $(id); if (el) el.textContent = b ? "Your best today: " + b.toLocaleString("en-GB") : "Same pitch for everyone today"; } }
function readName() { try { return localStorage.getItem(NAME_KEY) || "George"; } catch (e) { return "George"; } }
async function fetchBoard(game, today) {
  const q = `?game=eq.${game}${today ? "&created_at=gte." + todayUTC() + "T00:00:00Z" : ""}&select=player_name,score&order=score.desc&limit=5`;
  const res = await fetch(SB_URL + q, { headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY } });
  if (!res.ok) throw new Error(res.status); return res.json();
}
async function loadOnline(where) {
  for (const [id, game, today] of [["-all", GAME_ID, false], ["-day", GAME_DAILY, true]]) {
    const el = $(where + "-online" + id); if (!el) continue;
    try { const rows = await fetchBoard(game, today); el.innerHTML = rows.length ? rows.map((r, i) => `<li><b>${["🥇", "🥈", "🥉", "4", "5"][i]}</b><span>${esc(r.player_name)}</span><small>${Number(r.score).toLocaleString("en-GB")}</small></li>`).join("") : `<li class="empty"><span>${today ? "Nobody yet today. Be the first!" : "No scores yet. Be the first!"}</span></li>`; }
    catch (e) { el.innerHTML = '<li class="empty"><span>Couldn\'t load the online scores right now.</span></li>'; }
  }
}
$("save-form").addEventListener("submit", async (e) => {
  e.preventDefault(); if (!lastRun) return;
  const name = $("save-name").value.trim().slice(0, 18); if (!name) return;
  try { localStorage.setItem(NAME_KEY, name); } catch (er) {}
  $("save-msg").textContent = "Saving…";
  try {
    const res = await fetch(SB_URL, { method: "POST", headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ game: lastRun.game, player_name: name, score: Math.min(lastRun.score, 5000000) }) });
    if (!res.ok) throw new Error(res.status);
    $("save-form").hidden = true; $("save-msg").textContent = "Saved online! " + lastRun.score.toLocaleString("en-GB") + " points for " + name + "."; lastRun = null; loadOnline("end"); loadOnline("start");
  } catch (er) { $("save-msg").textContent = "Couldn't save online right now. Try again later."; }
});

const PRIZES = [
  { id: "run1000", test: (r) => r.dist >= 1000, kit: "Speedster shirt", text: "Run 1,000 m in one go" },
  { id: "run150c", test: (r) => r.coins >= 150, kit: "Golden Runner shirt", text: "Collect 150 coins in one run" },
  { id: "runghost", test: (r) => r.power >= 5, kit: "Phantom shirt", text: "Use 5 power-ups in one run" },
];
function gameOver() {
  closeCont(); G.phase = "over"; paused = false; sfx.over(); stopMusic(); shake = 0.4;
  const score = Math.floor(G.score), meters = Math.floor(G.dist);
  const t = readJSON(TOP_KEY, []);
  t.push({ s: score, m: meters, d: new Date().toISOString().slice(0, 10) }); t.sort((a, b) => b.s - a.s); writeJSON(TOP_KEY, t.slice(0, 10));
  const rank = t.slice(0, 3).findIndex((r) => r.s === score && r.m === meters);
  SAVE.runs = (SAVE.runs || 0) + 1; if (SAVE.runs >= 5) ach("season"); if (SAVE.runs >= 25) ach("clublegend"); writeJSON(RUN_KEY, SAVE);
  const run = { dist: meters, coins: G.coins, power: G.usedPower, kicks: G.kicks, maxNum: G.maxNum, noHit: G.noHit };
  const done = goals.map((m) => ({ m, ok: m.ok(run) })), bonus = done.filter((d) => d.ok).length * 10 + newAch.length * 5;
  const earned = Math.round(G.coins * 0.6 + meters / 60) + bonus;
  if (window.GZR && GZR.ready) { try { GZR.earn({ coins: earned, xp: Math.round(meters / 25) }); GZR.event("game"); GZR.event("run_m", meters); } catch (e) {} }
  const won = [];
  for (const p of PRIZES) if (!SAVE.ach[p.id] && p.test({ dist: meters, coins: G.coins, power: G.usedPower })) { SAVE.ach[p.id] = true; won.push(p); }
  SAVE.best = Math.max(SAVE.best || 0, score); SAVE.bestDist = Math.max(SAVE.bestDist || 0, bestM || 0, meters); writeJSON(RUN_KEY, SAVE);
  let dailyBest = false;
  if (G.daily) { const db = dailyRec(); dailyBest = score > db.best; if (dailyBest) writeJSON(DAILY_KEY, { date: todayUTC(), best: score }); }
  lastRun = { score, game: G.daily ? GAME_DAILY : GAME_ID };
  setTimeout(() => {
    document.body.classList.remove("gr-playing"); try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {}
    $("screen-game").hidden = true; $("screen-end").hidden = false; window.scrollTo(0, Math.max(0, $("screen-end").getBoundingClientRect().top + window.scrollY - 84));
    $("end-mode").textContent = G.daily ? "📅 Daily challenge · " + todayUTC() + (dailyBest ? " · your best today!" : "") : "";
    $("save-form").hidden = score <= 0; $("save-msg").textContent = ""; $("save-name").value = readName();
    $("end-title").textContent = rank === 0 ? "New high score!" : rank > 0 ? "You are in the top three!" : "Nice run, George!";
    $("end-stats").innerHTML = `<div><b>${score.toLocaleString("en-GB")}</b><span>Points</span></div><div><b>${meters} m</b><span>Distance</span></div><div><b>${G.coins}</b><span>Coins picked up</span></div><div><b>#${G.maxNum}</b><span>Best shirt number</span></div>` + (earned ? `<div><b>+${earned}</b><span>Coins for the shop</span></div>` : "");
    $("end-missions").innerHTML = done.map((d) => `<li class="${d.ok ? "ok" : ""}">${d.ok ? "✅" : "▫️"} ${d.m.text}${d.ok ? " <b>+10 🪙</b>" : ""}</li>`).join("");
    $("end-ach").innerHTML = newAch.map((a) => `<li>${a[1]} <b>${a[2]}</b> <small>${a[3]} · +5 🪙</small></li>`).join("");
    $("end-prizes").innerHTML = won.length ? won.map((p) => `<li>🎽 <b>New shirt unlocked: ${p.kit}!</b> <small>${p.text}. Wear it in My Player.</small></li>`).join("") : "";
    renderTop($("end-top")); newGoals(); showDaily(); loadOnline("end"); renderUpgrades();
  }, 1100);
}
function start(daily) {
  G.daily = !!daily;
  audio(); paused = false; $("pause").hidden = true; $("btn-pause").textContent = "⏸"; reset(); G.phase = "play"; ach("kickoff"); announceSeason(0);
  $("screen-start").hidden = true; $("screen-end").hidden = true; $("screen-game").hidden = false;
  document.body.classList.add("gr-playing");          // the game fills the whole screen, so the score and hearts are always in view
  try { if (matchMedia("(pointer: coarse)").matches && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {}
  resize(); requestAnimationFrame(resize); { const t = top3(); $("hud-best").textContent = t.length ? "🏆 Best " + t[0].s.toLocaleString("en-GB") : ""; } startMusic(); feedItem(G.daily ? "📅" : "🏃", G.daily ? "DAILY CHALLENGE" : "GO GEORGE!", G.daily ? "Same pitch for everyone today" : "Swipe to move, jump and slide", "big");
}
$("btn-start").addEventListener("click", () => start(false)); $("btn-daily").addEventListener("click", () => start(true)); $("btn-daily2").addEventListener("click", () => start(true));
$("btn-again").addEventListener("click", () => start(G.daily));
$("btn-music").addEventListener("click", () => { cycleMusic(); audio(); });
try { if (localStorage.getItem("gz_run_sfx") === "0") { sfxOn = false; $("btn-sound").textContent = "🔇 Sounds off"; } } catch (e) {}
$("btn-sound").addEventListener("click", () => { sfxOn = !sfxOn; try { localStorage.setItem("gz_run_sfx", sfxOn ? "1" : "0"); } catch (e) {} $("btn-sound").textContent = sfxOn ? "🔊 Sounds on" : "🔇 Sounds off"; });
showMusic(); showDaily(); renderUpgrades(); loadOnline("start"); renderAchList(); renderTop($("start-top")); newGoals(); resize();
reset(); G.phase = "menu"; for (const it of items) scene.remove(it.mesh); items.length = 0; last = performance.now(); raf = requestAnimationFrame(frame);
$("screen-game").hidden = true;
window.__run = { G, P, items, showGoal, coachCheer, renderUpgrades, powerTime, funItem, get song() { return curSong; }, referee, defender, mower, start, get layout() { return items.filter((i) => i.kind !== "coin" || true).slice(0, 40).map((i) => i.kind + ":" + (i.type || "") + ":" + i.x.toFixed(1) + ":" + Math.round(i.z)).join("|"); }, get george() { return george; }, hurt, givePower, camera, makeChunk, kick: () => givePower("ball"), jump, slide, goLane, feedItem };
