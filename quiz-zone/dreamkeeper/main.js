/* Dreamkeeper: puts it on the page. Controls, menus, the breathing exercise, the sleep timer and the goodnight routine. */
import { S, SAVE, saveNow, W, clamp, unlock, cardCount, popup } from "./core.js";
import { BOSS, TOWER, TOWER_IDS, SUPPORT_FROM, LEVELS, COLS, ROWS, TILE, GY, CARD, CARD_ORDER, ACH, GOOD, pathFor } from "./data.js";
import { buildSprites, drawGarden } from "./sprites.js";
import * as game from "./game.js";
import { render } from "./render.js";
import { audio, music } from "./audio.js";
import { VALUES, SLEEP as SLEEP_THOUGHTS, proofLines, pickAffirmation } from "./affirmations.js";

const $ = (id) => document.getElementById(id);
const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
let scale = 1, selLevel = 0, sleepExtended = false, sleepDone = false, breathToken = 0, lastTray = "", lastPanel = "", lastGo = "", rewardedNow = false, startedGame = false, goodPicked = [];

/* ---------------- setup ---------------- */
S.spr = buildSprites();
S.reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
audio.setSound(SAVE.opt.sound); audio.setMusic(SAVE.opt.music); audio.setCrickets(SAVE.opt.crickets);
S.speed = SAVE.opt.speed === 2 ? 2 : 1;

function resize() {
  const r = $("view").getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.max(2, Math.round(r.width * dpr)); cv.height = Math.max(2, Math.round(r.height * dpr)); scale = cv.width / W; S.H = cv.height / scale;
  if (S.pts.length) S.garden = drawGarden(LEVELS[S.level], S.H, pathFor(S.level), S.level);
}
window.addEventListener("resize", resize);
selLevel = Math.min(SAVE.maxLevel, 10) - 1; S.level = selLevel; game.setPath(selLevel); resize();
S.garden = drawGarden(LEVELS[selLevel], S.H, pathFor(selLevel), selLevel);

/* ---------------- achievements and toasts ---------------- */
function renderAch() {
  const n = ACH.filter((a) => SAVE.ach[a[0]]).length; $("ach-count").textContent = `${n} of ${ACH.length}`;
  $("ach-list").innerHTML = ACH.map((a) => SAVE.ach[a[0]] ? `<li class="got"><i>${a[1]}</i><span><b>${a[2]}</b><small>${a[3]}</small></span></li>` : `<li><i>🔒</i><span><b>???</b><small>${a[3]}</small></span></li>`).join("");
}
function toast(emoji, small, big) { const t = document.createElement("div"); t.className = "dk-toast"; t.innerHTML = `<i>${emoji}</i><div><small>${small}</small>${big}</div>`; const box = $("toasts"); box.appendChild(t); while (box.children.length > 1) box.firstChild.remove(); setTimeout(() => t.remove(), 3700); }
S.hooks.toast = (a) => { toast(a[1], "Achievement", a[2]); renderAch(); };
S.hooks.card = (key) => { toast("🃏", "New Calm Card", CARD[key][0]); $("card-n").textContent = `(${cardCount()}/${CARD_ORDER.length})`; };
let meetTimer = 0;
function meet(html) { const m = $("meet"); m.innerHTML = html; m.hidden = false; clearTimeout(meetTimer); meetTimer = setTimeout(() => (m.hidden = true), 7000); }
S.hooks.meet = (key) => {
  const c = CARD[key]; if (!c) return; let extra = "";
  if ((key === "shadow" || key === "bed") && !S.towers.some((t) => t.id === "lantern")) extra = " <small>Shadows hide in the dark. A Lantern 🏮 shows them.</small>";
  meet(`<b>A new worry: ${c[0]}</b><small>${c[1]}</small>${extra}`);
};
S.hooks.boss = (e) => meet(`<b>A big worry: ${e.def.name}</b><small>Slow and strong. Use your helpers together.</small>`);

/* ---------------- the lullaby and the level ---------------- */
S.hooks.level = (i) => { S.garden = drawGarden(LEVELS[i], S.H, pathFor(i), i); $("meet").hidden = true; music.set(i); if (SAVE.opt.music) music.start(i); };

/* ---------------- what's on screen ---------------- */
const screens = ["scr-start", "scr-pause", "scr-win", "scr-breather", "scr-breathe", "scr-bye", "scr-cards"];
function show(id) { screens.forEach((s) => ($(s).hidden = s !== id)); }
function hideAll() { screens.forEach((s) => ($(s).hidden = true)); }

