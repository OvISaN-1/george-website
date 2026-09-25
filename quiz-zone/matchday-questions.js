/* ================================================================
   MATCHDAY: questions, difficulty levels and the "brain" that
   learns from George's answers.

   Every question has a starting level: 1 = easy, 2 = medium, 3 = hard.
   That's only a first guess. The brain remembers every answer on this
   device and moves each question up or down to match how George
   actually does. Questions he gets wrong come back more often.

   A question's difficulty on the pitch also depends on:
     - how many answer buttons are shown (2 easy, 3 medium, 4 hard)
     - how tricky the wrong answers are
     - the timer (set by the game)

   Adding questions: w = wrong answers, TRICKIEST FIRST. Easy questions
   show the least tricky ones, hard questions show the trickiest.
   ================================================================ */
(function (MQ) {
  "use strict";

  const rand = Math.random;
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const SUBJECTS = {
    maths:     { label: "Times tables", emoji: "✖️" },
    capitals:  { label: "Capital cities", emoji: "🌍" },
    mountains: { label: "Mountains", emoji: "🏔️" },
    football:  { label: "Football", emoji: "⚽" },
    forest:    { label: "Forest", emoji: "🌳" },
  };

  /* ---------------- Football ---------------- */
  const FOOTBALL = [
    // level 1
    { l: 1, q: "How many players does each team have on the pitch?", a: "11", w: ["10", "12", "9"] },
    { l: 1, q: "What colour card gets a player sent off?", a: "Red", w: ["Yellow", "Blue", "Green"] },
    { l: 1, q: "How many minutes is a normal football match?", a: "90", w: ["80", "100", "60"] },
    { l: 1, q: "Which country is Lionel Messi from?", a: "Argentina", w: ["Brazil", "Spain", "Italy"] },
    { l: 1, q: "Which country is Cristiano Ronaldo from?", a: "Portugal", w: ["Spain", "Brazil", "France"] },
    { l: 1, q: "Which player is the only one allowed to handle the ball?", a: "The goalkeeper", w: ["The captain", "The striker", "The defender"] },
    { l: 1, q: "What does VAR stand for?", a: "Video Assistant Referee", w: ["Very Angry Referee", "Video Action Replay", "Visual Area Rule"] },
    { l: 1, q: "Which team plays at Old Trafford?", a: "Manchester United", w: ["Manchester City", "Liverpool", "Arsenal"] },
    { l: 1, q: "Which team plays at Anfield?", a: "Liverpool", w: ["Everton", "Chelsea", "Leeds"] },
    { l: 1, q: "How many points do you get for a win in the Premier League?", a: "3", w: ["2", "1", "4"] },
    { l: 1, q: "Erling Haaland plays for which club?", a: "Manchester City", w: ["Manchester United", "Chelsea", "Arsenal"] },
    // level 2
    { l: 2, q: "How far is the penalty spot from the goal line?", a: "12 yards", w: ["10 yards", "18 yards", "6 yards"] },
    { l: 2, q: "How far must the wall stand from a free kick?", a: "10 yards", w: ["12 yards", "8 yards", "5 yards"] },
    { l: 2, q: "Which country won the 2022 World Cup?", a: "Argentina", w: ["France", "Brazil", "England"] },
    { l: 2, q: "Which club is nicknamed 'The Toffees'?", a: "Everton", w: ["Fulham", "Brentford", "Leeds"] },
    { l: 2, q: "Which club is nicknamed 'The Cherries'?", a: "Bournemouth", w: ["Brentford", "Crystal Palace", "Sunderland"] },
    { l: 2, q: "Which club plays at Selhurst Park?", a: "Crystal Palace", w: ["Fulham", "Brentford", "Tottenham"] },
    { l: 2, q: "Which club plays at Villa Park?", a: "Aston Villa", w: ["Coventry", "Leeds", "Everton"] },
    { l: 2, q: "What is it called when a player scores three goals in one match?", a: "A hat-trick", w: ["A treble", "A triple", "A brace"] },
    { l: 2, q: "Which country hosted the 2022 World Cup?", a: "Qatar", w: ["Russia", "Brazil", "USA"] },
    { l: 2, q: "Which club is nicknamed 'The Black Cats'?", a: "Sunderland", w: ["Hull", "Newcastle", "Fulham"] },
    { l: 2, q: "Which country will co-host the 2026 World Cup with Canada and Mexico?", a: "USA", w: ["Brazil", "England", "Spain"] },
    // level 3
    { l: 3, q: "Which club has won the most English top-flight titles?", a: "Manchester United", w: ["Liverpool", "Arsenal", "Everton"] },
    { l: 3, q: "In which year did England win the World Cup?", a: "1966", w: ["1970", "1962", "1990"] },
    { l: 3, q: "Which club went a whole Premier League season unbeaten in 2003/04?", a: "Arsenal", w: ["Chelsea", "Manchester United", "Liverpool"] },
    { l: 3, q: "Who is the Premier League's all-time top scorer?", a: "Alan Shearer", w: ["Harry Kane", "Wayne Rooney", "Sergio Agüero"] },
    { l: 3, q: "Which club is nicknamed 'The Tractor Boys'?", a: "Ipswich", w: ["Hull", "Coventry", "Norwich"] },
    { l: 3, q: "Which club is nicknamed 'The Sky Blues'?", a: "Coventry", w: ["Manchester City", "Brighton", "Everton"] },
    { l: 3, q: "Which club is nicknamed 'The Tigers'?", a: "Hull", w: ["Leicester", "Sunderland", "Wolves"] },
    { l: 3, q: "How wide is a full-size goal?", a: "8 yards", w: ["7 yards", "10 yards", "6 yards"] },
    { l: 3, q: "Which country has won the most World Cups?", a: "Brazil", w: ["Germany", "Italy", "Argentina"] },
    { l: 3, q: "How many substitutes can a Premier League team use in a match?", a: "5", w: ["3", "4", "6"] },
  ];

  /* ---------------- Forest ----------------
     Levels 1 and 2 come from forest-questions.js (shared with the
     Penalty Shootout and Free Kick games). These are the hard ones. */
  const FOREST_HARD = [
    { l: 3, q: "Who scored the winner for Forest in the 1979 European Cup final?", a: "Trevor Francis", w: ["John Robertson", "Garry Birtles", "Tony Woodcock"] },
    { l: 3, q: "Who scored the winner for Forest in the 1980 European Cup final?", a: "John Robertson", w: ["Trevor Francis", "Garry Birtles", "Martin O'Neill"] },
    { l: 3, q: "Which team did Forest beat in the 1979 European Cup final?", a: "Malmö", w: ["Hamburg", "Liverpool", "Ajax"] },
    { l: 3, q: "Which team did Forest beat in the 1980 European Cup final?", a: "Hamburg", w: ["Malmö", "Bayern Munich", "Real Madrid"] },
    { l: 3, q: "Who was Brian Clough's assistant manager at Forest?", a: "Peter Taylor", w: ["Martin O'Neill", "Frank Clark", "Stuart Pearce"] },
    { l: 3, q: "In which season did Forest win the English league title?", a: "1977/78", w: ["1979/80", "1975/76", "1990/91"] },
    { l: 3, q: "Which Forest legend was nicknamed 'Psycho'?", a: "Stuart Pearce", w: ["Roy Keane", "Des Walker", "Nigel Clough"] },
    { l: 3, q: "In which year was Nottingham Forest founded?", a: "1865", w: ["1878", "1892", "1901"] },
  ];

  /* ---------------- Capitals ----------------
     region is used to find tricky wrong answers (other capitals nearby).
     trick = cities people often guess by mistake. */
  const CAPITALS = [
    ["France", "Paris", 1, "Europe"], ["Spain", "Madrid", 1, "Europe"], ["Italy", "Rome", 1, "Europe"], ["Germany", "Berlin", 1, "Europe"],
    ["the United Kingdom", "London", 1, "Europe"], ["Ireland", "Dublin", 1, "Europe"], ["Japan", "Tokyo", 1, "Asia"], ["Egypt", "Cairo", 1, "Africa"],
    ["Greece", "Athens", 1, "Europe"], ["Portugal", "Lisbon", 1, "Europe"], ["Russia", "Moscow", 1, "Europe"], ["China", "Beijing", 1, "Asia"],
    ["the USA", "Washington, D.C.", 2, "Americas", ["New York", "Los Angeles"]],
    ["Scotland", "Edinburgh", 2, "Europe", ["Glasgow", "Aberdeen"]], ["Wales", "Cardiff", 2, "Europe", ["Swansea"]],
    ["the Netherlands", "Amsterdam", 2, "Europe", ["Rotterdam"]], ["Belgium", "Brussels", 2, "Europe"], ["Norway", "Oslo", 2, "Europe"],
    ["Sweden", "Stockholm", 2, "Europe"], ["Denmark", "Copenhagen", 2, "Europe"], ["Poland", "Warsaw", 2, "Europe", ["Kraków"]],
    ["Austria", "Vienna", 2, "Europe"], ["Argentina", "Buenos Aires", 2, "Americas"], ["Mexico", "Mexico City", 2, "Americas"],
    ["India", "New Delhi", 2, "Asia", ["Mumbai"]], ["Kenya", "Nairobi", 2, "Africa"], ["South Korea", "Seoul", 2, "Asia"],
    ["Hungary", "Budapest", 2, "Europe"], ["Czechia", "Prague", 2, "Europe"], ["Romania", "Bucharest", 2, "Europe"],
    ["Australia", "Canberra", 3, "Oceania", ["Sydney", "Melbourne"]], ["Canada", "Ottawa", 3, "Americas", ["Toronto", "Vancouver"]],
    ["Brazil", "Brasília", 3, "Americas", ["Rio de Janeiro", "São Paulo"]], ["Turkey", "Ankara", 3, "Europe", ["Istanbul"]],
    ["Switzerland", "Bern", 3, "Europe", ["Zurich", "Geneva"]], ["New Zealand", "Wellington", 3, "Oceania", ["Auckland"]],
    ["Nigeria", "Abuja", 3, "Africa", ["Lagos"]], ["Morocco", "Rabat", 3, "Africa", ["Casablanca", "Marrakesh"]],
    ["Pakistan", "Islamabad", 3, "Asia", ["Karachi", "Lahore"]], ["Vietnam", "Hanoi", 3, "Asia", ["Ho Chi Minh City"]],
    ["Iceland", "Reykjavík", 3, "Europe"], ["Croatia", "Zagreb", 3, "Europe", ["Split"]], ["Colombia", "Bogotá", 3, "Americas", ["Medellín"]],
    ["Chile", "Santiago", 3, "Americas"], ["Peru", "Lima", 3, "Americas"], ["Finland", "Helsinki", 3, "Europe"],
  ];

  /* ---------------- Mountains ---------------- */
  const MOUNTAINS = [
    { l: 1, q: "What is the highest mountain in the world?", a: "Mount Everest", w: ["K2", "Mont Blanc", "Ben Nevis"] },
    { l: 1, q: "What is the highest mountain in the UK?", a: "Ben Nevis", w: ["Snowdon", "Scafell Pike", "Mount Everest"] },
    { l: 1, q: "Mount Fuji is in which country?", a: "Japan", w: ["China", "Nepal", "Italy"] },
    { l: 2, q: "What is the highest mountain in England?", a: "Scafell Pike", w: ["Helvellyn", "Ben Nevis", "Snowdon"] },
    { l: 2, q: "What is the highest mountain in Wales?", a: "Yr Wyddfa (Snowdon)", w: ["Pen y Fan", "Scafell Pike", "Ben Nevis"] },
    { l: 2, q: "What is the highest mountain in Africa?", a: "Kilimanjaro", w: ["Mount Kenya", "Atlas", "Table Mountain"] },
    { l: 2, q: "Mont Blanc is on the border of France and which country?", a: "Italy", w: ["Switzerland", "Spain", "Germany"] },
    { l: 2, q: "About how tall is Mount Everest?", a: "8,849 m", w: ["7,500 m", "10,200 m", "5,000 m"] },
    { l: 2, q: "In which country is Ben Nevis?", a: "Scotland", w: ["Wales", "England", "Ireland"] },
    { l: 3, q: "What is the second highest mountain in the world?", a: "K2", w: ["Kangchenjunga", "Lhotse", "Makalu"] },
    { l: 3, q: "What is the highest mountain in South America?", a: "Aconcagua", w: ["Chimborazo", "Huascarán", "Illimani"] },
    { l: 3, q: "What is the highest mountain in North America?", a: "Denali", w: ["Mount Logan", "Mount Whitney", "Mount Rainier"] },
    { l: 3, q: "What is the highest mountain in Europe?", a: "Mount Elbrus", w: ["Mont Blanc", "Matterhorn", "Mount Olympus"] },
    { l: 3, q: "What is the highest mountain in Australia?", a: "Mount Kosciuszko", w: ["Uluru", "Mount Townsend", "Mount Bogong"] },
    { l: 3, q: "What is the highest mountain in Romania?", a: "Moldoveanu", w: ["Negoiu", "Omu", "Parângu Mare"] },
    { l: 3, q: "About how tall is Ben Nevis?", a: "1,345 m", w: ["1,085 m", "978 m", "2,100 m"] },
  ];

  /* ---------------- Build the bank ---------------- */
  const BANK = [];
  let n = 0;
  function add(subject, item) { BANK.push(Object.assign({ id: subject[0] + ":" + (item.id || ++n), subject }, item)); }

  FOOTBALL.forEach((x, i) => add("football", Object.assign({ id: "fb" + i }, x)));
  FOREST_HARD.forEach((x, i) => add("forest", Object.assign({ id: "fh" + i }, x)));
  const FQ = window.FOREST_QUESTIONS || {};
  (FQ.easy || []).forEach((x, i) => add("forest", { id: "fe" + i, l: 1, q: x.q, a: x.a, w: x.o.filter((o) => o !== x.a) }));
  (FQ.medium || []).forEach((x, i) => add("forest", { id: "fm" + i, l: 2, q: x.q, a: x.a, w: x.o.filter((o) => o !== x.a) }));
  CAPITALS.forEach(([country, city, l, region, trick]) => {
    const near = CAPITALS.filter((c) => c[3] === region && c[1] !== city).map((c) => c[1]);
    const far = CAPITALS.filter((c) => c[3] !== region).map((c) => c[1]);
    add("capitals", { id: "cap-" + country, l, q: `What is the capital of ${country}?`, a: city, w: (trick || []).concat(shuffle(near)), far });
  });
  MOUNTAINS.forEach((x, i) => add("mountains", Object.assign({ id: "mt" + i }, x)));

  /* ---------------- Times tables (made up on the spot) ----------------
     Easy: x1, x2, x5, x10.  Medium: x3, x4, x6, x11.  Hard: x7, x8, x9, x12,
     plus "missing number" sums like ? x 8 = 72. */
  const TABLES = { 1: [2, 5, 10], 2: [3, 4, 6, 11], 3: [7, 8, 9, 12] };
  function mathsQuestion(level) {
    const a = pick(TABLES[level]);
    const b = level === 1 ? 1 + Math.floor(rand() * 10) : 2 + Math.floor(rand() * 11);
    const [x, y] = rand() < 0.5 ? [a, b] : [b, a];
    const ans = a * b;
    const id = "m:" + Math.min(a, b) + "x" + Math.max(a, b);
    const missing = level === 3 && rand() < 0.35;
    const q = missing ? `? × ${y} = ${ans}` : `${x} × ${y} = ?`;
    const right = missing ? x : ans;
    let wrong;
    if (missing) {
      wrong = [right + 1, right - 1, right + 2].filter((v) => v > 0 && v !== right);
    } else {
      // Trickiest first: next-door answers from the same tables, then further away.
      wrong = [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, ans + 10, ans - 10, ans + 1]
        .filter((v, i, arr) => v > 0 && v !== ans && arr.indexOf(v) === i);
      if (level === 1) wrong = [ans + 10 + Math.floor(rand() * 10), Math.max(1, ans - 9 - Math.floor(rand() * 8)), ans * 2 + 3].filter((v) => v !== ans);
    }
    return { id, subject: "maths", l: level, q, a: String(right), w: wrong.map(String), maths: true };
  }

  /* ================================================================
     THE BRAIN: remembers how George does on every question.
     Saved on this device only.
     ================================================================ */
  const BRAIN_KEY = "gz_matchday_brain_v1";
  let brain = {};
  try { brain = JSON.parse(localStorage.getItem(BRAIN_KEY)) || {}; } catch (e) { brain = {}; }
  function saveBrain() { try { localStorage.setItem(BRAIN_KEY, JSON.stringify(brain)); } catch (e) {} }

  /* Level the question plays at for George right now.
     Starts at its label. After a few tries:
       gets it right 4 times out of 5 (or better) -> one level easier
       gets it wrong more often than right        -> one level harder */
  function effectiveLevel(q) {
    const s = brain[q.id];
    let lvl = q.l;
    if (s && s.seen >= 3) {
      const acc = s.right / s.seen;
      if (acc >= 0.8) lvl -= 1;
      else if (acc < 0.5) lvl += 1;
    }
    return Math.max(1, Math.min(3, lvl));
  }

  function record(q, correct) {
    const s = brain[q.id] || { seen: 0, right: 0, last: 0, wrongStreak: 0, text: "" };
    s.seen += 1;
    if (correct) { s.right += 1; s.wrongStreak = 0; } else { s.wrongStreak += 1; }
    s.last = Date.now();
    s.text = q.q.length > 60 ? q.q.slice(0, 57) + "..." : q.q;
    s.lastResult = correct ? 1 : 0;
    brain[q.id] = s;
    saveBrain();
  }

  /* How likely a question is to be picked. Ones George got wrong come
     back more often; ones he just saw wait their turn. */
  function weight(q) {
    const s = brain[q.id];
    if (!s) return 1.2;                                    // new: try it
    let w = 1;
    if (s.wrongStreak > 0) w += 2.5;                       // got it wrong last time: practise it
    if (s.seen >= 3 && s.right / s.seen >= 0.9) w *= 0.4;  // nailed on: see it less
    const minutes = (Date.now() - s.last) / 60000;
    if (minutes < 10) w *= 0.15;                           // just seen it
    return w;
  }

  function weightedPick(list) {
    const total = list.reduce((t, q) => t + weight(q), 0);
    let r = rand() * total;
    for (const q of list) { r -= weight(q); if (r <= 0) return q; }
    return list[list.length - 1];
  }

  /* Pick a question for a moment in the match.
     level: 1-3, subjects: array of subject keys, used: Set of ids
     already asked this match. */
  function nextQuestion(level, subjects, used) {
    const subs = subjects && subjects.length ? subjects : Object.keys(SUBJECTS);
    const subject = pick(subs);
    if (subject === "maths") {
      // Try a few so the same sum doesn't come up twice in one match.
      for (let i = 0; i < 12; i++) {
        const mq = mathsQuestion(level);
        if (!used.has(mq.id) || i === 11) {
          // The brain can make a sum harder or easier for George too.
          const eff = effectiveLevel(mq);
          if (eff !== level && i < 8) continue;
          return present(mq, level);
        }
      }
    }
    let pool = BANK.filter((q) => q.subject === subject && !used.has(q.id));
    if (!pool.length) pool = BANK.filter((q) => subs.includes(q.subject) && !used.has(q.id));
    if (!pool.length) pool = BANK.slice();
    // Closest level first: exact match, then one away, then anything.
    for (const gap of [0, 1, 2]) {
      const fit = pool.filter((q) => Math.abs(effectiveLevel(q) - level) === gap);
      if (fit.length) return present(weightedPick(fit), level);
    }
    return present(pick(pool), level);
  }

  /* Turn a bank question into what goes on screen for a given level:
     level 1 -> 2 buttons (least tricky wrong answer)
     level 2 -> 3 buttons
     level 3 -> 4 buttons (trickiest wrong answers) */
  function present(q, level) {
    const count = level === 1 ? 1 : level === 2 ? 2 : 3;
    let wrong;
    if (level === 3) wrong = q.w.slice(0, count);
    else if (level === 2) wrong = shuffle(q.w.slice(0, 4)).slice(0, count);
    else wrong = q.far ? [pick(q.far)] : [q.w[q.w.length - 1]];
    wrong = wrong.filter((x) => x !== q.a);
    while (wrong.length < count && q.far) { const f = pick(q.far); if (f !== q.a && !wrong.includes(f)) wrong.push(f); }
    return { id: q.id, subject: q.subject, level, q: q.q, a: q.a, options: shuffle([q.a].concat(wrong)), src: q };
  }

  /* For the end-of-match "what I've learned" box. */
  function report() {
    const entries = Object.entries(brain);
    const mastered = entries.filter(([, s]) => s.seen >= 3 && s.right / s.seen >= 0.8).length;
    const practising = entries.filter(([, s]) => s.wrongStreak > 0).sort((a, b) => b[1].last - a[1].last).slice(0, 4).map(([, s]) => s.text);
    const total = entries.length;
    return { mastered, practising, total };
  }

  MQ.SUBJECTS = SUBJECTS;
  MQ.nextQuestion = nextQuestion;
  MQ.record = record;
  MQ.report = report;
  MQ.effectiveLevel = effectiveLevel;
  MQ._bank = BANK;
})(window.MQ = window.MQ || {});
