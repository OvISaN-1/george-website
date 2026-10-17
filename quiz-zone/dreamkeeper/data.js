/* Dreamkeeper: a calm tower defence for winding down.
   The "enemies" are everyday worries. Each one says a worried thought; when it is turned into a star, a kinder thought takes its place.
   The ideas come from common child-friendly CBT habits: naming thinking traps (Fortune Teller, Mind Reader, All-or-Nothing...), swapping them for
   kinder thoughts, slow breathing, noticing good things, and putting worries away for the night. This is a game, not treatment. */

import { SAYS } from "./thoughts.js";

export const W = 600, TILE = 100, COLS = 6, ROWS = 7, GY = 80;      // the garden is a 6 x 7 grid of 100-unit tiles

/* ---------------- the worries ----------------
   hp, spd (units per second, slow on purpose), armor (taken off every hit), reward (stars), leak (how much calm it costs if it reaches the nest) */
export const WORRY = {
  wonder:  { name: "What-If",           trap: "Fortune Teller",  hp: 22,  spd: 52, armor: 0, reward: 4,  leak: 4,  col: "#c9a6e8", r: 17,
             says: [["What if it all goes wrong?", "I can't see the future. What's most likely?"], ["What if I forget everything?", "I've remembered things before. I can check my notes."], ["What if I'm late?", "A little late is okay. The day carries on."]] },
  flutter: { name: "Butterflies",       trap: "Nervous Tummy",   hp: 16,  spd: 66, armor: 0, reward: 4,  leak: 3,  col: "#f2a6c8", r: 15,
             says: [["My tummy feels funny...", "That's just nerves. Slow breaths help."], ["My heart is racing!", "My body is getting ready. I can slow it down."]] },
  mind:    { name: "Mind Reader",       trap: "Mind Reader",     hp: 34,  spd: 48, armor: 0, reward: 6,  leak: 5,  col: "#8fc7e8", r: 19,
             says: [["They think I'm boring.", "I can't read minds. I could just ask."], ["Everyone was laughing at me.", "Maybe they were laughing about something else."]] },
  allnone: { name: "All-or-Nothing",    trap: "All-or-Nothing",  hp: 70,  spd: 42, armor: 2, reward: 9,  leak: 6,  col: "#e8a87c", r: 22,
             says: [["I always get it wrong.", "Always is a big word. I get lots right."], ["Nothing ever works out.", "Plenty works out. Let me find one."]] },
  myfault: { name: "All My Fault",      trap: "All My Fault",    hp: 52,  spd: 44, armor: 0, reward: 8,  leak: 5,  col: "#e89aa0", r: 20,
             says: [["It's all my fault.", "Lots of things make things happen, not just me."], ["I ruined it.", "I did my part. Other things played a part too."]] },
  shadow:  { name: "Night Shadow",      trap: "Dark Worries",    hp: 38,  spd: 50, armor: 0, reward: 7,  leak: 5,  col: "#7d8ad8", r: 19, hidden: true,
             says: [["What was that noise?", "Just the house settling. I'm safe."], ["Is something in the dark?", "The dark is only the light being off."]] },
  hurry:   { name: "Hurry-Up",          trap: "Should and Must", hp: 18,  spd: 104, armor: 0, reward: 5, leak: 3,  col: "#f2cf7c", r: 14,
             says: [["I have to be quick!", "I can go at my own pace."], ["I should be better by now.", "Learning takes time. I'm still growing."]] },
  gloom:   { name: "Gloom Cloud",       trap: "Ignoring the Good", hp: 64, spd: 40, armor: 0, reward: 9,  leak: 6,  col: "#8f93a8", r: 23, aura: 130,
             says: [["Nothing good happened today.", "Let's find just one good thing."], ["That doesn't count.", "Good things count, even small ones."]] },
  replay:  { name: "Embarrassing Replay", trap: "Replay Loop",   hp: 30,  spd: 50, armor: 0, reward: 6,  leak: 5,  col: "#f0b08c", r: 18, again: true,
             says: [["Everyone saw that!", "Most people forget quickly. I can too."], ["I can't stop thinking about it.", "Thoughts pass by like clouds."]] },
  heap:    { name: "Homework Heap",     trap: "Too Much",        hp: 150, spd: 32, armor: 1, reward: 14, leak: 8,  col: "#b3a58f", r: 27,
             says: [["So much to do!", "One small step at a time."], ["I'll never finish.", "Big jobs get done in small pieces."]] },
};