function buildTray() {
  $("tws").innerHTML = TOWER_IDS.map((id, i) => (i === SUPPORT_FROM ? '<span class="tw-sep" aria-hidden="true"></span>' : "") + `<button class="tw${i >= SUPPORT_FROM ? " sup" : ""}" data-id="${id}" type="button" aria-pressed="false" aria-label="${TOWER[id].name}, ${i >= SUPPORT_FROM ? "support helper" : "damage helper"}, ${TOWER[id].cost[0]} stars. Key ${i + 1}" title="${TOWER[id].name}: ${TOWER[id].desc}"><span>${TOWER[id].e}</span><small>${TOWER[id].cost[0]}</small></button>`).join("");
}
$("tws").addEventListener("click", (e) => { const b = e.target.closest(".tw"); if (!b || b.disabled) return; audio.unlock(); audio.play("click"); arm(S.armed === b.dataset.id ? null : b.dataset.id); });
function arm(id) { S.armed = id; S.sel = null; S.tileHover = null; lastTray = ""; lastPanel = ""; }

function setUi() {
  const live = !["menu"].includes(S.state) && !$("scr-start").hidden === false;
  const playing = ["intro", "play", "win", "breather"].includes(S.state);
  $("dk-btns").hidden = !playing; $("tray").hidden = !playing || !!S.sel; if (S.sel && !$("meet").hidden) $("meet").hidden = true;
  // tray buttons: affordable or not, picked or not
  const key = TOWER_IDS.map((id) => (S.stars >= TOWER[id].cost[0] ? 1 : 0) + (S.armed === id ? "a" : "")).join(",") + S.armed;
  if (key !== lastTray) { lastTray = key; for (const b of $("tws").querySelectorAll(".tw")) { const id = b.dataset.id; b.disabled = S.stars < TOWER[id].cost[0]; b.setAttribute("aria-pressed", S.armed === id); } }
  const hint = S.armed ? `${TOWER[S.armed].name}: ${TOWER[S.armed].desc.split(". ")[0]}.` : S.state === "intro" ? "Worries are drifting in." : S.waveActive ? "Tap a helper to upgrade it." : S.towers.length ? "Add helpers, then start." : "Pick a helper, then tap a tile.";
  if ($("hint").textContent !== hint) $("hint").textContent = hint;
  const eb = game.earlyBonus(), go = S.waveActive || S.wave + 1 >= S.waves.length || S.state !== "play" ? "" : `▶ Start wave ${S.wave + 2}${eb >= 1 ? ` · +${eb} ⭐` : ""}`;
  if (go !== lastGo) { lastGo = go; $("btn-go").disabled = !go; $("btn-go").textContent = go || (S.waveActive ? "Wave on…" : "▶ Start wave"); }
  // the panel for a picked helper
  const t = S.sel, pk = t ? `${t.id}${t.lv}${S.stars >= (t.lv < 2 ? TOWER[t.id].cost[t.lv + 1] : 0)}${S.stars > 0}${Math.floor(t.invested * 0.7)}` : "";
  if (pk !== lastPanel) {
    lastPanel = pk; const p = $("panel");
    if (!t) p.classList.remove("on"); else {
      const def = TOWER[t.id], max = t.lv >= 2, c = max ? 0 : def.cost[t.lv + 1];
      p.innerHTML = `<h3>${def.e} ${def.name} · level ${t.lv + 1}</h3><p>${def.desc.split(". ")[0].replace(/\.$/, "")}.${max ? " Fully grown ✨" : ""}</p><div class="dk-prow">${max ? "" : `<button class="dk-pbtn up" id="pn-up" type="button" ${S.stars < c ? "disabled" : ""}>Upgrade: ${def.up[t.lv]} · ⭐${c}</button>`}<button class="dk-pbtn" id="pn-sell" type="button">Put away · +⭐${Math.floor(t.invested * 0.7)}</button><button class="dk-pbtn" id="pn-done" type="button">Done</button></div>`;
      p.classList.add("on");
    }
  }
  if (!playing || !S.sel) $("panel").classList.remove("on");
}
$("panel").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "pn-up") game.upgradeTower(S.sel); else if (b.id === "pn-sell") game.sellTower(S.sel); else if (b.id === "pn-done") S.sel = null;
  lastPanel = ""; lastTray = "";
});
$("btn-go").onclick = () => { audio.unlock(); game.startWave(true); lastGo = ""; };
$("btn-auto").onclick = () => { SAVE.opt.auto = !SAVE.opt.auto; saveNow(); $("btn-auto").setAttribute("aria-pressed", SAVE.opt.auto); };
$("btn-speed").onclick = () => { S.speed = S.speed === 1 ? 2 : 1; SAVE.opt.speed = S.speed; saveNow(); $("btn-speed").textContent = S.speed + "×"; };

