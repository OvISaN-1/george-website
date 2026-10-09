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
  ["kickoff", "⚽", "Kick-off", "Play your first run"], ["firsttouch", "🪙", "First Touch", "Collect a coin"], ["hattrick", "🎩", "Hat-trick", "Collect 3 coins in a row"],
  ["fullteam", "👥", "Full Team", "Collect 11 coins without a card"], ["goldenboot", "👟", "Golden Boot", "Collect 25 coins without a card"], ["unplayable", "🔥", "Unplayable", "Collect 50 coins without a card"],
  ["invincibles", "🛡️", "The Invincibles", "Collect 100 coins without a card"], ["century", "💯", "Century", "Collect 100 coins in one run"],
  ["warmup", "🏃", "Warm-up", "Run 100 m"], ["halftime", "⏱️", "Half-time", "Run 500 m"], ["fulltime", "🔔", "Full Time", "Run 1,000 m"], ["extratime", "⏳", "Extra Time", "Run 2,000 m"], ["penalties", "🥅", "Penalty Shoot-out", "Run 3,000 m"],
  ["topbins", "🥅", "Top Bins", "Kick the football"], ["freekick", "🎯", "Free-kick Specialist", "Kick the football 3 times in one run"],
  ["fairplay", "📣", "Fair Play", "Use the referee whistle"], ["safehands", "🧤", "Safe Hands", "Use the keeper gloves"], ["motm", "🏅", "Man of the Match", "Use the gold medal"], ["bootroom", "👟", "Boot Room", "Use the golden boots"],
  ["champions", "🏆", "Champions!", "Use the golden trophy"], ["moon", "🚀", "Out of This World", "Use the rocket boots"], ["fan", "🧣", "Fan Favourite", "Use the fan scarf"], ["invisible", "💨", "Now You See Him", "Use the vanishing spray"],
  ["squad", "🔢", "Squad Number", "Get your shirt number to 15"], ["legend", "⭐", "Forest Legend", "Get your shirt number to 25"], ["retired", "🎖️", "Retired Number", "Get your shirt number to 50"],
  ["cleansheet", "🧱", "Clean Sheet", "Run 300 m without a card"], ["acrobat", "🤸", "Bicycle Kick", "Jump 20 times in one run"], ["slider", "🛷", "Sliding Tackle", "Slide 10 times in one run"], ["dribbler", "💃", "Dribbler", "Change lane 30 times in one run"],
  ["bigscore", "📈", "Man of the Match Score", "Score 5,000 points in one run"], ["season", "🎟️", "Season Ticket", "Play 5 runs"], ["clublegend", "🏟️", "Club Legend", "Play 25 runs"],
];
/* ---------------- renderer, scene, camera ---------------- */
const stage = $("stage"), canvas = $("gl");
const SAVE = Object.assign({}, SAVE_DEFAULT, readJSON(RUN_KEY, {})); SAVE.ach = SAVE.ach || {};
const achQueue = []; let achShowing = false, newAch = [];
function ach(id) {
  if (SAVE.ach[id]) return; const a = ACH.find((x) => x[0] === id); if (!a) return;
  SAVE.ach[id] = true; writeJSON(RUN_KEY, SAVE); newAch.push(a); try { burst(px, 1.6, 0, 0xd7102b, 12); burst(px, 1.6, 0, 0xffffff, 12); burst(px, 1.6, 0, 0xffd84a, 8); } catch (e) {} achQueue.push(a); showAch(); renderAchList();
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
// cones and footballs on the grass beside the touchline
const dots = [];
for (let i = 0; i < 50; i++) {
  const cone = i % 3 === 0, m = new THREE.Mesh(cone ? new THREE.ConeGeometry(0.22, 0.5, 8) : new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshLambertMaterial({ color: cone ? 0xff7a1a : 0xffffff }));
  m.position.set((i % 2 ? 1 : -1) * rand(5, 7.4), cone ? 0.25 : 0.22, -rand(0, 230)); scene.add(m); dots.push(m);
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
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 4, 32, 32, 30); gr.addColorStop(0, "rgba(0,0,0,.5)"); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03;
  const root = new THREE.Group(); root.add(g, blob); root.scale.setScalar(1.28); root.rotation.y = Math.PI;   // a little larger than life so the shirt print reads; he runs away from the camera (towards -z)
  return { root, body: g, head, legL: lL.hip, legR: lR.hip, kneeL: lL.knee, kneeR: lR.knee, armL: aL.sh, armR: aR.sh, elbowL: aL.elbow, elbowR: aR.elbow, mats, blob, drawNumber, baseNum: num };
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
// The tune: a stadium stomp-and-clap beat, a chant-like tune, and more instruments joining in as George gets faster.
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const CHORDS = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]], ROOTS = [45, 41, 48, 43];                  // A minor, F, C, G
const MELODY = [
  [76, 0, 0, 76, 79, 0, 81, 0, 79, 0, 76, 0, 74, 0, 76, 0], [77, 0, 0, 77, 81, 0, 84, 0, 81, 0, 77, 0, 76, 0, 77, 0],
  [76, 0, 0, 76, 79, 0, 84, 0, 83, 0, 79, 0, 76, 0, 79, 0], [74, 0, 0, 74, 79, 0, 83, 0, 81, 0, 79, 0, 74, 0, 0, 0],
];
let musicOn = false, step = 0, nextT = 0, musicTimer = 0, tempoBoost = 0;
function synth(f, t, dur, o) {
  const a = audio(); if (!a) return;
  const osc = a.createOscillator(), g = a.createGain(), flt = a.createBiquadFilter();
  osc.type = o.type || "sawtooth"; osc.frequency.value = f; if (o.detune) osc.detune.value = o.detune;
  flt.type = "lowpass"; flt.frequency.setValueAtTime(o.lp || 2500, a.currentTime + t);
  if (o.sweep) flt.frequency.exponentialRampToValueAtTime(Math.max(120, o.lp * o.sweep), a.currentTime + t + dur);
  const at = o.a || 0.005, v = o.vol || 0.05;
  g.gain.setValueAtTime(0.0001, a.currentTime + t); g.gain.linearRampToValueAtTime(v, a.currentTime + t + at); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + dur);
  osc.connect(flt).connect(g).connect(a.destination); osc.start(a.currentTime + t); osc.stop(a.currentTime + t + dur + 0.05);
}
function drum(kind, t, vol) {
  const a = audio(); if (!a) return;
  if (kind === "kick") { const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(150, a.currentTime + t); o.frequency.exponentialRampToValueAtTime(42, a.currentTime + t + 0.13); g.gain.setValueAtTime(0.5 * vol, a.currentTime + t); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + 0.2); o.connect(g).connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.22); return; }
  const n = Math.floor(a.sampleRate * (kind === "crash" ? 0.7 : 0.12)), buf = a.createBuffer(1, n, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, kind === "crash" ? 1.4 : 2.4);
  const s2 = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s2.buffer = buf; f.type = kind === "hat" ? "highpass" : kind === "crash" ? "highpass" : "bandpass"; f.frequency.value = kind === "hat" ? 7500 : kind === "crash" ? 4500 : 1500;
  g.gain.value = (kind === "hat" ? 0.12 : kind === "crash" ? 0.16 : 0.34) * vol; s2.connect(f).connect(g).connect(a.destination); s2.start(a.currentTime + t);
}
function musicTick() {
  const a = audio(); if (!a || !musicOn) return;
  const vol = MVOL[musicLevel()]; if (!vol) { nextT = a.currentTime; return; }
  const lvl = G.speed < 19 ? 0 : G.speed < 26 ? 1 : G.speed < 34 ? 2 : 3;
  const sd = 60 / (116 + tempoBoost) / 4;
  while (nextT < a.currentTime + 0.18) {
    const t = nextT - a.currentTime, i = step % 16, bar = Math.floor(step / 16) % 4, ch = CHORDS[bar], root = ROOTS[bar];
    // drums: stomp, stomp, clap like the terraces; four on the floor from level 1
    if (i === 0 || i === 8 || (lvl >= 1 && (i === 4 || i === 12)) || (lvl >= 3 && i === 14)) drum("kick", t, vol);
    if (i === 4 || i === 12) drum("clap", t, vol);
    if (i % 4 === 2 || (lvl >= 1 && i % 2 === 1)) drum("hat", t, vol * (i % 4 === 2 ? 1 : 0.6));
    if (lvl >= 3 && i === 0 && bar % 2 === 0) drum("crash", t, vol);
    // bass: root and octave bounce
    if (i === 0 || i === 6 || i === 8 || i === 14) synth(NOTE(root + (i === 6 || i === 14 ? 12 : 0)), t, sd * 2.4, { type: "sawtooth", lp: 600, sweep: 0.4, vol: 0.13 * vol });
    // warm chord pad
    if (lvl >= 1 && i === 0) for (const n of ch) { synth(NOTE(n), t, sd * 15, { type: "sawtooth", lp: 900, vol: 0.02 * vol, a: 0.25, detune: -7 }); synth(NOTE(n), t, sd * 15, { type: "sawtooth", lp: 900, vol: 0.02 * vol, a: 0.25, detune: 7 }); }
    // sparkly arpeggio
    if (lvl >= 2 && i % 2 === 0) synth(NOTE(ch[(i / 2) % 3] + 12), t, sd * 1.6, { type: "triangle", lp: 4000, vol: 0.05 * vol });
    // the tune
    const m = MELODY[bar][i];
    if (m) { synth(NOTE(m), t, sd * 2.2, { type: "sawtooth", lp: 2800, vol: 0.06 * vol, a: 0.01 }); if (lvl >= 3) synth(NOTE(m + 12), t, sd * 2, { type: "square", lp: 3500, vol: 0.02 * vol }); }
    nextT += sd; step++;
  }
}
function startMusic() { const a = audio(); if (!a) return; if (a.state === "suspended") a.resume(); musicOn = true; nextT = a.currentTime + 0.05; step = 0; clearInterval(musicTimer); musicTimer = setInterval(musicTick, 40); }
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
  medal: { name: "GOLD MEDAL", sub: "Every coin counts double", icon: "🏅", col: 0xffd23f },
  spray: { name: "VANISHING SPRAY", sub: "Invisible: walk through the cards", icon: "💨", col: 0xdde6ff },
  trophy: { name: "GOLDEN TROPHY", sub: "Coins fly to you", icon: "🏆", col: 0xffc933 },
  rocket: { name: "ROCKET BOOTS", sub: "Fly over everything", icon: "🚀", col: 0xe5384a },
  scarf: { name: "FAN SCARF", sub: "An extra life", icon: "🧣", col: 0xff4d6d },
  num5: { name: "SHIRT NUMBER +5", sub: "Every coin is worth more", icon: "#", col: 0x3ddc7c },
  num10: { name: "SHIRT NUMBER +10", sub: "Big boost for every coin", icon: "#", col: 0x4aa8ff },
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
  else if (type === "medal") { const d = C(0.36, 0.36, 0.09, 0xffd23f, 0, 0, 0); d.rotation.x = Math.PI / 2; const d2 = C(0.26, 0.26, 0.11, 0xffe680, 0, 0, 0); d2.rotation.x = Math.PI / 2; B(0.16, 0.5, 0.04, 0xe1102c, 0, 0.5, 0); }
  else if (type === "spray") { C(0.2, 0.2, 0.7, 0xf4f4f4, 0, 0, 0); C(0.12, 0.2, 0.2, 0x2f6fe0, 0, 0.42, 0); C(0.03, 0.03, 0.18, 0x222222, 0, 0.58, 0.04); S(0.08, 0xcfe6ff, 0.25, 0.5, 0.1); S(0.12, 0xcfe6ff, 0.38, 0.55, 0.15); }
  else if (type === "trophy") { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.16, 0.5, 16), L(0xffc933)); cup.position.y = 0.2; g.add(cup); C(0.06, 0.08, 0.3, 0xffc933, 0, -0.2, 0); C(0.22, 0.26, 0.1, 0xffc933, 0, -0.4, 0); for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 6, 12), L(0xffc933)); h.position.set(sx * 0.4, 0.22, 0); g.add(h); } }
  else if (type === "rocket") { C(0.22, 0.28, 0.9, 0xeeeeee, 0, 0, 0); const n = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 12), L(0xe5384a)); n.position.y = 0.65; g.add(n); for (const sx of [-1, 1]) B(0.4, 0.3, 0.05, 0xe5384a, sx * 0.28, -0.35, 0); g.rotation.z = 0.5; }
  else if (type === "scarf") { const t = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.13, 8, 18), L(0xd7102b)); g.add(t); for (let k = 0; k < 4; k++) { const st = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.135, 8, 3, 0.5), L(0xffffff)); st.rotation.z = k * 1.57; g.add(st); } B(0.2, 0.5, 0.06, 0xd7102b, 0.22, -0.4, 0.1); B(0.2, 0.5, 0.06, 0xffffff, 0.44, -0.4, 0.1); }
  else { const lab = type === "num5" ? "+5" : type === "num10" ? "+10" : "x2", col = TOYS[type].col; const tex = badgeTex(lab, col); for (const sz of [1, -1]) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.62, 28), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); m.position.z = 0.04 * sz; if (sz < 0) m.rotation.y = Math.PI; g.add(m); } billboard = true; }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.82, 24), new THREE.MeshBasicMaterial({ color: TOYS[type].col, transparent: true, opacity: 0.5, side: THREE.DoubleSide })); g.add(ring);
  g.scale.setScalar(1.25); g.userData.billboard = billboard; return g;
}
const toy = (type, lane, z) => { const m = toyMesh(type); return add("power", m, LANES[lane], 1.1, z, { type, baseY: 1.1, spin: !m.userData.billboard }); };