/* ---------------- the five big worries (a boss after levels 2, 4, 6, 8 and 10) ---------------- */
export const BOSS = [
  { id: "test",   name: "The Big Test",          hp: 480,  spd: 30, armor: 1, reward: 60,  leak: 25, col: "#e8d28f", r: 40, spawn: "wonder",
    says: [["What if I fail?", "I can only do my best, and that is enough."]], tip: "Before a test: do a little, rest, and remember it's one day, not your whole life." },
  { id: "falling", name: "The Falling Out",      hp: 820, spd: 30, armor: 0, reward: 80,  leak: 25, col: "#e89aa0", r: 38, split: true,
    says: [["They don't want to be my friend.", "Friends fall out and make up. Talking helps."]], tip: "If friends fall out, a kind word or a quiet chat often fixes it." },
  { id: "mistake", name: "The Big Mistake",      hp: 1100, spd: 28, armor: 4, reward: 100, leak: 25, col: "#e8a87c", r: 42,
    says: [["I messed up!", "Mistakes are how brains grow."]], tip: "Everyone makes mistakes, even the best footballers. They learn and carry on." },
  { id: "bed",    name: "The Thing Under the Bed", hp: 1350, spd: 30, armor: 0, reward: 120, leak: 25, col: "#7d8ad8", r: 40, hidden: true, spawn: "shadow",
    says: [["What is that shape?", "It was only my dressing gown on the chair!"]], tip: "Scary shapes at night are usually ordinary things. Turn the light on and look." },
  { id: "cloud",  name: "The Big Worry Cloud",   hp: 2300, spd: 26, armor: 1, reward: 200, leak: 30, col: "#a79fc9", r: 48, aura: 150, spawn: "mix",
    says: [["Everything feels too much.", "I can take it one small thing at a time. I'm not alone."]], tip: "When everything feels big, breathe slowly, name one thing, and tell someone you trust." },
];

/* every worry and big worry gets its full bank of thoughts (see thoughts.js) */
for (const k of Object.keys(SAYS)) { const w = WORRY[k] || BOSS.find((b) => b.id === k); if (w) w.says = SAYS[k]; }

/* ---------------- the towers: friendly night-garden helpers ----------------
   Each has three levels. cost = [build, upgrade to 2, upgrade to 3]. */
