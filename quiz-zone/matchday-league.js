/* ================================================================
   MATCHDAY: the Premier League table.

   Forest's results come from the matches George plays. Every time
   George plays a fixture for the first time, the other 18 teams play
   their games that week too (simulated, stronger teams win more).
   Those results are saved, so the table stays the same until George
   plays the next fixture.
   ================================================================ */
(function (MDL) {
  "use strict";

  // How strong each team is (roughly 60-90). Tweak here if you like.
  const STRENGTH = {
    "Man City": 89, "Arsenal": 89, "Liverpool": 88, "Chelsea": 85,
    "Newcastle": 80, "Tottenham": 79, "Aston Villa": 79, "Man Utd": 78,
    "Brighton": 77, "Crystal Palace": 76, "Brentford": 74, "Bournemouth": 75,
    "Everton": 73, "Fulham": 73, "Leeds": 70, "Sunderland": 69,
    "Coventry": 67, "Ipswich": 66, "Hull": 65,
    "Forest": 78,
  };
  const FOREST = "Forest";

  function teams() { return [FOREST].concat(Object.keys(MD.OPPONENTS)); }
  const nameOf = (k) => (k === FOREST ? "Nottingham Forest" : (MD.OPPONENTS[k] || {}).name || k);
  const kitOf = (k) => (k === FOREST ? MD.FOREST.kit : (MD.OPPONENTS[k] || {}).kit || { shirt: "#888", trim: "#fff" });
  const abbrOf = (k) => (k === FOREST ? "NFO" : (MD.OPPONENTS[k] || {}).abbr || k.slice(0, 3).toUpperCase());

  // Seeded random, so the same week always pairs teams the same way.
  function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function poisson(lambda, r) {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= r(); } while (p > L && k < 9);
    return k - 1;
  }

  /* The other nine matches in a week where Forest play `forestOpp`. */
  function simWeek(week, forestOpp) {
    const r = seeded(9173 + week * 7919);
    const rest = teams().filter((t) => t !== FOREST && t !== forestOpp);
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    const out = [];
    const go = Math.random;   // the scores themselves are properly random
    for (let i = 0; i + 1 < rest.length; i += 2) {
      const h = rest[i], a = rest[i + 1];
      const sh = STRENGTH[h] || 72, sa = STRENGTH[a] || 72;
      const lh = 1.45 * Math.pow(sh / sa, 2.2) * 1.08;
      const la = 1.2 * Math.pow(sa / sh, 2.2);
      out.push([h, a, poisson(lh, go), poisson(la, go)]);
    }
    return out;
  }

  /* results: { key: {opp, venue, f, o} } for Forest. sims: { key: [[h,a,hg,ag]...] } */
  function table(results, sims) {
    const rows = {};
    teams().forEach((t) => { rows[t] = { t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }; });
    const game = (h, a, hg, ag) => {
      if (!rows[h] || !rows[a]) return;
      [[h, hg, ag], [a, ag, hg]].forEach(([t, f, g]) => {
        const row = rows[t];
        row.p++; row.gf += f; row.ga += g;
        if (f > g) { row.w++; row.pts += 3; row.form.push("W"); }
        else if (f === g) { row.d++; row.pts += 1; row.form.push("D"); }
        else { row.l++; row.form.push("L"); }
      });
    };
    Object.values(results || {}).forEach((r) => {
      if (!r.opp) return;
      if (r.venue === "A") game(r.opp, FOREST, r.o, r.f); else game(FOREST, r.opp, r.f, r.o);
    });
    Object.values(sims || {}).forEach((list) => list.forEach(([h, a, hg, ag]) => game(h, a, hg, ag)));
    return Object.values(rows).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || nameOf(x.t).localeCompare(nameOf(y.t)));
  }

  function zone(pos) {
    if (pos <= 4) return { cls: "ucl", label: "Champions League" };
    if (pos === 5) return { cls: "uel", label: "Europa League" };
    if (pos === 6) return { cls: "uecl", label: "Conference League" };
    if (pos >= 18) return { cls: "rel", label: "Relegation" };
    return { cls: "", label: "" };
  }

  function render(el, results, sims, opts) {
    const o = opts || {};
    const rows = table(results, sims);
    const list = o.around ? rows.filter((r, i) => { const fi = rows.findIndex((x) => x.t === FOREST); return Math.abs(i - fi) <= 2; }) : rows;
    const esc = (t) => { const d = document.createElement("div"); d.textContent = String(t); return d.innerHTML; };
    el.innerHTML = `
      <table class="mdl-table">
        <thead><tr><th>#</th><th class="team">Team</th><th>P</th><th class="w">W</th><th class="w">D</th><th class="w">L</th><th class="w">GF</th><th class="w">GA</th><th>GD</th><th>Pts</th><th class="form">Form</th></tr></thead>
        <tbody>${list.map((r) => {
          const pos = rows.indexOf(r) + 1, z = zone(pos), k = kitOf(r.t), gd = r.gf - r.ga;
          return `<tr class="${z.cls}${r.t === FOREST ? " forest" : ""}" title="${esc(z.label)}">
            <td class="pos">${pos}</td>
            <td class="team"><i style="background:${k.shirt};border-color:${k.trim}"></i><span class="full">${esc(nameOf(r.t))}</span><span class="abbr">${abbrOf(r.t)}</span></td>
            <td>${r.p}</td><td class="w">${r.w}</td><td class="w">${r.d}</td><td class="w">${r.l}</td><td class="w">${r.gf}</td><td class="w">${r.ga}</td>
            <td>${gd > 0 ? "+" + gd : gd}</td><td class="pts">${r.pts}</td>
            <td class="form">${r.form.slice(-5).map((f) => `<span class="f${f}">${f}</span>`).join("")}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>
      ${o.around ? "" : `<p class="md-small mdl-key"><span class="k ucl"></span> Champions League <span class="k uel"></span> Europa League <span class="k uecl"></span> Conference League <span class="k rel"></span> Relegation</p>`}`;
  }

  function forestPosition(results, sims) { return table(results, sims).findIndex((r) => r.t === FOREST) + 1; }

  MDL.simWeek = simWeek;
  MDL.table = table;
  MDL.render = render;
  MDL.forestPosition = forestPosition;
  MDL.STRENGTH = STRENGTH;
})(window.MDL = window.MDL || {});
