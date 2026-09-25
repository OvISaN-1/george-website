/* ================================================================
   GEORGE KIT: shared bits for the football mini games
   (Penalty Shootout and Free Kick Masters).
   - util:   small helpers (tween, shuffle, sleep...)
   - art:    George as a cartoon (front avatar, striker from behind,
             keeper) plus generic players for the other team
   - sound:  tiny sound effects made in the browser (no files)
   - voice:  optional spoken commentary (browser speech)
   - confetti
   ================================================================ */
(function (GK) {
  "use strict";

  /* ---------------- util ---------------- */
  const rand = Math.random;
  const util = {
    rand,
    pick: (arr) => arr[Math.floor(rand() * arr.length)],
    shuffle: (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    lerp: (a, b, t) => a + (b - a) * t,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    escapeHtml(str) { const d = document.createElement("div"); d.textContent = String(str); return d.innerHTML; },
    tween(ms, fn, ease) {
      return new Promise((resolve) => {
        const start = performance.now();
        function frame(now) {
          const t = Math.min(1, (now - start) / ms);
          fn((ease || util.easeOut)(t));
          if (t < 1) requestAnimationFrame(frame); else resolve();
        }
        requestAnimationFrame(frame);
      });
    },
  };

  /* ---------------- art ----------------
     George: fair skin, brown eyes, light-brown hair with a straight
     fringe, Forest red with white shorts, GEORGE and 10 on his back. */
  const C = {
    SKIN: "#f3c9a4", SKIN_SHADE: "#e3b08a", HAIR: "#a57d52", HAIR_LIGHT: "#c79d6c", EYES: "#7b4a1f",
    FOREST_RED: "#d7102b",
  };

  // Kits George can wear. Unlocked in Free Kick Masters.
  const KITS = {
    home:   { name: "Home",          shirt: "#d7102b", trim: "#ffffff", text: "#ffffff", shorts: "#f4f1ee", socks: "#d7102b", sockTop: "#ffffff" },
    away:   { name: "Away",          shirt: "#f4f1ee", trim: "#d7102b", text: "#d7102b", shorts: "#15121a", socks: "#f4f1ee", sockTop: "#d7102b" },
    retro:  { name: "1979 European Cup", shirt: "#c8102e", trim: "#ffffff", text: "#ffffff", shorts: "#ffffff", socks: "#c8102e", sockTop: "#ffffff", retro: true },
    legend: { name: "Forest Legend", shirt: "#d4a52c", trim: "#3a0e18", text: "#3a0e18", shorts: "#3a0e18", socks: "#d4a52c", sockTop: "#3a0e18" },
  };

  let avatarCount = 0;
  /* Front-facing George. opts.pose: "idle" | "up" (both arms up) |
     "out" (arms wide, the SIUUU landing) | "point" (points at the badge).
     opts.kit: a key of KITS. opts.happy: big grin. */
  function avatar(opts) {
    const o = Object.assign({ pose: "idle", kit: "home", happy: false }, opts || {});
    const k = KITS[o.kit] || KITS.home;
    const clipId = "scarf-clip-" + (++avatarCount);
    const sleeve = (d) => `<path d="${d}" stroke="${k.shirt}" stroke-width="22" stroke-linecap="round" fill="none"/>`;
    let arms = "";
    if (o.pose === "up") arms = sleeve("M52 196 L22 120") + sleeve("M148 196 L178 120") +
      `<circle cx="20" cy="112" r="12" fill="${C.SKIN}"/><circle cx="180" cy="112" r="12" fill="${C.SKIN}"/>`;
    if (o.pose === "out") arms = sleeve("M52 196 L6 180") + sleeve("M148 196 L194 180") +
      `<circle cx="2" cy="179" r="11" fill="${C.SKIN}"/><circle cx="198" cy="179" r="11" fill="${C.SKIN}"/>`;
    const pointArm = o.pose === "point"
      ? sleeve("M58 206 L108 214") + `<circle cx="118" cy="212" r="10" fill="${C.SKIN}"/><path d="M122 207 L134 200" stroke="${C.SKIN}" stroke-width="6" stroke-linecap="round"/>` : "";
    const grin = o.happy || o.pose !== "idle";
    const mouth = grin
      ? `<path d="M84 124 C90 142 110 142 116 124 Z" fill="#6b1f24"/><path d="M87 125 H113 V130 H87 Z" fill="#fff"/>`
      : `<path d="M88 127 C95 133 106 133 113 127" stroke="#b5534f" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    const collar = k.retro
      ? `<path d="M78 166 L100 178 L122 166 L118 176 L100 186 L82 176 Z" fill="${k.trim}"/>`
      : `<path d="M84 166 L100 186 L116 166" stroke="${k.trim}" stroke-width="5" fill="none" stroke-linejoin="round"/>`;
    return `<svg viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg">
      ${arms}
      <path d="M26 232 C28 188 52 166 100 164 C148 166 172 188 174 232 Z" fill="${k.shirt}"/>
      ${collar}
      <g transform="translate(138 198)" fill="${k.trim}">
        <rect x="-2" y="2" width="4" height="10"/>
        <circle cx="0" cy="-2" r="6"/><circle cx="-5" cy="3" r="5"/><circle cx="5" cy="3" r="5"/>
        <path d="M-9 15 Q-4.5 12 0 15 T9 15" stroke="${k.trim}" stroke-width="1.6" fill="none"/>
      </g>
      <rect x="88" y="138" width="24" height="30" fill="${C.SKIN_SHADE}"/>
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
      ${pointArm}
      <ellipse cx="58" cy="100" rx="8" ry="12" fill="${C.SKIN}"/><ellipse cx="142" cy="100" rx="8" ry="12" fill="${C.SKIN}"/>
      <ellipse cx="100" cy="96" rx="42" ry="50" fill="${C.SKIN}"/>
      <path d="M56 98 C50 56 72 34 100 34 C130 34 152 56 144 98 C142 88 140 80 137 75 L131 81 L125 73 L118 82 L111 73 L104 82 L97 73 L90 82 L83 73 L76 82 L69 74 C63 80 59 88 56 98 Z" fill="${C.HAIR}"/>
      <path d="M72 50 C84 44 96 42 110 44 M78 60 C90 54 110 54 124 60 M66 66 C72 62 76 60 80 60" stroke="${C.HAIR_LIGHT}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M74 89 C79 86 86 86 91 88 M109 88 C114 86 121 86 126 89" stroke="#7a5a3a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="82" cy="101" rx="8.5" ry="5.8" fill="#fff"/><ellipse cx="118" cy="101" rx="8.5" ry="5.8" fill="#fff"/>
      <circle cx="83" cy="101" r="4.3" fill="${C.EYES}"/><circle cx="117" cy="101" r="4.3" fill="${C.EYES}"/>
      <circle cx="83" cy="101" r="2" fill="#1b1110"/><circle cx="117" cy="101" r="2" fill="#1b1110"/>
      <circle cx="84.3" cy="99.6" r="1.2" fill="#fff"/><circle cx="118.3" cy="99.6" r="1.2" fill="#fff"/>
      <path d="M100 104 C98 111 96 115 99 117 C102 118 104 117 105 116" stroke="#d99a72" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <circle cx="74" cy="116" r="7" fill="#f29a8a" opacity=".35"/><circle cx="126" cy="116" r="7" fill="#f29a8a" opacity=".35"/>
      ${mouth}
    </svg>`;
  }

  // Seen from behind, feet at (0,0). ~130 units tall.
  // o: { shirt, shorts, socks, sockTop, hair, hairLight, text, name, number, boots }
  function striker(o) {
    const boots = o.boots || "#15121a";
    const leg = (x, id) => `
      <g ${id ? `id="${id}"` : ""}>
        <rect x="${x - 4}" y="-42" width="9" height="14" fill="${C.SKIN}"/>
        <rect x="${x - 5}" y="-30" width="11" height="25" rx="2" fill="${o.socks}"/>
        <rect x="${x - 5}" y="-30" width="11" height="4" fill="${o.sockTop}"/>
        <rect x="${x - 7}" y="-7" width="15" height="7" rx="3" fill="${boots}"/>
      </g>`;
    return `
      <ellipse cx="2" cy="0" rx="28" ry="6" fill="#000" fill-opacity=".3"/>
      ${leg(-9)}
      ${leg(9, "kick-leg")}
      <path d="M-21 -62 L21 -62 L23 -40 L3 -40 L0 -46 L-3 -40 L-23 -40 Z" fill="${o.shorts}"/>
      <path d="M-24 -104 L-38 -86 L-30 -80 L-22 -90 Z" fill="${o.shirt}"/>
      <path d="M24 -104 L38 -86 L30 -80 L22 -90 Z" fill="${o.shirt}"/>
      <path d="M-35 -83 L-33 -60 M35 -83 L33 -60" stroke="${C.SKIN}" stroke-width="7" stroke-linecap="round"/>
      <path d="M-22 -60 L-24 -100 C-24 -106 -18 -110 -10 -111 L10 -111 C18 -110 24 -106 24 -100 L22 -60 Z" fill="${o.shirt}"/>
      ${o.name ? `<text x="0" y="-95" text-anchor="middle" font-family="Rajdhani, Arial Narrow, sans-serif" font-weight="700" font-size="8.5" letter-spacing="1" fill="${o.text}">${o.name}</text>` : ""}
      <text x="0" y="-67" text-anchor="middle" font-family="Rajdhani, Arial Narrow, sans-serif" font-weight="700" font-size="25" fill="${o.text}">${o.number}</text>
      <rect x="-5" y="-117" width="10" height="8" fill="${C.SKIN_SHADE}"/>
      <ellipse cx="-15" cy="-126" rx="3.5" ry="5" fill="${C.SKIN}"/><ellipse cx="15" cy="-126" rx="3.5" ry="5" fill="${C.SKIN}"/>
      <circle cx="0" cy="-127" r="15" fill="${C.SKIN}"/>
      <path d="M-15.5 -123 C-18 -141 -8 -145 0 -145 C9 -145 18 -141 15.5 -123 L12 -119 L9 -122 L6 -118 L3 -121 L0 -117 L-3 -121 L-6 -118 L-9 -122 L-12 -119 Z" fill="${o.hair}"/>
      ${o.hairLight ? `<path d="M-9 -139 C-4 -142 4 -142 9 -139 M-11 -131 C-5 -134 5 -134 11 -131" stroke="${o.hairLight}" stroke-width="1.6" fill="none" stroke-linecap="round"/>` : ""}`;
  }

  function georgeStriker(kitKey, boots) {
    const k = KITS[kitKey] || KITS.home;
    return striker({ shirt: k.shirt, shorts: k.shorts, socks: k.socks, sockTop: k.sockTop, hair: C.HAIR, hairLight: C.HAIR_LIGHT, text: k.text, name: "GEORGE", number: "10", boots });
  }

  // Keeper facing us, feet at (0,0). ~72 units tall.
  function keeper(kit, isGeorge) {
    const face = isGeorge ? `
      <circle cx="0" cy="-64" r="9.5" fill="${C.SKIN}"/>
      <path d="M-9.6 -63 C-11 -76 -4 -78 0 -78 C5 -78 11 -76 9.6 -63 L7.5 -67 L5.5 -65 L3.5 -68 L1 -65 L-1.5 -68 L-4 -65 L-6 -68 Z" fill="${C.HAIR}"/>
      <circle cx="-3.3" cy="-63" r="1.4" fill="${C.EYES}"/><circle cx="3.3" cy="-63" r="1.4" fill="${C.EYES}"/>
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

  // A wall defender facing us, feet at (0,0). ~52 units tall. Hands in front, of course.
  function defender(shirt, shorts, skin, hair) {
    return `
      <rect x="-6" y="-17" width="5" height="17" rx="2" fill="${shorts === "#ffffff" ? "#e9e6e2" : shorts}"/>
      <rect x="1" y="-17" width="5" height="17" rx="2" fill="${shorts === "#ffffff" ? "#e9e6e2" : shorts}"/>
      <rect x="-8" y="-24" width="16" height="9" rx="2" fill="${shorts}"/>
      <rect x="-9" y="-41" width="18" height="19" rx="4" fill="${shirt}"/>
      <path d="M-6 -30 L0 -26 L6 -30" stroke="${skin}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <circle cx="0" cy="-46.5" r="6.5" fill="${skin}"/>
      <path d="M-6.5 -47 C-7 -55 7 -55 6.5 -47 C4 -50 -4 -50 -6.5 -47 Z" fill="${hair}"/>
      <circle cx="-2.3" cy="-46" r="0.9" fill="#1b1110"/><circle cx="2.3" cy="-46" r="0.9" fill="#1b1110"/>`;
  }

  /* ---------------- sound ---------------- */
  function createSound(storageKey) {
    let on = true;
    try { on = localStorage.getItem(storageKey) !== "off"; } catch (e) {}
    let ctx = null;
    function audio() {
      if (!on) return null;
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
      thud() { tone(90, 0.15, "sine", 0.3); noise(0.3, 0.2, 300); },
      post() { tone(1400, 0.4, "triangle", 0.12); tone(1900, 0.3, "sine", 0.05); },
      ding() { tone(880, 0.12, "sine", 0.12); tone(1320, 0.2, "sine", 0.12, 0.1); },
      buzz() { tone(140, 0.25, "sawtooth", 0.08); },
      tick() { tone(1200, 0.03, "square", 0.03); },
      unlock() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, "sine", 0.1, i * 0.09)); },
      fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, "triangle", 0.1, i * 0.14)); noise(2.2, 0.45, 800); },
    };
    return {
      sfx,
      isOn: () => on,
      set(v) { on = !!v; try { localStorage.setItem(storageKey, on ? "on" : "off"); } catch (e) {} },
      wake: audio,
    };
  }

  /* ---------------- voice commentary ---------------- */
  function createVoice(storageKey) {
    const supported = "speechSynthesis" in window;
    let on = supported;
    try { if (localStorage.getItem(storageKey) === "off") on = false; } catch (e) {}
    let voice = null;
    function chooseVoice() {
      if (!supported) return;
      const vs = speechSynthesis.getVoices();
      voice = vs.find((v) => /en-GB/i.test(v.lang) && /male|daniel|george|arthur/i.test(v.name))
        || vs.find((v) => /en-GB/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null;
    }
    if (supported) { chooseVoice(); speechSynthesis.onvoiceschanged = chooseVoice; }
    return {
      supported,
      isOn: () => on && supported,
      set(v) { on = !!v && supported; try { localStorage.setItem(storageKey, on ? "on" : "off"); } catch (e) {} if (!on && supported) speechSynthesis.cancel(); },
      say(text, excited) {
        if (!on || !supported) return;
        try {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          if (voice) u.voice = voice;
          u.lang = voice ? voice.lang : "en-GB";
          u.rate = excited ? 1.12 : 1.02;
          u.pitch = excited ? 1.15 : 1;
          u.volume = 0.9;
          speechSynthesis.speak(u);
        } catch (e) { /* no voice, no problem */ }
      },
    };
  }

  /* ---------------- confetti ---------------- */
  function confetti(canvas, amount, colours) {
    if (util.reduced || !canvas) return;
    const g = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width = canvas.clientWidth * dpr, h = canvas.height = canvas.clientHeight * dpr;
    const cols = colours || ["#e1102c", "#ffffff", "#f5b942", "#ff5a6e"];
    const bits = Array.from({ length: amount || 120 }, () => ({
      x: w / 2 + (rand() - 0.5) * w * 0.3, y: h * 0.35,
      vx: (rand() - 0.5) * 14 * dpr, vy: (-rand() * 12 - 4) * dpr,
      s: (4 + rand() * 5) * dpr, r: rand() * 6, vr: (rand() - 0.5) * 0.4, c: util.pick(cols),
    }));
    const start = performance.now();
    (function frame(now) {
      g.clearRect(0, 0, w, h);
      bits.forEach((b) => {
        b.vy += 0.35 * dpr; b.x += b.vx; b.y += b.vy; b.vx *= 0.99; b.r += b.vr;
        g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.fillStyle = b.c; g.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); g.restore();
      });
      if (now - start < 2200) requestAnimationFrame(frame); else g.clearRect(0, 0, w, h);
    })(start);
  }

  GK.util = util;
  GK.C = C;
  GK.KITS = KITS;
  GK.avatar = avatar;
  GK.striker = striker;
  GK.georgeStriker = georgeStriker;
  GK.keeper = keeper;
  GK.defender = defender;
  GK.createSound = createSound;
  GK.createVoice = createVoice;
  GK.confetti = confetti;
})(window.GK = window.GK || {});
