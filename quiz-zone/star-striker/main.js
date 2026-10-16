/* Star Striker: puts it all on the page. Controls (touch, mouse, keyboard), the menus, scores, rewards and the game loop. */
import { S, SAVE, saveNow, W, clamp } from "./core.js";
import { ENEMY, BOSS, PICK, LEVELS, ACH } from "./data.js";
import { buildSprites } from "./sprites.js";
import * as game from "./game.js";
import { backdrop, updateBackdrop, render } from "./render.js";
import { audio, music } from "./audio.js";

const $ = (id) => document.getElementById(id);
const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
const LIVE = ["intro", "play", "boss", "warn"];
const GAME_ID = "star-striker";
let scale = 1, paused = false, selLevel = 0, dragging = false, rewarded = false, nameSent = false;

/* ---------------- setup ---------------- */
S.osReduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
S.calm = S.osReduced || SAVE.calm;
audio.setSound(SAVE.sound); audio.setMusic(SAVE.music);
S.spr = buildSprites(ENEMY, BOSS, PICK);
const coarse = !!(window.matchMedia && (matchMedia("(pointer: coarse)").matches || matchMedia("(any-pointer: coarse)").matches));
if (!coarse) stage.classList.add("noTouch");

function resize() {
  const r = stage.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.max(2, Math.round(r.width * dpr)); cv.height = Math.max(2, Math.round(r.height * dpr));
  scale = cv.width / W; S.H = cv.height / scale;
  S.P.y = clamp(S.P.y, 110, S.H - 44); S.P.ty = clamp(S.P.ty, 110, S.H - 44);
}
window.addEventListener("resize", () => { resize(); backdrop(clamp(S.level, 0, 9)); });
resize(); backdrop(0);

/* ---------------- achievements on the page ---------------- */
function renderAch() {
  const n = ACH.filter((a) => SAVE.ach[a[0]]).length; $("ach-count").textContent = `${n} of ${ACH.length}`;
  $("ach-list").innerHTML = ACH.map((a) => SAVE.ach[a[0]] ? `<li class="got"><i>${a[1]}</i><span><b>${a[2]}</b><small>${a[3]}</small></span></li>` : `<li><i>🔒</i><span><b>???</b><small>${a[3]}</small></span></li>`).join("");
}
S.hooks.toast = (a) => {
  const t = document.createElement("div"); t.className = "ss-toast"; t.innerHTML = `<i>${a[1]}</i><div><small>Achievement unlocked</small>${a[2]}</div>`;
  const box = $("toasts"); box.appendChild(t); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => t.remove(), 3700); renderAch();
};

/* ---------------- the online top scores ---------------- */
async function loadTop(el) {
  try {
    const rows = await window.DB.topScores(GAME_ID, 5);
    el.innerHTML = rows.length ? rows.map((r, i) => `<li><span>${i + 1}. ${String(r.player_name).replace(/[<>&"]/g, "")}</span><b>${(+r.score).toLocaleString("en-GB")}</b></li>`).join("") : "<li>No scores yet. Be the first!</li>";
  } catch (e) { el.innerHTML = "<li>Scores show up here when you're online.</li>"; }
}

/* ---------------- screens ---------------- */
const screens = ["scr-start", "scr-pause", "scr-clear", "scr-over"];
function show(id) { screens.forEach((s) => ($(s).hidden = s !== id)); }
function hideAll() { screens.forEach((s) => ($(s).hidden = true)); }

function renderLevels() {
  $("lv-grid").innerHTML = LEVELS.map((L, i) => `<button class="ss-lv${LEVELS[i].boss != null ? " boss" : ""}${i === selLevel ? " sel" : ""}" data-i="${i}" type="button" ${i + 1 > SAVE.maxLevel ? "disabled" : ""} aria-label="Level ${i + 1}: ${L.name}${L.boss != null ? ", boss" : ""}">${i + 1}</button>`).join("");
  $("lv-note").textContent = selLevel === 0 ? `Level 1: ${LEVELS[0].name}. Start here to save your score online. Other levels are practice runs.` : `Practice run: Level ${selLevel + 1}, ${LEVELS[selLevel].name}. Scores from practice runs aren't saved online.`;
  $("start-lede").textContent = SAVE.best ? `Your best: ${SAVE.best.toLocaleString("en-GB")}. Beat it!` : "An alien fleet is coming from above. Ten levels, five bosses, loads of power-ups. Can you save the galaxy?";
}
$("lv-grid").addEventListener("click", (e) => { const b = e.target.closest(".ss-lv"); if (!b || b.disabled) return; audio.unlock(); audio.play("click"); selLevel = +b.dataset.i; renderLevels(); });