/* ---------------- building the road ahead ---------------- */
const CHUNK = 34;
function difficulty() { return clamp((G.speed - 14) / 24, 0, 1); }
let safeChunks = 0;
function makeChunk(z0) {
  const d = difficulty(), p = safeChunks > 0 ? (safeChunks-- , 0.1) : Math.random(), lane = Math.floor(Math.random() * 3), others = [0, 1, 2].filter((l) => l !== lane);
  const line = (l, n, from, step, y) => { for (let i = 0; i < n; i++) coinAt(l, y || 0.9, from - i * (step || 2.3)); };
  if (p < 0.2) { line(lane, 9, z0 - 4); }
  else if (p < 0.4) { barrier(lane, z0 - 14); for (let i = 0; i < 8; i++) coinAt(lane, 0.9 + Math.sin((i / 7) * Math.PI) * 1.7, z0 - 8 - i * 1.7); line(others[0], 6, z0 - 6); }
  else if (p < 0.55) { wall(others[0], z0 - 14); wall(others[1], z0 - 14); line(lane, 10, z0 - 4); }
  else if (p < 0.7) { bar(lane, z0 - 14); line(lane, 3, z0 - 7); line(lane, 3, z0 - 19); line(others[1], 6, z0 - 6); if (d > 0.3) barrier(others[0], z0 - 14); }
  else if (p < 0.85) { for (let i = 0; i < 12; i++) coinAt(Math.round(1 + Math.sin(i * 0.8)), 0.9, z0 - 3 - i * 2.4); if (d > 0.2) { barrier(0, z0 - 18); barrier(2, z0 - 18); } }
  else { for (let r = 0; r < 4; r++) for (let l = 0; l < 3; l++) coinAt(l, 0.9, z0 - 5 - r * 3); if (d > 0.1) barrier(Math.floor(Math.random() * 3), z0 - 22); }
  if (d > 0.5 && Math.random() < 0.5) wall(Math.floor(Math.random() * 3), z0 - 30);
  // a pick-up now and then: at most one per stretch of road, so it never gets crowded
  if (Math.random() < 0.5) {
    const bag = ["ball", "ball", "ball", "boots", "boots", "whistle", "whistle", "gloves", "gloves", "medal", "medal", "spray", "spray", "trophy", "trophy", "rocket", "rocket", "scarf", "num5", "num5", "num5", "num10", "numx2"], t = pick(bag);
    if (t !== "scarf" || G.lives < MAXL) toy(t, Math.floor(Math.random() * 3), z0 - rand(10, 26));
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
// speed lines near the camera, grass kicked up behind George, and a wider view the faster he goes
const streaks = []; const streakMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 2.4), streakMat.clone()); m.visible = false; scene.add(m); streaks.push(m); }
function placeStreak(m, far) { const sd = Math.random() < 0.5 ? -1 : 1; m.position.set(sd * rand(1.4, 4.2), rand(0.3, 3.6), far ? rand(-35, 6) : -40); }
streaks.forEach((m) => placeStreak(m, true));
let dustT = 0;
function dust(x) {
  if (reduced) return;
  const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xa9d88f, transparent: true })); m.scale.setScalar(0.55); m.position.set(x + rand(-0.25, 0.25), 0.08, 0.5); scene.add(m);
  sparks.push({ m, vx: rand(-1.2, 1.2), vy: rand(0.4, 1.6), vz: rand(0.5, 2), life: rand(0.35, 0.6), max: 0.6 });
}
function updateFx(dt, sp) {
  const f = clamp((sp - 21) / 18, 0, 1);
  for (const m of streaks) { m.visible = f > 0.05; if (!m.visible) continue; m.position.z += sp * 1.7 * dt; m.material.opacity = f * 0.45; if (m.position.z > 8) placeStreak(m, false); }
  dustT -= dt; if (dustT <= 0 && grounded && sliding <= 0 && P.rocket <= 0) { dustT = 0.09 - f * 0.04; dust(px); }
}
function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt; s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt + G.speed * dt; s.vy -= 9 * dt; s.m.material.opacity = Math.max(0, s.life / s.max); if (s.life <= 0) { scene.remove(s.m); s.m.material.dispose(); sparks.splice(i, 1); } }
}

