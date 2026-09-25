/* ================================================================
   MATCHDAY: George's career, FC26 style.

   - A player card with an overall rating (OVR) and six stats:
     PAC pace, SHO shooting, PAS passing, DRI dribbling, DEF defending,
     PHY physical.
   - Every match earns XP. Levelling up gives skill points (SP) to
     spend on stats, and unlocks new kits, boots and celebrations.
   - The stats really matter in matches (see EFFECTS below).

   Saved on this device only.
   ================================================================ */
(function (MDC) {
  "use strict";
  const KEY = "gz_matchday_career_v1";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (t) => { const d = document.createElement("div"); d.textContent = String(t); return d.innerHTML; };

  const STATS = [
    { k: "pac", label: "PAC", name: "Pace", does: "More breakaways and halfway-line chances." },
    { k: "sho", label: "SHO", name: "Shooting", does: "Better finishing, and a bigger green zone on penalties and free kicks." },
    { k: "pas", label: "PAS", name: "Passing", does: "Tap-ins and crosses turn into goals more often." },
    { k: "dri", label: "DRI", name: "Dribbling", does: "Extra Forest chances in every match (at 80 and 90)." },
    { k: "def", label: "DEF", name: "Defending", does: "George tracks back: the other team score a bit less." },
    { k: "phy", label: "PHY", name: "Physical", does: "Wins more fouls: more penalties and free kicks." },
  ];
  const START = { pac: 70, sho: 66, pas: 62, dri: 71, def: 38, phy: 55 };

  /* Unlocks. need = level. */
  const ITEMS = {
    kit: [
      { id: "home", name: "Home red", need: 1 },
      { id: "away", name: "Away white", need: 1 },
      { id: "third", name: "Third kit (black & gold)", need: 4 },
      { id: "retro", name: "1979 European Cup", need: 6 },
      { id: "retro90", name: "1990 League Cup", need: 9 },
      { id: "pink", name: "Pink away", need: 12 },
      { id: "legend", name: "Forest Legend gold", need: 15 },
    ],
    boots: [
      { id: "black", name: "Classic black", need: 1, colour: "#15121a" },
      { id: "red", name: "Forest red", need: 2, colour: "#e1102c" },
      { id: "neon", name: "Neon", need: 7, colour: "#a3e635" },
      { id: "gold", name: "Gold", need: 10, colour: "#f5b942" },
      { id: "pearl", name: "Pearl white", need: 13, colour: "#f4f1ee" },
    ],
    cele: [
      { id: "armsup", name: "Arms up", need: 1, pose: "up", anim: "cele-jump", shout: "GET IN!" },
      { id: "slide", name: "Knee slide", need: 2, pose: "out", anim: "cele-slide", shout: "KNEE SLIDE!" },
      { id: "siuuu", name: "SIUUU", need: 3, pose: "out", anim: "cele-siuuu", shout: "SIUUUU!" },
      { id: "aeroplane", name: "Aeroplane", need: 5, pose: "out", anim: "cele-plane", shout: "NEEEOOOWW!" },
      { id: "shiver", name: "Cold shiver", need: 8, pose: "idle", anim: "cele-shiver", shout: "ICE COLD 🥶" },
      { id: "badge", name: "Kiss the badge", need: 11, pose: "point", anim: "cele-zoom", shout: "FOREST!" },
      { id: "backflip", name: "Backflip", need: 14, pose: "up", anim: "cele-flip", shout: "BACKFLIP!" },
      { id: "robot", name: "The Robot", need: 16, pose: "out", anim: "cele-robot", shout: "BEEP BOOP GOAL" },
    ],
  };

  // XP needed to reach each level: 0, 250, 750, 1500, 2500, 3750...
  const xpFor = (lvl) => 125 * lvl * (lvl - 1);
  function levelOf(xp) { let l = 1; while (xpFor(l + 1) <= xp && l < 30) l++; return l; }

  function fkSelected() { try { return (JSON.parse(localStorage.getItem("gz_freekick_v1")) || {}).selected || {}; } catch (e) { return {}; } }

  function defaults() {
    const fk = fkSelected();
    return {
      xp: 0, sp: 0, stats: Object.assign({}, START), seenLevel: 1,
      gear: {
        kit: ["home", "away"].includes(fk.kit) ? fk.kit : "home",
        boots: fk.boots === "red" ? "red" : "black",
        cele: ["armsup", "slide", "siuuu"].includes(fk.celebration) ? fk.celebration : "armsup",
      },
      matches: 0,
    };
  }
  let C = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) C = Object.assign(defaults(), s, { stats: Object.assign({}, START, s.stats || {}), gear: Object.assign(defaults().gear, s.gear || {}) }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(C)); } catch (e) {} }

  function ovr(st) {
    const s = st || C.stats;
    return Math.round(s.sho * 0.3 + s.pac * 0.2 + s.dri * 0.2 + s.pas * 0.1 + s.phy * 0.15 + s.def * 0.05);
  }
  function tier(o) {
    if (o >= 95) return { id: "icon", name: "ICON" };
    if (o >= 90) return { id: "hero", name: "FOREST HERO" };
    if (o >= 85) return { id: "totw", name: "TEAM OF THE WEEK" };
    if (o >= 75) return { id: "gold", name: "GOLD" };
    if (o >= 65) return { id: "silver", name: "SILVER" };
    return { id: "bronze", name: "BRONZE" };
  }
  const cost = (v) => (v < 75 ? 1 : v < 85 ? 2 : v < 95 ? 3 : 4);

  /* What the stats do in a match. All small nudges, so answering
     questions still matters most. */
  function effects() {
    const s = C.stats;
    return {
      finish: 1 + (s.sho - 66) / 110,          // multiplies George's scoring chances
      pass: 1 + (s.pas - 62) / 160,            // tap-ins and crosses
      counter: 0.14 + (s.pac - 70) / 220,      // chance to break after a tackle
      halfway: 0.35 + (s.pac - 70) / 130,      // chance of a halfway-line moment
      extraAttacks: (s.dri >= 80 ? 1 : 0) + (s.dri >= 90 ? 1 : 0),
      defend: 1 - (s.def - 38) / 260,          // multiplies the other team's scoring chances
      fouls: (s.phy - 55) / 140,               // added to penalty / free kick chances
      zone: Math.max(0, (s.sho - 66) / 6),     // extra % on the set-piece green zone
    };
  }

  function unlocked(item) { return levelOf(C.xp) >= item.need; }
  function item(type, id) { return ITEMS[type].find((x) => x.id === id) || ITEMS[type][0]; }
  function gear() {
    const g = C.gear;
    const kit = unlocked(item("kit", g.kit)) ? g.kit : "home";
    const boots = item("boots", unlocked(item("boots", g.boots)) ? g.boots : "black");
    const cele = item("cele", unlocked(item("cele", g.cele)) ? g.cele : "armsup");
    return { kit, boots: boots.colour, bootsId: boots.id, cele };
  }

  /* After a match. r = { goals, assists, right, asked, won, draw, motm, cleanSheet, halfway, rating } */
  function award(r) {
    const before = levelOf(C.xp);
    const parts = [
      ["Goals", r.goals * 60], ["Assists", r.assists * 30], ["Right answers", r.right * 12],
      [r.won ? "Win" : r.draw ? "Draw" : "Played", r.won ? 120 : r.draw ? 50 : 20],
      ["Player of the Match", r.motm ? 60 : 0], ["Clean sheet", r.cleanSheet ? 40 : 0],
      ["Halfway line goal", r.halfway ? 100 : 0], ["Match rating", Math.round((r.rating || 6) * 8)],
    ].filter((p) => p[1] > 0);
    const gained = parts.reduce((t, p) => t + p[1], 0);
    C.xp += gained;
    C.matches += 1;
    const after = levelOf(C.xp);
    const newLevels = after - before;
    C.sp += newLevels * 3;
    const unlocks = [];
    for (let l = before + 1; l <= after; l++) {
      Object.entries(ITEMS).forEach(([type, list]) => list.filter((x) => x.need === l).forEach((x) => unlocks.push({ type, name: x.name })));
    }
    save();
    return { gained, parts, before, after, newLevels, spGained: newLevels * 3, unlocks };
  }

  function upgrade(k) {
    const v = C.stats[k];
    const c = cost(v);
    if (v >= 99 || C.sp < c) return false;
    C.sp -= c;
    C.stats[k] = v + 1;
    save();
    return true;
  }

  /* ---------------- The card ---------------- */
  function card(opts) {
    const o = opts || {};
    const s = C.stats, rating = ovr(), t = tier(rating), g = gear();
    return `<div class="mdc-card ${t.id}${o.small ? " small" : ""}">
      <div class="mdc-top"><span class="mdc-ovr">${rating}</span><span class="mdc-pos">ST</span>
        <span class="mdc-badge" aria-hidden="true"><svg viewBox="0 0 20 22"><path d="M10 1 L19 5 V12 C19 17 14 20 10 21 C6 20 1 17 1 12 V5 Z" fill="#d7102b" stroke="#fff" stroke-width="1.2"/><g fill="#fff"><circle cx="10" cy="8" r="2.6"/><circle cx="7.6" cy="10.4" r="2.2"/><circle cx="12.4" cy="10.4" r="2.2"/><rect x="9.3" y="11" width="1.4" height="4"/></g></svg></span>
      </div>
      <div class="mdc-face">${GK.avatar({ pose: "idle", kit: g.kit, happy: true })}</div>
      <div class="mdc-name">GEORGE</div>
      <div class="mdc-stats">${STATS.map((x) => `<span><b>${s[x.k]}</b> ${x.label}</span>`).join("")}</div>
      <div class="mdc-tier">${t.name} · LVL ${levelOf(C.xp)}</div>
    </div>`;
  }

  /* ---------------- The career screen ---------------- */
  function render(el, onChange) {
    const lvl = levelOf(C.xp), next = xpFor(lvl + 1), prev = xpFor(lvl);
    const pct = lvl >= 30 ? 100 : Math.round(((C.xp - prev) / (next - prev)) * 100);
    const g = gear();
    const section = (type, title) => `<div class="mdc-sec"><h3>${title}</h3><div class="mdc-items">${ITEMS[type].map((x) => {
      const on = unlocked(x), sel = (type === "kit" ? g.kit : type === "boots" ? g.bootsId : g.cele.id) === x.id;
      const art = type === "kit"
        ? `<span class="mdc-art kit" style="background:${GK.KITS[x.id].shirt};color:${GK.KITS[x.id].text};border-color:${GK.KITS[x.id].trim}">10</span>`
        : type === "boots" ? `<span class="mdc-art boot" style="background:${x.colour}"></span>`
        : `<span class="mdc-art cele">${{ armsup: "🙌", slide: "🛷", siuuu: "🕺", aeroplane: "✈️", shiver: "🥶", badge: "💋", backflip: "🤸", robot: "🤖" }[x.id] || "🎉"}</span>`;
      return `<button type="button" class="mdc-item${sel ? " selected" : ""}${on ? "" : " locked"}" data-type="${type}" data-id="${x.id}" ${on ? "" : "aria-disabled=\"true\""}>
        ${art}<span class="mdc-item-name">${esc(x.name)}</span><span class="mdc-need">${on ? (sel ? "✓ Wearing" : "Tap to use") : "🔒 Level " + x.need}</span></button>`;
    }).join("")}</div></div>`;
    el.innerHTML = `
      <div class="mdc-head">
        ${card()}
        <div class="mdc-side">
          <p class="md-kicker">Level ${lvl}${lvl >= 30 ? " (max)" : ""}</p>
          <div class="mdc-xp"><span style="width:${pct}%"></span></div>
          <p class="md-small">${C.xp.toLocaleString("en-GB")} XP${lvl < 30 ? ` · ${(next - C.xp).toLocaleString("en-GB")} to level ${lvl + 1}` : ""}. Every level: +3 skill points.</p>
          <p class="mdc-sp"><b>${C.sp}</b> skill point${C.sp === 1 ? "" : "s"} to spend</p>
          <ul class="mdc-statlist">${STATS.map((x) => {
            const v = C.stats[x.k], c = cost(v), can = C.sp >= c && v < 99;
            return `<li><span class="lab">${x.label}</span><span class="bar"><i style="width:${v}%"></i></span><b>${v}</b>
              <button type="button" class="mdc-plus" data-stat="${x.k}" ${can ? "" : "disabled"} aria-label="Upgrade ${x.name} for ${c} skill point${c === 1 ? "" : "s"}">+${c > 1 ? `<small>${c}SP</small>` : ""}</button>
              <small class="does">${x.name}: ${x.does}</small></li>`;
          }).join("")}</ul>
        </div>
      </div>
      ${section("kit", "Kits")}${section("boots", "Boots")}${section("cele", "Celebrations")}
      <p class="md-small">Earn XP in every match: goals, assists, right answers, wins, Player of the Match, clean sheets. Stats cost more points as they get higher (1 point below 75, 2 below 85, 3 below 95, 4 after).</p>`;
    el.querySelectorAll(".mdc-plus").forEach((b) => b.addEventListener("click", () => { if (upgrade(b.dataset.stat)) { render(el, onChange); if (onChange) onChange("upgrade"); } }));
    el.querySelectorAll(".mdc-item").forEach((b) => b.addEventListener("click", () => {
      const it = item(b.dataset.type, b.dataset.id);
      if (!unlocked(it)) { if (onChange) onChange("locked"); return; }
      C.gear[b.dataset.type] = it.id;
      save();
      render(el, onChange);
      if (onChange) onChange("gear");
    }));
  }

  MDC.STATS = STATS;
  MDC.ITEMS = ITEMS;
  MDC.ovr = ovr;
  MDC.tier = tier;
  MDC.level = () => levelOf(C.xp);
  MDC.sp = () => C.sp;
  MDC.effects = effects;
  MDC.gear = gear;
  MDC.award = award;
  MDC.card = card;
  MDC.render = render;
  MDC.xpFor = xpFor;
  MDC._state = () => C;
})(window.MDC = window.MDC || {});