function setToggles() {
  $("tg-music").setAttribute("aria-pressed", SAVE.music); $("tg-sound").setAttribute("aria-pressed", SAVE.sound);
  $("tg-calm").textContent = S.calm ? "🌙 Calm effects" : "✨ Full effects"; $("tg-calm").setAttribute("aria-pressed", S.calm);
  $("tg-calm").disabled = S.osReduced; if (S.osReduced) $("tg-calm").title = "Your device asks for less motion, so this is on.";
  $("btn-snd").textContent = SAVE.sound ? "🔊" : "🔇";
}
$("tg-music").onclick = () => { audio.unlock(); SAVE.music = !SAVE.music; audio.setMusic(SAVE.music); saveNow(); setToggles(); };
$("tg-sound").onclick = () => { audio.unlock(); SAVE.sound = !SAVE.sound; audio.setSound(SAVE.sound); saveNow(); setToggles(); audio.play("click"); };
$("tg-calm").onclick = () => { if (S.osReduced) return; SAVE.calm = !SAVE.calm; S.calm = SAVE.calm; saveNow(); setToggles(); };
$("btn-snd").onclick = () => { SAVE.sound = !SAVE.sound; SAVE.music = SAVE.sound; audio.setSound(SAVE.sound); audio.setMusic(SAVE.music); saveNow(); setToggles(); };

$("howto").innerHTML = coarse
  ? "<b>Drag your finger</b> anywhere to fly. Your ship fires by itself. Tap the red <b>💣 button</b> for a bomb. Grab the glowing power-ups!"
  : "<b>Mouse</b> or <b>arrow keys / WASD</b> to fly. Your ship fires by itself. <b>Space</b> or <b>B</b> is a bomb. <b>P</b> pauses. Grab the glowing power-ups!";

function launch(lv) {
  audio.unlock(); rewarded = false; nameSent = false; paused = false;
  hideAll(); game.startRun(lv); setHud();
  if (SAVE.music) music.start(lv, false);
}
$("btn-play").onclick = () => launch(selLevel);
$("btn-again").onclick = () => launch(S.startLevel);
$("btn-menu").onclick = () => toMenu();
$("btn-next").onclick = () => { hideAll(); game.nextLevel(); };
$("btn-resume").onclick = () => setPause(false);
$("btn-quit").onclick = () => { setPause(false); music.stop(); toMenu(); };
$("btn-pause").onclick = () => setPause(true);
$("btn-bomb").onclick = () => { game.useBomb(); };

function toMenu() {
  S.state = "menu"; paused = false; music.stop(); S.ts = 1; S.timers.length = 0; S.eb.length = S.en.length = S.pb.length = S.pk.length = S.gm.length = S.beams.length = 0; S.boss = null;
  backdrop(0); selLevel = Math.min(selLevel, SAVE.maxLevel - 1); renderLevels(); show("scr-start"); loadTop($("start-top")); setHud(); renderAch();
}
function setPause(on) {
  if (on && !LIVE.includes(S.state)) return;
  paused = on; if (on) { show("scr-pause"); music.stop(); } else { $("scr-pause").hidden = true; if (SAVE.music && LIVE.includes(S.state)) music.start(S.level, !!S.boss); }
}

/* ---------------- the level clear and game over screens ---------------- */
S.hooks.level = (i) => { backdrop(i); if (SAVE.music) music.start(i, false); };
S.hooks.clear = (stars, bonus) => {
  $("clear-title").textContent = `Level ${S.level + 1} clear!`;
  $("clear-stars").innerHTML = [1, 2, 3].map((n) => `<span class="${n > stars ? "off" : ""}">⭐</span>`).join("");
  $("clear-bonus").innerHTML = `${stars === 3 ? "Flawless! No hits taken. " : stars === 2 ? "Great flying! " : "Cleared! "}Bonus <b>+${bonus.toLocaleString("en-GB")}</b>. You get an extra ❤️ and 💣 for the next level.`;
  $("btn-next").textContent = `Level ${S.level + 2}: ${LEVELS[S.level + 1] ? LEVELS[S.level + 1].name : ""}`;
  show("scr-clear");
};
S.hooks.end = (victory) => {
  setHud();
  const newBest = S.score >= SAVE.best && S.score > 0;
  $("over-kick").textContent = victory ? "You did it!" : S.practice ? "Practice run over" : "Mission over";
  $("over-title").textContent = victory ? "Galaxy saved!" : newBest ? "New best score!" : "Nice flying!";
  $("over-stats").innerHTML = [[S.score.toLocaleString("en-GB"), "Score"], [S.level + 1, "Level"], [S.kills, "Ships downed"]].map(([v, l]) => `<div class="ss-stat"><b>${v}</b><span>${l}</span></div>`).join("");
  $("save-form").hidden = S.practice || S.score <= 0; $("save-msg").textContent = S.practice ? "Practice runs don't go on the online board." : "";
  try { $("ss-name").value = localStorage.getItem("gz_ss_name") || ""; } catch (e) {}
  $("over-ach").innerHTML = S.runAch.map((id) => { const a = ACH.find((x) => x[0] === id); return a ? `<li class="got"><i>${a[1]}</i><span><b>${a[2]}</b><small>${a[3]}</small></span></li>` : ""; }).join("");
  // coins and XP for the whole site
  let txt = "";
  if (!rewarded && window.GZR && GZR.ready) {
    rewarded = true;
    const coins = Math.min(70, Math.floor(S.score / 2500) + S.levelsCleared * 4 + (victory ? 25 : 0)), xp = Math.floor(S.score / 700) + S.levelsCleared * 8;
    try { GZR.gameFinished(GAME_ID, {}); GZR.earn({ coins, xp }); txt = `You earned <b>${coins + 5} 🪙</b> and <b>${xp + 10} XP</b> for the whole site.`; } catch (e) {}
  }
  $("over-rewards").innerHTML = txt; show("scr-over"); loadTop($("over-top")); renderAch();
};
$("save-form").addEventListener("submit", async (e) => {
  e.preventDefault(); if (nameSent) return;
  const name = $("ss-name").value.trim().slice(0, 18); if (!name) return;
  try { localStorage.setItem("gz_ss_name", name); } catch (er) {}
  $("save-msg").textContent = "Saving…";
  try {
    await window.DB.saveScore(GAME_ID, name, Math.min(S.score, 2000000)); nameSent = true;
    $("save-form").hidden = true; $("save-msg").textContent = `Saved online! ${S.score.toLocaleString("en-GB")} points for ${name}.`; loadTop($("over-top")); loadTop($("start-top"));
  } catch (er) { $("save-msg").textContent = /name not allowed/i.test(er.message || "") ? "That name isn't allowed. Try a nickname with just letters." : "Couldn't save online right now. Try again later."; }
});

