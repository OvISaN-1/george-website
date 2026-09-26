/* ===========================================================
   GEORGE'S WEBSITE — shared behaviour for every page
   No build step, no framework — plain JS so it's easy to read
   and easy to change later.

   The words and lists shown on each page come from js/content.js.
   This file only turns that content into HTML.
   =========================================================== */
(function () {
'use strict';

/* ---- Mobile nav toggle ------------------------------------------------ */
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (!toggle || !mobileNav) return;

  toggle.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close the mobile menu when a link is tapped.
  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ---- Scroll reveal ------------------------------------------------------
   Fades sections in as they enter the viewport. Skipped entirely for
   anyone with "reduce motion" turned on (handled in CSS too, but this
   avoids doing pointless work). */
function initScrollReveal() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const targets = document.querySelectorAll('.reveal:not(.is-visible)');
  if (!targets.length) return;

  // Very old browsers without IntersectionObserver: just show everything
  // immediately rather than leaving it hidden forever.
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ---- "Last updated" ------------------------------------------------------
   Any element with data-last-updated gets the date this page was last
   published. GitHub Pages sends that date with every file, so it updates
   itself on every push. The text already inside the element is kept as
   a fallback if the browser can't tell. */
function initLastUpdated() {
  const els = document.querySelectorAll('[data-last-updated]');
  if (!els.length) return;
  const d = new Date(document.lastModified);
  // Browsers report "now" when they don't know, so only trust dates in the past.
  if (isNaN(d) || Date.now() - d.getTime() < 60 * 1000) return;
  const text = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  els.forEach((el) => { el.textContent = text; });
}

/* ---- Small helpers ------------------------------------------------------- */
const $ = (id) => document.getElementById(id);

/* Basic HTML-escaping so anything typed into the content file (an
   apostrophe in a player's name, for example) can't break the markup. */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

/* Same as escapeHtml, but also safe inside a double-quoted HTML attribute. */
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

function setText(id, text) {
  const el = $(id);
  if (el && text != null) el.textContent = text;
}

function storageGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function storageSet(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (e) { /* private mode etc. */ }
}

/* ---- Card renderer --------------------------------------------------------
   type: 'football' | 'gaming' | 'school' — controls the accent colour
   and the tag label shown on each card. */
function renderCards(containerId, items, type) {
  const container = $(containerId);
  if (!container || !items) return;

  const tagLabel = {
    football: 'Football',
    gaming: 'Video Games',
    school: 'School Zone',
  }[type] || '';

  const placeholderIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2"/>
      <circle cx="9" cy="10" r="1.6"/>
      <path d="M3 16l5-4.5 4 3.2 3.5-3.7L21 15"/>
    </svg>`;

  container.innerHTML = items
    .map((item) => {
      const photoText = item.photoAlt || 'Photo coming soon';
      const photoBlock = item.photo
        ? `<div class="card-photo"><img src="${escapeAttr(item.photo)}" alt="${escapeAttr(photoText)}" loading="lazy"></div>`
        : `<div class="photo-slot" aria-hidden="true">${placeholderIcon}<span>${escapeHtml(photoText)}</span></div>`;
      return `
        <article class="card ${type} reveal">
          ${photoBlock}
          <span class="tag">${escapeHtml(tagLabel)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          ${item.meta ? `<p class="mono-num" style="margin-bottom:0;">${escapeHtml(item.meta)}</p>` : ''}
          <p>${escapeHtml(item.description)}</p>
        </article>
      `;
    })
    .join('');

  initScrollReveal();
}

function renderList(id, items) {
  const el = $(id);
  if (!el || !items) return;
  el.innerHTML = items.map((t) => `<li>${escapeHtml(t)}</li>`).join('');
}

/* =====================================================================
   PAGE: HOME
   ===================================================================== */
function renderHome(C) {
  const facts = (C.home && C.home.facts) || [];
  const textEl = $('fact-text');
  if (!textEl || !facts.length) return;
  let last = -1;
  function show() {
    let i;
    do { i = Math.floor(Math.random() * facts.length); } while (i === last && facts.length > 1);
    last = i;
    textEl.textContent = facts[i];
  }
  show();
  const btn = $('fact-next');
  if (btn) {
    if (facts.length < 2) btn.hidden = true;
    btn.addEventListener('click', show);
  }
}

/* =====================================================================
   PAGE: FOOTBALL (next match + prediction tracker)
   ===================================================================== */
const PIN_KEY = 'gw_prediction_pin';

function kickoffOf(f) {
  // Local-time parse of the UK kick-off. Good enough for a UK family.
  return new Date(`${f.date}T${f.time || '15:00'}:00`);
}
function matchKey(f) {
  return `${f.date}-${f.opponent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}
function shortName(opponent) {
  return opponent;
}
function scoreLine(f, forest, opp) {
  // Always written from Forest's side: "Forest 2-1 Palace"
  return `Forest ${forest}-${opp} ${shortName(f.opponent)}`;
}
function outcome(a, b) { return a > b ? 'W' : a < b ? 'L' : 'D'; }
function pointsFor(p) {
  if (p.pred_forest == null || p.result_forest == null) return null;
  if (p.pred_forest === p.result_forest && p.pred_opponent === p.result_opponent) return 3;
  return outcome(p.pred_forest, p.pred_opponent) === outcome(p.result_forest, p.result_opponent) ? 1 : 0;
}
function friendlyError(err) {
  const m = (err && err.message || '').toLowerCase();
  if (m.includes('wrong pin')) return 'That PIN didn\'t work. Try again.';
  if (m.includes('too late')) return 'Too late, that match has already started.';
  if (m.includes('bad score')) return 'Scores need to be between 0 and 20.';
  if (err && err.status === 404) return 'The prediction table isn\'t set up in Supabase yet (see supabase-setup.sql).';
  return 'Couldn\'t save right now. Check the internet connection and try again.';
}

function renderFootball(C) {
  const F = C.football || {};
  setText('matchday-caption', F.matchdayCaption);
  if (F.fanStory) setText('fan-story', F.fanStory);
  else if ($('fan-story-wrap')) $('fan-story-wrap').hidden = true;

  setText('league-line', 'Loading the live table...');

  renderCards('players-grid', F.players, 'football');

  if (F.myTeam) {
    setText('my-team-line', `Team: ${F.myTeam.name} · Position: ${F.myTeam.position}`);
    setText('my-goals', F.myTeam.goals);
    setText('my-apps', F.myTeam.appearances);
    if (F.myTeam.quote) setText('my-team-quote', `“${F.myTeam.quote}”`);
    // No numbers yet: hide the goals / appearances boxes instead of showing dashes.
    const strip = document.querySelector('.stat-strip');
    if (strip && F.myTeam.goals == null && F.myTeam.appearances == null) strip.hidden = true;
  }

  // Live data from worker/index.js. If it can't be reached, the fixture
  // list in content.js keeps the next match and predictions working.
  loadLive().then((live) => {
    renderLeague(live);
    renderFixtures(live);
    FIXTURES = ((live && live.matches) || F.fixtures || []).slice().sort((a, b) => kickoffOf(a) - kickoffOf(b));
    initPredictions(FIXTURES);
  });
}

/* ---- Live Forest data (league, fixtures, results, top scorers) ------------ */
let FIXTURES = [];

async function loadLive() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch('/api/forest', { signal: ctrl.signal });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.league ? data : null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
const isLive = (f) => f.status === 'IN_PLAY' || f.status === 'PAUSED';
const isFinished = (f) => f.status === 'FINISHED';

function renderLeague(live) {
  const scorerEl = $('top-scorer');
  const tableEl = $('mini-table');
  if (!live) {
    setText('league-line', 'The live Premier League table isn\'t available right now. Try again later.');
    setText('league-asof', '');
    if (scorerEl) scorerEl.hidden = true;
    if (tableEl) tableEl.hidden = true;
    return;
  }
  const L = live.league;
  setText('league-line', `${ordinal(L.position)} in the Premier League · ${L.played} played · ${L.points} point${L.points === 1 ? '' : 's'}`);
  const t = new Date(live.updated);
  setText('league-asof', `Live table · updated ${t.toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`);

  if (scorerEl) {
    const top = live.scorers && live.scorers[0];
    scorerEl.hidden = !top;
    if (top) {
      scorerEl.innerHTML = `<b>Top scorer:</b> ${escapeHtml(top.name)}, ${top.goals} goal${top.goals === 1 ? '' : 's'}` +
        (live.scorers.length > 1 ? ` <span class="muted">(then ${live.scorers.slice(1, 3).map((s) => `${escapeHtml(s.name)} ${s.goals}`).join(', ')})</span>` : '');
    }
  }

  if (tableEl && L.table && L.table.length) {
    const i = L.table.findIndex((r) => r.forest);
    const from = Math.max(0, Math.min(i - 2, L.table.length - 5));
    const rows = L.table.slice(from, from + 5);
    tableEl.hidden = false;
    tableEl.innerHTML = `
      <table class="mini-table">
        <caption class="visually-hidden">Premier League table around Forest</caption>
        <thead><tr><th scope="col">Pos</th><th scope="col">Team</th><th scope="col">P</th><th scope="col">GD</th><th scope="col">Pts</th></tr></thead>
        <tbody>${rows.map((r) => `<tr${r.forest ? ' class="us"' : ''}><td>${r.position}</td><td>${escapeHtml(r.forest ? 'Nottingham Forest' : r.team)}</td><td>${r.played}</td><td>${r.goalDifference > 0 ? '+' : ''}${r.goalDifference}</td><td><b>${r.points}</b></td></tr>`).join('')}</tbody>
      </table>`;
  }
}

function renderFixtures(live) {
  const el = $('fixtures-results');
  if (!el) return;
  const section = el.closest('section');
  if (!live) { if (section) section.hidden = true; return; }
  const all = live.matches || [];
  const done = all.filter(isFinished).slice(-5).reverse();
  const next = all.filter((f) => !isFinished(f)).slice(0, 5);
  const when = (f) => kickoffOf(f).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const res = (f) => outcome(f.forest, f.opp);
  el.innerHTML = `
    <div class="fx-col">
      <h3>Coming up</h3>
      ${next.length ? `<ul class="fx-list">${next.map((f) => `<li>
        <span class="fx-date">${escapeHtml(when(f))}</span>
        <span class="fx-team">${escapeHtml(f.opponent)} <small>(${f.venue})</small></span>
        <span class="fx-right">${isLive(f) ? `<b class="fx-live">LIVE ${f.forest ?? 0}-${f.opp ?? 0}</b>` : escapeHtml(f.time)}</span>
      </li>`).join('')}</ul>` : '<p>No more fixtures this season.</p>'}
    </div>
    <div class="fx-col">
      <h3>Recent results</h3>
      ${done.length ? `<ul class="fx-list">${done.map((f) => `<li>
        <span class="fx-date">${escapeHtml(when(f))}</span>
        <span class="fx-team">${escapeHtml(f.opponent)} <small>(${f.venue})</small></span>
        <span class="fx-right"><span class="fx-score">${f.forest}-${f.opp}</span><span class="fx-chip ${res(f)}" aria-label="${res(f) === 'W' ? 'Won' : res(f) === 'L' ? 'Lost' : 'Drew'}">${res(f)}</span></span>
      </li>`).join('')}</ul>` : '<p>No results yet this season.</p>'}
    </div>`;
}

// A saved prediction for this match. Older rows may use a slightly different
// club name in their key, so fall back to the match date.
function predFor(preds, f) {
  if (!preds) return undefined;
  return preds[matchKey(f)] || Object.values(preds).find((p) => p.match_date === f.date);
}
// The final score: the live feed first, a score saved by hand as a backup.
function withResult(p, f) {
  if (!p) return p;
  if (isFinished(f) && f.forest != null) return Object.assign({}, p, { result_forest: f.forest, result_opponent: f.opp });
  return p;
}

async function initPredictions(fixtures) {
  const nextEl = $('next-match');
  const trackerEl = $('tracker');
  if (!nextEl && !trackerEl) return;

  const now = Date.now();
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const next = fixtures.find((f) => kickoffOf(f).getTime() + TWO_HOURS > now);
  const past = fixtures.filter((f) => kickoffOf(f).getTime() <= now);

  let preds = null; // null = couldn't load
  try {
    const rows = await DB.select('predictions', 'select=*&order=match_date.asc');
    preds = {};
    rows.forEach((r) => { preds[r.match_key] = r; });
  } catch (e) {
    console.warn('Could not load predictions', e);
  }

  if (nextEl) renderNextMatch(nextEl, next, preds);
  if (trackerEl) renderTracker(trackerEl, fixtures, past, preds);
}

function venueText(f) { return f.venue === 'H' ? 'Home, City Ground' : 'Away'; }
function teamsText(f) {
  return f.venue === 'H' ? `Nottingham Forest v ${f.opponent}` : `${f.opponent} v Nottingham Forest`;
}

function countdownParts(kickoff) {
  const ms = kickoff.getTime() - Date.now();
  if (ms <= 0) return { big: 'LIVE', small: 'playing now' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(kickoff); day.setHours(0, 0, 0, 0);
  const days = Math.round((day - today) / 86400000);
  if (days === 0) return { big: 'Today', small: kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) };
  if (days === 1) return { big: '1', small: 'day to go' };
  return { big: String(days), small: 'days to go' };
}

function pinFields(prefix) {
  const saved = storageGet(PIN_KEY) || '';
  return `
    <label>PIN
      <input type="password" id="${prefix}-pin" autocomplete="off" required value="${escapeAttr(saved)}">
    </label>
    <label class="remember"><input type="checkbox" id="${prefix}-remember" ${saved ? 'checked' : ''}> Remember on this device</label>`;
}

function renderNextMatch(el, f, preds) {
  if (!f) {
    el.innerHTML = `<p class="prediction-line">No more Forest fixtures this season. See you in August!</p>`;
    return;
  }
  const ko = kickoffOf(f);
  const cd = countdownParts(ko);
  const dateText = ko.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeText = ko.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const p = predFor(preds, f);
  const started = ko.getTime() <= Date.now();

  let predictionHtml;
  if (preds === null) predictionHtml = 'Couldn\'t load my prediction right now.';
  else if (p && p.pred_forest != null) predictionHtml = `My prediction: <strong>${escapeHtml(scoreLine(f, p.pred_forest, p.pred_opponent))}</strong>`;
  else predictionHtml = started ? 'No prediction for this one.' : 'No prediction yet. Get it in before kick-off!';

  const canPredict = preds !== null && !started;
  el.innerHTML = `
    <div>
      <p class="match-teams">${escapeHtml(teamsText(f))}</p>
      <p class="match-meta">${escapeHtml(dateText)} · ${escapeHtml(timeText)} · ${escapeHtml(venueText(f))}</p>
      ${isLive(f) ? `<p class="match-live">🔴 LIVE: <strong>${escapeHtml(scoreLine(f, f.forest ?? 0, f.opp ?? 0))}</strong></p>` : ''}
    </div>
    <div class="countdown" aria-label="${escapeAttr(cd.big + ' ' + cd.small)}">
      <span class="big">${escapeHtml(cd.big)}</span><span class="small">${escapeHtml(cd.small)}</span>
    </div>
    <p class="prediction-line" id="prediction-line">${predictionHtml}</p>
    ${canPredict ? `
    <details class="predict-toggle">
      <summary>${p && p.pred_forest != null ? 'Change my prediction' : 'Make my prediction'}</summary>
      <form class="predict-form" id="predict-form">
        <label>Forest
          <input type="number" id="pf-forest" min="0" max="20" inputmode="numeric" required value="${p && p.pred_forest != null ? p.pred_forest : ''}">
        </label>
        <label>${escapeHtml(f.opponent)}
          <input type="number" id="pf-opp" min="0" max="20" inputmode="numeric" required value="${p && p.pred_opponent != null ? p.pred_opponent : ''}">
        </label>
        ${pinFields('pf')}
        <button class="btn btn-primary" type="submit">Save prediction</button>
        <p class="form-status" id="pf-status" role="status"></p>
      </form>
    </details>` : ''}
  `;

  const form = $('predict-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitPrediction(f, 'prediction', +$('pf-forest').value, +$('pf-opp').value, 'pf');
    });
  }
}

async function submitPrediction(f, kind, forest, opp, prefix) {
  const status = $(`${prefix}-status`);
  const pin = $(`${prefix}-pin`).value;
  const remember = $(`${prefix}-remember`).checked;
  status.className = 'form-status';
  status.textContent = 'Saving...';
  try {
    await DB.rpc('save_prediction', {
      p_pin: pin,
      p_match_key: matchKey(f),
      p_match_date: f.date,
      p_opponent: f.opponent,
      p_venue: f.venue,
      p_kind: kind,
      p_forest: forest,
      p_opponent_goals: opp,
    });
    storageSet(PIN_KEY, remember ? pin : null);
    status.className = 'form-status ok';
    status.textContent = 'Saved!';
    setTimeout(() => initPredictions(FIXTURES), 600);
  } catch (err) {
    status.className = 'form-status err';
    status.textContent = friendlyError(err);
  }
}

function renderTracker(el, fixtures, past, preds) {
  if (preds === null) {
    el.innerHTML = '<p>Couldn\'t load the prediction tracker right now. Try again later.</p>';
    return;
  }
  const rows = fixtures
    .map((f) => ({ f, p: withResult(predFor(preds, f), f) }))
    .filter(({ f, p }) => p && p.pred_forest != null && kickoffOf(f).getTime() <= Date.now());

  let total = 0, scored = 0, rightResult = 0, exact = 0;
  rows.forEach(({ p }) => {
    const pts = pointsFor(p);
    if (pts == null) return;
    scored++; total += pts;
    if (pts >= 1) rightResult++;
    if (pts === 3) exact++;
  });

  const summary = scored
    ? `<strong>${total} points</strong> from ${scored} match${scored === 1 ? '' : 'es'} · right result ${Math.round((rightResult / scored) * 100)}% of the time · ${exact} exact score${exact === 1 ? '' : 's'}`
    : 'No finished matches with a prediction yet. The first points land after the next game.';

  const tableRows = rows.slice().reverse().map(({ f, p }) => {
    const pts = pointsFor(p);
    const d = kickoffOf(f).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `<tr>
      <td>${escapeHtml(d)}</td>
      <td>${escapeHtml(f.opponent)} (${f.venue === 'H' ? 'H' : 'A'})</td>
      <td class="mono-num">${p.pred_forest != null ? `${p.pred_forest}-${p.pred_opponent}` : '–'}</td>
      <td class="mono-num">${p.result_forest != null ? `${p.result_forest}-${p.result_opponent}` : (isLive(f) ? 'playing' : 'waiting')}</td>
      <td class="mono-num ${pts == null ? '' : 'pts-' + pts}">${pts == null ? '–' : pts}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <p class="tracker-summary">${summary}</p>
    ${rows.length ? `
    <div class="table-wrap">
      <table>
        <caption class="visually-hidden">George's score predictions and how many points each earned</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">Match</th><th scope="col">My guess</th><th scope="col">Result</th><th scope="col">Points</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>` : ''}
    <p style="margin-top:var(--s4); font-size:0.9rem;">3 points for the exact score, 1 point for the right result (win, draw or loss). Final scores fill in by themselves.</p>
  `;
}

/* =====================================================================
   PAGE: VIDEO GAMES
   ===================================================================== */
function renderGames(C) {
  const G = C.games || {};
  setText('currently-playing', G.currentlyPlaying);
  renderCards('games-grid', G.topGames, 'gaming');
  const body = $('scores-body');
  if (body && G.topScores) {
    body.innerHTML = G.topScores.map((r) =>
      `<tr><td>${escapeHtml(r.game)}</td><td class="mono-num">${escapeHtml(r.best)}</td><td class="mono-num">${escapeHtml(r.date)}</td></tr>`
    ).join('');
  }
  setText('trying-to-beat', G.tryingToBeat);
}

/* =====================================================================
   PAGE: SCHOOL ZONE
   ===================================================================== */
function renderSchool(C) {
  const S = C.school || {};
  setText('fav-subject', S.favouriteSubject);
  setText('fav-reason', S.favouriteReason);
  renderCards('achievements-grid', S.achievements, 'school');

  const g = S.termGoal;
  if (!g) return;
  setText('goal-title', g.title);
  setText('goal-note', g.progressNote);
  const track = $('goal-track');
  if (track) {
    const done = Math.max(0, Math.min(3, Number(g.badgesDone) || 0));
    const steps = g.steps || [['🥉', 'Bronze'], ['🥈', 'Silver'], ['🥇', 'Gold']];
    track.innerHTML = steps.map(([emoji, name], i) => {
      const cls = i < done ? 'done' : i === done ? 'next' : '';
      const state = i < done ? 'got it' : i === done ? 'next up' : 'to come';
      return `<div class="medal-step ${cls}"><span class="medal" aria-hidden="true">${emoji}</span>${name}<span class="visually-hidden">: ${state}</span></div>`;
    }).join('');
    const bar = $('goal-bar');
    if (bar) {
      bar.style.width = `${Math.round((done / 3) * 100)}%`;
      bar.parentElement.setAttribute('aria-valuenow', String(done));
    }
  }
}

/* =====================================================================
   PAGE: ABOUT
   ===================================================================== */
function renderAbout(C) {
  const A = C.about || {};
  renderList('fun-facts', A.funFacts);
  const loves = $('loves');
  if (loves && A.loves) {
    loves.innerHTML = A.loves.map((x) =>
      `<article class="card love-card"><span class="love-emoji" aria-hidden="true">${escapeHtml(x.emoji)}</span><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.text)}</p></article>`
    ).join('');
  }
  const qf = $('quickfire');
  if (qf && A.quickFire) {
    qf.innerHTML = A.quickFire.map((x) =>
      `<div class="qf-item"><dt>${escapeHtml(x.q)}</dt><dd>${escapeHtml(x.a)}</dd></div>`
    ).join('');
  }
}

/* ---- Boot ------------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initLastUpdated();

  const C = window.SITE;
  const page = document.body.dataset.page;
  if (C) {
    if (page === 'home') renderHome(C);
    if (page === 'football') renderFootball(C);
    if (page === 'games') renderGames(C);
    if (page === 'school') renderSchool(C);
    if (page === 'about') renderAbout(C);
  }

  initScrollReveal();
});
})();

/* ---- Share and keep-awake (used by the games and SATs practice) ----------
   GZShare(text): opens the phone's own share menu (WhatsApp, Messages...).
   On a computer it copies the text instead. Resolves to 'shared',
   'copied' or 'cancelled'.
   GZWake.on() / GZWake.off(): stops the screen dimming during a match. */
window.GZShare = async function (text, url) {
  const link = url || location.origin + location.pathname;
  try {
    if (navigator.share) { await navigator.share({ title: document.title, text, url: link }); return 'shared'; }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled';
  }
  try { await navigator.clipboard.writeText(`${text} ${link}`); return 'copied'; } catch (e) { return 'cancelled'; }
};
window.GZWake = (function () {
  let lock = null, wanted = false;
  async function grab() {
    try { if (wanted && 'wakeLock' in navigator && !lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } } catch (e) { lock = null; }
  }
  // The browser drops the lock when the tab is hidden; take it back on return.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') grab(); });
  return {
    on() { wanted = true; grab(); },
    off() { wanted = false; if (lock) { lock.release().catch(() => {}); lock = null; } },
  };
})();
