/* Dreamkeeper: sleepy sound, all made in code. Slow warm pads, a soft music-box tune, a dreamy echo, and optional crickets and rain.
   Everything is quiet and gentle on purpose: no sudden loud noises. */

let ctx = null, master, dry, wet, musicBus, sfxBus, ambBus, noiseBuf, rainNode = null;
let soundOn = true, musicOn = true, rainOn = false, cricketsOn = true;
let fade = 1;                                   // 1 = normal, goes down as bedtime gets closer
const last = {};

function ensure() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.8 * fade; master.connect(ctx.destination);
  dry = ctx.createGain(); dry.gain.value = 0.7; dry.connect(master);
  wet = ctx.createGain(); wet.gain.value = 0.55; wet.connect(master);
  // a soft, long echo made from fading noise
  const len = Math.floor(ctx.sampleRate * 3.4), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  const conv = ctx.createConvolver(); conv.buffer = ir; conv.connect(wet);
  musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.9 : 0; musicBus.connect(dry); musicBus.connect(conv);
  sfxBus = ctx.createGain(); sfxBus.gain.value = soundOn ? 0.9 : 0; sfxBus.connect(dry); sfxBus.connect(conv);
  ambBus = ctx.createGain(); ambBus.gain.value = soundOn ? 1 : 0; ambBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return ctx;
}

function note(freq, dur, vol, type = "sine", when = 0, bus = sfxBus, attack = 0.01, lp = 0) {
  const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let out = g; if (lp) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; g.connect(f); out = f; }
  o.connect(g); out.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
function pad(freq, dur, vol, when) {
  const t = ctx.currentTime + when, f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 950; f.connect(musicBus);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.linearRampToValueAtTime(vol * 0.8, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 3.5); g.connect(f);
  for (const [type, det] of [["sine", 0], ["triangle", 4]]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = det; o.connect(g); o.start(t); o.stop(t + dur + 3.6); }
}
function noiseBurst(dur, vol, freq, q, when = 0, bus = sfxBus) {
  const t = ctx.currentTime + when, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.02);
}

const PENTA = [0, 2, 4, 7, 9];
const ROOTS = [130.81, 110.0, 146.83, 123.47, 130.81, 98.0, 110.0, 146.83, 123.47, 130.81];   // C A D B C G A D B C
const CHORDS = [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 16]];            // maj7, m7, maj7, 6
const mtof = (root, s) => root * Math.pow(2, s / 12);

const SFX = {
  place: () => { note(392, 1.2, 0.07); note(523, 1.4, 0.05, "sine", 0.09); },
  up: () => { [392, 494, 587, 784].forEach((f, i) => note(f, 1.4, 0.06, "sine", i * 0.1)); },
  star: (n = 0) => { const f = mtof(523.25, PENTA[Math.floor(Math.random() * 5)] + 12 * (Math.random() < 0.3 ? 1 : 0)); note(f, 1.6, 0.045 * (n ? 1 : 1)); },
  chime: () => { note(1318, 1.6, 0.025); note(1568, 1.8, 0.02, "sine", 0.12); },
  puff: () => noiseBurst(0.35, 0.03, 900, 0.7),
  beam: () => { note(220, 0.9, 0.05, "sine"); note(330, 0.8, 0.03, "sine", 0.05); },
  zap: () => note(1760, 0.6, 0.018),
  wave: () => { note(98, 3.2, 0.1, "sine", 0, sfxBus, 0.4); note(147, 3.0, 0.05, "sine", 0.1, sfxBus, 0.4); },
  leak: () => { note(110, 1.0, 0.09, "sine"); },
  boss: () => { note(73.4, 4.5, 0.1, "sine", 0, sfxBus, 1.5); note(110, 4.2, 0.07, "sine", 0.2, sfxBus, 1.5); },
  win: () => { [392, 494, 587, 784, 988].forEach((f, i) => note(f, 2.2, 0.06, "sine", i * 0.28)); },
  click: () => note(660, 0.25, 0.04),
  breathe: () => note(196, 3.5, 0.05, "sine", 0, sfxBus, 1.5),
  bye: () => { [523, 392, 330, 262].forEach((f, i) => note(f, 3, 0.06, "sine", i * 0.5)); },
};