/* ---------------- tapping the garden ---------------- */
function tileAt(e) { const r = cv.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * S.H; return [Math.floor(x / TILE), Math.floor((y - GY) / TILE)]; }
cv.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse" && S.armed) S.tileHover = tileAt(e); });
cv.addEventListener("pointerleave", () => { S.tileHover = null; });
cv.addEventListener("pointerdown", (e) => {
  audio.unlock(); if (S.state !== "play" && S.state !== "intro") return; const [c, r] = tileAt(e); if (r < 0 || r >= ROWS || c < 0 || c >= COLS) { S.sel = null; return; }
  if (S.armed) { if (game.canBuild(c, r) && S.stars < TOWER[S.armed].cost[0]) { popup(c * TILE + TILE / 2, GY + r * TILE + 20, `Need ⭐${TOWER[S.armed].cost[0]}`, "#e8b4a0", 15); return; } const t = game.placeTower(c, r, S.armed); if (t) { S.armed = null; S.tileHover = null; if (game.towerAt) { /* placed */ } } else if (game.towerAt(c, r)) { popup(c * TILE + TILE / 2, GY + r * TILE + 22, "Spot taken", "#e8b4a0", 15); } lastTray = ""; lastPanel = ""; return; }
  const t = game.towerAt(c, r); S.sel = t || null; lastPanel = "";
});
window.addEventListener("keydown", (e) => {
  if (e.target.closest && e.target.closest("input,textarea")) return;
  if (/^[1-8]$/.test(e.key) && ["play", "intro"].includes(S.state)) { arm(TOWER_IDS[+e.key - 1] === S.armed ? null : TOWER_IDS[+e.key - 1]); }
  if (e.key === "Escape") { if (S.armed || S.sel) { S.armed = null; S.sel = null; lastTray = ""; lastPanel = ""; } else if (S.state === "play") setPause(!S.paused); }
  if (e.key === "p" || e.key === "P") setPause(!S.paused);
});

/* ---------------- pause ---------------- */
function setPause(on) {
  if (on && !["intro", "play"].includes(S.state)) return;
  S.paused = on; if (on) show("scr-pause"); else $("scr-pause").hidden = true;
}
$("btn-pause").onclick = () => setPause(true);
$("btn-resume").onclick = () => setPause(false);
$("btn-quit").onclick = () => { S.paused = false; toMenu(); };
/* ---------------- start the level again ---------------- */
function restartLevel() { $("scr-pause").hidden = true; $("scr-win").hidden = true; S.paused = false; breathToken++; S.armed = null; S.sel = null; game.beginLevel(S.level); lastTray = ""; lastPanel = ""; lastGo = ""; audio.play("click"); }
function confirmTwice(btn, ask, normal, then) {
  let t = 0;
  btn.addEventListener("click", () => {
    audio.unlock();
    if (btn.dataset.sure === "1") { clearTimeout(t); btn.dataset.sure = ""; btn.textContent = normal; then(); return; }
    btn.dataset.sure = "1"; btn.textContent = ask; audio.play("click");
    t = setTimeout(() => { btn.dataset.sure = ""; btn.textContent = normal; }, 3500);
  });
}
confirmTwice($("btn-restart"), "Tap again to restart", "🔄 Restart level", restartLevel);
confirmTwice($("btn-restart-top"), "Sure?", "↻", restartLevel);
$("btn-win-again").onclick = restartLevel;
$("btn-finish").onclick = () => { $("scr-pause").hidden = true; S.sleepOn = true; goodnight(); };
window.addEventListener("blur", () => { if (["intro", "play"].includes(S.state)) setPause(true); });
document.addEventListener("visibilitychange", () => { if (document.hidden && ["intro", "play"].includes(S.state)) setPause(true); });