export const TOWER = {
  firefly:  { name: "Firefly Jar",   e: "🫙", col: "#f2d37c", cost: [50, 60, 90],   range: [170, 175, 185], rate: [0.95, 0.8, 0.62], dmg: [8, 12, 17], shots: [1, 1, 2],
              desc: "Fireflies fly out and sting worries with soft light. A steady all-rounder.", up: ["Faster fireflies", "Two fireflies at once"] },
  lantern:  { name: "Lantern",       e: "🏮", col: "#f0a868", cost: [60, 70, 100],  range: [150, 170, 190], rate: [1.3, 1.2, 1.1], dmg: [3, 4, 5], lit: [0.3, 0.4, 0.5],
              desc: "Its warm light shows hidden shadows, and lit worries take extra damage from every tower.", up: ["Wider glow, brighter mark", "Widest glow, strongest mark"] },
  chime:    { name: "Wind Chime",    e: "🎐", col: "#9fd6c8", cost: [70, 80, 110],  range: [150, 170, 190], rate: [2.2, 2.0, 1.8], slow: [0.35, 0.45, 0.55],
              desc: "Gentle chimes slow every worry nearby so the other towers get more time.", up: ["Deeper chime, slower worries", "Biggest chime, slowest worries"] },
  dandelion:{ name: "Dandelion",     e: "🌼", col: "#f4e48a", cost: [90, 100, 140], range: [200, 205, 215], rate: [2.4, 2.1, 1.8], dmg: [12, 18, 26], splash: [55, 65, 80],
              desc: "Floaty seeds burst and hurt every worry in a small patch. Brilliant on crowds.", up: ["Bigger burst", "Biggest burst, hits harder"] },
  lavender: { name: "Lavender",      e: "🪻", col: "#b9a6e8", cost: [80, 90, 120],  range: [140, 155, 170], rate: [1.1, 1.0, 0.9], dps: [4, 6.5, 10], slow: [0.1, 0.12, 0.15],
              desc: "Calming scent that shrinks a worry bit by bit for a few seconds. Great against tough ones.", up: ["Stronger scent", "Strongest scent"] },
  moonbeam: { name: "Moonbeam",      e: "🌙", col: "#cfd8f0", cost: [130, 140, 190], range: [320, 360, 400], rate: [3.6, 3.1, 2.6], dmg: [42, 66, 100], pierce: true,
              desc: "A slow, powerful beam from far away. It ignores armour. Every third shot is a full moon.", up: ["Stronger beam", "Mighty beam"] },
  catcher:  { name: "Dream Catcher", e: "🕸️", col: "#e8b4d8", cost: [110, 120, 160], range: [160, 175, 190], rate: [1.5, 1.3, 1.1], dmg: [9, 13, 18], chain: [2, 3, 4],
              desc: "Threads of light jump from worry to worry. Perfect against swarms.", up: ["Jumps further", "Jumps the furthest"] },
  blanket:  { name: "Cosy Blanket",  e: "🧸", col: "#e8a5a5", cost: [100, 110, 150], range: [130, 150, 170], buff: [0.2, 0.3, 0.4], speed: [0, 0.1, 0.15],
              desc: "Doesn't attack. Makes every tower near it stronger. Place it in the middle of friends.", up: ["Warmer hug", "Warmest hug"] },
};
/* In the tray, from the most damage on the left to the least on the right; the last three are support helpers. */
export const TOWER_IDS = ["moonbeam", "catcher", "firefly", "dandelion", "lavender", "lantern", "chime", "blanket"];
export const SUPPORT_FROM = 5;                     // index where the support helpers start

/* ---------------- the paths (tile coordinates; -1 means just off the edge) ---------------- */
const PATHS = [
  [[-1, 0], [5, 0], [5, 2], [0, 2], [0, 4], [5, 4], [5, 6]],                         // a long snake
  [[-1, 0], [5, 0], [5, 6], [0, 6], [0, 2], [4, 2], [4, 4], [2, 4]],                 // a spiral into the middle
  [[-1, 0], [2, 0], [2, 2], [4, 2], [4, 4], [5, 4], [5, 6]],                         // stairs
  [[5, -1], [5, 1], [1, 1], [1, 3], [4, 3], [4, 5], [0, 5], [0, 6]],                 // a big U
  [[-1, 1], [3, 1], [3, 0], [5, 0], [5, 3], [2, 3], [2, 5], [5, 5], [5, 6]],         // a wave
];
export function pathFor(level) {
  const base = PATHS[level % 5], flip = level >= 5;
  return base.map(([c, r]) => [flip ? 5 - c : c, r]);
}

