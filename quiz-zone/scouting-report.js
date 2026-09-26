/* ================================================================
   SCOUTING REPORT (for grown-ups)
   Reads what Matchday has learned on this device and turns it into
   a report: strong subjects, what to practise, times tables, SATs
   topics and how much he's played. Nothing is sent anywhere.
   ================================================================ */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const pct = (r, n) => (n ? Math.round((r / n) * 100) : 0);

  /* ---------------- Grown-ups gate: hold for 2 seconds ---------------- */
  const OPEN_KEY = "gz_scout_open";
  function open() {
    try { sessionStorage.setItem(OPEN_KEY, "1"); } catch (e) {}
    $("gate").hidden = true;
    $("report").hidden = false;
    // Wait until the rest of this file has loaded (the gate can open straight away).
    setTimeout(render, 0);
  }
  (function gate() {
    let ok = false;
    try { ok = sessionStorage.getItem(OPEN_KEY) === "1"; } catch (e) {}
    if (ok) return open();
    const btn = $("hold"), fill = btn.querySelector("i"), MS = 2000;
    let start = 0, raf = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / MS);
      fill.style.width = p * 100 + "%";
      if (p >= 1) { stop(); open(); return; }
      raf = requestAnimationFrame(tick);
    };
    const go = (e) => { if (e) e.preventDefault(); if (start) return; start = performance.now(); raf = requestAnimationFrame(tick); };
    const stop = () => { start = 0; cancelAnimationFrame(raf); fill.style.width = "0"; };
    btn.addEventListener("pointerdown", go);
    ["pointerup", "pointerleave", "pointercancel"].forEach((t) => btn.addEventListener(t, stop));
    btn.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) go(e); else if (e.key === " " || e.key === "Enter") e.preventDefault(); });
    btn.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") stop(); });
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  })();

  /* ---------------- Reading the data ---------------- */
  const SUBJECTS = MQ.SUBJECTS;
  const BANK = {};
  (MQ._bank || []).forEach((q) => { BANK[q.id] = q; });

  // Older answers don't say which subject they were, so work it out from the id.
  function subjectOf(id, s) {
    if (s.subject) return s.subject;
    if (BANK[id]) return BANK[id].subject;
    if (/^m4?:/.test(id)) return "maths";
    if (/^(s:|prime|af)/.test(id)) return "sats";
    return null;
  }
  function levelOf(id, s) {
    if (s.l) return s.l;
    if (BANK[id]) return BANK[id].l;
    if (/^m4:/.test(id)) return 4;
    return null;
  }
  const SATS_TOPICS = [
    [/^(add|sub)/, "Adding & taking away"],
    [/^pv/, "Place value"],
    [/^r\d/, "Rounding"],
    [/^(f\d|af)/, "Fractions"],
    [/^p\d/, "Percentages"],
    [/^dec/, "Decimals"],
    [/^neg/, "Negative numbers"],
    [/^rom/, "Roman numerals"],
    [/^(bod|br)/, "Order of operations (BODMAS)"],
    [/^(sq|cu|prime)/, "Squares, cubes & primes"],
  ];
  function satsTopic(id) {
    const k = id.replace(/^s:/, "");
    const t = SATS_TOPICS.find(([re]) => re.test(k));
    return t ? t[1] : "Other";
  }
  // Which times tables a sum belongs to: 7 × 8 counts for both the 7s and the 8s.
  function tablesOf(id) {
    let m = /^m4?:(\d+)x(\d+)$/.exec(id);
    if (m) return [...new Set([Number(m[1]), Number(m[2])])];
    m = /^m4:sq(\d+)$/.exec(id); if (m) return [Number(m[1])];
    m = /^m4:\d+d(\d+)$/.exec(id); if (m) return [Number(m[1])];
    return [];
  }

  function status(n, p) {
    if (n < 5) return { cls: "none", text: "… Not enough yet" };
    if (p >= 80) return { cls: "good", text: "✓ Strong" };
    if (p >= 60) return { cls: "warn", text: "~ Getting there" };
    return { cls: "bad", text: "! Practise" };
  }
  // Sequential scale for the tables grid: one hue, brighter = better.
  function heat(p, n) {
    if (n < 3) return "rgba(241,237,233,0.06)";
    const a = 0.12 + (p / 100) * 0.78;
    return `rgba(157,92,255,${a.toFixed(2)})`;
  }
  const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  function analyse() {
    const brain = read("gz_matchday_brain_v1", {});
    const days = read("gz_matchday_days_v1", {});
    const save = read("gz_matchday_v1", {});
    const form = read("gz_matchday_form_v1", []);

    const subj = {};
    Object.keys(SUBJECTS).forEach((k) => { subj[k] = { key: k, n: 0, r: 0, qs: 0, mastered: 0, lv: { 1: [0, 0], 2: [0, 0], 3: [0, 0], 4: [0, 0] } }; });
    const sats = {}, tables = {};
    for (let t = 2; t <= 12; t++) tables[t] = [0, 0];
    const practise = [];
    let total = 0, right = 0, mastered = 0;

    Object.entries(brain).forEach(([id, s]) => {
      const k = subjectOf(id, s);
      if (!k || !subj[k]) return;
      const x = subj[k];
      x.n += s.seen; x.r += s.right; x.qs += 1;
      total += s.seen; right += s.right;
      if (s.seen >= 3 && s.right / s.seen >= 0.8) { x.mastered += 1; mastered += 1; }
      const l = levelOf(id, s);
      if (l && x.lv[l]) { x.lv[l][0] += s.seen; x.lv[l][1] += s.right; }
      if (k === "sats") { const t = satsTopic(id); const v = sats[t] || (sats[t] = [0, 0]); v[0] += s.seen; v[1] += s.right; }
      if (k === "maths") tablesOf(id).forEach((t) => { if (tables[t]) { tables[t][0] += s.seen; tables[t][1] += s.right; } });
      if (s.wrongStreak > 0 || (s.seen >= 2 && s.right / s.seen < 0.5)) {
        const bq = BANK[id];
        practise.push({ q: s.full || (bq && bq.q) || s.text, a: s.a || (bq && bq.a) || "", subject: k, seen: s.seen, right: s.right, last: s.last || 0 });
      }
    });
    practise.sort((a, b) => b.last - a.last);

    // Last 7 days vs the 7 before, from the daily log.
    const now = new Date(), week = [0, 0], prevWeek = [0, 0], daily = [], trend = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const day = days[dayKey(d)] || {};
      let n = 0, r = 0;
      Object.entries(day).forEach(([k, [a, b]]) => {
        n += a; r += b;
        const t = trend[k] || (trend[k] = { now: [0, 0], before: [0, 0] });
        const bucket = i < 7 ? t.now : t.before;
        bucket[0] += a; bucket[1] += b;
      });
      (i < 7 ? week : prevWeek)[0] += n; (i < 7 ? week : prevWeek)[1] += r;
      daily.push({ d, n, r });
    }
    const daysPlayed = daily.slice(7).filter((x) => x.n > 0).length;

    return { subj, sats, tables, practise, total, right, mastered, week, prevWeek, daily, trend, daysPlayed, save, form };
  }

  /* ---------------- Drawing the report ---------------- */
  function trendText(t) {
    if (!t || t.now[0] < 5 || t.before[0] < 5) return "";
    const d = pct(t.now[1], t.now[0]) - pct(t.before[1], t.before[0]);
    if (d >= 5) return ` <span title="Last 7 days compared with the week before" style="color:var(--good)">▲ ${d}%</span>`;
    if (d <= -5) return ` <span title="Last 7 days compared with the week before" style="color:var(--bad)">▼ ${-d}%</span>`;
    return ` <span title="Last 7 days compared with the week before" style="color:var(--faint)">● steady</span>`;
  }
  function workingAt(x) {
    let best = 0;
    [1, 2, 3, 4].forEach((l) => { const [n, r] = x.lv[l]; if (n >= 3 && r / n >= 0.7) best = l; });
    return best ? ["", "Easy", "Medium", "Hard", "World Class"][best] : "";
  }

  function tips(A) {
    const out = [];
    const on = A.save.subjects || Object.keys(SUBJECTS);
    const rated = Object.values(A.subj).filter((x) => x.n >= 5).map((x) => Object.assign({ p: pct(x.r, x.n) }, x));
    const weak = rated.filter((x) => x.p < 60).sort((a, b) => a.p - b.p);
    const strong = rated.filter((x) => x.p >= 85).sort((a, b) => b.p - a.p);
    if (weak.length) out.push(`<b>${esc(SUBJECTS[weak[0].key].label)}</b> is the one to work on (${weak[0].p}% right). The questions he's missed are listed under "Practise together" below: ask him to explain the answer back to you, then let the game bring them round again.`);
    const tt = Object.entries(A.tables).filter(([, [n]]) => n >= 3).map(([t, [n, r]]) => [t, pct(r, n)]).sort((a, b) => a[1] - b[1]);
    if (tt.length && tt[0][1] < 75) out.push(`The <b>${tt[0][0]} times table</b> is his weakest (${tt[0][1]}%). Two minutes of chanting it in the car will do more than an hour at a desk.`);
    const st = Object.entries(A.sats).filter(([, [n]]) => n >= 3).map(([t, [n, r]]) => [t, pct(r, n)]).sort((a, b) => a[1] - b[1]);
    if (st.length && st[0][1] < 70) out.push(`In SATs maths, <b>${esc(st[0][0])}</b> needs the most help (${st[0][1]}%).`);
    if (strong.length) out.push(`He's flying in <b>${strong.slice(0, 3).map((x) => esc(SUBJECTS[x.key].label)).join(", ")}</b>. Tell him! Praise for the effort works better than "you're clever".`);
    const off = Object.keys(SUBJECTS).filter((k) => !on.includes(k));
    if (off.length) out.push(`Switched off in Matchday right now: ${off.map((k) => esc(SUBJECTS[k].label)).join(", ")}. Turn them back on from the Matchday menu if you want them in the report.`);
    const thin = Object.values(A.subj).filter((x) => on.includes(x.key) && x.n < 5);
    if (thin.length && A.total > 30) out.push(`Not much to go on yet for ${thin.slice(0, 4).map((x) => esc(SUBJECTS[x.key].label)).join(", ")}: a few more matches will fill them in.`);
    if (A.daysPlayed >= 5) out.push(`He's played on ${A.daysPlayed} of the last 7 days. Great habit.`);
    if (!out.length) out.push("Play a few matches first: the report fills in as George answers questions.");
    return out;
  }

  // Results from the SATs practice page (sats.html).
  function satsSection() {
    const saved = read('gz_sats_v1', {}).topics || {};
    const M = window.SATS_MATHS, E = window.SATS_ENGLISH;
    if (!M || !E) return '';
    const groups = [['Maths', M.topics], ['Grammar, punctuation & spelling', E.gps], ['Reading', E.reading]];
    const tried = Object.keys(saved).length;
    const rows = groups.map(([label, topics]) => {
      const list = topics.map((t) => Object.assign({ s: saved[t.id] }, t)).sort((a, b) => (a.s ? a.s.right / a.s.total : 2) - (b.s ? b.s.right / b.s.total : 2));
      return `<h3 style="font-size:17px;margin:16px 0 4px">${esc(label)}</h3><div class="rows">${list.map((t) => {
        if (!t.s) return `<div class="row"><div class="name">${t.emoji} ${esc(t.name)}<small>Not tried yet</small></div><div class="viz"></div><span class="chip none">… Not tried</span></div>`;
        const p = pct(t.s.right, t.s.total), st = status(t.s.total, p);
        return `<div class="row"><div class="name">${t.emoji} ${esc(t.name)}<small>${t.s.total} answers · ${t.s.plays} round${t.s.plays === 1 ? '' : 's'} · best ${t.s.best}/${t.s.bestOf}</small></div><div class="viz"><div class="bar" title="${t.s.right} of ${t.s.total} right"><i style="width:${p}%"></i><b>${p}%</b></div></div><span class="chip ${st.cls}">${st.text}</span></div>`;
      }).join('')}</div>`;
    }).join('');
    return `<section class="card">
        <h2>SATs practice</h2>
        <p class="lede">From the SATs practice page in the School Zone. ${tried ? `${tried} topic${tried === 1 ? '' : 's'} tried so far; the ones to work on come first.` : 'Nothing tried yet: it\'s in School Zone → SATs practice.'}</p>
        ${rows}
      </section>`;
  }

  function render() {
    const A = analyse();
    const el = $("report");
    const s = A.save, played = s.played || 0;
    const formPct = A.form.length ? pct(A.form.reduce((t, v) => t + v, 0), A.form.length) : null;
    const lvl = window.MDC ? MDC.level() : null, ovr = window.MDC ? MDC.ovr() : null;

    // 1. Headline numbers
    const tiles = `
      <div class="tiles">
        <div class="tile"><div class="k">Questions answered</div><div class="v">${A.total.toLocaleString("en-GB")}</div><div class="s">${A.mastered} mastered (right 80%+ over 3 goes)</div></div>
        <div class="tile"><div class="k">Right overall</div><div class="v">${A.total ? pct(A.right, A.total) + "%" : "–"}</div><div class="s">${formPct != null ? `Recent form: ${formPct}% of the last ${A.form.length}` : "No answers yet"}</div></div>
        <div class="tile"><div class="k">Last 7 days</div><div class="v">${A.week[0]}</div><div class="s">${A.week[0] ? `${pct(A.week[1], A.week[0])}% right · played ${A.daysPlayed} day${A.daysPlayed === 1 ? "" : "s"}` : "No answers this week"}</div></div>
        <div class="tile"><div class="k">Matches</div><div class="v">${played}</div><div class="s">Won ${s.wins || 0} · drew ${s.draws || 0} · lost ${s.losses || 0}${s.georgeGoals ? ` · ${s.georgeGoals} goals` : ""}</div></div>
        ${lvl ? `<div class="tile"><div class="k">George's card</div><div class="v">${ovr} OVR</div><div class="s">Career level ${lvl}</div></div>` : ""}
      </div>`;

    // 2. Subjects, weakest first (the ones with enough answers), then the rest
    const list = Object.values(A.subj).map((x) => Object.assign({ p: pct(x.r, x.n) }, x));
    list.sort((a, b) => (a.n >= 5) === (b.n >= 5) ? (a.n >= 5 ? a.p - b.p : b.n - a.n) : a.n >= 5 ? -1 : 1);
    const rows = list.map((x) => {
      const st = status(x.n, x.p), meta = SUBJECTS[x.key], wa = workingAt(x);
      const lv = [1, 2, 3, 4].map((l) => {
        const [n, r] = x.lv[l];
        return `<span style="background:${heat(pct(r, n), n)}" title="${["", "Easy", "Medium", "Hard", "World Class"][l]}: ${n ? `${r} of ${n} right` : "not asked yet"}">${["", "E", "M", "H", "WC"][l]} ${n >= 3 ? pct(r, n) + "%" : "–"}</span>`;
      }).join("");
      return `<div class="row" tabindex="0">
        <div class="name">${meta.emoji} ${esc(meta.label)}${trendText(A.trend[x.key])}<small>${x.n} answer${x.n === 1 ? "" : "s"} · ${x.qs} different question${x.qs === 1 ? "" : "s"}${wa ? ` · working at ${wa}` : ""}</small></div>
        <div class="viz"><div class="bar" title="${x.r} of ${x.n} right"><i style="width:${x.n ? x.p : 0}%"></i>${x.n ? `<b>${x.p}%</b>` : ""}</div><div class="levels">${lv}</div></div>
        <span class="chip ${st.cls}">${st.text}</span>
      </div>`;
    }).join("");
    const table = `<details><summary>Show as a table</summary><table><thead><tr><th>Subject</th><th class="n">Answers</th><th class="n">Right</th><th class="n">%</th></tr></thead><tbody>${
      list.map((x) => `<tr><td>${esc(SUBJECTS[x.key].label)}</td><td class="n">${x.n}</td><td class="n">${x.r}</td><td class="n">${x.n ? x.p + "%" : "–"}</td></tr>`).join("")}</tbody></table></details>`;

    // 3. Maths: times tables grid + SATs topics
    const tt = Object.entries(A.tables).map(([t, [n, r]]) => `<div style="background:${heat(pct(r, n), n)}" title="${t} times table: ${n ? `${r} of ${n} right` : "not asked yet"}"><b>${t}×</b><span>${n >= 3 ? pct(r, n) + "%" : "–"}</span></div>`).join("");
    const satsRows = SATS_TOPICS.map(([, name]) => name).filter((name) => A.sats[name]).map((name) => {
      const [n, r] = A.sats[name], p = pct(r, n), st = status(n, p);
      return `<div class="row"><div class="name">${esc(name)}<small>${n} answer${n === 1 ? "" : "s"}</small></div><div class="viz"><div class="bar" title="${r} of ${n} right"><i style="width:${p}%"></i><b>${p}%</b></div></div><span class="chip ${st.cls}">${st.text}</span></div>`;
    }).join("");

    // 4. Activity, last 14 days
    const max = Math.max(5, ...A.daily.map((x) => x.n));
    const cols = A.daily.map((x) => {
      const label = x.d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
      return `<div class="col" tabindex="0" aria-label="${label}: ${x.n} answers, ${x.r} right">
        <span class="tip">${label}: ${x.n ? `${x.r} of ${x.n} right` : "no answers"}</span>
        ${x.n - x.r ? `<div class="w" style="height:${((x.n - x.r) / max) * 100}%"></div>` : ""}
        ${x.r ? `<div class="r" style="height:${(x.r / max) * 100}%"></div>` : ""}
      </div>`;
    }).join("");
    const dayLabels = A.daily.map((x) => `<span>${x.d.toLocaleDateString("en-GB", { weekday: "narrow" })}${x.d.getDate()}</span>`).join("");

    // 5. Practise together
    const prac = A.practise.slice(0, 12).map((x) => `<li><div class="q">${esc(x.q)}</div>${x.a ? `<div class="a">✓ ${esc(x.a)}</div>` : ""}<div class="m">${SUBJECTS[x.subject].emoji} ${esc(SUBJECTS[x.subject].label)} · right ${x.right} of ${x.seen}</div></li>`).join("");

    el.innerHTML = `
      <section class="card">
        <h2>The headlines</h2>
        <p class="lede">From every answer George has given in Matchday on this device. The game makes questions harder as he gets them right, so 70–80% right means he's being stretched about the right amount.</p>
        ${tiles}
      </section>
      <section class="card">
        <h2>Tips for this week</h2>
        <ul class="tips">${tips(A).map((t) => `<li>${t}</li>`).join("")}</ul>
      </section>
      <section class="card">
        <h2>Subjects</h2>
        <p class="lede">The ones to work on come first. The small boxes show each level: E easy, M medium, H hard, WC World Class. Brighter means more right.</p>
        <div class="rows">${rows}</div>
        ${table}
      </section>
      <section class="card">
        <h2>Times tables</h2>
        <p class="lede">From the Times tables subject. 7 × 8 counts towards both the 7s and the 8s.</p>
        <div class="tt">${tt}</div>
        <div class="scale"><span>Fewer right</span><i style="background:${heat(20, 9)}"></i><i style="background:${heat(50, 9)}"></i><i style="background:${heat(80, 9)}"></i><i style="background:${heat(100, 9)}"></i><span>More right</span><span style="margin-left:auto">– = fewer than 3 goes</span></div>
      </section>
      <section class="card">
        <h2>SATs maths in Matchday</h2>
        <p class="lede">Year 6 arithmetic from the SATs maths subject, split by topic.</p>
        ${satsRows ? `<div class="rows">${satsRows}</div>` : `<p class="empty">No SATs maths answers yet. Make sure "SATs maths" is ticked on the Matchday menu.</p>`}
      </section>
      ${satsSection()}
      <section class="card">
        <h2>The last two weeks</h2>
        <p class="lede">Answers each day. Hover or tap a day for the numbers.</p>
        <div class="chart" role="img" aria-label="Answers per day for the last 14 days">${cols}</div>
        <div class="days" aria-hidden="true">${dayLabels}</div>
        <div class="legend"><span><i style="background:var(--accent)"></i>Right</span><span><i style="background:rgba(241,237,233,.28)"></i>Wrong</span></div>
      </section>
      <section class="card">
        <h2>Practise together</h2>
        <p class="lede">Questions he got wrong last time, newest first, with the right answer. The game will ask these again, so a quick chat about them now helps them stick.</p>
        ${prac ? `<ul class="practise">${prac}</ul>` : `<p class="empty">Nothing to practise right now. 🎉</p>`}
      </section>
      <div class="actions">
        <button type="button" class="ghost" id="print">🖨️ Print</button>
        <button type="button" class="ghost" id="copy">📋 Copy a summary</button>
      </div>
      <p class="small">Saved only in this browser. If George plays on another device, that device has its own report.</p>`;

    $("print").addEventListener("click", () => window.print());
    $("copy").addEventListener("click", async () => {
      const lines = [`George's Matchday scouting report (${new Date().toLocaleDateString("en-GB")})`,
        `${A.total} answers, ${pct(A.right, A.total)}% right. Last 7 days: ${A.week[0]} answers.`, "",
        ...list.filter((x) => x.n >= 5).map((x) => `${SUBJECTS[x.key].label}: ${x.p}% (${x.n} answers) ${status(x.n, x.p).text}`)];
      try { await navigator.clipboard.writeText(lines.join("\n")); $("copy").textContent = "✓ Copied"; }
      catch (e) { $("copy").textContent = "Couldn't copy"; }
      setTimeout(() => { $("copy").textContent = "📋 Copy a summary"; }, 2000);
    });
  }
})();
