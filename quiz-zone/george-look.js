/* ================================================================
   GEORGE'S LOOK
   One place for how George looks and celebrates, shared by every game
   (Free Kick Masters, Penalty Shootout, Matchday) and by the
   "My Player" page.

   - His hair (8 styles, 11 colours), shirt number, kit, boots and
     favourite celebration are saved in one small save, gz_look_v1,
     so they follow him between games (and, if he is logged in, between
     devices).
   - Hair and number are free. Kits, boots and celebrations still have to
     be unlocked, by levelling up in Matchday OR in Free Kick Masters
     (whichever gets there first), or by the special feats listed.
   - A game that has no choice saved here just uses its own, as before.

   GL.get()            the current look
   GL.set({...})       change it (kit/boots/cele are ids)
   GL.unlocked(t, id)  is a kit / boots / cele unlocked in either game?
   GL.pick(t, id)      the saved choice if it is unlocked, else id
   GL.hairFront() ...  drawing for george-kit.js
   GL.celebrate(el)    play his celebration on top of a game screen
   ================================================================ */
(function (GL) {
  "use strict";
  const KEY = "gz_look_v1";
  const DEFAULT = { hair: "fringe", hairColour: "brown", number: 10, kit: null, boots: null, cele: null };

  /* ---------------- hair colours ---------------- */
  const HAIR_COLOURS = [
    { id: "brown", name: "Brown", base: "#a57d52", light: "#c79d6c" },       // George's real hair
    { id: "dark", name: "Dark brown", base: "#3b2616", light: "#5a3b22" },
    { id: "black", name: "Black", base: "#17141a", light: "#3a3540" },
    { id: "blonde", name: "Blonde", base: "#e0be6a", light: "#f2d98e" },
    { id: "ginger", name: "Ginger", base: "#c4571f", light: "#e07a3f" },
    { id: "silver", name: "Silver", base: "#d9d9e0", light: "#f4f4fa" },
    { id: "red", name: "Forest red", base: "#d7102b", light: "#ff4d62" },
    { id: "blue", name: "Blue", base: "#2f6fe0", light: "#6aa0ff" },
    { id: "green", name: "Green", base: "#2fbf6d", light: "#7ae6a6" },
    { id: "pink", name: "Pink", base: "#ef6fb0", light: "#ff9ad1" },
    { id: "purple", name: "Purple", base: "#8b4fe0", light: "#b98bff" },
  ];
  const colourOf = (id) => HAIR_COLOURS.find((c) => c.id === id) || HAIR_COLOURS[0];

  /* ---------------- hair styles ----------------
     front(c): the head seen from the front, in the 200x230 picture of GK.avatar
               (face is an ellipse at 100,96, 42 wide, 50 tall). { behind, over }
     back(c):  the head seen from behind, for the striker (head circle at 0,-127, r15).
     c = { base, light } colours. */
  const HAIRS = [
    { id: "fringe", name: "Fringe", emoji: "🙂" },
    { id: "crop", name: "Short crop", emoji: "💈" },
    { id: "spiky", name: "Spiky", emoji: "⚡" },
    { id: "curly", name: "Curly", emoji: "🌀" },
    { id: "long", name: "Long", emoji: "🦁" },
    { id: "mohawk", name: "Mohawk", emoji: "🦜" },
    { id: "messy", name: "Messy", emoji: "🌪️" },
    { id: "slick", name: "Slicked", emoji: "😎" },
  ];

  const FRONT = {
    fringe: (c) => ({ behind: "", over:
      `<path d="M56 98 C50 56 72 34 100 34 C130 34 152 56 144 98 C142 88 140 80 137 75 L131 81 L125 73 L118 82 L111 73 L104 82 L97 73 L90 82 L83 73 L76 82 L69 74 C63 80 59 88 56 98 Z" fill="${c.base}"/>
       <path d="M72 50 C84 44 96 42 110 44 M78 60 C90 54 110 54 124 60 M66 66 C72 62 76 60 80 60" stroke="${c.light}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` }),
    crop: (c) => ({ behind: "", over:
      `<path d="M57 94 C52 58 72 38 100 38 C130 38 150 58 143 94 C141 82 134 70 100 68 C66 70 59 82 57 94 Z" fill="${c.base}"/>
       <path d="M74 52 C86 46 100 44 114 46" stroke="${c.light}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` }),
    spiky: (c) => ({ behind: "", over:
      `<path d="M57 92 C54 70 58 60 64 56 L60 36 L78 48 L82 26 L96 44 L100 22 L106 44 L120 26 L124 48 L142 36 L136 56 C142 62 146 72 143 92 C140 78 132 70 100 68 C68 70 60 78 57 92 Z" fill="${c.base}"/>
       <path d="M80 40 L82 32 M100 36 L100 28 M120 40 L118 32" stroke="${c.light}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` }),
    curly: (c) => ({ behind: "", over:
      [[62, 82, 13], [60, 66, 13], [68, 52, 14], [82, 42, 15], [100, 38, 15], [118, 42, 15], [132, 52, 14], [140, 66, 13], [138, 82, 13], [84, 58, 12], [100, 54, 12], [116, 58, 12]]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.base}"/>`).join("") +
      [[88, 40, 4], [112, 44, 4], [70, 56, 3.5], [130, 58, 3.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.light}"/>`).join("") }),
    long: (c) => ({
      behind: `<path d="M54 100 C46 60 70 36 100 36 C130 36 154 60 146 100 L152 170 C140 184 128 178 124 160 L76 160 C72 178 60 184 48 170 Z" fill="${c.base}"/>`,
      over: `<path d="M56 98 C50 56 72 34 100 34 C130 34 152 56 144 98 C142 84 134 74 100 70 C66 74 58 84 56 98 Z" fill="${c.base}"/>
             <path d="M56 98 L52 148 C57 148 60 140 61 126 Z M144 98 L148 148 C143 148 140 140 139 126 Z" fill="${c.base}"/>
             <path d="M74 50 C86 44 100 42 114 44 M70 64 C76 60 82 58 90 58" stroke="${c.light}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` }),
    mohawk: (c) => ({ behind: "", over:
      `<path d="M57 94 C52 58 72 38 100 38 C130 38 150 58 143 94 C141 82 134 70 100 68 C66 70 59 82 57 94 Z" fill="${c.base}" opacity=".3"/>
       <path d="M86 72 C82 48 88 26 100 12 C112 26 118 48 114 72 C108 64 92 64 86 72 Z" fill="${c.base}"/>
       <path d="M100 20 L100 62" stroke="${c.light}" stroke-width="2.5" stroke-linecap="round"/>` }),
    messy: (c) => ({ behind: "", over:
      `<path d="M56 98 C48 58 70 32 100 32 C132 32 154 58 144 98 C142 90 138 82 134 78 L138 70 L128 76 L126 64 L116 74 L110 62 L102 74 L94 62 L88 76 L76 66 L74 78 L64 72 L66 82 C60 86 58 92 56 98 Z" fill="${c.base}"/>
       <path d="M80 40 L74 22 L90 36 Z M110 34 L118 16 L124 38 Z M96 34 L98 18 L104 34 Z" fill="${c.base}"/>
       <path d="M72 48 C84 42 96 40 110 42" stroke="${c.light}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` }),
    slick: (c) => ({ behind: "", over:
      `<path d="M56 96 C52 58 74 38 100 38 C128 38 150 56 144 96 C142 82 134 66 112 60 C94 56 72 62 62 84 C60 88 58 92 56 96 Z" fill="${c.base}"/>
       <path d="M96 40 C92 50 84 58 70 64" stroke="${c.light}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` }),
  };

  const BACK = {
    fringe: (c) => `<path d="M-15.5 -123 C-18 -141 -8 -145 0 -145 C9 -145 18 -141 15.5 -123 L12 -119 L9 -122 L6 -118 L3 -121 L0 -117 L-3 -121 L-6 -118 L-9 -122 L-12 -119 Z" fill="${c.base}"/>
      <path d="M-9 -139 C-4 -142 4 -142 9 -139 M-11 -131 C-5 -134 5 -134 11 -131" stroke="${c.light}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    crop: (c) => `<path d="M-15.5 -123 C-18 -141 -8 -144 0 -144 C9 -144 18 -141 15.5 -123 L12 -121 L-12 -121 Z" fill="${c.base}"/>
      <path d="M-8 -139 C-3 -141 3 -141 8 -139" stroke="${c.light}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    spiky: (c) => `<path d="M-14 -138 L-12 -150 L-7 -141 L-4 -153 L0 -142 L4 -153 L7 -141 L12 -150 L14 -138 Z" fill="${c.base}"/>
      <path d="M-15.5 -123 C-18 -141 -8 -144 0 -144 C9 -144 18 -141 15.5 -123 L12 -121 L-12 -121 Z" fill="${c.base}"/>`,
    curly: (c) => [[-11, -134], [-6, -140], [0, -143], [6, -140], [11, -134], [-14, -126], [14, -126], [-9, -122], [0, -120], [9, -122], [-4, -130], [4, -130], [0, -136]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${c.base}"/>`).join("") +
      [[-5, -140], [6, -137]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${c.light}"/>`).join(""),
    long: (c) => `<path d="M-15.5 -123 C-18 -141 -8 -145 0 -145 C9 -145 18 -141 15.5 -123 L17 -103 L11 -107 L6 -102 L0 -107 L-6 -102 L-11 -107 L-17 -103 Z" fill="${c.base}"/>
      <path d="M-9 -139 C-4 -142 4 -142 9 -139 M-10 -128 L-9 -110 M10 -128 L9 -110" stroke="${c.light}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    mohawk: (c) => `<path d="M-15.5 -123 C-18 -141 -8 -144 0 -144 C9 -144 18 -141 15.5 -123 L12 -121 L-12 -121 Z" fill="${c.base}" opacity=".3"/>
      <path d="M-3.2 -118 L-3.6 -147 C-1 -152 1 -152 3.6 -147 L3.2 -118 Z" fill="${c.base}"/>`,
    messy: (c) => `<path d="M-15.5 -123 C-18 -141 -8 -145 0 -145 C9 -145 18 -141 15.5 -123 L12 -119 L9 -123 L6 -118 L3 -122 L0 -117 L-3 -122 L-6 -118 L-9 -123 L-12 -119 Z" fill="${c.base}"/>
      <path d="M-10 -142 L-13 -150 L-6 -144 Z M2 -145 L5 -153 L8 -144 Z M-2 -145 L-3 -152 L2 -145 Z" fill="${c.base}"/>`,
    slick: (c) => `<path d="M-15.5 -123 C-18 -141 -8 -145 0 -145 C9 -145 18 -141 15.5 -123 L12 -120 L-12 -120 Z" fill="${c.base}"/>
      <path d="M-9 -139 C-4 -142 4 -142 9 -139" stroke="${c.light}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  };

  /* ---------------- the save ---------------- */
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && typeof s === "object") return Object.assign({}, DEFAULT, s);
    } catch (e) { /* none yet */ }
    return Object.assign({}, DEFAULT);
  }
  let LOOK = load();
  function get() { LOOK = load(); return LOOK; }          // always fresh: another tab may have changed it
  function set(patch) {
    const next = Object.assign({}, load(), patch || {});
    if (!FRONT[next.hair]) next.hair = DEFAULT.hair;
    if (!HAIR_COLOURS.some((c) => c.id === next.hairColour)) next.hairColour = DEFAULT.hairColour;
    next.number = Math.max(1, Math.min(99, parseInt(next.number, 10) || 10));
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* private mode */ }
    LOOK = next;
    try { window.dispatchEvent(new CustomEvent("gz-look", { detail: next })); } catch (e) {}
    return next;
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} LOOK = load(); try { window.dispatchEvent(new CustomEvent("gz-look", { detail: LOOK })); } catch (e) {} return LOOK; }

  /* ---------------- what can be worn / done ----------------
     need = the Matchday level (also the Free Kick Masters level, up to 10).
     fk = how Free Kick Masters unlocked it before: { stars } or { level }.
     ach = a special feat in Matchday. */
  const CATALOG = {
    kit: [
      { id: "home", name: "Home red", need: 1 },
      { id: "away", name: "Away white", need: 1, fk: { stars: 5 } },
      { id: "third", name: "Third kit (black & gold)", need: 4 },
      { id: "retro", name: "1979 European Cup", need: 6, fk: { stars: 10 } },
      { id: "retro90", name: "1990 League Cup", need: 9 },
      { id: "pink", name: "Pink away", need: 12 },
      { id: "legend", name: "Forest Legend gold", need: 15, fk: { stars: 16 } },
    ],
    boots: [
      { id: "black", name: "Classic black", need: 1, colour: "#15121a" },
      { id: "red", name: "Forest red", need: 2, colour: "#e1102c", fk: { level: 2 } },
      { id: "blue", name: "Electric blue", need: 3, colour: "#2f6fe0" },
      { id: "orange", name: "Orange", need: 5, colour: "#ff8a1f" },
      { id: "neon", name: "Neon", need: 7, colour: "#a3e635", fk: { level: 4 } },
      { id: "purple", name: "Purple", need: 8, colour: "#8b4fe0" },
      { id: "gold", name: "Gold", need: 10, colour: "#f5b942", fk: { level: 6 } },
      { id: "pearl", name: "Pearl white", need: 13, colour: "#f4f1ee" },
    ],
    cele: [
      { id: "armsup", name: "Arms up", need: 1, pose: "up", anim: "cele-jump", shout: "GET IN!", icon: "🙌" },
      { id: "slide", name: "Knee slide", need: 1, pose: "out", anim: "cele-slide", shout: "KNEE SLIDE!", icon: "🛷", fx: "💨" },
      { id: "sprinkler", name: "Sprinkler", need: 1, pose: "out", anim: "cele-sprinkler", shout: "SPRINKLER!", icon: "💦", fx: "💦" },
      { id: "moonwalk", name: "Moonwalk", need: 2, pose: "idle", anim: "cele-moonwalk", shout: "MOONWALK!", icon: "🌙", fx: "🌙" },
      { id: "siuuu", name: "SIUUU", need: 3, fk: { stars: 6 }, pose: "out", anim: "cele-siuuu", shout: "SIUUUU!", icon: "🕺" },
      { id: "spin", name: "Spin cycle", need: 3, pose: "out", anim: "cele-spin", shout: "SPIN CYCLE!", icon: "🌀", fx: "🌀" },
      { id: "corner", name: "Corner flag dance", need: 4, pose: "out", anim: "cele-dance", shout: "CORNER FLAG PARTY!", icon: "🚩", fx: "🚩" },
      { id: "pogo", name: "Pogo", need: 4, pose: "up", anim: "cele-pogo", shout: "POGO!", icon: "🦘", fx: "⭐" },
      { id: "aeroplane", name: "Aeroplane", need: 5, pose: "out", anim: "cele-plane", shout: "NEEEOOOWW!", icon: "✈️" },
      { id: "heart", name: "Heart hands", need: 6, pose: "up", anim: "cele-zoom", shout: "LOVE THIS CLUB ❤️", icon: "❤️", fx: "❤️" },
      { id: "guitar", name: "Air guitar", need: 7, pose: "out", anim: "cele-guitar", shout: "ROCK ON!", icon: "🎸", fx: "🎸" },
      { id: "shiver", name: "Cold shiver", need: 8, pose: "idle", anim: "cele-shiver", shout: "ICE COLD 🥶", icon: "🥶" },
      { id: "salute", name: "The salute", need: 9, pose: "point", anim: "cele-salute", shout: "SALUTE!", icon: "🫡", fx: "⭐" },
      { id: "flex", name: "Flex", need: 10, pose: "flex", anim: "cele-flex", shout: "FLEX!", icon: "💪", fx: "💪" },
      { id: "badge", name: "Kiss the badge", need: 11, fk: { level: 3 }, pose: "point", anim: "cele-zoom", shout: "FOREST!", icon: "💋" },
      { id: "baby", name: "Rock the baby", need: 12, pose: "out", anim: "cele-rock", shout: "ROCK-A-BYE!", icon: "🍼", fx: "🍼" },
      { id: "super", name: "Super George", need: 13, pose: "out", anim: "cele-super", shout: "SUPER GEORGE!", icon: "🦸", fx: "⚡" },
      { id: "backflip", name: "Backflip", need: 14, pose: "up", anim: "cele-flip", shout: "BACKFLIP!", icon: "🤸" },
      { id: "shush", name: "Shhh!", need: 15, pose: "shush", anim: "cele-shush", shout: "SHHHHH!", icon: "🤫", fx: "🤫" },
      { id: "robot", name: "The Robot", need: 16, fk: { stars: 12 }, pose: "out", anim: "cele-robot", shout: "BEEP BOOP GOAL", icon: "🤖" },
      { id: "cartwheel", name: "Cartwheel", need: 18, pose: "out", anim: "cele-cartwheel", shout: "CARTWHEEL!", icon: "✨", fx: "✨" },
      // Special ones: earned by doing something in Matchday, not by level
      { id: "hattrick", name: "Hat-trick hat", ach: "hattrick", how: "Score a hat-trick", pose: "up", anim: "cele-jump", shout: "HAT-TRICK HERO!", icon: "🎩", fx: "🎩" },
      { id: "rocket", name: "Rocket launch", ach: "halfway", how: "Score from the halfway line", pose: "up", anim: "cele-rocket", shout: "3... 2... 1... GOAL!", icon: "🚀", fx: "🚀" },
      { id: "crown", name: "King of the Trees", ach: "giant", how: "Beat Arsenal, Liverpool, Chelsea or Man City", pose: "point", anim: "cele-zoom", shout: "KING GEORGE!", icon: "👑", fx: "👑" },
      { id: "wall", name: "The Wall", ach: "clean", how: "Win with a clean sheet", pose: "out", anim: "cele-zoom", shout: "NOTHING GETS PAST US!", icon: "🧱", fx: "🧱" },
      { id: "tv", name: "Draw the VAR screen", ach: "var", how: "Win a VAR check", pose: "out", anim: "cele-salute", shout: "CHECK COMPLETE ✅", icon: "📺", fx: "📺" },
      { id: "redcard", name: "Show 'em red", ach: "red", how: "Get an opposition player sent off", pose: "point", anim: "cele-zoom", shout: "OFF YOU GO! 🟥", icon: "🟥", fx: "🟥" },
    ],
  };
  const find = (type, id) => (CATALOG[type] || []).find((x) => x.id === id);

  /* ---------------- progress, read from both games' saves ---------------- */
  const FK_LEVELS = [0, 200, 500, 900, 1400, 2000, 2800, 3800, 5000, 6500];
  const readJSON = (k) => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  function progress() {
    const fk = readJSON("gz_freekick_v1"), md = readJSON("gz_matchday_career_v1");
    const fkXp = Number(fk.xp) || 0;
    let fkLevel = 1; FK_LEVELS.forEach((t, i) => { if (fkXp >= t) fkLevel = i + 1; });
    const fkStars = Object.values(fk.stars || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    let mdLevel = 1; const mdXp = Number(md.xp) || 0;
    while (125 * (mdLevel + 1) * mdLevel <= mdXp && mdLevel < 30) mdLevel++;
    return { fkLevel, fkStars, mdLevel, mdAch: md.ach || {} };
  }
  function unlocked(type, id) {
    const it = find(type, id);
    if (!it) return false;
    const P = progress();
    if (it.ach) return !!P.mdAch[it.ach];
    if (P.mdLevel >= it.need) return true;
    if (it.fk) return (it.fk.stars != null && P.fkStars >= it.fk.stars) || (it.fk.level != null && P.fkLevel >= it.fk.level);
    return it.need <= 10 && P.fkLevel >= it.need;       // Free Kick levels count too, as far as they go
  }
  // What to use: his saved choice if he has one and it is unlocked, otherwise the game's own.
  function pick(type, fallbackId) {
    const v = get()[type];
    return v && unlocked(type, v) ? v : fallbackId;
  }
  const celeData = (id) => find("cele", id) || find("cele", "armsup");
  const bootsColour = (id) => (find("boots", id) || find("boots", "black")).colour;

  /* ---------------- drawing, used by george-kit.js ---------------- */
  const colours = (look) => colourOf((look || get()).hairColour);
  function hairFront(look) { const l = look || get(); return (FRONT[l.hair] || FRONT.fringe)(colours(l)); }
  function hairBack(look) { const l = look || get(); return (BACK[l.hair] || BACK.fringe)(colours(l)); }
  // The small face of a goalkeeper George: the front hair, shrunk to fit.
  function hairKeeper(look) {
    const l = look || get(), h = (FRONT[l.hair] || FRONT.fringe)(colours(l));
    const t = 'transform="translate(0 -64) scale(.23) translate(-100 -96)"';
    return { behind: h.behind ? `<g ${t}>${h.behind}</g>` : "", over: `<g ${t}>${h.over}</g>` };
  }
  const number = () => get().number;

  /* ---------------- play his celebration over a game screen ----------------
     host: a positioned element (the game's stage). Resolves when it ends, or on a tap. */
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function celebrate(host, o) {
    o = o || {};
    return new Promise((resolve) => {
      if (!host || !window.GK) return resolve();
      const L = get();
      const c = celeData(pick("cele", o.fallback || "armsup"));
      const kit = pick("kit", o.kit || "home");
      const box = document.createElement("div");
      box.className = "gl-cele";
      box.setAttribute("role", "status");
      box.innerHTML = `<div class="cele-fx" aria-hidden="true"></div><div class="gl-cele-avatar" aria-hidden="true"></div><div class="gl-cele-text"></div>`;
      box.querySelector(".gl-cele-text").textContent = c.shout;
      box.querySelector(".gl-cele-avatar").innerHTML = GK.avatar({ pose: c.pose, kit, happy: true });
      const av = box.querySelector(".gl-cele-avatar svg");
      if (av && !reduced) av.classList.add(c.anim);
      if (c.fx && !reduced) box.querySelector(".cele-fx").innerHTML = Array.from({ length: 14 }, () =>
        `<span style="left:${Math.round(Math.random() * 94)}%;animation-delay:${(Math.random() * 1).toFixed(2)}s;font-size:${Math.round(22 + Math.random() * 20)}px">${c.fx}</span>`).join("");
      host.appendChild(box);
      let done = false;
      const end = () => { if (done) return; done = true; box.remove(); resolve(); };
      box.addEventListener("click", end);
      setTimeout(end, reduced ? 900 : (o.ms || 1900));
    });
  }

  GL.KEY = KEY;
  GL.DEFAULT = DEFAULT;
  GL.HAIRS = HAIRS;
  GL.HAIR_COLOURS = HAIR_COLOURS;
  GL.CATALOG = CATALOG;
  GL.get = get;
  GL.set = set;
  GL.reset = reset;
  GL.find = find;
  GL.progress = progress;
  GL.unlocked = unlocked;
  GL.pick = pick;
  GL.celeData = celeData;
  GL.bootsColour = bootsColour;
  GL.hairFront = hairFront;
  GL.hairBack = hairBack;
  GL.hairKeeper = hairKeeper;
  GL.hairColour = colours;
  GL.number = number;
  GL.celebrate = celebrate;
})(window.GL = window.GL || {});