/* ---------------- the ten levels ---------------- */
export const LEVELS = [
  { name: "Quiet Meadow",       tag: "A few small worries drift in. Easy does it.",        sky: ["#1b1740", "#2d2a58"], ground: "#26325a", lane: "#6a5d78", glow: "#f2d37c", pool: ["wonder", "flutter"],                       waves: 6, boss: null, stars0: 150 },
  { name: "Moon Pond",          tag: "A test is coming. Boss at the end.",                   sky: ["#171a45", "#2a3566"], ground: "#233a5e", lane: "#5f6b86", glow: "#9fd6c8", pool: ["wonder", "flutter", "hurry"],              waves: 6, boss: 0,    stars0: 170 },
  { name: "Whispering Woods",   tag: "Friend worries rustle in the trees.",                  sky: ["#17213f", "#26385a"], ground: "#21403f", lane: "#6a6a76", glow: "#b9e0a8", pool: ["wonder", "mind", "flutter", "replay"],      waves: 7, boss: null, stars0: 190 },
  { name: "Lantern Hill",       tag: "Friends can fall out. Boss at the end.",               sky: ["#231a45", "#3a2a62"], ground: "#33305e", lane: "#78687a", glow: "#f0a868", pool: ["mind", "replay", "allnone", "hurry"],       waves: 7, boss: 1,    stars0: 210 },
  { name: "Sleepy Orchard",     tag: "All-or-Nothing thoughts and a few shadows.",           sky: ["#2a1a40", "#432a5a"], ground: "#3a2f58", lane: "#7a6678", glow: "#e8a5a5", pool: ["allnone", "myfault", "shadow", "wonder"],    waves: 8, boss: null, stars0: 230 },
  { name: "Starfall Lake",      tag: "Everyone makes mistakes. Boss at the end.",            sky: ["#14204a", "#223a6a"], ground: "#1f3a5a", lane: "#5f6f88", glow: "#cfd8f0", pool: ["myfault", "gloom", "allnone", "replay"],     waves: 8, boss: 2,    stars0: 250 },
  { name: "Misty Moor",         tag: "Night shadows hide in the mist. Bring a lantern.",     sky: ["#161a38", "#262c52"], ground: "#2a3452", lane: "#656b82", glow: "#7d8ad8", pool: ["shadow", "gloom", "heap", "flutter"],        waves: 8, boss: null, stars0: 270 },
  { name: "Cloudtop Garden",    tag: "Something is under the bed. Boss at the end.",         sky: ["#1a1840", "#2e2a60"], ground: "#2e3060", lane: "#6c6486", glow: "#c9a6e8", pool: ["shadow", "heap", "mind", "hurry", "gloom"],  waves: 8, boss: 3,    stars0: 290 },
  { name: "Dreamy Dunes",       tag: "Big changes and lots to do. Take it slowly.",          sky: ["#241a3a", "#3c2c56"], ground: "#43355a", lane: "#7e6a78", glow: "#f0b08c", pool: ["heap", "allnone", "replay", "wonder", "gloom"], waves: 9, boss: null, stars0: 310 },
  { name: "The Sleepy Sky",     tag: "One last big worry. Then it's time to rest.",          sky: ["#100f30", "#221e52"], ground: "#262658", lane: "#6a6288", glow: "#f2d37c", pool: ["wonder", "mind", "allnone", "shadow", "gloom", "heap", "replay"], waves: 9, boss: 4, stars0: 330 },
];

/* levels are twice as long as they first were: LEN times as many waves, with the strength and the stars spread over them so it is longer, not harder */
export const LEN = 2;

/* a wave is a list of groups: [type, how many, seconds between them, seconds before the first] */
export function makeWaves(L) {
  const lv = LEVELS[L], out = [], n = lv.waves * LEN;
  let seed = L * 977 + 13; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let w = 0; w < n; w++) {
    const u = w / LEN, groups = [], k = 1 + (u >= 2 ? 1 : 0) + (u >= 5 && L >= 4 ? 1 : 0);
    const size = Math.round(4 + u * 1.1 + L * 0.5);
    for (let g = 0; g < k; g++) {
      const t = lv.pool[Math.floor(rnd() * lv.pool.length)], big = WORRY[t].hp >= 60;
      const cnt = Math.max(2, Math.round((size / k) * (big ? 0.35 : 1) * (t === "hurry" ? 1.2 : 1)));
      groups.push([t, cnt, big ? 4.2 : t === "hurry" ? 1.8 : 2.6, g * 6]);
    }
    // each level introduces its newest worry in wave 1 so there is something to learn
    if (w === LEN) lv.pool.slice(-1).forEach((t) => groups.push([t, 2, 4, 3]));
    out.push(groups);
  }
  if (lv.boss != null) out[n - 1] = [["__boss", 1, 1, 2], ...(L >= 3 ? [[lv.pool[0], 4, 3, 10]] : [])];
  return out;
}