/* ---------------- the menu ---------------- */
const DIM = [["Warm"], ["Dim"], ["Very dim"]];
const SLEEP = [0, 10, 15, 20, 30];
function renderMenu() {
  $("lv-grid").innerHTML = LEVELS.map((L, i) => { const r = SAVE.rating[i] || 0; return `<button class="dk-lv${L.boss != null ? " boss" : ""}${i === selLevel ? " sel" : ""}" data-i="${i}" type="button" ${i + 1 > SAVE.maxLevel ? "disabled" : ""} aria-label="Level ${i + 1}: ${L.name}${L.boss != null ? ", big worry at the end" : ""}${r ? ", calm rating " + r : ""}">${i + 1}<small>${r ? "🌸".repeat(r) : ""}</small></button>`; }).join("");
  $("btn-play").textContent = SAVE.maxLevel > 1 || SAVE.rating[0] ? `Play level ${selLevel + 1}: ${LEVELS[selLevel].name}` : "Begin tonight's garden";
  $("card-n").textContent = `(${cardCount()}/${CARD_ORDER.length})`;
  $("tg-music").setAttribute("aria-pressed", SAVE.opt.music); $("tg-sound").setAttribute("aria-pressed", SAVE.opt.sound); $("tg-rain").setAttribute("aria-pressed", SAVE.opt.rain);
  $("tg-dim").textContent = `🌙 Night light: ${DIM[clamp(SAVE.opt.dim, 1, 3) - 1][0]}`; $("tg-sleep").textContent = `⏰ Sleep timer: ${SAVE.opt.sleep ? SAVE.opt.sleep + " min" : "off"}`;
  $("btn-auto").setAttribute("aria-pressed", SAVE.opt.auto); $("btn-snd").textContent = SAVE.opt.sound ? "🔊" : "🔇"; $("btn-speed").textContent = S.speed + "×";
  applyLight();
}
$("lv-grid").addEventListener("click", (e) => { const b = e.target.closest(".dk-lv"); if (!b || b.disabled) return; audio.unlock(); audio.play("click"); selLevel = +b.dataset.i; renderMenu(); });
$("tg-music").onclick = () => { audio.unlock(); SAVE.opt.music = !SAVE.opt.music; audio.setMusic(SAVE.opt.music); saveNow(); renderMenu(); };
$("tg-sound").onclick = () => { audio.unlock(); SAVE.opt.sound = !SAVE.opt.sound; audio.setSound(SAVE.opt.sound); saveNow(); renderMenu(); audio.play("click"); };
$("tg-rain").onclick = () => { audio.unlock(); SAVE.opt.rain = !SAVE.opt.rain; audio.setRain(SAVE.opt.rain); saveNow(); renderMenu(); };
$("tg-dim").onclick = () => { SAVE.opt.dim = (SAVE.opt.dim % 3) + 1; saveNow(); renderMenu(); };
$("tg-sleep").onclick = () => { SAVE.opt.sleep = SLEEP[(SLEEP.indexOf(SAVE.opt.sleep) + 1) % SLEEP.length]; saveNow(); renderMenu(); };
$("btn-snd").onclick = () => { SAVE.opt.sound = !SAVE.opt.sound; SAVE.opt.music = SAVE.opt.sound; audio.setSound(SAVE.opt.sound); audio.setMusic(SAVE.opt.music); saveNow(); renderMenu(); };

function toMenu() {
  S.state = "menu"; S.paused = false; music.stop(); S.armed = null; S.sel = null; breathToken++; S.enemies.length = 0; S.towers.length = 0; S.shots.length = 0; S.bossRef = null; $("meet").hidden = true;
  S.level = selLevel; game.setPath(selLevel); S.garden = drawGarden(LEVELS[selLevel], S.H, pathFor(selLevel), selLevel); audio.setFade(1); sleepDone = false; renderMenu(); renderAch(); show("scr-start");
}
$("btn-play").onclick = () => {
  audio.unlock(); hideAll(); S.paused = false; sleepExtended = false; sleepDone = false; S.sleepLeft = SAVE.opt.sleep * 60; S.sleepOn = SAVE.opt.sleep > 0; audio.setRain(SAVE.opt.rain); audio.setFade(1, 1);
  game.beginLevel(selLevel); lastTray = ""; lastGo = "";
  if (!startedGame) { startedGame = true; try { if (window.GZR && GZR.ready) GZR.event("game"); } catch (e) {} }
};

