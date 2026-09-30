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

/* ---- Bottom tab bar (phones): an app-style nav within thumb's reach -------
   Injected here instead of in every page's HTML, so all six pages stay
   in sync automatically. Skipped on the game pages themselves — they
   already use the bottom of the screen for controls. */
const TABS = [
  ['index.html', 'home', 'Home', '<path d="M4 11l8-6 8 6"/><path d="M6 10v9h12v-9"/>'],
  ['football.html', 'football', 'Football', '<circle cx="12" cy="12" r="9"/>'],
  ['games.html', 'games', 'Games', '<rect x="3" y="7" width="18" height="10" rx="4"/>'],
  ['quiz-zone.html', 'quiz-zone', 'Game Zone', '<path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>'],
  ['school.html', 'school', 'School', '<path d="M12 4l9 4-9 4-9-4z"/><path d="M6 10.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-5.5"/>'],
];
function initBottomTabs() {
  const page = document.body.dataset.page;
  if (!page || page === 'quiz-game') return; // the games need their own bottom space
  const inSubfolder = location.pathname.includes('/quiz-zone/');
  const base = inSubfolder ? '../' : '';
  const bar = document.createElement('nav');
  bar.className = 'bottom-tabbar';
  bar.setAttribute('aria-label', 'Quick navigation');
  bar.innerHTML = TABS.map(([href, key, label, path]) =>
    `<a href="${base}${href}"${key === page ? ' aria-current="page"' : key === 'school' && page === 'space' ? ' aria-current="true"' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${path}</svg>${label}</a>`
  ).join('');
  document.body.appendChild(bar);
  document.body.classList.add('has-bottom-tabbar');
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
        ? `<div class="card-photo"><img src="${escapeAttr(item.photo)}" alt="${escapeAttr(photoText)}" loading="lazy"${item.livePhoto ? ` data-live-photo="${escapeAttr(item.livePhoto)}" data-live-team="${escapeAttr(item.livePhotoTeam || '')}"` : ''}></div>`
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

  container.querySelectorAll('img[data-live-photo]').forEach(swapInLivePhoto);
  initScrollReveal();
}

