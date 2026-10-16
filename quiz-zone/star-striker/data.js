/* Star Striker: the game's data. Enemy types, ten levels, five bosses, pickups and achievements. */

export const W = 600;               // the play field is always 600 wide (the height follows the screen)

/* hp is for level 1; the game scales it up level by level. r = hit radius. fire = seconds between shots. */
export const ENEMY = {
  scout:    { hp: 2,  r: 20, score: 100, vy: 105, col: "#5cff9d", name: "Scout" },
  zig:      { hp: 2,  r: 18, score: 120, vy: 125, col: "#ffe14d", name: "Zigzag" },
  bee:      { hp: 1,  r: 14, score: 80,  vy: 150, col: "#ff7ad9", name: "Swarm bee" },
  gunner:   { hp: 6,  r: 24, score: 220, vy: 90,  col: "#5ab8ff", name: "Gunner", fire: 1.9 },
  spinner:  { hp: 8,  r: 24, score: 260, vy: 70,  col: "#ff9a3c", name: "Spinner", fire: 2.1 },
  tank:     { hp: 18, r: 34, score: 450, vy: 50,  col: "#9fb0c8", name: "Armour tank", fire: 2.9, drop: 1 },
  kamikaze: { hp: 3,  r: 18, score: 150, vy: 0,   col: "#ff4d5e", name: "Kamikaze" },
  weaver:   { hp: 5,  r: 20, score: 200, vy: 85,  col: "#b17bff", name: "Weaver", fire: 1.4 },
  layer:    { hp: 9,  r: 26, score: 300, vy: 60,  col: "#7dffcf", name: "Mine layer", fire: 2.4 },
  phantom:  { hp: 6,  r: 20, score: 280, vy: 80,  col: "#7ef2ff", name: "Phantom", fire: 1.9 },
  splitter: { hp: 8,  r: 28, score: 300, vy: 75,  col: "#ffb35c", name: "Splitter" },
  carrier:  { hp: 26, r: 40, score: 700, vy: 40,  col: "#ff7a59", name: "Carrier", drop: 1 },
  rock:     { hp: 5,  r: 26, score: 40,  vy: 90,  col: "#b49676", name: "Asteroid" },
};

export const BOSS = [
  { id: "mini",     name: "MINI MOTHERSHIP",   hp: 150, r: 74, score: 5000,  col: "#5ab8ff" },
  { id: "crab",     name: "FROST CRAB",        hp: 260, r: 78, score: 8000,  col: "#8be9ff" },
  { id: "queen",    name: "HIVE QUEEN",        hp: 380, r: 80, score: 12000, col: "#ff7ad9" },
  { id: "titan",    name: "IRON TITAN",        hp: 540, r: 84, score: 16000, col: "#9fb0c8" },
  { id: "overlord", name: "GALACTIC OVERLORD", hp: 820, r: 90, score: 30000, col: "#ffcf4d" },
];

/* Pickups. "weapon" ones change the ship's gun for a short while (pick the same one again to power it up). */
export const PICK = {
  twin:    { e: "⚡", col: "#4dd2ff", name: "TWIN SHOT",    kind: "weapon" },
  spread:  { e: "🔱", col: "#ffd34d", name: "SPREAD SHOT",  kind: "weapon" },
  laser:   { e: "🌈", col: "#ff6bd6", name: "RAINBOW BEAM", kind: "weapon" },
  missile: { e: "🚀", col: "#ff8a4d", name: "HOMING MISSILES", kind: "weapon" },
  ball:    { e: "⚽", col: "#ffffff", name: "FOOTBALL BLAST", kind: "weapon" },
  nova:    { e: "💫", col: "#ffe66b", name: "NOVA RINGS",   kind: "weapon" },
  rapid:   { e: "⏩", col: "#7dff6b", name: "RAPID FIRE",   kind: "boost" },
  shield:  { e: "🛡️", col: "#6bb5ff", name: "SHIELD",       kind: "boost" },
  magnet:  { e: "🧲", col: "#ff5c7a", name: "GEM MAGNET",   kind: "boost" },
  freeze:  { e: "❄️", col: "#b8f0ff", name: "TIME FREEZE",  kind: "boost" },
  x2:      { e: "✖️", col: "#ffb84d", name: "DOUBLE POINTS", kind: "boost" },
  drone:   { e: "🛸", col: "#b58cff", name: "HELPER DRONES", kind: "boost" },
  bomb:    { e: "💣", col: "#ff6b6b", name: "BOMB +1",      kind: "item" },
  heart:   { e: "❤️", col: "#ff4d6d", name: "EXTRA LIFE",   kind: "item" },
};
export const WEAPONS = ["twin", "spread", "laser", "missile", "ball", "nova"];
export const BOOSTS = ["rapid", "shield", "magnet", "freeze", "x2", "drone"];