/* ---------------- calm cards ---------------- */
$("btn-cards").onclick = () => {
  const n = cardCount(); $("cards-title").textContent = `${n} of ${CARD_ORDER.length} cards`;
  $("cards-list").innerHTML = CARD_ORDER.map((k) => SAVE.cards[k] ? `<li class="got"><i>🃏</i><span><b>${CARD[k][0]}</b><small>${CARD[k][1]}<br><em style="color:#f2d37c;font-style:normal">Try this:</em> ${CARD[k][2]}</small></span></li>` : `<li><i>🔒</i><span><b>???</b><small>Turn this worry into a star to collect its card.</small></span></li>`).join("");
  show("scr-cards");
};
$("btn-cards-close").onclick = () => show("scr-start");

/* ---------------- breathing: in for 4, hold 4, out for 4, hold 4 (box breathing) ---------------- */
function runBreathing(orb, phase, roundEl, rounds, done) {
  const token = ++breathToken; let round = 0;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms)), ok = () => token === breathToken;
  (async () => {
    orb.classList.remove("in", "hold"); phase.textContent = "Get comfy. We'll start in a moment."; await wait(2500);
    for (round = 1; round <= rounds && ok(); round++) {
      if (roundEl) roundEl.textContent = `Round ${round} of ${rounds}`;
      phase.innerHTML = "Breathe in slowly…<br>smell the flower 🌸"; orb.classList.add("in"); audio.play("breathe"); await wait(4000); if (!ok()) return;
      phase.innerHTML = "Hold gently…"; await wait(4000); if (!ok()) return;
      phase.innerHTML = "Breathe out slowly…<br>blow out the candle 🕯️"; orb.classList.remove("in"); await wait(4000); if (!ok()) return;
      phase.innerHTML = "Rest…"; await wait(4000); if (!ok()) return;
    }
    if (ok()) { phase.innerHTML = "Lovely. Well done."; if (rounds >= 4) unlock("breathe"); renderAch(); await wait(1800); if (ok()) done(); }
  })();
}
let breatheBack = null, wasPaused = false;
function openBreathe(back) {
  breatheBack = back; wasPaused = S.paused; S.paused = true; show("scr-breathe");
  runBreathing($("orb"), $("phase"), $("br-round"), 4, closeBreathe);
}
function closeBreathe() { breathToken++; $("scr-breathe").hidden = true; S.paused = wasPaused; if (breatheBack) breatheBack(); breatheBack = null; }
$("btn-breathe").onclick = () => openBreathe(() => {});
$("btn-breathe2").onclick = () => { hideAll(); S.state = "menu"; openBreathe(() => show("scr-start")); };
$("btn-br-done").onclick = closeBreathe;

/* a breather when the calm runs out: nothing is lost, the wave is just tried again */
S.hooks.breather = () => {
  S.paused = true; show("scr-breather"); const orb = $("orb2"), ph = $("phase2"); const token = ++breathToken; orb.classList.remove("in");
  const steps = [[() => { ph.innerHTML = "Breathe in slowly…"; orb.classList.add("in"); }, 4000], [() => { ph.innerHTML = "Hold gently…"; }, 2000], [() => { ph.innerHTML = "Breathe out, even slower…"; orb.classList.remove("in"); }, 5000], [() => { ph.innerHTML = "Good. Let's try again."; }, 1800]];
  (async () => { for (const [fn, ms] of steps) { if (token !== breathToken) return; fn(); await new Promise((r) => setTimeout(r, ms)); } if (token !== breathToken) return; $("scr-breather").hidden = true; S.paused = false; game.endBreather(); lastTray = ""; lastGo = ""; })();
};