// Swap a card's placeholder for a live photo (TheSportsDB via /api/player),
// but only once it's loaded, and only if it's the right team's player.
async function swapInLivePhoto(img) {
  try {
    const res = await fetch(`${apiUrl('player')}?id=${encodeURIComponent(img.dataset.livePhoto)}`, { signal: AbortSignal.timeout(10000) });
    const p = await res.json();
    if (!res.ok || !p || !p.photo || !/^https:\/\//.test(p.photo)) return;
    const team = (img.dataset.liveTeam || '').toLowerCase();
    if (team && !String(p.team || '').toLowerCase().includes(team.split(' ')[0])) return;
    const pic = new Image();
    pic.onload = () => { img.src = p.photo; img.classList.add('live-photo'); };
    pic.src = p.photo;
  } catch (e) { /* keep the placeholder */ }
}

function renderList(id, items) {
  const el = $(id);
  if (!el || !items) return;
  el.innerHTML = items.map((t) => `<li>${escapeHtml(t)}</li>`).join('');
}

/* =====================================================================
   PAGE: HOME
   ===================================================================== */
// Home: "Right now" tiles (next Forest match with its forecast, and the ISS).
async function renderNow() {
  const fx = $('now-forest'), sp = $('now-space'), ad = $('now-advice');
  if (!fx && !sp && !ad) return;
  const tile = (el, main, sub) => { el.querySelector('.now-main').innerHTML = main; el.querySelector('.now-sub').innerHTML = sub; };
  loadLive().then((live) => {
    if (!fx) return;
    LIVE = live;
    const all = ((live && live.matches) || (window.SITE.football || {}).fixtures || []).slice().sort((a, b) => kickoffOf(a) - kickoffOf(b));
    const next = all.find((f) => f.status !== 'FINISHED' && kickoffOf(f).getTime() + 2 * 3600000 > Date.now());
    if (!next) return tile(fx, 'No more fixtures this season', '');
    const when = kickoffOf(next).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const w = weatherOf(next);
    tile(fx, isLive(next) ? `🔴 LIVE: ${escapeHtml(scoreLine(next, next.forest ?? 0, next.opp ?? 0))}` : `${escapeHtml(next.opponent)} <small>(${next.venue === 'H' ? 'home' : 'away'})</small>`,
      `${escapeHtml(when)} · ${escapeHtml(next.time)}${w ? ` · ${w.emoji} ${w.temp}°C` : ''}${live ? ` · we're ${ordinal(live.league.position)}` : ''}`);
  });
  if (sp) {
    try {
      const res = await fetch(apiUrl('iss'), { cache: 'no-store' });
      const s = await res.json();
      if (!res.ok || s.error) throw new Error('iss');
      let name = s.country;
      try { if (name) name = new Intl.DisplayNames(['en-GB'], { type: 'region' }).of(name); } catch (e) { /* keep the code */ }
      const flag = s.country ? s.country.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0))) + ' ' : '🌊 ';
      tile(sp, `Over ${flag}${escapeHtml(name || 'the ocean')}`, `${s.altitude} km up · ${s.speed.toLocaleString('en-GB')} km/h · tap for the Space corner: rocket launches, Earth from space and more`);
    } catch (e) {
      tile(sp, 'Somewhere up there 🛰️', 'Tap for the Space corner: rocket launches, Earth from space and more');
    }
  }
  const jk = $('now-joke');
  if (jk) {
    try {
      const res = await fetch(apiUrl('joke'), { signal: AbortSignal.timeout(10000) });
      const j = await res.json();
      if (!res.ok || j.error || !(j.joke || (j.setup && j.delivery))) throw new Error('joke');
      $('joke-text').textContent = j.joke || j.setup;
      const punch = $('joke-punch');
      if (j.delivery) {
        // Two-part joke: keep the punchline back until George taps.
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'joke-btn';
        btn.textContent = 'Tell me! 🥁';
        btn.addEventListener('click', () => { punch.textContent = j.delivery; punch.classList.add('joke-punchline'); });
        punch.replaceChildren(btn);
      } else {
        punch.textContent = 'A new one every day';
      }
      jk.hidden = false;
    } catch (e) { /* leave it hidden */ }
  }
  if (ad) {
    try {
      // Busts the API's own response cache so it's not the same line all day.
      const res = await fetch(`https://api.adviceslip.com/advice?t=${Date.now()}`);
      const data = await res.json();
      const line = data && data.slip && data.slip.advice;
      if (!line) throw new Error('advice');
      $('advice-text').textContent = `"${line}"`;
      ad.hidden = false;
    } catch (e) { /* leave it hidden: nothing broken-looking on the page */ }
  }
}

function renderHome(C) {
  renderNow();
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
  initMatchdayTabs();

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
    LIVE = live;
    renderLeague(live);
    renderFixtures(live);
    FIXTURES = ((live && live.matches) || F.fixtures || []).slice().sort((a, b) => kickoffOf(a) - kickoffOf(b));
    initPredictions(FIXTURES);
    initMatchCentre();
  });
}

/* ---- Live Forest data (league, fixtures, results, top scorers) ------------ */
let FIXTURES = [];
let LIVE = null;

// Matchday forecast for a fixture (from worker/extras.js, Open-Meteo).
function weatherOf(f) { return LIVE && LIVE.weather && LIVE.weather[f.date] || null; }
function weatherLine(w) {
  if (!w) return '';
  return `${w.emoji} ${w.text} · ${w.temp}°C${w.rain != null ? ` · ${w.rain}% chance of rain` : ''} · wind ${w.wind} km/h`;
}

// On georgeneagu.win (or the workers.dev test address) the data is at
// /api/forest. Anywhere else (the old github.io copy, a computer at home)
// it is fetched from georgeneagu.win.
function apiUrl(name) {
  return (/(^|\.)georgeneagu\.win$|\.workers\.dev$/.test(location.hostname) ? '' : 'https://georgeneagu.win') + `/api/${name}`;
}
const LIVE_URL = apiUrl('forest');
const LIVE_SAVE = 'gz_forest_live_v1';