/* ---------- the ten levels ----------
   Each event is [seconds, formation, enemy, how many, options].
   Formations: line, vee, col, sine, side, rain, single. `boss` is an index into BOSS (after levels 2, 4, 6, 8 and 10). */
const e = (t, f, type, n, o) => ({ t, f, type, n, o: o || {} });

export const LEVELS = [
  { name: "Warm-Up Orbit", tag: "Easy does it. Here come the scouts.", sky: ["#061a3a", "#0b0620"], neb: ["#1d5fff", "#00d2ff"], planet: ["#3aa0ff", "#0a3d8f"], boss: null,
    ev: [e(1, "line", "scout", 3), e(5, "col", "scout", 4, { x: 150 }), e(9, "vee", "scout", 5), e(14, "sine", "zig", 5), e(19, "line", "zig", 4),
         e(24, "col", "scout", 5, { x: 450 }), e(28, "side", "zig", 5, { side: "L" }), e(32, "side", "zig", 5, { side: "R" }), e(37, "vee", "zig", 7),
         e(42, "rain", "scout", 8, { span: 5 }), e(49, "line", "scout", 5), e(53, "sine", "zig", 6)] },
  { name: "Asteroid Alley", tag: "Rocks everywhere. Boss at the end!", sky: ["#2a1205", "#0c0508"], neb: ["#ff8a3c", "#ffd34d"], planet: ["#d98b4a", "#6b3414"], boss: 0,
    ev: [e(1, "rain", "rock", 8, { span: 6 }), e(5, "line", "scout", 4), e(9, "rain", "rock", 6, { span: 4 }), e(12, "side", "bee", 6, { side: "L" }),
         e(17, "vee", "zig", 5), e(21, "rain", "rock", 8, { span: 5 }), e(24, "side", "bee", 6, { side: "R" }), e(29, "line", "scout", 5),
         e(33, "col", "zig", 5, { x: 300 }), e(38, "rain", "rock", 9, { span: 5 }), e(41, "vee", "scout", 7), e(47, "side", "bee", 8, { side: "L" }), e(51, "single", "gunner", 1, { x: 300 })] },
  { name: "Nebula Drift", tag: "Gunners aim at you. Keep moving!", sky: ["#220a45", "#07021a"], neb: ["#b45bff", "#ff5cc8"], planet: ["#c58bff", "#4a1b8f"], boss: null,
    ev: [e(1, "line", "bee", 6), e(5, "single", "gunner", 1, { x: 180 }), e(7, "single", "gunner", 1, { x: 420 }), e(11, "sine", "zig", 6), e(16, "vee", "bee", 7),
         e(20, "line", "gunner", 2), e(25, "side", "bee", 8, { side: "R" }), e(29, "col", "zig", 6, { x: 120 }), e(30, "col", "zig", 6, { x: 480 }),
         e(36, "line", "gunner", 3), e(41, "rain", "bee", 10, { span: 5 }), e(46, "vee", "zig", 7), e(51, "line", "gunner", 3), e(55, "sine", "bee", 8)] },
  { name: "Ice Moon", tag: "Heavy tanks. Boss: the Frost Crab!", sky: ["#0a2a3a", "#03070f"], neb: ["#6ee7ff", "#e6fbff"], planet: ["#d7f6ff", "#5aa4c8"], boss: 1,
    ev: [e(1, "line", "scout", 5), e(5, "single", "tank", 1, { x: 300 }), e(10, "side", "zig", 6, { side: "L" }), e(14, "line", "gunner", 2), e(18, "single", "tank", 1, { x: 150 }),
         e(19, "single", "tank", 1, { x: 450 }), e(25, "sine", "bee", 9), e(30, "vee", "gunner", 3), e(36, "rain", "zig", 9, { span: 5 }), e(41, "line", "tank", 2),
         e(47, "side", "bee", 8, { side: "R" }), e(51, "line", "gunner", 3), e(56, "single", "tank", 1, { x: 300 })] },
  { name: "Solar Flare", tag: "Kamikazes dive at you. Spinners shoot rings.", sky: ["#3d0d05", "#12030a"], neb: ["#ff5a1f", "#ffc23c"], planet: ["#ff8a2b", "#a3200c"], boss: null,
    ev: [e(1, "line", "kamikaze", 3), e(5, "single", "spinner", 1, { x: 300 }), e(9, "line", "kamikaze", 4), e(14, "vee", "zig", 7), e(18, "single", "spinner", 1, { x: 160 }),
         e(19, "single", "spinner", 1, { x: 440 }), e(24, "rain", "kamikaze", 7, { span: 5 }), e(29, "line", "gunner", 3), e(33, "sine", "bee", 9), e(38, "line", "kamikaze", 5),
         e(42, "single", "spinner", 1, { x: 300 }), e(45, "side", "zig", 7, { side: "L" }), e(49, "side", "zig", 7, { side: "R" }), e(54, "rain", "kamikaze", 8, { span: 5 })] },
  { name: "Toxic Reef", tag: "Mines and splitters. Boss: the Hive Queen!", sky: ["#052a1a", "#020b0a"], neb: ["#3dff9a", "#b6ff3d"], planet: ["#58e0a0", "#10603d"], boss: 2,
    ev: [e(1, "line", "weaver", 3), e(6, "single", "layer", 1, { x: 200 }), e(10, "line", "splitter", 3), e(15, "sine", "weaver", 5), e(20, "single", "layer", 1, { x: 400 }),
         e(24, "vee", "bee", 9), e(28, "line", "splitter", 4), e(33, "single", "layer", 1, { x: 300 }), e(35, "sine", "weaver", 6), e(41, "rain", "bee", 10, { span: 5 }),
         e(45, "line", "splitter", 4), e(50, "single", "layer", 1, { x: 150 }), e(51, "single", "layer", 1, { x: 450 }), e(56, "sine", "weaver", 6)] },
  { name: "Phantom Fog", tag: "Some ships fade away. Wait for them to show up.", sky: ["#041f26", "#02060a"], neb: ["#35e8ff", "#7a6bff"], planet: ["#6fe3f0", "#13506b"], boss: null,
    ev: [e(1, "line", "phantom", 3), e(6, "sine", "weaver", 5), e(11, "line", "kamikaze", 5), e(15, "vee", "phantom", 5), e(20, "rain", "zig", 9, { span: 4 }), e(24, "line", "phantom", 4),
         e(29, "single", "layer", 1, { x: 300 }), e(31, "line", "kamikaze", 6), e(36, "sine", "phantom", 6), e(41, "line", "gunner", 4), e(45, "vee", "phantom", 7),
         e(50, "rain", "kamikaze", 8, { span: 5 }), e(54, "line", "phantom", 5), e(58, "sine", "weaver", 7)] },
  { name: "Iron Armada", tag: "Carriers launch fighters. Boss: the Iron Titan!", sky: ["#0d1626", "#04060c"], neb: ["#7aa2ff", "#c4d4ee"], planet: ["#9db4d6", "#2c3a55"], boss: 3,
    ev: [e(1, "single", "carrier", 1, { x: 300 }), e(7, "line", "gunner", 4), e(12, "line", "tank", 2), e(18, "single", "carrier", 1, { x: 180 }), e(19, "single", "carrier", 1, { x: 420 }),
         e(26, "vee", "spinner", 3), e(31, "sine", "zig", 8), e(35, "line", "tank", 3), e(41, "rain", "kamikaze", 8, { span: 4 }), e(45, "single", "carrier", 1, { x: 300 }),
         e(50, "line", "gunner", 5), e(55, "line", "tank", 3)] },
  { name: "Crimson Core", tag: "Everything at once. Stay sharp!", sky: ["#3a0610", "#0a0108"], neb: ["#ff3355", "#ff9a3c"], planet: ["#ff4d5e", "#6e0f1f"], boss: null,
    ev: [e(1, "line", "kamikaze", 5), e(4, "single", "tank", 1, { x: 300 }), e(8, "vee", "phantom", 5), e(12, "single", "spinner", 1, { x: 170 }), e(12, "single", "spinner", 1, { x: 430 }),
         e(17, "sine", "weaver", 7), e(22, "single", "layer", 1, { x: 300 }), e(24, "line", "splitter", 4), e(29, "rain", "kamikaze", 9, { span: 4 }), e(33, "single", "carrier", 1, { x: 300 }),
         e(38, "line", "gunner", 5), e(42, "vee", "phantom", 7), e(47, "line", "tank", 3), e(51, "sine", "bee", 12), e(55, "rain", "kamikaze", 10, { span: 4 }), e(60, "line", "splitter", 5)] },
  { name: "Galaxy Gate", tag: "The final fight. Boss: the Galactic Overlord!", sky: ["#2a1450", "#07031a"], neb: ["#ffcf4d", "#c36bff"], planet: ["#ffd86b", "#7a3ac9"], boss: 4,
    ev: [e(1, "line", "kamikaze", 6), e(5, "vee", "phantom", 6), e(10, "single", "carrier", 1, { x: 300 }), e(14, "line", "gunner", 5), e(19, "single", "spinner", 1, { x: 160 }),
         e(19, "single", "spinner", 1, { x: 440 }), e(24, "sine", "weaver", 8), e(29, "line", "tank", 3), e(34, "line", "splitter", 5), e(39, "single", "layer", 1, { x: 300 }),
         e(41, "rain", "kamikaze", 10, { span: 4 }), e(46, "vee", "phantom", 8), e(51, "single", "carrier", 1, { x: 200 }), e(52, "single", "carrier", 1, { x: 400 }), e(58, "sine", "bee", 14)] },
];