/* ---------------- Calm Cards: one for each worry, unlocked the first time it is turned into a star ---------------- */
export const CARD = {
  wonder:  ["Fortune Teller", "Your brain guesses the worst before it happens.", "Ask: what's most likely? Often it's something much calmer."],
  flutter: ["Nervous Tummy", "Butterflies in your tummy mean your body is getting ready.", "Breathe in slowly, then out even slower. The flutters settle."],
  mind:    ["Mind Reader", "Guessing what other people think, usually something unkind.", "You can't read minds. You could ask, or just assume they're friendly."],
  allnone: ["All-or-Nothing", "Words like always and never, as if there's no middle.", "Look for the middle. Most days are a mix of good and bad."],
  myfault: ["All My Fault", "Blaming yourself for things that had lots of causes.", "Draw a pie of everything that played a part. You're only one slice."],
  shadow:  ["Dark Worries", "Night makes ordinary things look strange.", "Switch a small light on. Shapes turn back into coats and chairs."],
  hurry:   ["Should and Must", "Feeling you have to be better or faster right now.", "Swap 'I should' for 'I'm learning'. Growing takes time."],
  gloom:   ["Ignoring the Good", "Only noticing what went wrong.", "Find three good things from today. Small ones count."],
  replay:  ["Replay Loop", "Playing an embarrassing moment over and over.", "Others forget quickly. Let the thought float by like a cloud."],
  heap:    ["Too Much", "A pile of jobs that feels impossible.", "Pick one small step. Do just that. Then rest."],
  test:    ["The Big Test", "Worry about a test or being judged.", "Do a little each day, sleep well, and remember it's one day."],
  falling: ["The Falling Out", "A friendship wobble.", "A kind word, or just saying sorry, can start to fix it."],
  mistake: ["The Big Mistake", "Feeling bad about getting something wrong.", "Mistakes show your brain what to learn next. Everyone makes them."],
  bed:     ["Under the Bed", "A scary shape in the dark.", "Look at it with the light on. It's almost always something ordinary."],
  cloud:   ["The Big Worry Cloud", "When everything feels like too much at once.", "Breathe, name one thing, and tell a grown-up you trust."],
};
export const CARD_ORDER = ["wonder", "flutter", "mind", "allnone", "myfault", "shadow", "hurry", "gloom", "replay", "heap", "test", "falling", "mistake", "bed", "cloud"];

/* ---------------- gentle achievements ---------------- */
export const ACH = [
  ["first-star", "⭐", "First Star", "Turn your first worry into a star"],
  ["lvl-1", "🌿", "Quiet Meadow", "Finish level 1"],
  ["lvl-5", "🌳", "Halfway There", "Finish level 5"],
  ["lvl-10", "🌌", "Sleepy Sky", "Finish level 10"],
  ["boss-1", "📝", "Big Test Beaten", "Calm your first big worry"],
  ["boss-all", "👑", "Dreamkeeper", "Calm all five big worries"],
  ["harmony", "🎶", "Harmony", "Hit a worry with light, a slow and a calm at once"],
  ["upgrade", "🔆", "Glow Up", "Upgrade a helper to its top level"],
  ["all-towers", "🏡", "Full Garden", "Build all eight kinds of helper"],
  ["cosy", "🧸", "Cosy", "Have a blanket warming three helpers"],
  ["quiet", "🕊️", "Quiet Garden", "Finish a level without letting any worry through"],
  ["cards-5", "🃏", "Calm Collector", "Collect 5 Calm Cards"],
  ["cards-all", "📚", "Calm Library", "Collect all 15 Calm Cards"],
  ["breathe", "🌬️", "Deep Breath", "Finish a full breathing exercise"],
  ["good-things", "💛", "Three Good Things", "Pick three good things from your day"],
  ["sweet", "😴", "Sweet Dreams", "Play until the sleep timer says goodnight"],
  ["streak", "🌙", "Wind-Down Habit", "Play on three evenings in a row"],
];
export const GOOD = ["⚽ Football", "👨‍👩‍👦 Family", "😂 Something funny", "🍕 Tasty food", "🐶 Animals", "🎮 Gaming", "🌤️ Being outside", "📚 Learning something", "🤝 A friend", "😌 A quiet moment"];
