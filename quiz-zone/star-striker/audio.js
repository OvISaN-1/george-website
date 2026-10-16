/* Star Striker: all sound is made in code with the Web Audio API (no audio files). */

let ctx = null, master = null, sfxGain = null, musGain = null, noiseBuf = null;
let soundOn = true, musicOn = true;
const lastPlayed = {};

function ensure() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
  sfxGain = ctx.createGain(); sfxGain.gain.value = soundOn ? 0.8 : 0; sfxGain.connect(master);
  musGain = ctx.createGain(); musGain.gain.value = musicOn ? 0.32 : 0; musGain.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

function tone(type, f0, f1, dur, vol, when = 0, out = sfxGain) {
  const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, lp0, lp1, when = 0) {
  const t = ctx.currentTime + when, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = "lowpass"; f.frequency.setValueAtTime(lp0, t); f.frequency.exponentialRampToValueAtTime(Math.max(60, lp1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t); s.stop(t + dur + 0.02);
}

const SFX = {
  laser: () => tone("square", 980, 340, 0.07, 0.05),
  twin: () => { tone("square", 1100, 420, 0.07, 0.045); },
  missile: () => { noise(0.18, 0.08, 2400, 500); tone("sawtooth", 300, 90, 0.2, 0.05); },
  ball: () => { tone("sine", 220, 120, 0.12, 0.12); tone("triangle", 660, 330, 0.08, 0.06); },
  nova: () => tone("sine", 500, 1400, 0.18, 0.07),
  beam: () => tone("sawtooth", 180, 190, 0.09, 0.04),
  hit: () => { noise(0.08, 0.1, 3000, 900); tone("square", 260, 140, 0.05, 0.05); },
  boom: () => { noise(0.35, 0.28, 2200, 120); tone("sine", 140, 40, 0.3, 0.25); },
  big: () => { noise(0.9, 0.4, 2600, 80); tone("sine", 120, 28, 0.8, 0.4); noise(0.5, 0.25, 4000, 200, 0.18); },
  hurt: () => { noise(0.4, 0.3, 1800, 100); tone("sawtooth", 220, 55, 0.4, 0.2); },
  pick: () => { [660, 880, 1320].forEach((f, i) => tone("triangle", f, f, 0.1, 0.12, i * 0.06)); },
  power: () => { tone("sawtooth", 240, 1200, 0.3, 0.1); [520, 780, 1040].forEach((f, i) => tone("square", f, f, 0.12, 0.07, 0.12 + i * 0.07)); },
  gem: () => tone("sine", 1200 + Math.random() * 300, 1800, 0.05, 0.06),
  bomb: () => { noise(1.1, 0.5, 3000, 60); tone("sine", 90, 24, 1, 0.5); },
  warn: () => { for (let i = 0; i < 4; i++) { tone("sawtooth", 520, 520, 0.28, 0.12, i * 0.5); tone("sawtooth", 390, 390, 0.28, 0.12, i * 0.5 + 0.25); } },
  clear: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => { tone("triangle", f, f, 0.22, 0.14, i * 0.1); tone("square", f / 2, f / 2, 0.22, 0.05, i * 0.1); }); },
  ach: () => { [880, 1175, 1568].forEach((f, i) => tone("sine", f, f, 0.3, 0.14, i * 0.09)); },
  combo: () => tone("triangle", 600, 900, 0.08, 0.07),
  over: () => { [392, 330, 262, 196].forEach((f, i) => tone("triangle", f, f * 0.96, 0.35, 0.16, i * 0.22)); },
  click: () => tone("square", 800, 600, 0.05, 0.06),
};

export const audio = {
  unlock() { ensure(); },
  play(name, minGap = 0) {
    if (!soundOn || !ensure() || !SFX[name]) return;
    const now = performance.now(); if (minGap && lastPlayed[name] && now - lastPlayed[name] < minGap) return;
    lastPlayed[name] = now; try { SFX[name](); } catch (e) {}
  },
  setSound(on) { soundOn = !!on; if (sfxGain) sfxGain.gain.value = soundOn ? 0.8 : 0; },
  setMusic(on) { musicOn = !!on; if (musGain) musGain.gain.value = musicOn ? 0.32 : 0; },
  get soundOn() { return soundOn; },
  get musicOn() { return musicOn; },
};

/* ---------------- music: a bass line, a plucky arpeggio and a beat; faster on later levels and in boss fights ---------------- */
const SCALE = [0, 3, 5, 7, 10, 12, 15, 17];               // minor pentatonic-ish
const ROOTS = [110, 98, 123.5, 87.3, 110, 130.8, 103.8, 92.5, 116.5, 98];   // a different key on each level
let timer = 0, nextT = 0, step = 0, level = 0, boss = false, running = false;
const mtof = (root, semis) => root * Math.pow(2, semis / 12);

function schedule() {
  if (!ctx || !running) return;
  const bpm = 118 + level * 4 + (boss ? 18 : 0), sp = 60 / bpm / 4;
  while (nextT < ctx.currentTime + 0.3) {
    const when = Math.max(0, nextT - ctx.currentTime), root = ROOTS[level % 10], s = step % 16;
    if (s % 4 === 0) { tone("sine", 140, 45, 0.16, 0.5, when, musGain); }                                           // kick
    if (s % 2 === 1) { const t = ctx.currentTime + when, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = 7000; g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); src.connect(f); f.connect(g); g.connect(musGain); src.start(t); src.stop(t + 0.06); }
    const bassPat = [0, 0, 7, 0, 5, 5, 7, 3][(step >> 1) % 8];
    if (s % 2 === 0) { tone("sawtooth", mtof(root, bassPat), mtof(root, bassPat), sp * 1.8, boss ? 0.2 : 0.15, when, musGain); }
    const arp = SCALE[[0, 2, 4, 2, 5, 3, 6, 4, 7, 4, 5, 2, 3, 1, 4, 2][s] % SCALE.length];
    tone("square", mtof(root * 4, arp), mtof(root * 4, arp), sp * 0.9, boss ? 0.075 : 0.055, when, musGain);
    step++; nextT += sp;
  }
}
export const music = {
  start(lvl, isBoss) { if (!ensure()) return; level = lvl; boss = !!isBoss; if (running) return; running = true; step = 0; nextT = ctx.currentTime + 0.05; timer = setInterval(schedule, 80); },
  set(lvl, isBoss) { level = lvl; boss = !!isBoss; },
  stop() { running = false; clearInterval(timer); },
};