export const audio = {
  unlock() { ensure(); },
  play(name, gap = 0, arg) { if (!soundOn || !ensure() || !SFX[name]) return; const n = performance.now(); if (gap && last[name] && n - last[name] < gap) return; last[name] = n; try { SFX[name](arg); } catch (e) {} },
  setSound(on) { soundOn = !!on; if (sfxBus) { sfxBus.gain.value = soundOn ? 0.9 : 0; ambBus.gain.value = soundOn ? 1 : 0; } },
  setMusic(on) { musicOn = !!on; if (musicBus) musicBus.gain.value = musicOn ? 0.9 : 0; },
  setRain(on) { rainOn = !!on; if (!ensure()) return; if (rainOn && !rainNode) { const s = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf; s.loop = true; lp.type = "lowpass"; lp.frequency.value = 1700; hp.type = "highpass"; hp.frequency.value = 350; g.gain.value = 0.045; s.connect(lp); lp.connect(hp); hp.connect(g); g.connect(ambBus); s.start(); rainNode = { s, g }; } else if (!rainOn && rainNode) { rainNode.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4); const r = rainNode; setTimeout(() => { try { r.s.stop(); } catch (e) {} }, 1500); rainNode = null; } },
  setCrickets(on) { cricketsOn = !!on; },
  /* 1 = normal, 0 = silent. Moves slowly so nothing changes suddenly. */
  setFade(f, secs = 4) { fade = Math.max(0, Math.min(1, f)); if (master) master.gain.setTargetAtTime(0.8 * fade, ctx.currentTime, secs / 3); },
  get soundOn() { return soundOn; }, get musicOn() { return musicOn; },
};

/* ---------------- the lullaby ---------------- */
let timer = 0, running = false, level = 0, nextT = 0, beat = 0, bpm = 52, cricketAt = 0;
function schedule() {
  if (!ctx || !running) return;
  const sp = 60 / bpm;
  while (nextT < ctx.currentTime + 0.5) {
    const when = Math.max(0, nextT - ctx.currentTime), root = ROOTS[level % 10], bar = Math.floor(beat / 8) % 4, b = beat % 8;
    if (b === 0) {
      const ch = CHORDS[bar]; ch.forEach((s, i) => pad(mtof(root * 2, s), sp * 8, 0.06 - i * 0.006, when + i * 0.15));
      note(mtof(root, ch[0] - 12), sp * 8, 0.11, "sine", when, musicBus, 1.2);
    }
    if (b % 2 === 0 && Math.random() < 0.55) {
      const s = PENTA[Math.floor(Math.random() * 5)] + (Math.random() < 0.3 ? 12 : 0) + (bar === 1 ? -3 : 0), f = mtof(root * 4, s);
      note(f, 3.2, 0.05, "sine", when + Math.random() * 0.4, musicBus, 0.012); note(f * 2, 1.4, 0.014, "sine", when + 0.01, musicBus, 0.012);
    }
    if (cricketsOn && ensure() && nextT > cricketAt && Math.random() < 0.25) { cricketAt = nextT + 5 + Math.random() * 5; for (let i = 0; i < 3; i++) noiseBurst(0.07, 0.012, 4300, 14, when + i * 0.13, ambBus); }
    beat++; nextT += sp;
  }
}
export const music = {
  start(lv) { if (!ensure()) return; level = lv; if (running) return; running = true; beat = 0; nextT = ctx.currentTime + 0.1; timer = setInterval(schedule, 120); },
  set(lv) { level = lv; }, stop() { running = false; clearInterval(timer); },
  /* tempo goes from 52 down to about 42 as the night goes on */
  setTempo(t) { bpm = Math.max(40, Math.min(60, t)); },
};
