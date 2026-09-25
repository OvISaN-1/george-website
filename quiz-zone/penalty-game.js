/* ================================================================
   PENALTY SHOOTOUT: THE GEORGE CUP
   George takes Forest's penalties, then goes in goal for theirs.
   Deliberately easy: a big green power zone, keepers who guess
   wrong a lot, opponents who miss more when Forest are behind,
   and a Forest question for a retake after a miss.
   ================================================================ */
(function () {
  "use strict";

  /* ---------------- Settings you might want to tweak ---------------- */
  const SUPABASE_URL = "https://hucnucpfyjltlhmvprso.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Y251Y3BmeWpsdGxobXZwcnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDgzNjEsImV4cCI6MjEwMzU4NDM2MX0.DSjLCkiUWB47wVd4wnW_2RvWFoISbH80JI9ukB1bBdg";
  const GAME_ID = "penalty-shootout";
  const LEADERBOARD_SIZE = 10;

  // One entry per round of the George Cup. Higher numbers = harder.
  //   save:    chance the keeper saves when he guesses the right side
  //   guess:   chance the keeper guesses the right side
  //   oppMiss: chance their penalty-taker misses by himself
  //   period:  milliseconds for the power bar to go end to end
  const ROUNDS = [
    { stage: "Round of 16",   opp: "Everton",        short: "EVERTON",   shirt: "#274488", shorts: "#ffffff", socks: "#ffffff", hair: "#2b1d14", keeperKit: "#f2c200", save: 0.35, guess: 0.33, oppMiss: 0.30, period: 1700 },
    { stage: "Quarter-final", opp: "Aston Villa",    short: "VILLA",     shirt: "#670e36", shorts: "#ffffff", socks: "#95bfe5", hair: "#3a2414", keeperKit: "#ff7a1a", save: 0.40, guess: 0.36, oppMiss: 0.27, period: 1600 },
    { stage: "Semi-final",    opp: "Tottenham",      short: "SPURS",     shirt: "#f4f4f4", shorts: "#132257", socks: "#132257", hair: "#1c1410", keeperKit: "#7ee04a", save: 0.45, guess: 0.39, oppMiss: 0.24, period: 1500 },
    { stage: "Final",         opp: "Man City",       short: "MAN CITY",  shirt: "#6cabdd", shorts: "#ffffff", socks: "#1c2c5b", hair: "#4a3020", keeperKit: "#b44cff", save: 0.50, guess: 0.42, oppMiss: 0.22, period: 1400 },
  ];

  // Easy-ish Forest questions for the "second chance" retake.
  const QUESTIONS = [
    { q: "What colour shirts do Nottingham Forest play in?", a: "Red", o: ["Red", "Blue", "Green", "Yellow"] },
    { q: "What is Forest's stadium called?", a: "The City Ground", o: ["The City Ground", "Old Trafford", "Anfield", "Villa Park"] },
    { q: "Which river runs right next to the City Ground?", a: "The River Trent", o: ["The River Trent", "The River Thames", "The River Mersey", "The River Tyne"] },
    { q: "What is on the Nottingham Forest badge?", a: "A tree", o: ["A tree", "A lion", "A castle", "A fox"] },
    { q: "Which of these is a Forest nickname?", a: "The Tricky Trees", o: ["The Tricky Trees", "The Magpies", "The Foxes", "The Seagulls"] },
    { q: "How many times have Forest won the European Cup?", a: "2", o: ["2", "0", "5", "1"] },
    { q: "Who was the legendary manager who won the European Cup with Forest?", a: "Brian Clough", o: ["Brian Clough", "Alex Ferguson", "Pep Guardiola", "Arsène Wenger"] },
    { q: "In which city do Forest play?", a: "Nottingham", o: ["Nottingham", "Leeds", "Manchester", "Birmingham"] },
    { q: "Which famous outlaw from the old stories comes from Nottingham?", a: "Robin Hood", o: ["Robin Hood", "King Arthur", "Dick Turpin", "Guy Fawkes"] },
    { q: "What shirt number does Morgan Gibbs-White wear?", a: "10", o: ["10", "7", "9", "1"] },
    { q: "Which country is Forest striker Chris Wood from?", a: "New Zealand", o: ["New Zealand", "Australia", "Scotland", "Canada"] },
    { q: "Which country is Forest defender Murillo from?", a: "Brazil", o: ["Brazil", "Spain", "France", "Italy"] },
    { q: "Which country does Neco Williams play for?", a: "Wales", o: ["Wales", "England", "Ireland", "Scotland"] },
    { q: "Who are Forest's biggest rivals?", a: "Derby County", o: ["Derby County", "Real Madrid", "Barcelona", "Celtic"] },
    { q: "When Forest play Derby, the winner gets a trophy named after...", a: "Brian Clough", o: ["Brian Clough", "Robin Hood", "Wayne Rooney", "The King"] },
    { q: "In what year was Nottingham Forest founded?", a: "1865", o: ["1865", "1965", "2005", "1999"] },
    { q: "Forest's two European Cup wins were in 1979 and...?", a: "1980", o: ["1980", "2020", "1966", "1999"] },
    { q: "Which club's ground is just across the river from the City Ground?", a: "Notts County", o: ["Notts County", "Chelsea", "Liverpool", "Everton"] },
    { q: "Which London club got its first red shirts as a present from Forest?", a: "Arsenal", o: ["Arsenal", "Chelsea", "Fulham", "West Ham"] },
    { q: "What colour shorts do Forest usually wear at home?", a: "White", o: ["White", "Black", "Green", "Pink"] },
    { q: "Which Forest legend was nicknamed 'Psycho'?", a: "Stuart Pearce", o: ["Stuart Pearce", "Chris Wood", "Brian Clough", "Robin Hood"] },
    { q: "Forest won the league title in which season?", a: "1977-78", o: ["1977-78", "2023-24", "1999-00", "1955-56"] },
    { q: "How many League Cups have Forest won?", a: "4", o: ["4", "0", "10", "1"] },
    { q: "Which goalkeeper played in both of Forest's European Cup wins?", a: "Peter Shilton", o: ["Peter Shilton", "David Seaman", "Jordan Pickford", "Matz Sels"] },
    { q: "In 2022 Forest won promotion to the Premier League at which stadium?", a: "Wembley", o: ["Wembley", "The Moon", "Anfield", "The O2"] },
    { q: "What do Forest fans sing? 'Come on you...'", a: "Reds", o: ["Reds", "Blues", "Greens", "Cows"] },
    { q: "Forest's red shirts were inspired by which Italian hero's 'Redshirts'?", a: "Garibaldi", o: ["Garibaldi", "Pinocchio", "Mario", "Julius Caesar"] },
    { q: "How many players does a team have on the pitch?", a: "11", o: ["11", "5", "15", "22"] },
    { q: "Where does the ref put the ball for a penalty?", a: "On the penalty spot", o: ["On the penalty spot", "On the halfway line", "In the corner", "In the goal"] },
    { q: "Who is the best penalty taker on this website?", a: "George", o: ["George", "Dad", "The keeper", "A goat"] },
  ];

  /* ---------------- Little helpers ---------------- */
  const $ = (id) => document.getElementById(id);
  const rand = Math.random;
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  function tween(ms, fn, ease) {
    return new Promise((resolve) => {
      const start = performance.now();
      function frame(now) {
        const t = Math.min(1, (now - start) / ms);
        fn((ease || easeOut)(t));
        if (t < 1) requestAnimationFrame(frame); else resolve();
      }
      requestAnimationFrame(frame);
    });
  }
  function escapeHtml(str) { const d = document.createElement("div"); d.textContent = String(str); return d.innerHTML; }

  /* ---------------- Drawing: George and friends ----------------
     George: fair skin, brown eyes, light-brown hair with a straight
     fringe, Forest red with white shorts, name and 10 on his back. */
  const SKIN = "#f3c9a4", SKIN_SHADE = "#e3b08a", HAIR = "#a57d52", HAIR_LIGHT = "#c79d6c", EYES = "#7b4a1f";
  const FOREST_RED = "#d7102b";

  let avatarCount = 0;
  function georgeAvatar(celebrate) {
    const clipId = "scarf-clip-" + (++avatarCount);
    const arms = celebrate ? `
      <path d="M52 196 L22 120" stroke="${FOREST_RED}" stroke-width="22" stroke-linecap="round"/>
      <path d="M148 196 L178 120" stroke="${FOREST_RED}" stroke-width="22" stroke-linecap="round"/>
      <circle cx="20" cy="112" r="12" fill="${SKIN}"/><circle cx="180" cy="112" r="12" fill="${SKIN}"/>` : "";
    const mouth = celebrate
      ? `<path d="M84 124 C90 142 110 142 116 124 Z" fill="#6b1f24"/><path d="M87 125 H113 V130 H87 Z" fill="#fff"/>`
      : `<path d="M88 127 C95 133 106 133 113 127" stroke="#b5534f" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg">
      ${arms}
      <path d="M26 232 C28 188 52 166 100 164 C148 166 172 188 174 232 Z" fill="${FOREST_RED}"/>
      <path d="M84 166 L100 186 L116 166" stroke="#fff" stroke-width="5" fill="none" stroke-linejoin="round"/>
      <g transform="translate(138 198)" fill="#fff">
        <rect x="-2" y="2" width="4" height="10"/>
        <circle cx="0" cy="-2" r="6"/><circle cx="-5" cy="3" r="5"/><circle cx="5" cy="3" r="5"/>
        <path d="M-9 15 Q-4.5 12 0 15 T9 15" stroke="#fff" stroke-width="1.6" fill="none"/>
      </g>
      <rect x="88" y="138" width="24" height="30" fill="${SKIN_SHADE}"/>
      <clipPath id="${clipId}"><path d="M56 170 C80 186 120 186 144 170 L146 186 C122 202 78 202 54 186 Z M62 184 L70 230 L90 230 L82 190 Z"/></clipPath>
      <g clip-path="url(#${clipId})">
        <rect x="40" y="160" width="120" height="80" fill="#f4f1ee"/>
        <g fill="#e1102c">
          <rect x="40" y="160" width="14" height="80"/><rect x="66" y="160" width="14" height="36"/><rect x="92" y="160" width="14" height="80"/>
          <rect x="118" y="160" width="14" height="80"/><rect x="144" y="160" width="14" height="80"/>
          <rect x="60" y="198" width="40" height="10"/><rect x="60" y="218" width="40" height="12"/>
        </g>
      </g>
      <path d="M56 170 C80 186 120 186 144 170 L146 186 C122 202 78 202 54 186 Z M62 184 L70 230 L90 230 L82 190 Z" fill="none" stroke="#8e0a1c" stroke-width="2"/>
      <ellipse cx="58" cy="100" rx="8" ry="12" fill="${SKIN}"/><ellipse cx="142" cy="100" rx="8" ry="12" fill="${SKIN}"/>
      <ellipse cx="100" cy="96" rx="42" ry="50" fill="${SKIN}"/>
      <path d="M56 98 C50 56 72 34 100 34 C130 34 152 56 144 98 C142 88 140 80 137 75 L131 81 L125 73 L118 82 L111 73 L104 82 L97 73 L90 82 L83 73 L76 82 L69 74 C63 80 59 88 56 98 Z" fill="${HAIR}"/>
      <path d="M72 50 C84 44 96 42 110 44 M78 60 C90 54 110 54 124 60 M66 66 C72 62 76 60 80 60" stroke="${HAIR_LIGHT}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M74 89 C79 86 86 86 91 88 M109 88 C114 86 121 86 126 89" stroke="#7a5a3a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="82" cy="101" rx="8.5" ry="5.8" fill="#fff"/><ellipse cx="118" cy="101" rx="8.5" ry="5.8" fill="#fff"/>
      <circle cx="83" cy="101" r="4.3" fill="${EYES}"/><circle cx="117" cy="101" r="4.3" fill="${EYES}"/>
      <circle cx="83" cy="101" r="2" fill="#1b1110"/><circle cx="117" cy="101" r="2" fill="#1b1110"/>
      <circle cx="84.3" cy="99.6" r="1.2" fill="#fff"/><circle cx="118.3" cy="99.6" r="1.2" fill="#fff"/>
      <path d="M100 104 C98 111 96 115 99 117 C102 118 104 117 105 116" stroke="#d99a72" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <circle cx="74" cy="116" r="7" fill="#f29a8a" opacity=".35"/><circle cx="126" cy="116" r="7" fill="#f29a8a" opacity=".35"/>
      ${mouth}
    </svg>`;
  }

  // Seen from behind, feet at (0,0). ~130 units tall.
  function strikerMarkup(o) {
    const leg = (x, id) => `
      <g ${id ? `id="${id}"` : ""}>
        <rect x="${x - 4}" y="-42" width="9" height="14" fill="${SKIN}"/>
        <rect x="${x - 5}" y="-30" width="11" height="25" rx="2" fill="${o.socks}"/>
        <rect x="${x - 5}" y="-30" width="11" height="4" fill="${o.sockTop}"/>
        <rect x="${x - 7}" y="-7" width="15" height="7" rx="3" fill="#15121a"/>
      </g>`;
    return `
      <ellipse cx="2" cy="0" rx="28" ry="6" fill="#000" fill-opacity=".3"/>
      ${leg(-9)}
      ${leg(9, "kick-leg")}
      <path d="M-21 -62 L21 -62 L23 -40 L3 -40 L0 -46 L-3 -40 L-23 -40 Z" fill="${o.shorts}"/>
      <path d="M-24 -104 L-38 -86 L-30 -80 L-22 -90 Z" fill="${o.shirt}"/>
      <path d="M24 -104 L38 -86 L30 -80 L22 -90 Z" fill="${o.shirt}"/>
      <path d="M-35 -83 L-33 -60 M35 -83 L33 -60" stroke="${SKIN}" stroke-width="7" stroke-linecap="round"/>
      <path d="M-22 -60 L-24 -100 C-24 -106 -18 -110 -10 -111 L10 -111 C18 -110 24 -106 24 -100 L22 -60 Z" fill="${o.shirt}"/>
      ${o.name ? `<text x="0" y="-95" text-anchor="middle" font-family="Rajdhani, Arial Narrow, sans-serif" font-weight="700" font-size="8.5" letter-spacing="1" fill="${o.text}">${o.name}</text>` : ""}
      <text x="0" y="-67" text-anchor="middle" font-family="Rajdhani, Arial Narrow, sans-serif" font-weight="700" font-size="25" fill="${o.text}">${o.number}</text>
      <rect x="-5" y="-117" width="10" height="8" fill="${SKIN_SHADE}"/>
      <ellipse cx="-15" cy="-126" rx="3.5" ry="5" fill="${SKIN}"/><ellipse cx="15" cy="-126" rx="3.5" ry="5" fill="${SKIN}"/>
      <circle cx="0" cy="-127" r="15" fill="${SKIN}"/>
      <path d="M-15.5 -123 C-18 -141 -8 -145 0 -145 C9 -145 18 -141 15.5 -123 L12 -119 L9 -122 L6 -118 L3 -121 L0 -117 L-3 -121 L-6 -118 L-9 -122 L-12 -119 Z" fill="${o.hair}"/>
      ${o.hairLight ? `<path d="M-9 -139 C-4 -142 4 -142 9 -139 M-11 -131 C-5 -134 5 -134 11 -131" stroke="${o.hairLight}" stroke-width="1.6" fill="none" stroke-linecap="round"/>` : ""}`;
  }

  // Keeper facing us, feet at (0,0). ~72 units tall.
  function keeperMarkup(kit, isGeorge) {
    const face = isGeorge ? `
      <circle cx="0" cy="-64" r="9.5" fill="${SKIN}"/>
      <path d="M-9.6 -63 C-11 -76 -4 -78 0 -78 C5 -78 11 -76 9.6 -63 L7.5 -67 L5.5 -65 L3.5 -68 L1 -65 L-1.5 -68 L-4 -65 L-6 -68 Z" fill="${HAIR}"/>
      <circle cx="-3.3" cy="-63" r="1.4" fill="${EYES}"/><circle cx="3.3" cy="-63" r="1.4" fill="${EYES}"/>
      <path d="M-3 -58.5 C-1 -57 1 -57 3 -58.5" stroke="#b5534f" stroke-width="1.2" fill="none"/>`
      : `
      <circle cx="0" cy="-64" r="9.5" fill="#d9a67f"/>
      <path d="M-9.6 -65 C-10 -76 10 -76 9.6 -65 C6 -70 -6 -70 -9.6 -65 Z" fill="#231914"/>
      <circle cx="-3.3" cy="-63" r="1.3" fill="#231914"/><circle cx="3.3" cy="-63" r="1.3" fill="#231914"/>`;
    return `
      <ellipse cx="0" cy="0" rx="16" ry="4" fill="#000" fill-opacity=".3"/>
      <g id="keeper-body">
        <rect x="-9" y="-22" width="7" height="22" rx="2" fill="${kit}"/>
        <rect x="2" y="-22" width="7" height="22" rx="2" fill="${kit}"/>
        <rect x="-10" y="-3" width="9" height="4" rx="2" fill="#15121a"/><rect x="1" y="-3" width="9" height="4" rx="2" fill="#15121a"/>
        <rect x="-11" y="-32" width="22" height="12" rx="3" fill="#15121a"/>
        <path d="M-12 -52 L-28 -64" stroke="${kit}" stroke-width="7" stroke-linecap="round"/>
        <path d="M12 -52 L28 -64" stroke="${kit}" stroke-width="7" stroke-linecap="round"/>
        <circle cx="-29" cy="-66" r="5.5" fill="#f4f4f4" stroke="#15121a" stroke-width="1"/>
        <circle cx="29" cy="-66" r="5.5" fill="#f4f4f4" stroke="#15121a" stroke-width="1"/>
        <rect x="-13" y="-56" width="26" height="26" rx="6" fill="${kit}"/>
        ${isGeorge ? `<text x="0" y="-37" text-anchor="middle" font-family="Rajdhani, Arial Narrow, sans-serif" font-weight="700" font-size="11" fill="#fff">1</text>` : ""}
        ${face}
      </g>`;
  }

  /* ---------------- Sound (tiny, made in the browser) ---------------- */
  let soundOn = true;
  try { soundOn = localStorage.getItem("gz_penalty_sound") !== "off"; } catch (e) {}
  let ctx = null;
  function audio() {
    if (!soundOn) return null;
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, when) {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + (when || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(vol || 0.15, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur);
  }
  function noise(dur, vol, freq) {
    const a = audio(); if (!a) return;
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.sin(Math.PI * i / len);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq || 900; f.Q.value = 0.6;
    const g = a.createGain(); g.gain.value = vol || 0.4;
    src.connect(f); f.connect(g); g.connect(a.destination); src.start();
  }
  const sfx = {
    whistle() { tone(2900, 0.12, "sine", 0.08); tone(2900, 0.35, "sine", 0.08, 0.16); },
    kick() { tone(110, 0.12, "sine", 0.35); tone(60, 0.1, "square", 0.05); },
    roar() { noise(1.6, 0.5, 700); tone(523, 0.15, "triangle", 0.06, 0.1); tone(659, 0.15, "triangle", 0.06, 0.22); tone(784, 0.3, "triangle", 0.06, 0.34); },
    aww() { noise(0.9, 0.25, 350); },
    save() { tone(180, 0.12, "square", 0.08); noise(0.8, 0.3, 600); },
    ding() { tone(880, 0.12, "sine", 0.12); tone(1320, 0.2, "sine", 0.12, 0.1); },
    buzz() { tone(140, 0.25, "sawtooth", 0.08); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, "triangle", 0.1, i * 0.14)); noise(2.2, 0.45, 800); },
  };

  /* ---------------- Confetti ---------------- */
  const confettiCanvas = $("confetti");
  function confetti(amount) {
    if (reduced) return;
    const c = confettiCanvas, g = c.getContext("2d");
    const w = c.width = c.clientWidth * devicePixelRatio, h = c.height = c.clientHeight * devicePixelRatio;
    const colours = ["#e1102c", "#ffffff", "#f5b942", "#ff5a6e"];
    const bits = Array.from({ length: amount || 120 }, () => ({
      x: w / 2 + (rand() - 0.5) * w * 0.3, y: h * 0.35,
      vx: (rand() - 0.5) * 14 * devicePixelRatio, vy: (-rand() * 12 - 4) * devicePixelRatio,
      s: (4 + rand() * 5) * devicePixelRatio, r: rand() * 6, vr: (rand() - 0.5) * 0.4, c: pick(colours),
    }));
    const start = performance.now();
    (function frame(now) {
      g.clearRect(0, 0, w, h);
      bits.forEach((b) => {
        b.vy += 0.35 * devicePixelRatio; b.x += b.vx; b.y += b.vy; b.vx *= 0.99; b.r += b.vr;
        g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.fillStyle = b.c; g.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); g.restore();
      });
      if (now - start < 2200) requestAnimationFrame(frame); else g.clearRect(0, 0, w, h);
    })(start);
  }

  function pop(text, cls) {
    const el = $("pop");
    el.className = "ps-pop";
    void el.offsetWidth;
    el.textContent = text;
    el.className = "ps-pop show " + (cls || "");
  }

  /* ---------------- Scene setup ---------------- */
  const svg = $("pitch");
  const stage = $("stage");
  const ballEl = $("ball"), shadowEl = $("ball-shadow"), aimEl = $("aim");
  const keeperEl = $("keeper"), strikerEl = $("striker"), netEl = $("net");
  const instructionEl = $("instruction");

  (function drawCrowd() {
    const g = $("crowd"); let html = "";
    for (let row = 0; row < 7; row++) {
      const y = 56 + row * 11.5;
      for (let x = -116 + (row % 2) * 4; x < 520; x += 8.2) {
        const r = rand();
        const col = r < 0.62 ? "#e1102c" : r < 0.86 ? "#f4efe9" : r < 0.93 ? "#7a0d20" : "#f5b942";
        html += `<circle cx="${x.toFixed(1)}" cy="${(y + (rand() - 0.5) * 3).toFixed(1)}" r="3.1" fill="${col}" class="fan"/>`;
      }
    }
    g.innerHTML = html;
  })();

  function crowdJump() {
    if (reduced) return;
    const fans = $("crowd").querySelectorAll(".fan");
    const offs = Array.from(fans, () => rand() * 4 + 2);
    tween(700, (t) => {
      const k = Math.sin(t * Math.PI * 3) * (1 - t);
      fans.forEach((f, i) => f.setAttribute("transform", `translate(0 ${(-offs[i] * Math.abs(k)).toFixed(2)})`));
    }, (t) => t);
  }

  /* Show more of the stadium on wide screens, so the pitch fills the
     card instead of sitting in a narrow strip. */
  function fitView() {
    const w = stage.clientWidth || 360;
    const h = Math.min(w * 1.1, window.innerHeight * 0.66);
    const vw = Math.max(400, Math.min(640, (440 * w) / h));
    svg.setAttribute("viewBox", `${(200 - vw / 2).toFixed(1)} 0 ${vw.toFixed(1)} 440`);
  }
  window.addEventListener("resize", fitView);

  const GEORGE_KIT = { shirt: FOREST_RED, shorts: "#f4f1ee", socks: FOREST_RED, sockTop: "#ffffff", hair: HAIR, hairLight: HAIR_LIGHT, text: "#ffffff", name: "GEORGE", number: "10" };
  function oppKit(r) {
    const light = r.shirt === "#f4f4f4" || r.shirt === "#6cabdd";
    return { shirt: r.shirt, shorts: r.shorts, socks: r.socks, sockTop: r.socks, hair: r.hair, text: light ? "#132257" : "#ffffff", name: "", number: "9" };
  }

  const BALL_HOME = { x: 200, y: 356 };
  const STRIKER_HOME = { x: 150, y: 432, s: 1 };
  const STRIKER_KICK = { x: 184, y: 394, s: 0.9 };

  function setBall(x, y, s) {
    ballEl.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`);
  }
  function setShadow(x, y, s, o) {
    shadowEl.setAttribute("cx", x.toFixed(1)); shadowEl.setAttribute("cy", y.toFixed(1));
    shadowEl.setAttribute("rx", (9 * s).toFixed(2)); shadowEl.setAttribute("ry", (3 * s).toFixed(2));
    shadowEl.setAttribute("fill-opacity", o == null ? 0.35 : o);
  }
  function setStriker(x, y, s) { strikerEl.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`); }
  function setKeeperPose(dx, dy, rot) {
    const body = $("keeper-body");
    if (body) body.setAttribute("transform", `translate(${dx.toFixed(1)} ${dy.toFixed(1)}) rotate(${rot.toFixed(1)})`);
  }
  function setKickLeg(a) {
    const leg = $("kick-leg");
    if (leg) leg.setAttribute("transform", `rotate(${a.toFixed(1)} 9 -42)`);
  }

  function resetScene(forestShooting) {
    const r = ROUNDS[S.round];
    strikerEl.innerHTML = strikerMarkup(forestShooting ? GEORGE_KIT : oppKit(r));
    keeperEl.innerHTML = keeperMarkup(forestShooting ? r.keeperKit : "#1f9d55", !forestShooting);
    setStriker(STRIKER_HOME.x, STRIKER_HOME.y, STRIKER_HOME.s);
    setBall(BALL_HOME.x, BALL_HOME.y, 1); setShadow(200, 364, 1);
    ballEl.style.opacity = 1;
    setKeeperPose(0, 0, 0);
    netEl.setAttribute("transform", "");
    aimEl.setAttribute("opacity", 0);
    $("stage-desc").textContent = forestShooting
      ? `George, in Forest red with GEORGE 10 on his back, stands over the ball. ${r.opp}'s keeper waits on the line.`
      : `George is in goal in green. ${r.opp}'s penalty taker steps up.`;
  }

  /* ---------------- Game state ---------------- */
  const S = {
    round: 0, forest: [], opp: [], retakeUsed: false, phase: "idle",
    target: { x: 200, y: 205 }, power: 0, powerRaf: null,
    cup: { goals: 0, saves: 0, retakes: 0, topBins: 0, maxSaves: 0, roundsWon: 0, won: false },
    roundStart: null, matchSaves: 0, usedQuestions: [],
  };
  const goals = (arr) => arr.filter(Boolean).length;

  function decided() {
    const f = S.forest.length, o = S.opp.length, fg = goals(S.forest), og = goals(S.opp);
    if (f <= 5 && o <= 5) {
      if (fg + (5 - f) < og) return "opp";
      if (og + (5 - o) < fg) return "forest";
      if (f === 5 && o === 5 && fg !== og) return fg > og ? "forest" : "opp";
      return null;
    }
    if (f === o && fg !== og) return fg > og ? "forest" : "opp";
    return null;
  }
  const suddenDeath = () => S.forest.length >= 5 && S.opp.length >= 5;

  function renderScoreboard() {
    const r = ROUNDS[S.round];
    $("round-label").textContent = `The George Cup · ${r.stage}`;
    $("opp-name").textContent = r.short;
    $("score-forest").textContent = goals(S.forest);
    $("score-opp").textContent = goals(S.opp);
    const n = Math.max(5, S.forest.length, S.opp.length);
    const dots = (arr) => Array.from({ length: n }, (_, i) =>
      `<span class="ps-dot ${i < arr.length ? (arr[i] ? "scored" : "missed") : ""}" aria-hidden="true"></span>`).join("");
    $("dots-forest").innerHTML = dots(S.forest);
    $("dots-opp").innerHTML = dots(S.opp);
  }

  function renderBracket(el) {
    el.innerHTML = ROUNDS.map((r, i) => {
      const cls = i < S.round ? "done" : i === S.round && S.phase !== "idle" ? "now" : "";
      return `<span class="ps-chip ${cls}">${r.stage}: ${r.opp}</span>`;
    }).join("");
  }

  function say(text) { instructionEl.textContent = text; }
  function showControls(which) {
    $("power").hidden = which !== "power";
    $("dive").hidden = which !== "dive";
  }

  /* ---------------- Forest penalty (George shoots) ---------------- */
  function setupForestKick() {
    S.phase = "aim";
    resetScene(true);
    renderScoreboard();
    showControls(null);
    stage.classList.add("aiming");
    const late = S.forest.length >= 4 ? " Big moment!" : "";
    say(S.retakeUsed ? "Retake! Tap in the goal where you want to shoot." : `Your penalty, George.${late} Tap in the goal where you want to shoot.`);
  }

  function svgPoint(evt) {
    const p = svg.createSVGPoint(); p.x = evt.clientX; p.y = evt.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  function clampTarget(x, y) {
    return { x: Math.max(108, Math.min(292, x)), y: Math.max(166, Math.min(242, y)) };
  }
  function showAim() {
    aimEl.setAttribute("transform", `translate(${S.target.x.toFixed(1)} ${S.target.y.toFixed(1)})`);
    aimEl.setAttribute("opacity", 1);
  }

  function chooseTarget(x, y) {
    S.target = clampTarget(x, y);
    showAim();
    startPower();
  }

  function startPower() {
    S.phase = "power";
    stage.classList.remove("aiming");
    showControls("power");
    say("Tap SHOOT when the bar is in the green!");
    $("btn-shoot").focus({ preventScroll: true });
    const period = ROUNDS[S.round].period;
    const start = performance.now();
    const needle = $("needle");
    cancelAnimationFrame(S.powerRaf);
    (function frame(now) {
      if (S.phase !== "power") return;
      const t = ((now - start) % (period * 2)) / period;
      S.power = (t <= 1 ? t : 2 - t) * 100;
      needle.style.left = S.power + "%";
      S.powerRaf = requestAnimationFrame(frame);
    })(start);
  }

  async function shoot() {
    if (S.phase !== "power") return;
    S.phase = "shooting";
    cancelAnimationFrame(S.powerRaf);
    showControls(null);
    const r = ROUNDS[S.round];
    const { x: tx, y: ty } = S.target;
    const p = S.power;
    const zone = tx < 160 ? "L" : tx > 240 ? "R" : "C";
    const topBins = ty < 184 && (tx < 136 || tx > 264);
    const behind = goals(S.forest) < goals(S.opp);
    // When the keeper guesses wrong he usually dives the other way.
    const wrongWays = zone === "C" ? ["L", "R"] : zone === "L" ? ["R", "R", "C"] : ["L", "L", "C"];
    let keeperZone = rand() < r.guess ? zone : pick(wrongWays);
    let outcome;
    if (p >= 88) outcome = "over";
    else if (p < 14) { outcome = "saved"; keeperZone = zone; }
    else if (keeperZone === zone && !topBins && rand() < r.save * (behind ? 0.35 : 1)) outcome = "saved";
    else outcome = "goal";

    say("");
    await runUp();
    sfx.kick();
    await Promise.all([ballFlight(tx, ty, outcome, p), keeperDive(keeperZone, ty, outcome === "saved" ? { x: tx, y: ty } : null)]);

    if (outcome === "goal") {
      S.forest.push(true);
      S.cup.goals++;
      if (topBins) S.cup.topBins++;
      renderScoreboard();
      rippleNet();
      sfx.roar(); crowdJump(); confetti(topBins ? 170 : 110);
      pop(topBins ? "TOP BINS!" : pick(["GOAL!", "GOAL!", "WHAT A PEN!", "GET IN!"]), topBins ? "gold" : "");
      say(topBins ? "Right in the top corner. Unstoppable!" : pick(["Back of the net!", "The City Ground goes wild!", "Cool as you like, George!"]));
      await sleep(1700);
      nextTurn();
    } else {
      sfx.aww();
      pop(outcome === "over" ? "OVER THE BAR!" : "SAVED!", "soft");
      say(outcome === "over" ? "Too much power, it flew over." : (p < 14 ? "Not enough power, the keeper got it." : "The keeper guessed right."));
      await sleep(1400);
      if (!S.retakeUsed) {
        const correct = await askQuestion();
        if (correct) {
          S.retakeUsed = true;
          S.cup.retakes++;
          sfx.whistle();
          pop("RETAKE!", "gold");
          await sleep(1100);
          setupForestKick();
          return;
        }
      }
      S.forest.push(false);
      renderScoreboard();
      nextTurn();
    }
  }

  async function runUp() {
    const from = STRIKER_HOME, to = STRIKER_KICK;
    const dur = reduced ? 250 : 600;
    await tween(dur, (t) => {
      const bob = Math.abs(Math.sin(t * Math.PI * 4)) * 3;
      setStriker(lerp(from.x, to.x, t), lerp(from.y, to.y, t) - bob, lerp(from.s, to.s, t));
      setKickLeg(t > 0.7 ? lerp(0, 38, (t - 0.7) / 0.3) : Math.sin(t * Math.PI * 4) * 12);
    }, (t) => t);
    await tween(reduced ? 60 : 110, (t) => setKickLeg(lerp(38, -30, t)));
  }

  function ballFlight(tx, ty, outcome, power) {
    const x0 = BALL_HOME.x, y0 = BALL_HOME.y;
    let x1 = tx, y1 = ty;
    if (outcome === "over") { y1 = 118; x1 = tx + (tx - 200) * 0.2; }
    const speed = power < 14 ? 900 : lerp(640, 420, Math.min(1, power / 88));
    const cy = Math.min(y0, y1) - (outcome === "over" ? 80 : 30);
    return tween(reduced ? speed * 0.6 : speed, (t) => {
      const it = 1 - t;
      const x = it * it * x0 + 2 * it * t * ((x0 + x1) / 2) + t * t * x1;
      const y = it * it * y0 + 2 * it * t * cy + t * t * y1;
      const s = lerp(1, outcome === "over" ? 0.45 : 0.6, t);
      setBall(x, y, s);
      setShadow(lerp(200, x1, t), lerp(364, 250, t), lerp(1, 0.6, t), lerp(0.35, 0.15, t));
    }, (t) => 1 - Math.pow(1 - t, 1.6)).then(async () => {
      if (outcome === "over") {
        await tween(350, (t) => { setBall(x1 + (x1 - 200) * 0.1 * t, lerp(118, 70, t), lerp(0.45, 0.3, t)); ballEl.style.opacity = 1 - t; });
      } else if (outcome === "saved") {
        const dir = tx < 200 ? -1 : 1;
        await tween(420, (t) => setBall(tx + dir * 60 * t, ty + 70 * t * t - 20 * t, lerp(0.6, 0.75, t)), easeOut);
      } else if (outcome === "post") {
        const px = tx < 200 ? 100 : 300;
        await tween(380, (t) => setBall(lerp(px, px + (tx < 200 ? -70 : 70), t), lerp(ty, 290, t), lerp(0.6, 0.8, t)));
      }
    });
  }

  function keeperDive(zone, ty, catchAt) {
    const high = ty < 195;
    let dx = 0, dy = -14, rot = 0;
    if (zone === "L") { dx = high ? -40 : -46; dy = high ? -26 : -4; rot = high ? -58 : -76; }
    if (zone === "R") { dx = high ? 40 : 46; dy = high ? -26 : -4; rot = high ? 58 : 76; }
    if (zone === "C") { dx = 0; dy = high ? -26 : -8; rot = 0; }
    if (catchAt) { dx = Math.max(-60, Math.min(60, (catchAt.x - 200) * 0.55)); }
    return (async () => {
      await sleep(reduced ? 40 : 120);
      await tween(reduced ? 220 : 380, (t) => setKeeperPose(dx * t, dy * Math.sin(t * Math.PI * 0.5), rot * t), easeOut);
      if (catchAt) sfx.save();
    })();
  }

  function rippleNet() {
    if (reduced) return;
    tween(500, (t) => {
      const k = Math.sin(t * Math.PI * 4) * (1 - t) * 0.04;
      netEl.setAttribute("transform", `translate(200 205) scale(${1 + k} ${1 - k}) translate(-200 -205)`);
    }, (t) => t).then(() => netEl.setAttribute("transform", ""));
  }

  /* ---------------- Their penalty (George in goal) ---------------- */
  function setupOppKick() {
    S.phase = "dive";
    resetScene(false);
    renderScoreboard();
    showControls("dive");
    stage.classList.remove("aiming");
    say(`You're in goal! Which way will ${ROUNDS[S.round].opp} shoot?`);
    const first = $("dive").querySelector("button");
    if (first) first.focus({ preventScroll: true });
  }

  async function dive(choice) {
    if (S.phase !== "dive") return;
    S.phase = "shooting";
    showControls(null);
    const r = ROUNDS[S.round];
    const zone = rand() < 0.2 ? "C" : rand() < 0.5 ? "L" : "R";
    let missP = r.oppMiss;
    if (goals(S.forest) <= goals(S.opp)) missP += 0.25;     // Forest behind or level: they get nervous
    if (suddenDeath()) missP += 0.1;
    const missed = rand() < missP;
    const tx = zone === "L" ? 118 + rand() * 30 : zone === "R" ? 252 + rand() * 30 : 180 + rand() * 40;
    const ty = 176 + rand() * 60;
    let outcome;
    if (missed) outcome = rand() < 0.5 ? "over" : "post";
    else if (choice === zone) outcome = "saved";
    else outcome = "goal";

    say("");
    await runUp();
    sfx.kick();
    const flightTarget = outcome === "post" ? { x: zone === "R" ? 300 : 100, y: ty } : { x: tx, y: ty };
    await Promise.all([
      ballFlight(flightTarget.x, flightTarget.y, outcome, 50),
      keeperDive(choice, ty, outcome === "saved" ? { x: tx, y: ty } : null),
    ]);

    if (outcome === "goal") {
      S.opp.push(true);
      rippleNet();
      sfx.aww();
      pop("They score", "soft");
      say("They scored that one. Shake it off, George!");
    } else {
      S.opp.push(false);
      if (outcome === "saved") {
        S.cup.saves++; S.matchSaves++;
        sfx.roar(); crowdJump(); confetti(90);
        pop(pick(["WHAT A SAVE!", "GEORGE SAVES!", "BRICK WALL!"]), "gold");
        say("Unbelievable save from George!");
      } else {
        sfx.roar(); crowdJump();
        pop(outcome === "over" ? "OVER!" : "OFF THE POST!", "gold");
        say(outcome === "over" ? "They blazed it over! The Trent End loves it." : "It hit the post and stayed out!");
      }
    }
    renderScoreboard();
    await sleep(1600);
    nextTurn();
  }

  /* ---------------- Turn order + round end ---------------- */
  function nextTurn() {
    const winner = decided();
    if (winner) { endRound(winner === "forest"); return; }
    if (S.forest.length > S.opp.length) setupOppKick();
    else { S.retakeUsed = false; setupForestKick(); }
  }

  async function endRound(won) {
    S.phase = "roundover";
    showControls(null);
    const r = ROUNDS[S.round];
    const fg = goals(S.forest), og = goals(S.opp);
    S.cup.maxSaves = Math.max(S.cup.maxSaves, S.matchSaves);
    const actions = $("r-actions");
    if (won) {
      S.cup.roundsWon++;
      sfx.fanfare(); confetti(200); crowdJump();
      pop("FOREST WIN!", "gold");
      await sleep(1300);
      const last = S.round === ROUNDS.length - 1;
      $("avatar-result").innerHTML = georgeAvatar(true);
      $("r-title").textContent = last ? "GEORGE CUP WINNERS!" : "Forest are through!";
      $("r-text").textContent = `Forest beat ${r.opp} ${fg}-${og} on penalties.` + (last ? " The cup is coming home to Nottingham!" : "");
      actions.innerHTML = last
        ? `<button class="btn-primary" id="r-next">Lift the trophy 🏆</button>`
        : `<button class="btn-primary" id="r-next">Next: ${ROUNDS[S.round + 1].stage} v ${ROUNDS[S.round + 1].opp}</button>`;
      $("result").hidden = false;
      $("r-next").focus();
      $("r-next").onclick = () => {
        $("result").hidden = true;
        if (last) { S.cup.won = true; finishCup(); }
        else { S.round++; startRound(); }
      };
    } else {
      sfx.aww();
      $("avatar-result").innerHTML = georgeAvatar(false);
      $("r-title").textContent = "So close!";
      $("r-text").textContent = `${r.opp} won it ${og}-${fg} this time. Forest never give up. Go again?`;
      actions.innerHTML = `<button class="btn-primary" id="r-retry">Replay the ${r.stage}</button>
        <button class="ps-ghost" id="r-finish">Finish the cup run</button>`;
      $("result").hidden = false;
      $("r-retry").focus();
      $("r-retry").onclick = () => {
        $("result").hidden = true;
        Object.assign(S.cup, S.roundStart);
        startRound();
      };
      $("r-finish").onclick = () => { $("result").hidden = true; finishCup(); };
    }
  }

  function startRound() {
    S.forest = []; S.opp = []; S.retakeUsed = false; S.matchSaves = 0;
    S.roundStart = { goals: S.cup.goals, saves: S.cup.saves, retakes: S.cup.retakes, topBins: S.cup.topBins, maxSaves: S.cup.maxSaves, roundsWon: S.cup.roundsWon };
    const r = ROUNDS[S.round];
    renderScoreboard();
    pop(`${r.stage.toUpperCase()}`, "gold");
    sfx.whistle();
    setupForestKick();
    say(`${r.stage} v ${r.opp}. You go first, George. Tap in the goal where you want to shoot.`);
  }

  function startCup() {
    S.round = 0;
    S.cup = { goals: 0, saves: 0, retakes: 0, topBins: 0, maxSaves: 0, roundsWon: 0, won: false };
    $("screen-start").hidden = true;
    $("screen-end").hidden = true;
    $("screen-game").hidden = false;
    fitView();
    S.phase = "starting";
    startRound();
    $("screen-game").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  /* ---------------- Second-chance question ---------------- */
  function nextQuestion() {
    if (S.usedQuestions.length >= QUESTIONS.length) S.usedQuestions = [];
    const free = QUESTIONS.map((_, i) => i).filter((i) => !S.usedQuestions.includes(i));
    const i = pick(free);
    S.usedQuestions.push(i);
    return QUESTIONS[i];
  }

  function askQuestion() {
    return new Promise((resolve) => {
      S.phase = "question";
      const q = nextQuestion();
      $("q-text").textContent = q.q;
      $("q-feedback").textContent = "";
      const box = $("q-options");
      box.innerHTML = "";
      shuffle(q.o).forEach((opt) => {
        const b = document.createElement("button");
        b.type = "button"; b.textContent = opt;
        b.onclick = async () => {
          box.querySelectorAll("button").forEach((x) => { x.disabled = true; if (x.textContent === q.a) x.classList.add("right"); });
          const ok = opt === q.a;
          if (!ok) b.classList.add("wrong");
          $("q-feedback").textContent = ok ? "Correct! The ref says RETAKE!" : `Not this time. It was ${q.a}.`;
          $("q-feedback").style.color = ok ? "var(--good)" : "var(--bad)";
          ok ? sfx.ding() : sfx.buzz();
          await sleep(ok ? 1200 : 1800);
          $("question").hidden = true;
          resolve(ok);
        };
        box.appendChild(b);
      });
      $("question").hidden = false;
      box.querySelector("button").focus({ preventScroll: true });
    });
  }

  /* ---------------- Cup end + leaderboard ---------------- */
  function finishCup() {
    S.phase = "idle";
    const c = S.cup;
    const score = c.goals + c.saves;
    $("screen-game").hidden = true;
    $("screen-end").hidden = false;
    $("avatar-end").innerHTML = georgeAvatar(c.won);
    document.querySelector(".ps-trophy").style.display = c.won ? "" : "none";
    const reached = ROUNDS[Math.min(S.round, ROUNDS.length - 1)].stage;
    $("end-title").textContent = c.won ? "George Cup winners!" : `What a run to the ${reached}!`;
    $("end-text").textContent = c.won
      ? "Forest lift the George Cup, and George is the hero from the spot. The whole of Nottingham is celebrating."
      : "Every great team has a tough day. Have another go and bring the cup home.";
    $("end-stats").innerHTML = [
      ["Score", score], ["Goals", c.goals], ["Saves", c.saves], ["Top bins", c.topBins], ["Retakes won", c.retakes],
    ].map(([k, v]) => `<div class="ps-stat"><b>${v}</b><span>${k}</span></div>`).join("");
    $("name-form").hidden = score === 0;
    $("saved-msg").textContent = "";
    if (c.won) { sfx.fanfare(); setTimeout(() => confetti(220), 200); }
    if (window.GZ && GZ.recordPenalty) {
      const { newBadges } = GZ.recordPenalty({ score, won: c.roundsWon > 0, cupWon: c.won, topBins: c.topBins, maxSaves: c.maxSaves });
      GZ.announceBadges(newBadges);
    }
    renderLeaderboard();
    $("screen-end").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  async function renderLeaderboard() {
    const body = document.querySelector("#leaderboard tbody");
    body.innerHTML = "<tr><td colspan='3'>Loading top scores...</td></tr>";
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?game=eq.${GAME_ID}&select=player_name,score&order=score.desc&limit=${LEADERBOARD_SIZE}`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
      if (!res.ok) throw new Error(res.status);
      const rows = await res.json();
      body.innerHTML = rows.length
        ? "<tr><th>#</th><th>Name</th><th>Score</th></tr>" + rows.map((r, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(r.player_name)}</td><td>${Number(r.score)}</td></tr>`).join("")
        : "<tr><td colspan='3'>No scores yet. Be the first!</td></tr>";
    } catch (e) {
      body.innerHTML = "<tr><td colspan='3'>Couldn't load the top scores right now.</td></tr>";
    }
  }

  $("name-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("player-name").value.trim();
    if (!name) return;
    const score = S.cup.goals + S.cup.saves;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ game: GAME_ID, player_name: name, score }),
      });
      if (!res.ok) throw new Error(res.status);
      $("name-form").hidden = true;
      $("saved-msg").textContent = `Saved! ${score} points for ${name}.`;
      renderLeaderboard();
    } catch (err) {
      $("saved-msg").textContent = "Couldn't save online right now. Try again later.";
    }
  });

  /* ---------------- Input ---------------- */
  svg.addEventListener("pointerdown", (e) => {
    if (S.phase === "aim") {
      const p = svgPoint(e);
      if (p.y < 140 || p.y > 268 || p.x < 80 || p.x > 320) { say("Tap inside the goal, George!"); return; }
      chooseTarget(p.x, p.y);
    } else if (S.phase === "power") {
      shoot();
    } else if (S.phase === "dive") {
      const p = svgPoint(e);
      if (p.y > 140 && p.y < 275) dive(p.x < 165 ? "L" : p.x > 235 ? "R" : "C");
    }
  });
  $("btn-shoot").addEventListener("click", shoot);
  $("dive").addEventListener("click", (e) => {
    const b = e.target.closest("[data-zone]");
    if (b) dive(b.dataset.zone);
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (S.phase === "aim") {
      const step = 12;
      const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[e.key]) {
        e.preventDefault();
        S.target = clampTarget(S.target.x + moves[e.key][0], S.target.y + moves[e.key][1]);
        showAim();
        say("Arrow keys to aim, Enter to lock it in.");
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        chooseTarget(S.target.x, S.target.y);
      }
    } else if (S.phase === "power" && (e.key === " " || e.key === "Enter")) {
      e.preventDefault(); shoot();
    } else if (S.phase === "dive") {
      const map = { ArrowLeft: "L", ArrowUp: "C", ArrowRight: "R" };
      if (map[e.key]) { e.preventDefault(); dive(map[e.key]); }
    }
  });

  $("btn-kickoff").addEventListener("click", () => { audio(); startCup(); });
  $("btn-again").addEventListener("click", () => { audio(); startCup(); });
  function showSound() {
    $("btn-sound").textContent = soundOn ? "🔊 Sound on" : "🔇 Sound off";
    $("btn-sound").setAttribute("aria-pressed", String(soundOn));
  }
  $("btn-sound").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem("gz_penalty_sound", soundOn ? "on" : "off"); } catch (e) {}
    showSound();
  });
  showSound();

  /* ---------------- First paint ---------------- */
  fitView();
  $("avatar-start").innerHTML = georgeAvatar(false);
  renderBracket($("bracket-start"));
  resetScene(true);

  // For testing in the browser console only.
  window.__penalty = { S, ROUNDS, QUESTIONS };
})();