/* ---------------- power-ups and the top-of-screen feed ---------------- */
const P = { magnet: 0, medal: 0, spray: 0, rocket: 0, boots: 0, whistle: 0 };
const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.25, 18, 12), new THREE.MeshBasicMaterial({ color: 0x9fe3ff, transparent: true, opacity: 0.28 })); bubble.visible = false; scene.add(bubble);
const flame = []; for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); m.visible = false; scene.add(m); flame.push({ m, life: 0 }); }
let flameIdx = 0;
function setGhost(on) { for (const m of george.mats) { m.transparent = on; m.opacity = on ? 0.32 : 1; m.needsUpdate = true; } }
// short messages that slide in at the top left, one line each, and fade away on their own
const feedEl = $("feed");
function feedItem(icon, text, sub, cls) {
  const li = document.createElement("li"); li.className = "gr-fi " + (cls || "");
  li.innerHTML = `<i>${icon}</i><span><b>${text}</b>${sub ? `<small>${sub}</small>` : ""}</span>`;
  feedEl.appendChild(li); while (feedEl.children.length > 4) feedEl.firstChild.remove();
  const kill = () => { li.classList.add("out"); setTimeout(() => li.remove(), 400); }; li._timer = setTimeout(kill, 3000); li._kill = kill;
  return li;
}
let coinFeed = null;
function coinFeedAdd(points) {
  const now = performance.now();
  if (coinFeed && coinFeed.li.isConnected && now - coinFeed.t < 1100) { coinFeed.total += points; coinFeed.t = now; coinFeed.li.querySelector("b").textContent = "+" + coinFeed.total; clearTimeout(coinFeed.li._timer); coinFeed.li._timer = setTimeout(coinFeed.li._kill, 2200); }
  else { const li = feedItem("🪙", "+" + points, "", "coin"); coinFeed = { li, total: points, t: now }; }
}
function setNum(n) { G.num = clamp(Math.round(n), george.baseNum, 99); george.drawNumber(G.num); G.maxNum = Math.max(G.maxNum, G.num); }
function setAct(type, dur) { act = { type, t: dur, dur }; }
const AM = { ball: "topbins", boots: "bootroom", whistle: "fairplay", gloves: "safehands", medal: "motm", spray: "invisible", trophy: "champions", rocket: "moon", scarf: "fan" };
function givePower(type) {
  const T = TOYS[type]; if (AM[type]) ach(AM[type]); G.usedPower++; sfx.power(); burst(px, 1.2, 0, T.col, 14);
  if (type === "ball") { feedItem(T.icon, T.name, T.sub, "power"); kickT = 0.45; G.kicks++; sfx.kick(); ballFly = { z: -1.5, t: 0, last: -1.5, got: 0 }; pop("KICK!", "The ball collects every coin ahead", "gold"); return; }
  if (type === "boots") { P.boots = 6; setAct("flex", 0.6); }
  else if (type === "whistle") { P.whistle = 3; setAct("whistle", 0.9); }
  else if (type === "gloves") { G.shield = true; setAct("gloves", 0.9); }
  else if (type === "medal") { P.medal = 10; setAct("medal", 0.9); }
  else if (type === "spray") { P.spray = 8; setGhost(true); setAct("spray", 0.8); }
  else if (type === "trophy") { P.magnet = 10; setAct("trophy", 0.9); }
  else if (type === "rocket") { P.rocket = 4.5; }
  else if (type === "scarf") { if (G.lives < MAXL) G.lives++; sfx.life(); setAct("cheer", 0.8); }
  else {
    const before = G.num; setNum(type === "num5" ? G.num + 5 : type === "num10" ? G.num + 10 : G.num * 2); setAct("flex", 0.8);
    feedItem("#", "#" + before + " → #" + G.num, "Every coin is now worth " + G.num, "num"); return;
  }
  feedItem(T.icon, T.name, T.sub, "power");
}
function takeCoin(it, bonus) {
  it.gone = true; G.streak++;
  const n = P.medal > 0 ? 2 : 1, value = G.num * n * (bonus || 1);
  G.coins += n; G.score += value; reachT = 0.22; ach("firsttouch"); if (G.streak >= 3) ach("hattrick"); if (G.streak >= 11) ach("fullteam"); if (G.streak >= 25) ach("goldenboot"); if (G.streak >= 50) ach("unplayable"); if (G.streak >= 100) ach("invincibles"); sfx.coin(G.streak); burst(it.mesh.position.x, it.mesh.position.y, it.mesh.position.z, 0xffd84a, 3); coinFeedAdd(value);
  if (G.streak === 25 || G.streak === 50 || G.streak === 100 || G.streak === 200) feedItem("🔥", "COIN FEVER!", G.streak + " coins without a card", "big");
}

