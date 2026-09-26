/* ===========================================================
   SATs PRACTICE PAGE
   -----------------------------------------------------------
   Topics from js/sats-maths.js and js/sats-english.js.
   George picks a topic, answers a round of questions and sees
   how to work out anything he gets wrong. Best scores save on
   this device (gz_sats_v1), and "Move my progress" carries them
   over, like the games.
   =========================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Questions may use <u>underline</u> to point at a word; everything else is escaped.
  const qHtml = (s) => esc(s).replace(/&lt;u&gt;/g, '<u>').replace(/&lt;\/u&gt;/g, '</u>');
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const M = window.SATS_MATHS, E = window.SATS_ENGLISH;
  const SUBJECTS = {
    maths: { name: 'Maths', topics: M.topics.map((t) => Object.assign({ sub: t.paper === 'Both papers' ? 'Arithmetic & reasoning papers' : `${t.paper} paper${t.paper === 'Reasoning' ? 's' : ''}` }, t)), round: 10, mixed: 20 },
    gps: { name: 'Grammar, punctuation & spelling', topics: E.gps.map((t) => Object.assign({ sub: `${t.count} questions` }, t)), round: 10, mixed: 20 },
    reading: { name: 'Reading', topics: E.reading.map((t) => Object.assign({ sub: `A short text, ${t.count} questions` }, t)), round: 5 },
  };
  const topicName = (id) => { for (const s of Object.values(SUBJECTS)) { const t = s.topics.find((x) => x.id === id); if (t) return t; } return { name: id, emoji: '' }; };

  /* ---------------- Saved progress ---------------- */
  const KEY = 'gz_sats_v1';
  let SAVE = { topics: {} };
  try { SAVE = Object.assign(SAVE, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) {} };
  function record(topicId, right, total) {
    const t = SAVE.topics[topicId] || (SAVE.topics[topicId] = { best: 0, bestOf: total, plays: 0, right: 0, total: 0 });
    t.plays += 1; t.right += right; t.total += total; t.last = Date.now();
    if (right / total >= t.best / (t.bestOf || total)) { t.best = right; t.bestOf = total; }
    persist();
  }
  function stars(t) {
    if (!t) return 0;
    const p = t.best / t.bestOf;
    return p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.4 ? 1 : 0;
  }

  /* ---------------- Home: tabs and topic cards ---------------- */
  let subject = 'maths';
  function renderSummary() {
    const all = Object.values(SAVE.topics);
    const topicsTried = Object.keys(SAVE.topics).filter((id) => !id.startsWith('mixed-'));
    const answered = all.reduce((n, t) => n + t.total, 0), right = all.reduce((n, t) => n + t.right, 0);
    const topicCount = Object.values(SUBJECTS).reduce((n, s) => n + s.topics.length, 0);
    const starCount = topicsTried.reduce((n, id) => n + stars(SAVE.topics[id]), 0);
    $('sats-summary').innerHTML = `
      <div><b>${topicsTried.length}</b><span>of ${topicCount} topics tried</span></div>
      <div><b>${answered}</b><span>questions answered</span></div>
      <div><b>${answered ? Math.round((right / answered) * 100) + '%' : '–'}</b><span>right overall</span></div>
      <div><b>${starCount} ⭐</b><span>of ${topicCount * 3} stars</span></div>`;
  }
  function renderHome() {
    document.querySelectorAll('.sats-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.subject === subject)));
    const S = SUBJECTS[subject];
    const card = (t) => {
      const s = SAVE.topics[t.id], st = stars(s);
      return `<button type="button" class="sats-topic" data-topic="${t.id}">
        <span class="sats-emoji" aria-hidden="true">${t.emoji}</span>
        <span class="sats-name">${esc(t.name)}</span>
        <span class="sats-sub">${esc(t.sub)}</span>
        <span class="sats-best">${s ? `Best ${s.best}/${s.bestOf} · <span aria-label="${st} of 3 stars">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>` : 'Not tried yet'}</span>
      </button>`;
    };
    $('sats-home').innerHTML = `
      ${S.mixed ? `<div class="sats-mixed">
        <div><h2>Mixed test</h2><p>${S.mixed} questions from every topic, like the real paper.</p></div>
        <button type="button" class="btn btn-primary" data-mixed="${subject}">Start the mixed test</button>
      </div>` : `<p class="sats-intro">Read the text carefully, then answer the questions. You can look back at the text as many times as you like, just like in the real test.</p>`}
      <h2 class="sats-h2">Practise one topic</h2>
      <div class="sats-grid">${S.topics.map(card).join('')}</div>`;
    $('sats-home').querySelectorAll('.sats-topic').forEach((b) => b.addEventListener('click', () => start(b.dataset.topic)));
    const mixed = $('sats-home').querySelector('[data-mixed]');
    if (mixed) mixed.addEventListener('click', () => start(`mixed-${subject}`));
    renderSummary();
  }

  /* ---------------- A round of questions ---------------- */
  let Q = null;
  function makeRound(topicId) {
    if (topicId === 'mixed-maths') return Array.from({ length: SUBJECTS.maths.mixed }, (_, i) => M.question(SUBJECTS.maths.topics[i % SUBJECTS.maths.topics.length].id)).sort(() => Math.random() - 0.5);
    if (topicId === 'mixed-gps') return shuffle(SUBJECTS.gps.topics.flatMap((t) => E.questions(t.id).slice(0, 4))).slice(0, SUBJECTS.gps.mixed);
    if (SUBJECTS.maths.topics.some((t) => t.id === topicId)) {
      // No repeated questions in one round.
      const out = [], seen = new Set();
      for (let tries = 0; out.length < SUBJECTS.maths.round && tries < 200; tries++) { const q = M.question(topicId); if (!seen.has(q.q)) { seen.add(q.q); out.push(q); } }
      return out;
    }
    const qs = E.questions(topicId);
    return SUBJECTS.reading.topics.some((t) => t.id === topicId) ? qs : qs.slice(0, SUBJECTS.gps.round);
  }
  function start(topicId) {
    Q = { topicId, qs: makeRound(topicId), i: 0, right: 0, wrong: [] };
    $('sats-home').hidden = true;
    $('sats-quiz').hidden = false;
    document.querySelector('.sats-tabs').hidden = true;
    ask();
    $('sats-quiz').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function title() {
    if (Q.topicId.startsWith('mixed-')) return { emoji: '🎓', name: `${SUBJECTS[Q.topicId.slice(6)].name}: mixed test` };
    return topicName(Q.topicId);
  }
  function ask() {
    const q = Q.qs[Q.i], t = title(), n = Q.qs.length;
    $('sats-quiz').innerHTML = `
      <div class="sats-q-head">
        <button type="button" class="sats-back" id="sats-quit">← Topics</button>
        <span class="sats-q-topic">${t.emoji} ${esc(t.name)}</span>
        <span class="sats-q-count">Question ${Q.i + 1} of ${n} · ${Q.right} right</span>
      </div>
      <div class="sats-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${Q.i}"><span style="width:${(Q.i / n) * 100}%"></span></div>
      ${q.passage ? `<details class="sats-passage" ${Q.i === 0 ? 'open' : ''}><summary>📖 ${esc(q.passage.title)} <small>(tap to ${Q.i === 0 ? 'hide' : 'read again'})</small></summary><p>${esc(q.passage.text)}</p></details>` : ''}
      <div class="sats-card">
        <p class="sats-question">${qHtml(q.q)}</p>
        ${q.type === 'input' ? `
          <form class="sats-answer" id="sats-form" autocomplete="off">
            <label class="visually-hidden" for="sats-input">Your answer</label>
            ${q.unit === '£' ? '<span class="sats-unit">£</span>' : ''}
            <input id="sats-input" inputmode="decimal" autocomplete="off" placeholder="Your answer">
            ${q.unit && q.unit !== '£' ? `<span class="sats-unit">${esc(q.unit)}</span>` : ''}
            <button type="submit" class="btn btn-primary">Check</button>
          </form>` : `
          <div class="sats-options" role="group" aria-label="Answers">
            ${q.options.map((o, k) => `<button type="button" class="sats-opt" data-k="${k}"><kbd>${'ABCD'[k]}</kbd> ${esc(o)}</button>`).join('')}
          </div>`}
        <div class="sats-feedback" id="sats-feedback" role="status" aria-live="polite"></div>
      </div>`;
    $('sats-quit').addEventListener('click', home);
    if (q.type === 'input') {
      $('sats-form').addEventListener('submit', (e) => { e.preventDefault(); const v = $('sats-input').value.trim(); if (v) check(v); });
      $('sats-input').focus({ preventScroll: true });
    } else {
      $('sats-quiz').querySelectorAll('.sats-opt').forEach((b) => b.addEventListener('click', () => check(q.options[+b.dataset.k], b)));
    }
  }

  // Typed answers: ignore spaces, commas, £, %, ° and units, and accept 7.50 for 7.5.
  function sameNumber(typed, answer) {
    const clean = typed.replace(/[−–]/g, '-').replace(/[£%°,\s]/g, '').replace(/[a-zA-Z²³]+$/, '');
    if (!/^-?\d*\.?\d+$/.test(clean)) return false;
    return Math.abs(parseFloat(clean) - parseFloat(answer)) < 1e-9;
  }
  function check(given, btn) {
    const q = Q.qs[Q.i];
    if (Q.answered) return;
    Q.answered = true;
    const ok = q.type === 'input' ? sameNumber(given, q.a) : given === q.a;
    if (ok) Q.right += 1; else Q.wrong.push({ q, given });
    if (q.type === 'input') { $('sats-input').disabled = true; $('sats-form').querySelector('button').disabled = true; }
    else {
      $('sats-quiz').querySelectorAll('.sats-opt').forEach((b) => {
        b.disabled = true;
        if (q.options[+b.dataset.k] === q.a) b.classList.add('right');
      });
      if (!ok && btn) btn.classList.add('wrong');
    }
    const shown = q.type === 'input' ? `${q.unit === '£' ? '£' : ''}${M.num(+q.a)}${q.unit && q.unit !== '£' ? ' ' + q.unit : ''}` : q.a;
    const last = Q.i === Q.qs.length - 1;
    $('sats-feedback').innerHTML = `
      <p class="sats-verdict ${ok ? 'ok' : 'no'}">${ok ? `✅ ${['Correct!', 'Spot on!', 'Nailed it!', 'Brilliant!', 'Top bins! ⚽'][Math.floor(Math.random() * 5)]}` : `❌ Not quite. The answer is <b>${esc(shown)}</b>.`}</p>
      <p class="sats-explain"><b>How to work it out:</b> ${qHtml(q.explain)}</p>
      ${wordTools(q)}
      ${ok ? '' : coachButton()}
      <button type="button" class="btn btn-primary" id="sats-next">${last ? 'See my score' : 'Next question →'}</button>`;
    $('sats-next').addEventListener('click', next);
    if ($('coach-btn')) $('coach-btn').addEventListener('click', () => askCoach(q, given, shown));
    if ($('word-say')) wireWordTools(q);
    $('sats-next').focus({ preventScroll: true });
    $('sats-feedback').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  /* ---------------- Hear it + what it means (spelling and word meanings) ----
     🔊 uses the device's own British voice; 📖 looks the word up in the free
     Dictionary API (dictionaryapi.dev). Only for real words, not prefixes. */
  const WORD_TOPICS = ['spelling', 'words'];
  function theWord(q) {
    if (!WORD_TOPICS.includes(q.topic)) return null;
    const w = String(q.a).trim();
    return /^[a-z]{3,}$/i.test(w) ? w.toLowerCase() : null;
  }
  function wordTools(q) {
    const w = theWord(q);
    if (!w) return '';
    return `<div class="word-tools">
      <button type="button" class="btn btn-ghost word-btn" id="word-say">🔊 Hear "${esc(w)}"</button>
      <button type="button" class="btn btn-ghost word-btn" id="word-mean">📖 What does it mean?</button>
      <div class="word-def" id="word-def" aria-live="polite"></div>
    </div>`;
  }
  function wireWordTools(q) {
    const w = theWord(q);
    $('word-say').addEventListener('click', () => {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(w);
      const gb = speechSynthesis.getVoices().find((v) => /en-GB/i.test(v.lang));
      if (gb) u.voice = gb;
      u.lang = 'en-GB'; u.rate = 0.85;
      speechSynthesis.speak(u);
    });
    $('word-mean').addEventListener('click', async () => {
      const box = $('word-def');
      box.textContent = 'Looking it up…';
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
        const data = await res.json();
        const m = Array.isArray(data) && data[0] && data[0].meanings && data[0].meanings[0];
        const d = m && m.definitions && m.definitions[0];
        if (!d) throw new Error('none');
        const def = d.definition.length > 180 ? d.definition.slice(0, 177) + '…' : d.definition;
        box.innerHTML = `<b>${esc(w)}</b> <i>(${esc(m.partOfSpeech || 'word')})</i>: ${esc(def)}${d.example ? `<br><small>For example: "${esc(d.example)}"</small>` : ''}`;
      } catch (e) {
        box.textContent = 'Couldn\'t find a meaning right now.';
      }
    });
  }

  /* ---------------- Ask the Coach (AI help after a wrong answer) ----------------
     Sends only this question to worker/coach.js: never a name or anything
     personal, and there's no text box, so it can't be used for chatting.
     20 a day on this device. */
  const COACH_PER_DAY = 20;
  function coachLeft() {
    const today = new Date().toISOString().slice(0, 10);
    if (!SAVE.coach || SAVE.coach.day !== today) SAVE.coach = { day: today, used: 0 };
    return Math.max(0, COACH_PER_DAY - SAVE.coach.used);
  }
  function coachButton() {
    const left = coachLeft();
    return `<div class="coach" id="coach">
      <button type="button" class="btn btn-ghost coach-btn" id="coach-btn" ${left ? '' : 'disabled'}>🤖 Still stuck? Ask the Coach</button>
      <span class="coach-left">${left ? `${left} left today` : 'The Coach has helped lots today. Back tomorrow!'}</span>
    </div>`;
  }
  async function askCoach(q, given, shown) {
    const box = $('coach');
    if (!box || !coachLeft()) return;
    box.innerHTML = '<p class="coach-thinking">🤖 The Coach is thinking…</p>';
    // Underlined words can't be sent as underlining, so they go in [square brackets].
    const plain = (s) => (/<u>/.test(s) ? String(s).replace(/<u>(.*?)<\/u>/g, '[$1]') + ' (The underlined word is shown in [square brackets].)' : String(s));
    let text = '', problem = '';
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          topic: title().name,
          question: plain(q.q),
          passage: q.passage ? q.passage.text : '',
          choices: q.type === 'choice' ? q.options : [],
          answer: shown,
          given,
          explain: q.explain,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.text) text = data.text;
      else problem = data.error === 'daily-limit' ? 'The Coach has helped lots of people today. Try again tomorrow!' : data.error === 'slow-down' ? 'Whoa, lots of questions! Wait a minute and try again.' : 'The Coach isn\'t available right now. The explanation above shows how to do it.';
    } catch (e) {
      problem = 'The Coach isn\'t available right now (are you online?).';
    }
    if (text) { SAVE.coach.used += 1; persist(); }
    box.innerHTML = text
      ? `<div class="coach-answer"><p class="coach-title">🤖 Coach says:</p>${esc(text).split(/\n+/).map((l) => `<p>${l}</p>`).join('')}<p class="coach-note">The Coach is an AI helper and can sometimes get things wrong. If it doesn't make sense, ask a grown-up. ${coachLeft()} left today.</p></div>`
      : `<p class="coach-note">${esc(problem)}</p>`;
  }

  function next() {
    Q.answered = false;
    Q.i += 1;
    if (Q.i < Q.qs.length) return ask();
    finish();
  }
  function finish() {
    const n = Q.qs.length, p = Q.right / n;
    record(Q.topicId, Q.right, n);
    const msg = p === 1 ? '🏆 Perfect score! World class.' : p >= 0.8 ? '🔥 Brilliant! Nearly perfect.' : p >= 0.6 ? '👍 Good work. Look at the ones you missed below.' : p >= 0.4 ? '💪 Getting there. Read how to work out the ones you missed, then try again.' : '📚 This one needs practice. Read the explanations below, then have another go.';
    $('sats-quiz').innerHTML = `
      <div class="sats-card sats-end">
        <p class="sats-q-topic">${title().emoji} ${esc(title().name)}</p>
        <p class="sats-score"><b>${Q.right}</b> / ${n}</p>
        <p>${msg}</p>
        <div class="sats-end-actions">
          <button type="button" class="btn btn-primary" id="sats-again">Try again</button>
          <button type="button" class="btn btn-ghost" id="sats-home-btn">Pick another topic</button>
          ${navigator.share || navigator.clipboard ? '<button type="button" class="btn btn-ghost" id="sats-share">📤 Share</button>' : ''}
        </div>
      </div>
      ${Q.wrong.length ? `<h2 class="sats-h2">The ones to learn</h2>
      <ol class="sats-review">${Q.wrong.map(({ q, given }) => `<li>
        <p class="sats-question">${qHtml(q.q)}</p>
        <p class="sats-yours">You said: ${esc(given)}</p>
        <p class="sats-verdict ok">Answer: <b>${esc(q.type === 'input' ? `${q.unit === '£' ? '£' : ''}${M.num(+q.a)}${q.unit && q.unit !== '£' ? ' ' + q.unit : ''}` : q.a)}</b></p>
        <p class="sats-explain">${qHtml(q.explain)}</p>
      </li>`).join('')}</ol>` : ''}`;
    $('sats-again').addEventListener('click', () => start(Q.topicId));
    $('sats-home-btn').addEventListener('click', home);
    if ($('sats-share')) $('sats-share').addEventListener('click', async () => {
      const how = await window.GZShare(`📝 I scored ${Q.right}/${n} in SATs practice: ${title().name}!`);
      if (how === 'copied') $('sats-share').textContent = '✓ Copied';
    });
    $('sats-quiz').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function home() {
    Q = null;
    $('sats-quiz').hidden = true;
    $('sats-home').hidden = false;
    document.querySelector('.sats-tabs').hidden = false;
    renderHome();
  }

  // Keyboard: A-D (or 1-4) picks an answer, Enter goes to the next question.
  document.addEventListener('keydown', (e) => {
    if (!Q || e.target.tagName === 'INPUT') return;
    const k = 'abcd1234'.indexOf(e.key.toLowerCase());
    if (!Q.answered && k >= 0) { const b = $('sats-quiz').querySelector(`.sats-opt[data-k="${k % 4}"]`); if (b) { e.preventDefault(); b.click(); } }
  });

  document.querySelectorAll('.sats-tab').forEach((b) => b.addEventListener('click', () => {
    subject = b.dataset.subject;
    history.replaceState(null, '', `#${subject}`);
    renderHome();
  }));
  const fromHash = location.hash.slice(1);
  if (SUBJECTS[fromHash]) subject = fromHash;
  renderHome();
})();
