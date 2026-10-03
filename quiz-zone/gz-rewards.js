/* ================================================================
   GEORGE'S REWARDS: coins, level, daily missions, SATs countdown
   One small module shared by the whole site.

   * Coins and XP are earned by playing any game and by SATs practice.
     Coins are spent in Tiki-Taka's Training ground and in My Player.
   * Every day there are three missions (one school, one football, one
     anything). Do them all for a bonus.
   * The SATs card counts down the days and suggests what to practise.

   Saved on this device in gz_rewards_v1 (so the optional login carries
   it between devices like the rest of the progress).

   For games:   GZR.event("game")   GZR.event("tt_goal", 2)   ...
   For pages:   GZR.renderMissions(el)  GZR.renderLevel(el)  GZR.renderSats(el)
   ================================================================ */
(function (GZR) {
  "use strict";
  const KEY = "gz_rewards_v1";
  const SATS_KEY = "gz_sats_v1";

  // The SATs week for Year 6. Change this one line if the school says different.
  const SATS_DATE = "2027-05-10";
  const SATS_LABEL = "week of 10 May 2027";

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

  /* ---------------- the save ---------------- */
  function blank() { return { coins: 0, xp: 0, earned: 0, day: "", prog: {}, done: {}, bonus: false }; }
  function readSave() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    s = Object.assign(blank(), s && typeof s === "object" ? s : {});
    s.coins = Math.max(0, Math.floor(+s.coins || 0)); s.xp = Math.max(0, Math.floor(+s.xp || 0)); s.earned = Math.max(0, Math.floor(+s.earned || 0));
    if (typeof s.prog !== "object" || !s.prog) s.prog = {};
    if (typeof s.done !== "object" || !s.done) s.done = {};
    if (s.day !== today()) { s.day = today(); s.prog = {}; s.done = {}; s.bonus = false; }   // a fresh day, fresh missions
    return s;
  }
  function write(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function changed() { try { window.dispatchEvent(new CustomEvent("gz-rewards")); } catch (e) {} }

  /* ---------------- level ---------------- */
  const xpFor = (n) => 50 * n * (n - 1);                    // XP needed to reach level n: 0, 100, 300, 600, 1000...
  function levelOf(xp) { let n = 1; while (xpFor(n + 1) <= xp && n < 99) n++; return n; }
  function levelInfo(xp) {
    const n = levelOf(xp), a = xpFor(n), b = xpFor(n + 1);
    return { level: n, into: xp - a, span: b - a, pct: Math.round(((xp - a) / (b - a)) * 100) };
  }

  /* ---------------- toasts ---------------- */
  function toast(t) {
    if (window.GZ && GZ.showToast) GZ.showToast(t);
  }
  let toastQueue = [], toasting = false;
  function say(t) { toastQueue.push(t); if (!toasting) next(); }
  function next() {
    const t = toastQueue.shift();
    if (!t) { toasting = false; return; }
    toasting = true; toast(t); setTimeout(next, 3300);
  }

  /* ---------------- a small "+5 🪙" that floats up when you earn ---------------- */
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let popCoins = 0, popLevel = false, popTimer = 0;
  function pop(coins, xp, levelUp) {
    if (reduced || (!coins && !levelUp)) return;
    popCoins += coins; popLevel = popLevel || levelUp;
    clearTimeout(popTimer);                      // several rewards in one moment show as one pop
    popTimer = setTimeout(() => {
      const el = document.createElement("div");
      el.className = "gzr-float" + (popLevel ? " lv" : "");
      el.setAttribute("aria-hidden", "true");
      el.textContent = (popLevel ? "⭐ LEVEL UP!  " : "") + (popCoins ? `+${popCoins} 🪙` : "");
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1700);
      document.querySelectorAll(".gzr-level").forEach((c) => { c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); });
      popCoins = 0; popLevel = false;
    }, 350);
  }

  /* ---------------- earning and spending ---------------- */
  function earn(o, quiet) {
    const s = readSave();
    const coins = Math.max(0, Math.floor(o.coins || 0)), xp = Math.max(0, Math.floor(o.xp || 0));
    const before = levelOf(s.xp);
    s.coins += coins; s.xp += xp; s.earned += coins;
    write(s);
    const after = levelOf(s.xp);
    if (after > before) say(`⭐ Level ${after}! Well played, George!`);
    changed();
    pop(coins, xp, after > before);
    return { coins, xp, level: after };
  }
  function spend(n) {
    const s = readSave();
    n = Math.max(0, Math.floor(n));
    if (s.coins < n) return false;
    s.coins -= n; write(s); changed();
    return true;
  }

  /* ---------------- daily missions ---------------- */
  const POOLS = {
    school: [
      { id: "school1", icon: "🎓", text: "Finish a school round: SATs practice, Matchday, Times Tables or a geography quiz", ev: "school", target: 1 },
      { id: "sats10", icon: "✏️", text: "Answer 10 questions in SATs practice", ev: "sats_q", target: 10 },
      { id: "sats7", icon: "🧠", text: "Get 7 SATs questions right", ev: "sats_right", target: 7 },
    ],
    football: [
      { id: "ttgoal", icon: "⚽", text: "Score 2 goals in Tiki-Taka", ev: "tt_goal", target: 2 },
      { id: "ttgame", icon: "🔁", text: "Play a game of Tiki-Taka", ev: "tt_game", target: 1 },
      { id: "fkgoal", icon: "🎯", text: "Score a free kick in Free Kick Masters", ev: "fk_goal", target: 1 },
      { id: "pen", icon: "🥅", text: "Play a Penalty Shootout", ev: "pen_game", target: 1 },
      { id: "md", icon: "🏟️", text: "Play a match in Matchday", ev: "md_game", target: 1 },
    ],
    any: [
      { id: "play2", icon: "🎮", text: "Finish 2 games, any games", ev: "game", target: 2 },
      { id: "right10", icon: "💡", text: "Get 10 quiz answers right", ev: "correct", target: 10 },
      { id: "pack", icon: "📦", text: "Open a card pack", ev: "pack", target: 1 },
    ],
  };
  const REWARD = { coins: 20, xp: 30 }, BONUS = { coins: 50, xp: 60 };
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); }
  function todaysMissions() {
    const d = today();
    return ["school", "football", "any"].map((k, i) => POOLS[k][hash(d + k) % POOLS[k].length]);
  }
  function missions() {
    const s = readSave();
    return todaysMissions().map((m) => ({ ...m, got: Math.min(m.target, s.prog[m.id] || 0), done: !!s.done[m.id] }));
  }

  /* A game tells us what happened: ("game"), ("tt_goal", 2), ("correct", 7)... */
  function event(name, n) {
    n = n === undefined ? 1 : n;
    if (!(n > 0)) return;
    const s = readSave();
    const fresh = [];
    for (const m of todaysMissions()) {
      if (m.ev !== name || s.done[m.id]) continue;
      s.prog[m.id] = (s.prog[m.id] || 0) + n;
      if (s.prog[m.id] >= m.target) { s.done[m.id] = true; fresh.push(m); }
    }
    let gift = { coins: 0, xp: 0 };
    for (const m of fresh) { gift.coins += REWARD.coins; gift.xp += REWARD.xp; }
    const all = todaysMissions().every((m) => s.done[m.id]);
    let bonus = false;
    if (all && !s.bonus) { s.bonus = true; bonus = true; gift.coins += BONUS.coins; gift.xp += BONUS.xp; }
    write(s);
    fresh.forEach((m) => say(`✅ Mission complete: ${m.text} (+${REWARD.coins} 🪙)`));
    if (bonus) say(`🎉 All three missions done today! Bonus +${BONUS.coins} 🪙`);
    if (gift.coins || gift.xp) earn(gift);
    else if (fresh.length) changed();
  }

  /* What a finished game is worth, and which missions it counts for. */
  const SCHOOL_GAMES = ["times-tables", "capital-quest", "flag-quest", "mountain-peaks", "matchday"];
  function gameFinished(id, o) {
    o = o || {};
    earn({ coins: 5, xp: 10 });
    event("game");
    if (SCHOOL_GAMES.includes(id)) event("school");
    if (id === "tiki-taka") { event("tt_game"); event("tt_goal", o.goals || 0); }
    if (id === "penalty-shootout") event("pen_game");
    if (id === "matchday") event("md_game");
    if (id === "free-kick") event("fk_goal", o.goals || 0);
    if (id === "pack-opener") event("pack");
    if (o.correct) event("correct", o.correct);
  }
  /* SATs practice: a round of `total` questions with `right` correct. */
  function satsRound(right, total) {
    earn({ coins: Math.min(10, right), xp: right * 2 });
    event("sats_q", total); event("sats_right", right); event("school");
  }

  /* ---------------- the SATs countdown ---------------- */
  function daysToSats() {
    const [y, m, d] = SATS_DATE.split("-").map(Number);
    const t = new Date(y, m - 1, d), n = new Date(); n.setHours(0, 0, 0, 0);
    return Math.round((t - n) / 86400000);
  }
  function satsSave() { try { return JSON.parse(localStorage.getItem(SATS_KEY) || "{}").topics || {}; } catch (e) { return {}; } }
  function satsSuggestion() {
    const T = satsSave(), ids = Object.keys(T).filter((id) => !id.startsWith("mixed-") && T[id].total >= 5);
    const tid = (t) => T[t].right / T[t].total;
    const lastDay = Math.max(0, ...Object.values(T).map((t) => t.last || 0));
    const didToday = lastDay && new Date(lastDay).toDateString() === new Date().toDateString();
    if (ids.length) {
      ids.sort((a, b) => tid(a) - tid(b));
      const w = ids[0], t = T[w];
      return { didToday, text: `Your trickiest topic is <b>${esc(t.name || w)}</b> (${Math.round(tid(w) * 100)}% right). A quick round would help.` };
    }
    return { didToday, text: "Pick a topic and do one round. Ten minutes a day adds up!" };
  }

  /* ---------------- drawing the cards ---------------- */
  function renderLevel(el) {
    if (!el) return;
    const s = readSave(), L = levelInfo(s.xp);
    el.innerHTML = `<div class="gzr-level" role="group" aria-label="George's level">
      <span class="gzr-lv"><span aria-hidden="true">⭐</span> Level ${L.level}</span>
      <span class="gzr-xp" aria-label="${L.into} of ${L.span} experience points"><i style="width:${Math.max(4, L.pct)}%"></i></span>
      <span class="gzr-coins"><span aria-hidden="true">🪙</span> ${s.coins}</span></div>`;
  }
  function renderMissions(el) {
    if (!el) return;
    const ms = missions(), s = readSave(), all = ms.every((m) => m.done);
    const fold = el.hasAttribute("data-collapse");
    // A folded card keeps its open/closed state when it redraws; on a phone it starts closed.
    const old = el.querySelector("details");
    const open = old ? old.open : window.innerWidth >= 700;
    const summary = `🎯 Today's missions <span class="gzr-sub">${all ? "All done! 🎉" : `${ms.filter((m) => m.done).length} of 3 done`}</span>`;
    el.innerHTML = `<section class="gzr-card${fold ? " gzr-fold" : ""}" aria-label="Today's missions">
      ${fold ? `<details${open ? " open" : ""}><summary class="gzr-head"><h2>${summary}</h2></summary>` : `<div class="gzr-head"><h2>🎯 Today's missions</h2><span class="gzr-sub">${all ? "All done! 🎉" : `${ms.filter((m) => m.done).length} of 3 done`}</span></div>`}
      <ul class="gzr-list">${ms.map((m) => `<li class="${m.done ? "done" : ""}">
        <span class="gzr-ico" aria-hidden="true">${m.done ? "✅" : m.icon}</span>
        <span class="gzr-txt">${esc(m.text)}<span class="gzr-bar" aria-label="${m.got} of ${m.target}"><i style="width:${Math.round((m.got / m.target) * 100)}%"></i></span></span>
        <span class="gzr-pay">+${REWARD.coins} 🪙</span></li>`).join("")}</ul>
      <p class="gzr-foot">${s.bonus ? "Bonus collected today. See you tomorrow!" : `Do all three for a bonus of ${BONUS.coins} 🪙. New missions every day.`}</p>${fold ? "</details>" : ""}</section>`;
  }
  function renderSats(el, o) {
    if (!el) return;
    o = o || {};
    const d = daysToSats(), sug = satsSuggestion();
    const head = d > 1 ? `${d} days to go` : d === 1 ? "Tomorrow!" : d === 0 ? "This week!" : "SATs are done. Well done, George!";
    const weeks = d > 14 ? ` (about ${Math.round(d / 7)} weeks)` : "";
    el.innerHTML = `<section class="gzr-card gzr-sats" aria-label="SATs countdown">
      <div class="gzr-head"><h2>📅 SATs countdown</h2><span class="gzr-sub">${esc(SATS_LABEL)}</span></div>
      <p class="gzr-big">${head}<small>${weeks}</small></p>
      ${d >= 0 ? `<p class="gzr-note">${sug.didToday ? "✅ You have done your practice today. Nice work!" : "⏱️ Today's goal: 10 minutes of practice."}<br>${sug.text}</p>
      <a class="gzr-btn" href="${esc(o.href || "sats.html")}">${sug.didToday ? "Practise some more" : "Start practising"}</a>` : ""}
    </section>`;
  }

  GZR.event = event;
  GZR.earn = earn;
  GZR.spend = spend;
  GZR.coins = () => readSave().coins;
  GZR.state = readSave;
  GZR.level = () => levelInfo(readSave().xp);
  GZR.gameFinished = gameFinished;
  GZR.satsRound = satsRound;
  GZR.missions = missions;
  GZR.daysToSats = daysToSats;
  GZR.renderLevel = renderLevel;
  GZR.renderMissions = renderMissions;
  GZR.renderSats = renderSats;
  GZR.ready = true;
  // Anything that happened before this file finished loading is replayed now.
  const q = window.__gzrQueue || [];
  window.__gzrQueue = null;
  q.forEach(([fn, args]) => { try { GZR[fn].apply(GZR, args); } catch (e) {} });
  // Keep every card on the page up to date.
  window.addEventListener("gz-rewards", () => {
    document.querySelectorAll("[data-gzr]").forEach((el) => {
      const k = el.dataset.gzr;
      if (k === "level") renderLevel(el); else if (k === "missions") renderMissions(el); else if (k === "sats") renderSats(el, { href: el.dataset.href });
    });
  });
  // Cards that ask for themselves with data-gzr="missions" | "level" | "sats"
  const auto = () => document.querySelectorAll("[data-gzr]").forEach((el) => {
    const k = el.dataset.gzr;
    if (k === "level") renderLevel(el); else if (k === "missions") renderMissions(el); else if (k === "sats") renderSats(el, { href: el.dataset.href });
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto); else auto();
})(window.GZR = window.GZR || {});