/* ---------------- finishing a level ---------------- */
S.hooks.win = (info) => {
  const last = info.level >= 9, bossLv = LEVELS[info.level].boss;
  $("win-kick").textContent = last ? "The whole garden is calm" : "Level complete";
  $("win-title").textContent = last ? "Sweet dreams, George" : info.stars === 3 ? "A perfectly quiet garden" : info.stars === 2 ? "A calm garden" : "Well done for staying with it";
  $("win-flowers").innerHTML = [1, 2, 3].map((n) => `<span class="${n > info.stars ? "off" : ""}">🌸</span>`).join("");
  let txt = info.leaks === 0 ? "Not a single worry reached the nest." : `${info.leaks} worr${info.leaks === 1 ? "y" : "ies"} slipped through, and that's okay.`;
  if (info.breathers) txt += " You took a breather, and that's a smart thing to do.";
  if (!SAVE.rewarded.includes(info.level)) { SAVE.rewarded.push(info.level); saveNow(); try { if (window.GZR && GZR.ready) { const c = 3 + info.level; GZR.earn({ coins: c, xp: 12 }); txt += ` You earned ${c} 🪙 for the whole site.`; } } catch (e) {} }
  if (last) txt = "The big worry cloud has turned into a blanket of stars. The sky is full of them, and every one was a worry once. " + txt;
  $("win-text").textContent = txt;
  $("win-cards").innerHTML = info.cards.map((k) => `<li class="got"><i>🃏</i><span><b>New card: ${CARD[k][0]}</b><small>${CARD[k][2]}</small></span></li>`).join("");
  $("win-tip").textContent = bossLv != null ? BOSS[bossLv].tip : "";
  $("btn-next").hidden = last; $("btn-next").textContent = last ? "" : `Level ${info.level + 2}: ${LEVELS[info.level + 1].name}`;
  // kind words, backed by what George really did this level
  $("aff-text").textContent = pickAffirmation(info, SAVE);
  $("aff-proof").innerHTML = proofLines(info).map((l) => `<li><i>✨</i><span>${l}</span></li>`).join("");
  $("win-happy-wrap").hidden = !info.happy.length;
  $("win-happy").innerHTML = info.happy.slice(0, 3).map((t) => `<li class="got"><i>💛</i><span><b>${t}</b></span></li>`).join("");
  renderValues(); saveNow();
  renderAch(); show("scr-win");
};
/* "What matters to you?": thinking about what you care about is one of the best ways to feel good about yourself */
function renderValues() {
  $("values").innerHTML = VALUES.map(([id, label]) => `<button class="dk-good" data-v="${id}" type="button" aria-pressed="${SAVE.value === id}">${label}</button>`).join("");
  const v = VALUES.find((x) => x[0] === SAVE.value); $("value-line").textContent = v ? v[2] : "Tap one that fits you.";
}
$("values").addEventListener("click", (e) => { const b = e.target.closest(".dk-good"); if (!b) return; SAVE.value = SAVE.value === b.dataset.v ? "" : b.dataset.v; saveNow(); audio.play("click"); renderValues(); });
$("btn-next").onclick = () => { hideAll(); selLevel = S.level + 1; game.beginLevel(S.level + 1); lastTray = ""; lastGo = ""; };
$("btn-win-night").onclick = () => { $("scr-win").hidden = true; S.sleepOn = true; goodnight(); };
$("btn-win-menu").onclick = () => { selLevel = Math.min(S.level + (S.state === "win" ? 1 : 0), 9, SAVE.maxLevel - 1); toMenu(); };
$("btn-win-breathe").onclick = () => { $("scr-win").hidden = true; openBreathe(() => show("scr-win")); };