/* ---------------- input ---------------- */
function goLane(d) { if (paused) return; const n = clamp(laneIdx + d, 0, 2); if (n !== laneIdx) { laneIdx = n; G.lanes++; } }
let jumpBuf = 0, coyote = 0;
function jump() { if (G.phase !== "play" || paused) return; if ((grounded || coyote > 0) && !(P.rocket > 0)) { coyote = 0; vy = 10.2; grounded = false; sliding = 0; G.jumps++; sfx.jump(); } else jumpBuf = 0.15; }
function slide() { if (G.phase !== "play" || paused) return; if (!grounded) vy = Math.min(vy, -14); if (!(P.rocket > 0)) { sliding = 0.7; G.slides++; sfx.slide(); } }
window.addEventListener("keydown", (e) => {
  if (G.phase !== "play") return;
  const k = e.key;
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
  if (P.magnet > 0 && !flying) { g.armL.rotation.z = -1.3; g.armR.rotation.z = 1.3; g.armL.rotation.x = g.armR.rotation.x = -0.5; }
  if (P.spray > 0) { g.body.rotation.x = 0.45; g.armL.rotation.x = g.armR.rotation.x = 0.7; g.elbowL.rotation.x = g.elbowR.rotation.x = -0.3; g.body.rotation.y = s * 0.3; }
  if (flying) { g.body.rotation.x = 1.3; g.body.position.y = 0.6; g.armL.rotation.x = g.armR.rotation.x = -3.0; g.elbowL.rotation.x = g.elbowR.rotation.x = -0.1; g.legL.rotation.x = g.legR.rotation.x = 0.7; g.kneeL.rotation.x = g.kneeR.rotation.x = 0.1; g.body.rotation.y = s * 0.08; }
  if (act.t > 0) {                                                      // a pose for each thing George picks up
    act.t -= dt; const u = clamp(1 - act.t / act.dur, 0, 1), ps = Math.sin(u * Math.PI);
    if (act.type === "whistle") { g.armR.rotation.x = -2.3 * ps; g.elbowR.rotation.x = -2.4 * ps; g.armR.rotation.z = -0.25 * ps; g.head.rotation.x = -0.12 - 0.25 * ps; }
    else if (act.type === "gloves") { g.armL.rotation.z = -1.4 * ps; g.armR.rotation.z = 1.4 * ps; g.armL.rotation.x = g.armR.rotation.x = -0.9 * ps; g.body.rotation.x = 0.2 + 0.3 * ps; g.legL.rotation.z = -0.35 * ps; g.legR.rotation.z = 0.35 * ps; }
    else if (act.type === "medal") { g.armR.rotation.x = -1.2 * ps; g.elbowR.rotation.x = -2.4 * ps; g.armR.rotation.z = -0.5 * ps; g.head.rotation.x = -0.12 + 0.5 * ps; }
    else if (act.type === "trophy") { g.armL.rotation.x = g.armR.rotation.x = -3.0 * ps; g.armL.rotation.z = -0.3 * ps; g.armR.rotation.z = 0.3 * ps; g.body.position.y += ps * 0.2; }
    else if (act.type === "spray") { g.armR.rotation.x = -1.5 * ps; g.elbowR.rotation.x = -0.4 * ps; g.body.rotation.y += Math.sin(u * Math.PI * 4) * 0.7 * ps; }
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
  if (!run) { g.body.rotation.set(1.1, 0, 0); g.body.position.y = -0.5; g.legL.rotation.x = g.legR.rotation.x = 0.4; g.armL.rotation.z = -1.1; g.armR.rotation.z = 1.1; g.armL.rotation.x = g.armR.rotation.x = -0.3; }
}

/* ---------------- sky: day, sunset, night and back again ---------------- */
const SKYS = [[0x7db4ee, 0x2f9a35, 2.4, 1.5], [0x7db4ee, 0x2f9a35, 2.4, 1.5], [0xea9a6e, 0x2a8a30, 1.9, 1.1], [0x0f1b40, 0x14451c, 1.0, 0.25], [0x0f1b40, 0x14451c, 1.0, 0.25], [0x9ec5f0, 0x2f9a35, 2.2, 1.3]];
const STOPS = [0, 0.3, 0.45, 0.6, 0.82, 0.93];
const cA = new THREE.Color(), cB = new THREE.Color(), hemi = scene.children.find((o) => o.isHemisphereLight);
function applySky() {
  const f = (G.dist / 2400) % 1; let k = STOPS.length - 1; for (let i = 0; i < STOPS.length - 1; i++) if (f >= STOPS[i] && f < STOPS[i + 1]) { k = i; break; }
  const a = SKYS[k], b = SKYS[(k + 1) % SKYS.length], lo = STOPS[k], hi = k === STOPS.length - 1 ? 1 : STOPS[k + 1], t = clamp((f - lo) / (hi - lo), 0, 1);
  cA.set(a[0]); cB.set(b[0]); cA.lerp(cB, t); scene.background.copy(cA); scene.fog.color.copy(cA);
  cA.set(a[1]); cB.set(b[1]); cA.lerp(cB, t); ground.material.color.copy(cA);
  if (hemi) hemi.intensity = lerp(a[2], b[2], t); sun.intensity = lerp(a[3], b[3], t);
  const dayK = clamp(((hemi ? hemi.intensity : 2.4) - 1.0) / 1.4, 0, 1);
  for (const m of crowdMats) m.color.setScalar(0.4 + 0.6 * dayK); for (const m of boardMats) m.color.setScalar(0.5 + 0.5 * dayK); road.material.color.setScalar(0.55 + 0.45 * dayK);
  lampMat.color.setRGB(1, 0.85 + 0.15 * (1 - dayK), 0.6 + 0.3 * (1 - dayK)); lampMat.color.multiplyScalar(0.55 + 0.45 * (1 - dayK) * 1.2);
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
  if (G.shield) c.push("🧤"); if (P.medal > 0) c.push("🏅 " + Math.ceil(P.medal)); if (P.spray > 0) c.push("💨 " + Math.ceil(P.spray)); if (P.rocket > 0) c.push("🚀 " + Math.ceil(P.rocket));
  if (P.magnet > 0) c.push("🏆 " + Math.ceil(P.magnet)); if (P.boots > 0) c.push("👟 " + Math.ceil(P.boots)); if (P.whistle > 0) c.push("📣"); if (ballFly) c.push("⚽");
  return c.join("   ");
}
function setHud() {
  $("hud-score").textContent = Math.floor(G.score).toLocaleString("en-GB");
  $("hud-coins").textContent = G.coins; $("hud-dist").textContent = Math.floor(G.dist) + " m";
  $("hud-lives").textContent = "❤".repeat(G.lives) + "♡".repeat(Math.max(0, MAXL - G.lives));
  $("hud-mult").textContent = "#" + G.num;
  $("hud-power").textContent = chips();
  const t = top3(), n = t.filter((r) => r.s > G.score).length;
  $("hud-rank").textContent = G.phase === "play" ? (n < 3 ? "#" + (n + 1) + " right now" : "") : "";
}
let bestShown = false;
function reset() {
  for (const it of items) scene.remove(it.mesh); items.length = 0; feedEl.innerHTML = ""; coinFeed = null;
  G.speed = 15; G.dist = 0; G.coins = 0; G.score = 0; G.lives = 4; G.t = 0; G.streak = 0; G.invuln = 0; G.shield = false; G.nextMile = 500; G.usedPower = 0; G.kicks = 0; G.noHit = true; G.jumps = G.slides = G.lanes = 0; G.achT = 0; jumpBuf = coyote = 0; newAch = []; landT = reachT = 0;
  P.magnet = P.medal = P.spray = P.rocket = P.boots = P.whistle = 0; setGhost(false); ballFly = null; laneIdx = 1; px = 0; py = 0; vy = 0; sliding = 0; grounded = true; stumble = kickT = celeT = 0; act.t = 0; tempoBoost = 0;
  G.num = george.baseNum; G.maxNum = G.num; george.drawNumber(G.num);
  safeChunks = 3; bestShown = false; spawnFront = -30; fillAhead(); applySky();
}
function hurt(it) {
  if (G.phase !== "play" || G.invuln > 0) return;
  if (G.shield) { G.shield = false; G.invuln = 1.2; burst(px, 1.2, 0, 0x9fe3ff, 18); sfx.power(); feedItem("🧤", "SAVED!", "The gloves stopped the card", "power"); it.gone = true; scene.remove(it.mesh); return; }
  flash("hit"); G.lives--; G.noHit = false; G.invuln = 3; stumble = 0.9; G.streak = 0; shake = 0.5; G.speed = Math.max(14, G.speed * 0.78); sfx.hit(); burst(px, 1, 0, 0xff6b6b, 14);
  const was = G.num; setNum(Math.max(george.baseNum, G.num - 5));
  if (G.lives <= 0) { gameOver(); return; }
  feedItem(it.type === "wall" ? "🟥" : "🟨", "CARD!", G.lives + (G.lives === 1 ? " life left" : " lives left") + (G.num < was ? " · shirt number #" + G.num : ""), "bad");
}
function update(dt) {
  G.t += dt;
  // faster and faster
  G.speed = Math.min(40, G.speed + dt * (P.rocket > 0 ? 0 : 0.15 + difficulty() * 0.06));
  const sp = G.speed * (P.rocket > 0 ? 1.45 : P.boots > 0 ? 1.35 : 1);
  G.dist += sp * dt; G.score += sp * dt * 0.5 * (P.boots > 0 ? 2 : 1);
  tempoBoost = Math.min(34, (G.speed - 15) * 1.2);
  if (!bestShown && SAVE.best > 0 && G.score > SAVE.best) { bestShown = true; feedItem("🏆", "NEW PERSONAL BEST!", "Keep going!", "big"); sfx.milestone(); burst(px, 1.6, 0, 0xffd84a, 14); }
  G.achT -= dt; if (G.achT <= 0) { G.achT = 0.3; const d = G.dist; if (d >= 100) ach("warmup"); if (d >= 500) ach("halftime"); if (d >= 1000) ach("fulltime"); if (d >= 2000) ach("extratime"); if (d >= 3000) ach("penalties"); if (G.noHit && d >= 300) ach("cleansheet"); if (G.num >= 15) ach("squad"); if (G.num >= 25) ach("legend"); if (G.num >= 50) ach("retired"); if (G.score >= 5000) ach("bigscore"); if (G.jumps >= 20) ach("acrobat"); if (G.slides >= 10) ach("slider"); if (G.lanes >= 30) ach("dribbler"); if (G.kicks >= 3) ach("freekick"); if (G.coins >= 100) ach("century"); }
  if (G.dist >= G.nextMile) { feedItem("📍", G.nextMile + " m!", "Keep going!", "big"); sfx.milestone(); celeT = 0.8; celeFlip = G.nextMile % 1000 === 0; if (celeFlip && G.lives < MAXL) { G.lives++; sfx.life(); feedItem("❤", "EXTRA LIFE!", "Reward for 1,000 m", "power"); } G.nextMile += 500; }
  for (const k of ["magnet", "medal", "spray", "rocket", "boots", "whistle"]) if (P[k] > 0) { P[k] -= dt; if (P[k] <= 0) { P[k] = 0; if (k === "spray") setGhost(false); } }
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
  for (const d of dots) { d.position.z += sp * dt; if (d.position.z > 12) { d.position.z -= 230; d.position.x = (Math.random() < 0.5 ? 1 : -1) * rand(5, 7.4); } }
  spawnFront += sp * dt; fillAhead(); applySky();
  if (ballFly) { ballFly.last = ballFly.z; ballFly.z -= (sp + 85) * dt; ballFly.t += dt; if (ballFly.z < -140) { feedItem("⚽", "BALL BONUS!", "+" + ballFly.got + " coins collected", "big"); ballFly = null; } }
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]; it.z += sp * dt; it.mesh.position.z = it.z;
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
      else if (Math.abs(it.z) < 1.0 && Math.abs(it.x - px) < 1.4 && Math.abs((it.baseY || 0.9) - (py + 0.9)) < 1.5) takeCoin(it);
    } else if (it.kind === "power" && !it.gone) {
      if (Math.abs(it.z) < 1.3 && Math.abs(it.x - px) < 1.4 && Math.abs(1.1 - (py + 0.9)) < 1.8) { it.gone = true; givePower(it.type); }
    } else if (it.kind === "obs" && !it.gone && Math.abs(it.z) < 0.7 && Math.abs(it.x - px) < 0.82) {
      const safe = P.spray > 0 || P.rocket > 0 || G.invuln > 0, standing = sliding <= 0;
      const hit = it.type === "wall" ? py < 2.5 : it.type === "barrier" ? py < 0.62 : (standing && py < 1.5);
      if (hit && !safe) hurt(it);
    }
    if (it.gone && it.kind !== "obs") { scene.remove(it.mesh); items.splice(i, 1); continue; }
    if (it.z > 12) { scene.remove(it.mesh); items.splice(i, 1); }
  }
  // the football flying ahead
  if (ballFly) { ballMesh.visible = true; ballMesh.position.set(px, 0.8 + Math.abs(Math.sin(ballFly.t * 9)) * 0.5, ballFly.z); ballMesh.rotation.x -= 0.6; } else ballMesh.visible = false;
  // rocket flames
  if (P.rocket > 0 && !reduced) { for (let k = 0; k < 2; k++) { const f = flame[flameIdx++ % flame.length]; f.m.position.set(px + rand(-0.15, 0.15), py + 0.7 + rand(-0.1, 0.1), 0.9); f.life = 0.35; f.m.visible = true; } }
  for (const f of flame) { if (f.life > 0) { f.life -= dt; f.m.position.z += (sp * 0.9) * dt; f.m.material.opacity = Math.max(0, f.life / 0.35); const sc = 0.6 + (1 - f.life / 0.35); f.m.scale.setScalar(sc); if (f.life <= 0) f.m.visible = false; } }
  updateSparks(dt); updateFx(dt, sp);
  // the figure
  george.root.position.set(px, py, 0);
  george.root.visible = !(G.invuln > 0 && P.spray <= 0 && Math.floor(clock * 14) % 2 === 0 && G.phase === "play" && stumble <= 0);
  george.blob.position.y = 0.03 - py; george.blob.scale.setScalar(clamp(1 - py * 0.12, 0.5, 1));
  george.root.rotation.z = (px - LANES[laneIdx]) * -0.07; george.root.rotation.y = Math.PI + clamp((px - LANES[laneIdx]) * 0.12, -0.35, 0.35);   // leans into a lane change
  bubble.visible = G.shield; if (G.shield) { bubble.position.set(px, py + 1, 0); const bs = 1 + Math.sin(clock * 5) * 0.04; bubble.scale.set(bs, bs, bs); }
}
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshLambertMaterial({ map: ballTex, emissive: 0xffe9a8, emissiveIntensity: 0.4 })); ballMesh.visible = false; scene.add(ballMesh);