/* ---------------- controls ---------------- */
function target(e) {
  const r = stage.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * S.H, off = e.pointerType === "touch" ? 95 : 36;
  S.P.tx = clamp(x, 30, W - 30); S.P.ty = clamp(y - off, 110, S.H - 44); S.input = "ptr";
}
stage.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button,input,a,form,label")) return;
  audio.unlock(); if (!LIVE.includes(S.state)) return; dragging = true; target(e); try { stage.setPointerCapture(e.pointerId); } catch (er) {}
});
stage.addEventListener("pointermove", (e) => { if (!LIVE.includes(S.state) || paused) return; if (e.pointerType === "mouse" || dragging) target(e); });
const endDrag = () => { dragging = false; };
stage.addEventListener("pointerup", endDrag); stage.addEventListener("pointercancel", endDrag);
stage.addEventListener("contextmenu", (e) => { if (LIVE.includes(S.state)) e.preventDefault(); });

const KEYMAP = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down" };
window.addEventListener("keydown", (e) => {
  if (e.target.closest && e.target.closest("input,textarea")) return;
  const k = KEYMAP[e.code];
  if (k && LIVE.includes(S.state)) { game.keys[k] = true; S.input = "kbd"; e.preventDefault(); }
  if ((e.code === "Space" || e.code === "KeyB") && LIVE.includes(S.state) && !paused) { e.preventDefault(); game.useBomb(); }
  if (e.code === "KeyP" || e.code === "Escape") { if (paused) setPause(false); else if (LIVE.includes(S.state)) setPause(true); }
});
window.addEventListener("keyup", (e) => { const k = KEYMAP[e.code]; if (k) game.keys[k] = false; });
window.addEventListener("blur", () => { for (const k in game.keys) game.keys[k] = false; if (LIVE.includes(S.state)) setPause(true); });
document.addEventListener("visibilitychange", () => { if (document.hidden && LIVE.includes(S.state)) setPause(true); });

/* ---------------- the display around the canvas ---------------- */
let lastBombs = -1, lastLive = null;
function setHud() {
  const live = ["intro", "play", "boss", "warn", "bossdie", "clear"].includes(S.state);
  if (live !== lastLive) { lastLive = live; $("ss-btns").hidden = !live; stage.classList.toggle("playing", live); }
  if (S.bombs !== lastBombs) { lastBombs = S.bombs; $("bomb-n").textContent = S.bombs; $("btn-bomb").disabled = S.bombs <= 0; }
}

/* ---------------- the loop, and a gentle drop in effects on slow devices ---------------- */
let last = performance.now(), acc = 0, frames = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!paused) { game.update(dt); updateBackdrop(dt); } else S.now += 0;
  render(ctx, cv, scale); setHud();
  acc += dt; frames++;
  if (acc > 2.5) { const ms = (acc / frames) * 1000; if (ms > 25 && S.fxMul > 0.35) S.fxMul *= 0.75; acc = 0; frames = 0; }
}
requestAnimationFrame(frame);

setToggles(); renderLevels(); renderAch(); loadTop($("start-top")); show("scr-start");
if (document.fonts && document.fonts.load) document.fonts.load('700 20px Rajdhani');
window.__ss = { S, SAVE, game, launch, setPause, toMenu };
