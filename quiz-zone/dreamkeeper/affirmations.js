/* Dreamkeeper: the kind words at the end of a level.
   What the research says, and what this file does about it:
   - Big, general claims ("I am amazing") can backfire for children and adults who don't quite believe them (Wood, Perunovic and Lee, 2009).
     So these are modest and believable: about effort, learning, coping and being kind to yourself, never "I am perfect" or "I am the best".
   - Praise for effort and the way you did something works better than praise for being clever (Mueller and Dweck, 1998).
     So every message is paired with real evidence from what George just did in the game, so it can't be argued with ("You turned 23 worries
     into happy thoughts").
   - Looking at what matters to you is the strongest kind of self-affirmation (Steele; Cohen and Sherman). So he can tap what matters to him.
   - Talking to yourself kindly after a wobble (self-compassion) is a skill children can learn.
   Everything is written in the first person so it reads like George's own kind thoughts. */

export const AFFIRM = {
  effort: [
    "I can do hard things, one small step at a time.",
    "I tried my best today, and that is something to be proud of.",
    "I'm still learning, and learning is what brains are for.",
    "Mistakes help me grow. I don't need to be perfect.",
    "I keep going even when things feel tricky.",
    "Every time I try, I get a little stronger.",
    "I don't have to know everything yet.",
    "I can get better at things with practice.",
    "I'm allowed to take my time.",
    "Trying is brave, even when it's hard.",
    "I can make a plan and take the first step.",
    "I worked out a tricky problem tonight, and I can work out more.",
  ],
  coping: [
    "When I feel worried, I can slow my breathing and it gets easier.",
    "Worries come and go like clouds, and I'm still here.",
    "It's okay to feel nervous. I can handle this.",
    "I've felt worried before and I got through it.",
    "I can ask for help, and asking is a smart thing to do.",
    "My feelings are allowed to be here.",
    "Big feelings pass, and I know some things that help.",
    "I can notice a worry and decide not to follow it.",
    "I can calm my body, and my mind follows.",
    "I know how to turn a worry into something kinder.",
    "I don't have to solve everything tonight.",
    "Tomorrow I can try again with a fresh mind.",
  ],
  kind: [
    "I can talk to myself the way I'd talk to a good friend.",
    "I'm allowed to be kind to myself when things go wrong.",
    "I'm good enough as I am, and I can keep growing too.",
    "I deserve rest, fun and kindness, just like everyone.",
    "My best is enough, even on days when it's small.",
    "I can forgive myself for mistakes.",
    "I am more than one bad moment.",
    "I'm worth looking after, and that includes me.",
    "I can be proud and still keep learning.",
    "I don't have to earn being cared about.",
  ],
  connect: [
    "I'm a good friend, and I'm learning to be an even better one.",
    "People care about me, and I can care about them.",
    "I'm not alone. There are people I can talk to.",
    "My kindness makes a difference.",
    "There are good things about me, and I can name some.",
    "I'm allowed to have fun and enjoy things.",
    "I can be brave and kind at the same time.",
    "My ideas are worth sharing.",
    "I can be myself, and the right people will like that.",
    "I'm someone who keeps trying, and that's a great thing to be.",
  ],
  team: [
    "Even the best players miss, and they step up again. So can I.",
    "A good team looks after each other. I can be a good teammate to myself.",
    "I train my mind like I train my legs: bit by bit.",
    "Feeling the pressure just means my body is getting ready to play.",
  ],
  big: [
    "I faced a big worry and I stayed in the game.",
    "Big worries get smaller when I look at them with facts and with friends.",
    "I'm braver than I thought.",
    "I can face scary things with breathing and with help.",
  ],
};
export const FINAL = "Every worry in this garden was once a worry I faced. I'm braver and calmer than I knew.";

/* for the goodnight screen: thoughts to sleep on */
export const SLEEP = [
  "My day is done. I can rest now.",
  "Tonight I can let my worries go, and tomorrow I can look at them again.",
  "My body knows how to sleep. I can let it.",
  "It's safe and quiet. I can be calm.",
  "I did enough today.",
  "The things I can't fix tonight can wait until morning.",
  "I'm warm, safe and ready to rest.",
  "Good things happened today. I can remember one as I drift off.",
];

/* "What matters to you?" (values affirmation) */
export const VALUES = [
  ["kind", "Being kind", "Being kind matters to you, and tonight you were kind to yourself too."],
  ["family", "Family", "Family matters to you. Caring about people is a real strength."],
  ["friends", "Friends", "Friends matter to you. That's a lovely thing to care about."],
  ["football", "Football", "Football matters to you. It teaches you to keep going and play as a team."],
  ["brave", "Being brave", "Being brave matters to you, and you showed it by facing the worries."],
  ["learning", "Learning", "Learning matters to you. That's why you keep trying."],
  ["fun", "Having fun", "Having fun matters to you. Joy is important too."],
];

/* The proof: real things George did this level, in the order that matters most. Up to three. */
export function proofLines(info) {
  const out = [], n = info.kills || 0;
  if (info.boss) out.push(`You faced ${info.boss} and calmed it.`);
  if (info.leaks === 0) out.push("Not one worry got through. You kept the garden calm.");
  else if (info.breathers) out.push("You took a breather when it got tough. Knowing when to rest is smart.");
  else if (info.leaks <= 3) out.push(`Only ${info.leaks} slipped through, and you carried on.`);
  else out.push("Some worries got through, and you kept going. That's real strength.");
  if (n >= 1) out.push(`You turned ${n} worr${n === 1 ? "y" : "ies"} into happy thoughts.`);
  if (info.towers >= 3 && out.length < 3) out.push(`You planted ${info.towers} helpers and made them work as a team.`);
  if (info.early && out.length < 3) out.push("You started a wave early when you felt ready.");
  if (info.total >= 20 && out.length < 3) out.push(`That's ${info.total} worries turned into happy thoughts so far.`);
  return out.slice(0, 3);
}

/* One affirmation: a mix across kinds, boss levels get a brave one, the last level gets the big one; never one used lately. */
export function pickAffirmation(info, save) {
  if (info.level >= 9) return FINAL;
  const order = info.boss ? ["big", "coping", "effort", "kind"] : ["effort", "coping", "kind", "connect", "team"];
  const kind = order[(info.level + (save.aff ? save.aff.length : 0)) % order.length];
  const recent = save.aff || [];
  let pool = AFFIRM[kind].filter((t) => !recent.includes(t));
  if (!pool.length) pool = Object.values(AFFIRM).flat().filter((t) => !recent.includes(t));
  if (!pool.length) pool = AFFIRM[kind];
  const t = pool[Math.floor(Math.random() * pool.length)];
  save.aff = recent.concat(t).slice(-14);
  return t;
}
