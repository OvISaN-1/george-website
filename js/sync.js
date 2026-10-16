/* ================================================================
   PROGRESS ACCOUNT SYNC
   If George has logged in on progress.html, this keeps his saves
   (everything in localStorage that the games write) in step with his
   account online, so they follow him to other devices.

   - Loads on every page, but only does anything once he is logged in
     (js/main.js adds it; progress.html includes it directly).
   - Starts with the account: if the account has newer progress it is
     loaded (the page reloads once so the games pick it up).
   - While playing, changes are saved to the account every 20 seconds
     and when the tab is hidden or closed.
   - If the account and this device have BOTH changed, the two are
     combined automatically (higher numbers, joined lists, settings kept
     as they are here) and a backup of both is kept. No question is asked.
   - The password is never kept: each device holds its own random key.
   Everything here fails quietly when offline.
   ================================================================ */
(function () {
  "use strict";
  if (window.GZSync) return;

  const BASE = "https://hucnucpfyjltlhmvprso.supabase.co/rest/v1/rpc/";
  const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Y251Y3BmeWpsdGxobXZwcnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDgzNjEsImV4cCI6MjEwMzU4NDM2MX0.DSjLCkiUWB47wVd4wnW_2RvWFoISbH80JI9ukB1bBdg";
  const ACC = "gz_account_v1";
  const OURS = /^(gz_|gamezone_|gw_)/;
  // Never part of a save: the login itself, Dad's secret PIN, and short-lived copies of live data
  // (fixtures, squad, goal scorers) that change on every visit and would look like false clashes.
  const SKIP = /^(gz_account|gz_sync_|gz_forest_live|gz_forest_squad|gz_goals_v1_|gz_scout_open|gw_prediction_pin)/;
  const onProgressPage = /progress\.html$/.test(location.pathname);

  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) {} };

  /* ---- what the games have saved here ---- */
  function collect() {
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (OURS.test(k) && !SKIP.test(k)) data[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return data;
  }
  // A short fingerprint, to notice when something changed. (Not security.)
  function hashOf(data) {
    let h = 5381, n = 0;
    Object.keys(data).sort().forEach((k) => {
      const s = k + "\u0001" + data[k] + "\u0002";
      for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
      n += s.length;
    });
    return h + ":" + n;
  }
  // Replace this device's saves with the given ones (the login is left alone).
  function apply(data) {
    Object.keys(collect()).forEach((k) => lsDel(k));
    Object.keys(data || {}).forEach((k) => { if (OURS.test(k) && !SKIP.test(k) && typeof data[k] === "string") lsSet(k, data[k]); });
  }

  /* ---- the login kept on this device ---- */
  function account() { try { return JSON.parse(lsGet(ACC)); } catch (e) { return null; } }
  function setAccount(a) { if (a) lsSet(ACC, JSON.stringify(a)); else lsDel(ACC); }

  async function rpc(fn, args, keepalive) {
    try {
      const res = await fetch(BASE + fn, {
        method: "POST", keepalive: !!keepalive,
        headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      if (res.status === 404) return { ok: false, error: "setup" };   // the database part isn't installed yet
      if (!res.ok) return { ok: false, error: "offline" };
      return await res.json();
    } catch (e) { return { ok: false, error: "offline" }; }
  }

  /* ---- log in / out / create ---- */
  async function create(user, pass) {
    const local = collect();
    const r = await rpc("progress_create", { p_user: user, p_pass: pass, p_data: local });
    if (!r.ok) return r;
    setAccount({ user: user.trim().toLowerCase(), display: r.display, token: r.token, base: r.updated_at, hash: hashOf(local) });
    return r;
  }
  // Returns { ok, state } where state is: loaded | saved | same | choose
  async function login(user, pass) {
    const r = await rpc("progress_login", { p_user: user, p_pass: pass });
    if (!r.ok) return r;
    const local = collect(), theirs = r.data || {};
    const hasLocal = Object.keys(local).length > 0, hasTheirs = Object.keys(theirs).length > 0;
    const acc = { user: user.trim().toLowerCase(), display: r.display, token: r.token, base: r.updated_at, hash: "" };
    let state;
    if (!hasLocal && hasTheirs) { apply(theirs); acc.hash = hashOf(collect()); state = "loaded"; }
    else if (hasLocal && !hasTheirs) { state = "saved"; }                       // this device's progress goes up
    else if (hashOf(local) === hashOf(theirs)) { acc.hash = hashOf(local); state = "same"; }
    else if (!hasLocal && !hasTheirs) { acc.hash = hashOf(local); state = "same"; }
    else { state = "merge"; }                                                    // both have progress: they are combined for him
    setAccount(acc);
    if (state === "saved") await push(true);
    if (state === "merge") { await reconcile(); state = "merged"; }
    return { ok: true, state, display: r.display, theirs };
  }
  async function logout() {
    const a = account();
    if (a) await rpc("progress_logout", { p_user: a.user, p_token: a.token });
    setAccount(null);
  }

  /* ---- merging, so George never has to choose ----
     When this device and the account both changed, the two are combined key by key:
     numbers (coins, best scores, levels) keep the higher one, lists and unlocks are joined,
     yes/no unlocks stay unlocked, and settings stay as they are on this device.
     A backup of both sides is kept on this device in case a merge ever looks wrong. */
  const SETTINGS_KEY = /(autoname|_sfx|_music|_sound|_calm|_theme|_name|_speed|_opt|_settings|_prefs)$/;
  const SETTINGS_FIELD = /^(opt|opts|options|settings|prefs|preferences|calm|music|sound|sfx|theme|name|nick|nickname|dim|speed|sleep|auto)$/i;
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  function mergeVal(l, r, field) {
    if (field && SETTINGS_FIELD.test(field)) return l;
    if (isObj(l) && isObj(r)) { const o = {}; new Set([...Object.keys(l), ...Object.keys(r)]).forEach((k) => { o[k] = k in l && k in r ? mergeVal(l[k], r[k], k) : k in l ? l[k] : r[k]; }); return o; }
    if (Array.isArray(l) && Array.isArray(r)) { const seen = new Set(), out = []; [...l, ...r].forEach((x) => { const k = JSON.stringify(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }); return out; }
    if (typeof l === "number" && typeof r === "number") return Math.max(l, r);
    if (typeof l === "boolean" && typeof r === "boolean") return l || r;
    return l;
  }
  function mergeData(local, remote) {
    const out = {};
    new Set([...Object.keys(local), ...Object.keys(remote || {})]).forEach((k) => {
      const l = local[k], r = (remote || {})[k];
      if (r === undefined) { out[k] = l; return; }
      if (l === undefined) { out[k] = r; return; }
      if (l === r) { out[k] = l; return; }
      if (SETTINGS_KEY.test(k)) { out[k] = l; return; }
      try { out[k] = JSON.stringify(mergeVal(JSON.parse(l), JSON.parse(r), "")); } catch (e) { out[k] = l; }
    });
    return out;
  }
  // Combine this device and the account, quietly. Returns the push result.
  async function reconcile() {
    const a = account();
    if (!a) return { ok: false, error: "none" };
    const r = await rpc("progress_pull", { p_user: a.user, p_token: a.token, p_since: null });
    if (!r.ok) { if (r.error === "auth") setAccount(null); return r; }
    const local = collect(), merged = mergeData(local, r.data || {});
    try { lsSet("gz_sync_backup", JSON.stringify({ at: new Date().toISOString(), device: local, account: r.data || {} })); } catch (e) {}
    apply(merged);
    a.base = r.updated_at; a.hash = ""; delete a.conflict; setAccount(a);
    return push(true);
  }

  /* ---- keeping in step ---- */
  let busy = false;
  // Send this device's saves up. Refused (conflict) if the account moved on since the last sync.
  async function push(force, keepalive) {
    const a = account();
    if (!a) return { ok: false, error: "none" };
    const local = collect();
    const r = await rpc("progress_save", { p_user: a.user, p_token: a.token, p_data: local, p_base: force ? null : a.base, p_force: !!force }, keepalive);
    if (r.ok) { a.base = r.updated_at; a.hash = hashOf(local); delete a.conflict; setAccount(a); }
    else if (r.error === "conflict") { a.conflict = true; setAccount(a); }   // sync() combines the two on its next turn
    else if (r.error === "auth") { setAccount(null); }
    return r;
  }
  // The account's saves come down and replace this device's.
  async function pullAll() {
    const a = account();
    if (!a) return { ok: false, error: "none" };
    const r = await rpc("progress_pull", { p_user: a.user, p_token: a.token, p_since: null });
    if (!r.ok) { if (r.error === "auth") setAccount(null); return r; }
    apply(r.data);
    a.base = r.updated_at; a.hash = hashOf(collect()); delete a.conflict;
    setAccount(a);
    return r;
  }
  // Look at what is in the account without changing anything here.
  async function peek() {
    const a = account();
    if (!a) return { ok: false, error: "none" };
    return rpc("progress_pull", { p_user: a.user, p_token: a.token, p_since: null });
  }
  // The "keep this device" / "use my account" choice after a conflict.
  async function resolve(which) {
    if (which === "device") return push(true);
    if (which === "merge") return reconcile();
    return pullAll();
  }

  async function sync(atStart) {
    const a = account();
    if (!a || busy) return;
    busy = true;
    try {
      if (a.conflict) { await reconcile(); return; }
      const changedHere = hashOf(collect()) !== a.hash;
      const r = await rpc("progress_pull", { p_user: a.user, p_token: a.token, p_since: a.base });
      if (!r.ok) { if (r.error === "auth") setAccount(null); return; }
      if (r.changed && !changedHere) {
        // Newer progress from another device: take it, then reload once so the games read it.
        apply(r.data);
        a.base = r.updated_at; a.hash = hashOf(collect()); setAccount(a);
        if (atStart && !onProgressPage && !sessionStorage.getItem("gz_sync_reloaded")) {
          try { sessionStorage.setItem("gz_sync_reloaded", "1"); } catch (e) {}
          location.reload();
        }
      } else if (r.changed && changedHere) {
        await reconcile();                                        // both changed: combine them, no questions
      } else if (changedHere) {
        const p = await push(false);
        if (p.error === "conflict") await reconcile();
      }
    } finally { busy = false; }
  }

  /* ---- Scores: name filled in, score saved ----
     Every game ends with an "Enter your name" box for the online top scores. While George is
     logged in the box fills itself with his username and the score is saved straight away.
     (The leaderboard only takes letters, numbers, spaces, ' - and . so anything else in a
     username, like _, becomes a space. It can be switched off on the progress page; if a
     save fails, the box stays open with his name in it.) */
  const BOXES = ["player-name", "r-name", "keepy-name", "ss-name"];
  const autoOn = () => lsGet("gz_autoname") !== "0";
  function scoreName() {
    const a = account();
    if (!a) return "";
    const n = (a.display || a.user || "").replace(/[^A-Za-z0-9 '.-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 18);
    return /[A-Za-z]/.test(n) ? n : "";
  }
  function fillNameBoxes() {
    if (document.hidden || onProgressPage || !autoOn()) return;
    const name = scoreName();
    if (!name) return;
    BOXES.forEach((id) => {
      const box = document.getElementById(id);
      if (!box) return;
      if (!box.getClientRects().length) { delete box.dataset.gzAuto; return; }   // hidden: ready for next time
      if (box.dataset.gzAuto) return;                                           // already done for this one
      box.dataset.gzAuto = "1";
      box.value = name;
      const form = box.form;
      if (form && form.requestSubmit) setTimeout(() => { if (box.getClientRects().length) form.requestSubmit(); }, 700);
    });
  }

  /* ---- save soon after anything changes (Locker Room upgrades, challenges, new unlocks...) ---- */
  let soon = 0;
  function saveSoon() {
    clearTimeout(soon);
    soon = setTimeout(() => {
      const a = account();
      if (a && !a.conflict && !busy && hashOf(collect()) !== a.hash) push(false);
    }, 4000);
  }
  try {
    const rawSet = Storage.prototype.setItem, rawDel = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (k) { const r = rawSet.apply(this, arguments); if (this === window.localStorage && OURS.test(k) && !SKIP.test(k)) saveSoon(); return r; };
    Storage.prototype.removeItem = function (k) { const r = rawDel.apply(this, arguments); if (this === window.localStorage && OURS.test(k) && !SKIP.test(k)) saveSoon(); return r; };
  } catch (e) { /* can't watch writes: the 20-second check still covers it */ }

  window.GZSync = { account, collect, hashOf, apply, create, login, logout, push, pullAll, peek, resolve, sync, reconcile, mergeData };

  /* ---- go ---- */
  if (account()) {
    setInterval(fillNameBoxes, 500);
    setTimeout(() => sync(true), 1200);
    setInterval(() => { const a = account(); if (a && !a.conflict && hashOf(collect()) !== a.hash) push(false); }, 20000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "hidden") return;
      const a = account();
      if (a && !a.conflict && hashOf(collect()) !== a.hash) push(false, true);
    });
  }
})();