function cameraStep(dt) {
  const tx = px * 0.55, ty = (P.rocket > 0 ? 5.4 : 3.7) + py * 0.3, tz = 6.7;
  camPos.x = lerp(camPos.x, tx, 1 - Math.exp(-6 * dt)); camPos.y = lerp(camPos.y, ty, 1 - Math.exp(-4 * dt)); camPos.z = lerp(camPos.z, tz + clamp((G.speed - 15) * 0.05, 0, 1.4) + (P.boots > 0 ? 0.8 : 0), 1 - Math.exp(-3 * dt));
  let sxk = 0, syk = 0; if (shake > 0 && !reduced) { shake -= dt; sxk = rand(-0.15, 0.15) * shake * 2; syk = rand(-0.1, 0.1) * shake * 2; }
  const bob = G.phase === "play" && grounded ? Math.sin(phase * 2) * 0.025 * clamp((G.speed - 12) / 20, 0, 1) : 0;
  const wantFov = baseFov + clamp((G.speed - 15) * 0.3, 0, 8) + (P.boots > 0 ? 4 : 0) + (P.rocket > 0 ? 6 : 0);
  if (Math.abs(camera.fov - wantFov) > 0.05) { camera.fov = lerp(camera.fov, wantFov, 1 - Math.exp(-3 * dt)); camera.updateProjectionMatrix(); }
  camera.position.set(camPos.x + sxk, camPos.y + syk + bob, camPos.z); camera.lookAt(px * 0.35, 1.5 + py * 0.3, -14);
}
function setPause(on) {
  if (on === paused || (on && G.phase !== "play")) return;
  paused = on; $("pause").hidden = !on; $("btn-pause").textContent = on ? "▶" : "⏸";
  if (ac) { try { on ? ac.suspend() : ac.resume(); } catch (e) {} }
}
$("btn-pause").addEventListener("click", () => setPause(!paused)); $("btn-resume").addEventListener("click", () => setPause(false));
document.addEventListener("visibilitychange", () => { if (document.hidden) setPause(true); }); window.addEventListener("blur", () => setPause(true));
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; if (paused) { renderer.render(scene, camera); return; } clock += dt;
  if (G.phase === "play") update(P.whistle > 0 ? dt * 0.6 : dt);       // the referee's whistle slows the whole game down
  else if (G.phase === "menu") { roadScroll += 10 * dt; scrollWorld(10 * dt); roadTex.offset.y = (roadScroll / 16) % 1; grassTex.offset.y = (roadScroll / 16) % 1; for (const t of trees) { t.position.z += 10 * dt; if (t.position.z > 14) t.position.z -= 228; } }
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
  G.phase = "over"; paused = false; sfx.over(); stopMusic(); shake = 0.4;
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
  SAVE.best = Math.max(SAVE.best || 0, score); writeJSON(RUN_KEY, SAVE);
  setTimeout(() => {
    $("screen-game").hidden = true; $("screen-end").hidden = false;
    $("end-title").textContent = rank === 0 ? "New high score!" : rank > 0 ? "You are in the top three!" : "Nice run, George!";
    $("end-stats").innerHTML = `<div><b>${score.toLocaleString("en-GB")}</b><span>Points</span></div><div><b>${meters} m</b><span>Distance</span></div><div><b>${G.coins}</b><span>Coins picked up</span></div><div><b>#${G.maxNum}</b><span>Best shirt number</span></div>` + (earned ? `<div><b>+${earned}</b><span>Coins for the shop</span></div>` : "");
    $("end-missions").innerHTML = done.map((d) => `<li class="${d.ok ? "ok" : ""}">${d.ok ? "✅" : "▫️"} ${d.m.text}${d.ok ? " <b>+10 🪙</b>" : ""}</li>`).join("");
    $("end-ach").innerHTML = newAch.map((a) => `<li>${a[1]} <b>${a[2]}</b> <small>${a[3]} · +5 🪙</small></li>`).join("");
    $("end-prizes").innerHTML = won.length ? won.map((p) => `<li>🎽 <b>New shirt unlocked: ${p.kit}!</b> <small>${p.text}. Wear it in My Player.</small></li>`).join("") : "";
    renderTop($("end-top")); newGoals();
  }, 1100);
}
function start() {
  audio(); paused = false; $("pause").hidden = true; $("btn-pause").textContent = "⏸"; reset(); G.phase = "play"; ach("kickoff");
  $("screen-start").hidden = true; $("screen-end").hidden = true; $("screen-game").hidden = false;
  resize(); renderTop($("hud-top")); startMusic(); feedItem("🏃", "GO GEORGE!", "Swipe to move, jump and slide", "big");
  stage.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
}
$("btn-start").addEventListener("click", start);
$("btn-again").addEventListener("click", start);
$("btn-music").addEventListener("click", () => { cycleMusic(); audio(); });
try { if (localStorage.getItem("gz_run_sfx") === "0") { sfxOn = false; $("btn-sound").textContent = "🔇 Sounds off"; } } catch (e) {}
$("btn-sound").addEventListener("click", () => { sfxOn = !sfxOn; try { localStorage.setItem("gz_run_sfx", sfxOn ? "1" : "0"); } catch (e) {} $("btn-sound").textContent = sfxOn ? "🔊 Sounds on" : "🔇 Sounds off"; });
showMusic(); renderAchList(); renderTop($("start-top")); newGoals(); resize();
reset(); G.phase = "menu"; for (const it of items) scene.remove(it.mesh); items.length = 0; last = performance.now(); raf = requestAnimationFrame(frame);
$("screen-game").hidden = true;
window.__run = { G, P, items, get george() { return george; }, hurt, givePower, camera, makeChunk, setGhost, kick: () => givePower("ball"), jump, slide, goLane, feedItem };
