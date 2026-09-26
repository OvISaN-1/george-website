/* ================================================================
   MATCHDAY: REAL-WORLD UPDATES
   Runs after matchday-squads.js and before matchday-game.js.
   1. Forest's squad follows the real one (football-data.org via the
      site's Worker): players who have left are replaced by new players
      in the same position, and new signings join the bench. George
      always keeps the 10 shirt up front.
   2. Opponents' difficulty follows the real Premier League table.
   3. "Name that riff" music questions switch on when song clips work.
   Everything is saved on the device, so it also works offline, and
   if anything looks wrong the game keeps its own squad.
   ================================================================ */
(function () {
  "use strict";
  if (!window.MD) return;
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* full or private */ } };
  const api = (name) => (window.apiUrl ? window.apiUrl(name) : `/api/${name}`);
  const plain = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, "").trim();

  /* ---------- 1. The real squad ---------- */
  const groupOfApi = (p) => /goal/i.test(p) ? "G" : /back|defen|centre-back|full/i.test(p) ? "D" : /mid/i.test(p) ? "M" : /forward|offen|wing|striker|attack/i.test(p) ? "F" : null;
  const groupOfLocal = (p) => p === "GK" ? "G" : ["RB", "CB", "LB", "LWB", "RWB"].includes(p) ? "D" : ["DM", "CM", "CAM", "RM", "LM"].includes(p) ? "M" : "F";
  const DEFAULT_POS = { G: "GK", D: "CB", M: "CM", F: "ST" };

  function sameName(a, b) {
    const x = plain(a), y = plain(b);
    if (!x || !y) return false;
    if (x === y) return true;
    const lx = x.split(" ").pop(), ly = y.split(" ").pop();
    // "Murillo" v "Murillo Santiago Costa dos Santos": match on a shared last or only name.
    return (x.split(" ").length === 1 || y.split(" ").length === 1) ? x.split(" ").includes(ly) || y.split(" ").includes(lx) : lx === ly && x[0] === y[0];
  }

  function applySquad(data) {
    const F = MD.FOREST;
    const real = (data && data.players || []).filter((p) => p.name);
    if (real.length < 16) return null;                        // too short to trust
    const mine = F.xi.filter((p) => !p.george).concat(F.subs);
    const stillHere = mine.filter((p) => real.some((r) => sameName(r.name, p.name)));
    if (stillHere.length < 8) return null;                    // doesn't look like Forest's squad
    if (!F.baseXi) { F.baseXi = F.xi.map((p) => Object.assign({}, p)); F.baseSubs = F.subs.map((p) => Object.assign({}, p)); }

    const newcomers = real.filter((r) => !mine.some((p) => sameName(r.name, p.name)));
    const used = new Set([10].concat(mine.map((p) => p.num)));
    const freeNum = (want) => {
      if (want && want !== 10 && !used.has(want)) { used.add(want); return want; }
      for (let n = 2; n < 60; n++) if (!used.has(n)) { used.add(n); return n; }
      return 99;
    };
    const shortOf = (name) => { const parts = name.split(" "); return parts.length > 1 ? parts[parts.length - 1] : name; };
    const make = (r, pos) => ({ num: freeNum(r.shirtNumber), name: r.name, short: shortOf(r.name), pos });
    const changes = { in: [], out: [] };
    const takeNewcomer = (group) => {
      const i = newcomers.findIndex((r) => groupOfApi(r.position) === group);
      return i >= 0 ? newcomers.splice(i, 1)[0] : null;
    };

    // Starting XI: swap anyone who has left for someone in the same position.
    F.xi = F.xi.map((p) => {
      if (p.george || real.some((r) => sameName(r.name, p.name))) return p;
      const g = groupOfLocal(p.pos);
      const benchIdx = F.subs.findIndex((s) => groupOfLocal(s.pos) === g && real.some((r) => sameName(r.name, s.name)));
      changes.out.push(p.name);
      if (benchIdx >= 0) { const s = F.subs.splice(benchIdx, 1)[0]; return Object.assign({}, s, { pos: p.pos, for: undefined, captain: p.captain }); }
      const r = takeNewcomer(g);
      if (!r) { changes.out.pop(); return p; }                 // nobody to replace them with: keep
      changes.in.push(r.name);
      return Object.assign(make(r, p.pos), { captain: p.captain });
    });
    // Bench: drop players who have left, add new signings.
    F.subs = F.subs.filter((s) => { const ok = real.some((r) => sameName(r.name, s.name)); if (!ok) changes.out.push(s.name); return ok; });
    newcomers.slice(0, Math.max(0, 9 - F.subs.length)).forEach((r) => {
      const g = groupOfApi(r.position);
      if (!g) return;
      F.subs.push(make(r, DEFAULT_POS[g]));
      changes.in.push(r.name);
    });
    // Substitutions point at shirt slots; keep only ones whose slot still makes sense.
    F.subs.forEach((s) => { if (s.for != null && (!F.xi[s.for] || F.xi[s.for].george)) delete s.for; });
    F.liveSquad = { updated: data.updated, changes };
    return changes;
  }

  /* ---------- 2. Difficulty from the real table ---------- */
  function applyTable(live) {
    const table = live && live.league && live.league.table;
    if (!table || !table.length) return;
    const played = Math.max(...table.map((r) => r.played || 0));
    if (played < 3) return;                                   // too early in the season to mean much
    Object.entries(MD.OPPONENTS).forEach(([key, team]) => {
      const row = table.find((r) => plain(r.team) === plain(key));
      if (!row) return;
      if (team.baseTier == null) team.baseTier = team.tier;
      team.tier = row.position <= 5 ? 3 : row.position <= 13 ? 2 : 1;
      team.tablePos = row.position;
    });
  }

  /* ---------- 3. "Name that riff" ---------- */
  function checkAudio() {
    if (!window.Audio) return;
    fetch(`${api("track")}?id=thunderstruck`).then((r) => r.json()).then((t) => { window.MQ_AUDIO = !!(t && t.preview); }).catch(() => { window.MQ_AUDIO = false; });
  }

  // Use what's saved straight away, then refresh in the background.
  const saved = read("gz_forest_squad_v1");
  if (saved) applySquad(saved);
  applyTable(read("gz_forest_live_v1"));
  fetch(api("squad")).then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (!d || !d.players) return;
    write("gz_forest_squad_v1", d);
    // Don't change the squad in the middle of a match.
    if (!document.getElementById("screen-match") || document.getElementById("screen-match").hidden) {
      if (MD.FOREST.baseXi) { MD.FOREST.xi = MD.FOREST.baseXi.map((p) => Object.assign({}, p)); MD.FOREST.subs = MD.FOREST.baseSubs.map((p) => Object.assign({}, p)); }
      applySquad(d);
    }
  }).catch(() => {});
  if (window.loadLive) window.loadLive().then(applyTable).catch(() => {});
  checkAudio();

  MD.applySquad = applySquad; // for testing
})();