async function fetchLive() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(LIVE_URL, { signal: ctrl.signal, cache: 'no-cache' });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.league ? data : null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
async function loadLive() {
  let data = await fetchLive();
  if (!data) { await new Promise((r) => setTimeout(r, 1500)); data = await fetchLive(); } // one more go
  if (data) {
    storageSet(LIVE_SAVE, JSON.stringify(data));
    return data;
  }
  // Couldn't reach it: show the last table this device saw (up to a week old).
  try {
    const saved = JSON.parse(storageGet(LIVE_SAVE));
    if (saved && saved.league && Date.now() - new Date(saved.updated).getTime() < 7 * 86400000) return Object.assign(saved, { stale: true });
  } catch (e) { /* nothing saved */ }
  return null;
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
  setText('league-asof', live.stale
    ? `Couldn't refresh just now, so this is the table from ${t.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
    : `Live table · updated ${t.toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`);

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
  const nextEl = $('fx-next'), doneEl = $('fx-results');
  if (!nextEl || !doneEl) return;
  if (!live) {
    const msg = '<p class="fx-off">Live fixtures and results aren\'t available right now. The next match is still shown in the first tab.</p>';
    nextEl.innerHTML = msg; doneEl.innerHTML = msg;
    return;
  }
  const all = live.matches || [];
  const done = all.filter(isFinished).reverse();
  const next = all.filter((f) => !isFinished(f));
  const when = (f) => kickoffOf(f).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const res = (f) => outcome(f.forest, f.opp);
  const wx = (f) => (!isLive(f) && live.weather && live.weather[f.date] ? `<span class="fx-wx" title="${escapeAttr(weatherLine(live.weather[f.date]))}">${live.weather[f.date].emoji} ${live.weather[f.date].temp}°</span>` : '');
  nextEl.innerHTML = next.length ? `<ul class="fx-list">${next.map((f) => `<li>
      <span class="fx-date">${escapeHtml(when(f))}</span>
      <span class="fx-team">${escapeHtml(f.opponent)} <small>(${f.venue})</small></span>
      <span class="fx-right">${wx(f)}${isLive(f) ? `<b class="fx-live">LIVE ${f.forest ?? 0}-${f.opp ?? 0}</b>` : escapeHtml(f.time)}</span>
    </li>`).join('')}</ul>` : '<p class="fx-off">No more fixtures this season.</p>';
  // Results as proper scorelines: home team on the left, away on the right,
  // each team's scorers and cards underneath its own name.
  const FOREST = 'Nottingham Forest';
  doneEl.innerHTML = done.length ? `<ul class="fxr-list">${done.map((f) => {
    const home = f.venue === 'H';
    const [hName, aName] = home ? [FOREST, f.opponent] : [f.opponent, FOREST];
    const [hGoals, aGoals] = home ? [f.forest, f.opp] : [f.opp, f.forest];
    const r = res(f);
    return `<li>
      <div class="fxr-top"><span class="fx-date">${escapeHtml(when(f))}</span><span class="fx-chip ${r}" aria-label="${r === 'W' ? 'Forest won' : r === 'L' ? 'Forest lost' : 'Draw'}">${r}</span></div>
      <div class="fxr-board">
        <span class="fxr-team fxr-home${home ? ' is-forest' : ''}">${escapeHtml(hName)}</span>
        <span class="fxr-score">${hGoals}<span aria-hidden="true"> – </span><span class="visually-hidden"> to </span>${aGoals}</span>
        <span class="fxr-team fxr-away${home ? '' : ' is-forest'}">${escapeHtml(aName)}</span>
      </div>
      <div class="fxr-events" data-date="${escapeAttr(f.date)}" data-home="${home ? 'forest' : 'opp'}" hidden></div>
    </li>`;
  }).join('')}</ul>` : '<p class="fx-off">No results yet this season.</p>';
  resultsReady = true;
  if (wantResultEvents) loadResultEvents();
}

/* ---- Scorers and cards under each result (ESPN, straight from the browser) --
   ESPN's public scoreboard (no key, unofficial) answers 403 to Cloudflare's
   servers, so George's browser asks it directly; it allows that
   (access-control-allow-origin: *). football-data.org's free plan has no
   scorers or cards. ESPN's soccer fields aren't documented anywhere that
   could be checked, so both its true/false flags and its type text are read,
   and the match summary's keyEvents are tried if the scoreboard has none.
   Fetched only once the Results tab is opened, for the latest 10 results;
   finished matches are remembered in this browser. Anything that can't be
   found just leaves the row as it was. */
const ESPN_PL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1';
function espnEvent(d, forestId) {
  if (!d) return null;
  const text = String((d.type && d.type.text) || '');
  const red = d.redCard === true || /red card/i.test(text);
  const yellow = !red && (d.yellowCard === true || /yellow card/i.test(text));
  const goal = !red && !yellow && (d.scoringPlay === true || (/goal|penalty - scored/i.test(text) && !/disallowed|missed|saved|no goal/i.test(text)));
  if (!goal && !red && !yellow) return null;
  const who = (d.athletesInvolved && d.athletesInvolved[0]) || (d.participants && d.participants[0] && d.participants[0].athlete) || {};
  const player = String(who.shortName || who.displayName || '').replace(/^[A-Z]\.\s+/, '').trim().slice(0, 40);
  if (!player) return null;
  const teamId = d.team && d.team.id;
  return {
    kind: goal ? 'goal' : red ? 'red' : 'yellow',
    min: String((d.clock && d.clock.displayValue) || '').trim(),
    sort: Number(d.clock && d.clock.value) || 0,
    forest: teamId != null && String(teamId) === String(forestId),
    player,
    pen: goal && (d.penaltyKick === true || /penalty/i.test(text)),
    og: goal && (d.ownGoal === true || /own goal/i.test(text)),
  };
}
async function matchEvents(date) {
  const key = `gz_goals_v1_${date}`;
  try { const hit = localStorage.getItem(key); if (hit) return JSON.parse(hit); } catch (e) { /* private mode */ }
  const get = async (url) => { const r = await fetch(url, { signal: AbortSignal.timeout(12000) }); if (!r.ok) throw new Error(`espn ${r.status}`); return r.json(); };
  const j = await get(`${ESPN_PL}/scoreboard?dates=${date.replace(/-/g, '')}`);
  if (!j || !Array.isArray(j.events)) throw new Error('espn: unexpected response shape');
  const isForest = (c) => c && c.team && /nottingham/i.test(`${c.team.displayName || ''} ${c.team.name || ''}`);
  const ev = j.events.find((e) => e && e.competitions && e.competitions[0] && (e.competitions[0].competitors || []).some(isForest));
  if (!ev) throw new Error('espn: no Forest match that day');
  if (!(ev.status && ev.status.type && ev.status.type.completed)) throw new Error('espn: not finished');
  const comp = ev.competitions[0];
  const forestId = comp.competitors.find(isForest).team.id;
  let raw = Array.isArray(comp.details) ? comp.details : [];
  if (!raw.length) {
    try { const sj = await get(`${ESPN_PL}/summary?event=${encodeURIComponent(ev.id)}`); if (Array.isArray(sj.keyEvents)) raw = sj.keyEvents; } catch (e) { /* no details then */ }
  }
  const out = { events: raw.map((d) => espnEvent(d, forestId)).filter(Boolean).sort((a, b) => a.sort - b.sort).map(({ sort, ...e }) => e) };
  try { localStorage.setItem(key, JSON.stringify(out)); } catch (e) { /* storage full */ }
  return out;
}
let resultsReady = false, wantResultEvents = false, resultEventsLoaded = false;
function loadResultEvents() {
  wantResultEvents = true;
  if (!resultsReady || resultEventsLoaded) return;
  resultEventsLoaded = true;
  const rows = [...document.querySelectorAll('#fx-results .fxr-events')].slice(0, 10);
  const ICON = { goal: '⚽', yellow: '🟨', red: '🟥' };
  const line = (e) => `<span class="fxr-ev"><span aria-hidden="true">${ICON[e.kind]}</span> ${escapeHtml(e.player)} ${escapeHtml(e.min)}${e.pen ? ' (pen)' : ''}${e.og ? ' (o.g.)' : ''}<span class="visually-hidden"> ${e.kind === 'goal' ? 'goal' : `${e.kind} card`}</span></span>`;
  // Goals first, then cards (yellow before red), each in minute order.
  const order = { goal: 0, yellow: 1, red: 2 };
  const side = (list) => list.slice().sort((a, b) => order[a.kind] - order[b.kind]).map(line).join('');
  rows.forEach(async (box) => {
    try {
      const d = await matchEvents(box.dataset.date);
      if (!d.events.length) return;
      const forest = d.events.filter((e) => e.forest), them = d.events.filter((e) => !e.forest);
      const [left, right] = box.dataset.home === 'forest' ? [forest, them] : [them, forest];
      box.innerHTML = `<div class="fxr-side fxr-home">${side(left)}</div><div class="fxr-mid" aria-hidden="true"></div><div class="fxr-side fxr-away">${side(right)}</div>`;
      box.hidden = false;
    } catch (e) { /* leave the row as it is */ }
  });
}

// Matchday tabs (Next match · Fixtures · Results), with arrow-key support.
function initMatchdayTabs() {
  const tabs = [...document.querySelectorAll('.md-tabs [role="tab"]')];
  if (!tabs.length) return;
  const select = (t) => {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      $(x.getAttribute('aria-controls')).hidden = !on;
    });
    if (t.id === 'tab-fpl') loadFpl(); // only fetched if George opens the tab
    if (t.id === 'tab-results') loadResultEvents();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const n = tabs[(i + d + tabs.length) % tabs.length];
      select(n); n.focus();
    });
  });
}

/* ---- Forest in Fantasy Premier League (worker/more.js fpl()) --------------
   Top 5 Forest players by FPL points, the rest tucked behind "show all". */
let fplLoaded = false;
async function loadFpl() {
  const box = $('fpl');
  if (!box || fplLoaded) return;
  fplLoaded = true;
  try {
    const res = await fetch(apiUrl('fpl'), { signal: AbortSignal.timeout(15000) });
    const d = await res.json();
    if (!res.ok || d.error || !Array.isArray(d.players) || !d.players.length) throw new Error('fpl');
    const row = (p, i) => `<li><span class="fpl-rank">${i + 1}</span><span class="fpl-name"><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.pos)} · £${p.price.toFixed(1)}m${p.goals ? ` · ⚽ ${p.goals}` : ''}${p.assists ? ` · 🅰️ ${p.assists}` : ''}</small></span><span class="fpl-pts"><b>${p.points}</b><small>${p.week} this week</small></span></li>`;
    const top = d.players.slice(0, 5), rest = d.players.slice(5);
    box.innerHTML = `
      <p class="fpl-head">${d.gameweek ? `Gameweek ${d.gameweek} · ` : ''}Forest's top scorers in <b>Fantasy Premier League</b></p>
      <ol class="fpl-list">${top.map(row).join('')}</ol>
      ${rest.length ? `<details class="fpl-more"><summary>Show all ${d.players.length} Forest players</summary><ol class="fpl-list" start="6">${rest.map((p, i) => row(p, i + 5)).join('')}</ol></details>` : ''}
      ${d.star ? `<p class="fpl-foot">Best in the whole game this week: <b>${escapeHtml(d.star.name)}</b>${d.star.team ? ` (${escapeHtml(d.star.team)})` : ''} with ${d.star.points} points${d.average != null ? `. Average team: ${d.average}` : ''}.</p>` : ''}`;
  } catch (e) {
    fplLoaded = false; // let it try again next time the tab is opened
    box.innerHTML = '<p>Couldn\'t load Fantasy Premier League right now. Try again later!</p>';
  }
}

/* ---- Match centre (API-Football via worker/extras.js) ----------------------
   Only on a Forest matchday, from an hour before kick-off until midnight,
   so the free plan's 100 requests a day are plenty. Refreshes every minute
   while the match is on. */
const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT', 'SUSP'];
let centreTimer = null;
function ukToday() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }); }
function initMatchCentre() {
  const el = $('match-centre');
  if (!el) return;
  const today = ukToday();
  const f = FIXTURES.find((x) => x.date === today);
  if (!f || Date.now() < kickoffOf(f).getTime() - 60 * 60 * 1000) return;
  refreshMatchCentre(f);
}
async function refreshMatchCentre(f) {
  const el = $('match-centre');
  clearTimeout(centreTimer);
  let data = null;
  try {
    const res = await fetch(`${apiUrl('live')}?date=${ukToday()}`, { cache: 'no-cache' });
    data = res.ok ? await res.json() : null;
  } catch (e) { data = null; }
  const m = data && data.match;
  if (!m) { if (data && data.error) console.info('Match centre not available:', data.error, data.detail || ''); return; }
  renderMatchCentre(el, m);
  $('mc-wrap').hidden = false;
  if (LIVE_STATUSES.includes(m.status) || m.status === 'NS') centreTimer = setTimeout(() => refreshMatchCentre(f), 60000);
}
function renderMatchCentre(el, m) {
  const icon = { goal: '⚽', pen: '⚽', own: '⚽', miss: '❌', yellow: '🟨', red: '🟥', sub: '🔁', var: '📺' };
  const label = (e) => ({
    goal: `${e.player}${e.other ? ` <small>(assist ${escapeHtml(e.other)})</small>` : ''}`,
    pen: `${e.player} <small>(penalty)</small>`,
    own: `${e.player} <small>(own goal)</small>`,
    miss: `${e.player} <small>(missed penalty)</small>`,
    yellow: e.player, red: e.player,
    sub: `${e.player} <small>⇄ ${escapeHtml(e.other || '')} (substitution)</small>`,
    var: `VAR: ${escapeHtml(e.detail || '')}`,
  }[e.type]);
  const live = LIVE_STATUSES.includes(m.status);
  const state = live ? `<span class="mc-live">🔴 LIVE ${m.status === 'HT' ? 'Half-time' : `${m.elapsed}'`}</span>` : m.status === 'NS' ? `<span class="mc-soon">Kick-off ${new Date(m.kickoff).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })}</span>` : `<span class="mc-ft">${escapeHtml(m.statusText || 'Full time')}</span>`;
  const us = `<span class="mc-team us">Forest</span>`, them = `<span class="mc-team">${escapeHtml(m.opponent)}</span>`;
  const score = m.forest == null ? 'v' : m.home ? `${m.forest} – ${m.opp}` : `${m.opp} – ${m.forest}`;
  const events = (m.events || []).slice().reverse();
  el.innerHTML = `
    <div class="mc-head">${state}${m.venue ? `<span class="mc-venue">🏟️ ${escapeHtml(m.venue)}</span>` : ''}</div>
    <p class="mc-score">${m.home ? us : them}<b>${score}</b>${m.home ? them : us}</p>
    ${events.length ? `<ol class="mc-events">${events.map((e) => `<li class="${e.team === 'f' ? 'f' : 'o'} ${e.type}"><span class="mc-min">${escapeHtml(e.min)}'</span><span aria-hidden="true">${icon[e.type] || '•'}</span><span>${e.type === 'var' ? label(e) : `${escapeHtml(e.player || '')}${label(e).slice((e.player || '').length)}`}</span></li>`).join('')}</ol>` : `<p class="mc-quiet">${m.status === 'NS' ? 'Line-ups come out about an hour before kick-off.' : 'Nothing yet. Come on Forest! 🌳'}</p>`}
    ${m.lineup ? `<details class="mc-lineup"><summary>Forest line-up (${escapeHtml(m.lineup.formation || '')})</summary>
      <ol>${m.lineup.xi.map((p) => `<li><b>${p.number ?? ''}</b> ${escapeHtml(p.name)}</li>`).join('')}</ol>
      ${m.lineup.subs.length ? `<p class="mc-subs">Subs: ${m.lineup.subs.map((p) => escapeHtml(p.name)).join(', ')}</p>` : ''}</details>` : ''}
    <p class="mc-note">${live ? 'Updates every minute.' : ''}</p>`;
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
      ${weatherOf(f) ? `<p class="match-weather" title="Forecast for kick-off at ${escapeAttr(weatherOf(f).ground)}">${escapeHtml(weatherLine(weatherOf(f)))} <span>at ${escapeHtml(weatherOf(f).ground)}</span></p>` : ''}
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

  if ($('tracker-pts')) $('tracker-pts').textContent = scored ? `· ${total} point${total === 1 ? '' : 's'}` : '';
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
  addGameDetails(G.topGames || []);
  addNewReleases();
  const body = $('scores-body');
  if (body && G.topScores) {
    body.innerHTML = G.topScores.map((r) =>
      `<tr><td><span class="icon-badge sm purple" aria-hidden="true">🏆</span>${escapeHtml(r.game)}</td><td class="mono-num"><span class="score-value">${escapeHtml(r.best)}</span></td><td class="mono-num">${escapeHtml(r.date)}</td></tr>`
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
  const badgeColours = ['red', 'purple', 'gold', 'pink', 'teal'];
  if (loves && A.loves) {
    loves.innerHTML = A.loves.map((x, i) =>
      `<article class="card love-card${x.dogPhoto ? ' dog-card' : ''}">${x.dogPhoto ? `<figure class="dog-photo" id="dog-photo"><span class="love-emoji" aria-hidden="true">${escapeHtml(x.emoji)}</span></figure>` : `<span class="icon-badge ${badgeColours[i % badgeColours.length]} love-emoji" aria-hidden="true">${escapeHtml(x.emoji)}</span>`}<h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.text)}</p>${x.dogPhoto ? '<button type="button" class="link-btn dog-next" id="dog-next">Another one! 🐶</button>' : ''}${x.jukebox ? '<div class="jukebox" id="jukebox"><button type="button" class="jukebox-btn" id="jukebox-btn">▶ Play some AC/DC</button><p class="jukebox-now" id="jukebox-now" aria-live="polite"></p></div>' : ''}</article>`
    ).join('');
    if ($('dog-photo')) initDogPhoto();
    if ($('jukebox')) initJukebox();
  }
  const qf = $('quickfire');
  if (qf && A.quickFire) {
    qf.innerHTML = A.quickFire.map((x) =>
      `<div class="qf-item"><dt>${escapeHtml(x.q)}</dt><dd>${escapeHtml(x.a)}</dd></div>`
    ).join('');
  }
}

/* ---- Video games: details from RAWG (through the Worker) ----------------- */
async function addGameDetails(top) {
  const grid = $('games-grid');
  if (!grid || !top.length) return;
  let data;
  try {
    const res = await fetch(apiUrl('games'));
    data = await res.json();
    if (!res.ok || data.error) return;
  } catch (e) { return; }
  const cards = grid.querySelectorAll('.card');
  const date = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  top.forEach((t, i) => {
    const g = (data.games || []).find((x) => x.title === t.title);
    if (!g || !cards[i]) return;
    const bits = [
      g.released ? `📅 ${date(g.released)}` : (g.tba ? '📅 Coming soon' : ''),
      g.metacritic ? `⭐ Metacritic ${g.metacritic}` : (g.rating ? `⭐ ${g.rating.toFixed(1)}/5` : ''),
      g.platforms.length ? `🎮 ${g.platforms.join(', ')}` : '',
    ].filter(Boolean);
    if (!bits.length) return;
    const p = document.createElement('p');
    p.className = 'game-meta';
    p.textContent = bits.join(' · ');
    cards[i].appendChild(p);
  });
  if (data.soon && data.soon.length) {
    const wrap = document.createElement('div');
    wrap.className = 'coming-soon';
    wrap.innerHTML = `<h3>🔜 Coming soon</h3><ul>${data.soon.map((g) => `<li>${g.image ? `<img src="${escapeAttr(g.image)}" alt="" loading="lazy">` : ''}<span><b>${escapeHtml(g.name)}</b><small>${g.released ? escapeHtml(date(g.released)) : 'Date to be announced'}</small></span></li>`).join('')}</ul><p class="small-print">Game details from RAWG.</p>`;
    grid.after(wrap);
  }
}

/* ---- Video games: "Just released" from RAWG (through the Worker) --------- */
async function addNewReleases() {
  const section = $('new-games-section'), list = $('new-games');
  if (!section || !list) return;
  let data;
  try {
    const res = await fetch(apiUrl('new-games'), { signal: AbortSignal.timeout(12000) });
    data = await res.json();
    if (!res.ok || data.error || !Array.isArray(data.games) || !data.games.length) return;
  } catch (e) { return; }
  const out = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  list.innerHTML = data.games.map((g) => `<li>
    <img src="${escapeAttr(g.image)}" alt="" loading="lazy">
    <div class="ng-body"><b>${escapeHtml(g.name)}</b>
    <small>Out ${escapeHtml(out(g.released))}${g.platforms.length ? ` · 🎮 ${escapeHtml(g.platforms.join(', '))}` : ''}</small>
    <small>Rated ${escapeHtml(g.age)}</small></div>
  </li>`).join('');
  section.hidden = false;
}

/* ---- Rock jukebox: 30-second clips through the Worker (Deezer) ----------
   The ids match SONGS in worker/more.js; AC/DC first, then other classics. */
const JUKEBOX = [
  ['thunderstruck', 'Thunderstruck', 'AC/DC'], ['backinblack', 'Back In Black', 'AC/DC'], ['tnt', 'T.N.T.', 'AC/DC'], ['highway', 'Highway to Hell', 'AC/DC'],
  ['rockyou', 'We Will Rock You', 'Queen'], ['dontstop', "Don't Stop Me Now", 'Queen'], ['tiger', 'Eye of the Tiger', 'Survivor'],
  ['sevennation', 'Seven Nation Army', 'The White Stripes'], ['countdown', 'The Final Countdown', 'Europe'], ['smoke', 'Smoke on the Water', 'Deep Purple'],
];
function initJukebox() {
  const btn = $('jukebox-btn'), now = $('jukebox-now');
  let i = 0, audio = null;
  const stop = () => { if (audio) { audio.pause(); audio = null; } };
  async function play() {
    const [id, title, artist] = JUKEBOX[i % JUKEBOX.length];
    stop();
    btn.textContent = '⏳ Loading…';
    try {
      const t = await (await fetch(`${apiUrl('track')}?id=${id}`)).json();
      if (!t.preview) throw new Error('no clip');
      audio = new Audio(t.preview);
      audio.addEventListener('ended', () => { i++; btn.textContent = '▶ Next song'; now.innerHTML = ''; audio = null; });
      await audio.play();
      btn.textContent = '⏸ Stop';
      now.innerHTML = `${t.cover ? `<img src="${escapeAttr(t.cover)}" alt="" width="36" height="36">` : ''}<span>Now playing: <b>${escapeHtml(title)}</b> · ${escapeHtml(artist)}<br><small>30-second clip from ${escapeHtml(t.source || 'Deezer')}</small></span>`;
    } catch (e) {
      btn.textContent = '▶ Play some AC/DC';
      now.textContent = 'The jukebox isn\'t available right now.';
    }
  }
  btn.addEventListener('click', () => {
    if (audio) { stop(); i++; btn.textContent = '▶ Next song'; now.innerHTML = ''; return; }
    play();
  });
}

/* ---- Golden Retriever of the visit (dog.ceo, free, no key) -------------- */
function initDogPhoto() {
  const fig = $('dog-photo'), btn = $('dog-next');
  async function load() {
    btn.disabled = true;
    try {
      const res = await fetch('https://dog.ceo/api/breed/retriever/golden/images/random');
      const data = await res.json();
      if (data.status !== 'success' || !/^https:\/\/images\.dog\.ceo\//.test(data.message)) throw new Error('no dog');
      const img = new Image();
      img.alt = 'A Golden Retriever';
      img.decoding = 'async';
      img.onload = () => { fig.replaceChildren(img); fig.classList.add('has-photo'); btn.disabled = false; };
      img.onerror = () => { btn.disabled = false; };
      img.src = data.message;
    } catch (e) {
      btn.hidden = true; // offline or blocked: the 🐶 stays
    }
  }
  btn.addEventListener('click', load);
  load();
}

/* ---- Boot ------------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initLastUpdated();
  initBottomTabs();

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

// Shared with other scripts: js/space.js and the Matchday game.
window.apiUrl = apiUrl;
window.loadLive = loadLive;
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