/* ---------------- the sleep timer: the screen warms and dims, the music slows, then it says goodnight ---------------- */
const LIGHT = [[255, 236, 212], [212, 176, 148], [150, 112, 98]];             // Normal, Dim, Very dim: a warm amber that multiplies the whole page
let nl = null;
function applyLight(extra = 1) {
  if (!nl) { nl = document.createElement("div"); nl.setAttribute("aria-hidden", "true"); nl.style.cssText = "position:fixed;inset:0;z-index:9990;pointer-events:none;mix-blend-mode:multiply;transition:background-color 4s ease"; document.body.appendChild(nl); }
  const [r, g, b] = LIGHT[clamp(SAVE.opt.dim, 1, 3) - 1], k = clamp(extra, 0.3, 1);
  nl.style.backgroundColor = `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
}
let lastInput = performance.now(), pausedFor = 0;
["pointerdown", "keydown", "touchstart"].forEach((e) => addEventListener(e, () => { lastInput = performance.now(); }, { passive: true, capture: true }));
function sleepTick(dt) {
  // asleep at the screen? A long pause, or a long time with no taps, means it is time to say goodnight
  if (S.sleepOn && !sleepDone && ["intro", "play", "win", "breather"].includes(S.state)) {
    pausedFor = S.paused && $("scr-pause").hidden === false ? pausedFor + dt : 0;
    if (pausedFor > 180 || (!S.paused && performance.now() - lastInput > 8 * 60 * 1000)) { pausedFor = 0; goodnight(); return; }
  }
  if (!S.sleepOn || sleepDone || !["intro", "play", "win", "breather"].includes(S.state) || S.paused) return;
  S.sleepLeft -= dt;
  const left = S.sleepLeft, dim = left < 180 ? 0.65 + 0.35 * (left / 180) : 1;
  if (Math.abs(dim - (sleepTick.last || 1)) > 0.004) { sleepTick.last = dim; applyLight(dim); }
  if (left < 150) { audio.setFade(clamp(0.3 + 0.7 * (left / 150), 0.3, 1), 5); music.setTempo(44 + 8 * clamp(left / 150, 0, 1)); }
  if (left <= 0) goodnight();
}
function goodnight() {
  sleepDone = true; S.paused = true; goodPicked = []; $("good-msg").textContent = "Tap three that fit your day."; $("btn-bye-more").hidden = sleepExtended;
  $("goods").innerHTML = GOOD.map((g, i) => `<button class="dk-good" data-i="${i}" type="button" aria-pressed="false">${g}</button>`).join("");
  $("bye-aff").textContent = SLEEP_THOUGHTS[Math.floor(Math.random() * SLEEP_THOUGHTS.length)];
  audio.play("bye"); show("scr-bye");
}
$("goods").addEventListener("click", (e) => {
  const b = e.target.closest(".dk-good"); if (!b) return; const i = +b.dataset.i, at = goodPicked.indexOf(i);
  if (at >= 0) goodPicked.splice(at, 1); else if (goodPicked.length < 3) goodPicked.push(i); else return;
  b.setAttribute("aria-pressed", at < 0); audio.play("click");
  if (goodPicked.length === 3) { SAVE.st.good++; saveNow(); unlock("good-things"); renderAch(); $("good-msg").textContent = "Lovely. Hold on to those as you drift off. 💛"; } else $("good-msg").textContent = `Pick ${3 - goodPicked.length} more.`;
});
$("btn-bye-more").onclick = () => { sleepExtended = true; sleepDone = false; S.sleepLeft = 300; sleepTick.last = 1; applyLight(0.75); S.paused = false; $("scr-bye").hidden = true; };
$("btn-bye-breathe").onclick = () => { $("scr-bye").hidden = true; openBreathe(() => { show("scr-bye"); }); };
$("btn-bye-done").onclick = () => { unlock("sweet"); renderAch(); music.stop(); audio.setFade(0, 6); sleepDone = true; S.sleepOn = false; S.paused = false; selLevel = Math.min(S.level, 9); toMenu(); asleep(true); };
/* the last screen of the night: dark and quiet, with nothing to press except a small way back */
function asleep(on) {
  let el = $("asleep"); if (!el) { el = document.createElement("div"); el.id = "asleep"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Goodnight"); el.style.cssText = "position:fixed;inset:0;z-index:9995;background:#07050f;color:#8f86ad;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:24px;font-family:Manrope,sans-serif;opacity:0;transition:opacity 3s ease";
    el.innerHTML = '<div style="font-size:54px;opacity:.4;filter:grayscale(.5)">🌙</div><div style="font:700 30px Rajdhani,sans-serif;color:#b5acd2">Sleep well, George</div><div style="font-size:16px;max-width:30ch;line-height:1.5">The garden is quiet. Put the screen down and rest your eyes.</div><button id="asleep-back" type="button" style="margin-top:28px;background:none;border:1px solid rgba(143,134,173,.35);color:#8f86ad;border-radius:999px;padding:0 18px;min-height:46px;font:600 14px Manrope,sans-serif;cursor:pointer">I\'m still awake</button>';
    document.body.appendChild(el); $("asleep-back").onclick = () => asleep(false); }
  if (on) { el.style.display = "flex"; requestAnimationFrame(() => (el.style.opacity = "1")); applyLight(0.45); try { $("asleep-back").focus({ preventScroll: true }); } catch (e) {} }
  else { el.style.opacity = "0"; setTimeout(() => (el.style.display = "none"), 800); sleepDone = false; audio.setFade(1, 2); applyLight(1); }
}

/* ---------------- the loop ---------------- */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  game.update(dt); sleepTick(dt); render(ctx, cv, scale); setUi();
}
buildTray(); renderMenu(); renderAch(); show("scr-start"); requestAnimationFrame(frame);
window.__dk = { S, SAVE, game, show, toMenu, selectLevel(i) { selLevel = i; renderMenu(); } };