/* ---------- achievements: [id, emoji, name, what to do] ---------- */
export const ACH = [
  ["first-blood", "💥", "First Blood", "Destroy your first enemy ship"],
  ["combo-5", "🔥", "Combo Cadet", "Get a x5 combo"],
  ["combo-8", "⚡", "Combo Master", "Reach the maximum x8 combo"],
  ["boss-1", "👾", "Boss Buster", "Defeat your first boss"],
  ["boss-all", "👑", "Boss Hunter", "Defeat all five bosses"],
  ["level-3", "🚀", "Cadet Pilot", "Reach level 3"],
  ["level-5", "🌟", "Star Pilot", "Reach level 5"],
  ["level-10", "🌌", "Deep Space", "Reach level 10"],
  ["win", "🏆", "Galaxy Saved!", "Beat the Galactic Overlord"],
  ["untouched", "✨", "Untouchable", "Finish a level without being hit"],
  ["power-hungry", "🔋", "Power Hungry", "Grab 10 pickups in one run"],
  ["arsenal", "🧰", "Full Arsenal", "Use all six weapons in one run"],
  ["bomb-squad", "💣", "Bomb Squad", "Wipe out 8 ships with one bomb"],
  ["football-fan", "⚽", "Football Fan", "Destroy 20 ships with the Football Blast"],
  ["beam-me-up", "🌈", "Rainbow Rider", "Destroy 20 ships with the Rainbow Beam"],
  ["close-call", "😅", "Close Call", "Grab a heart when you only have one life left"],
  ["gem-hoarder", "💎", "Gem Hoarder", "Collect 100 gems in total"],
  ["score-10k", "🎯", "Ten Thousand", "Score 10,000 in one run"],
  ["score-50k", "💫", "Fifty Thousand", "Score 50,000 in one run"],
  ["score-150k", "🌠", "Super Striker", "Score 150,000 in one run"],
  ["kills-500", "🛰️", "Fleet Breaker", "Destroy 500 ships in total"],
  ["drone-squad", "🛸", "Drone Squad", "Fly with helper drones"],
];
