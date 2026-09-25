/* ================================================================
   MATCHDAY: Rock Anthem Goals
   A short rock riff blasts out when George scores. Every sound is
   made in the browser (distorted guitar, bass and drums), so there
   are no sound files. All riffs are made up for the game.

   How a riff is written (each step is a 16th note):
     guitar:  "E2:2 G2:2 A2:4"  a power chord (root, fifth, octave)
              "e4:1"            one lead note (lower-case letter)
              "E2:1m"           palm-muted (short and chunky)
              "-:2"             rest
     drums:   one letter per 16th, "." is silence
              k kick   s snare   h hi-hat   c crash   x kick + crash
              p hand clap   t tom   f floor tom
   ================================================================ */
(function (MDR) {
  "use strict";

  const RIFFS = {
    power: {
      bpm: 140,
      gtr: "E2:2 E2:2 G2:2 A2:4 E2:2 G2:2 A2:2 C3:2 B2:8",
      drm: "x.h.s.h.k.h.s.h.k.k.s.h.c.......",
    },
    stomp: {
      bpm: 124,
      gtr: "-:16 E2:2 E2:2 D2:2 E2:8",
      drm: "k.k.p...k.k.p...x.s.s.c.......",
    },
    punk: {
      bpm: 184,
      gtr: "A2:2 A2:2 A2:2 A2:2 D3:2 D3:2 E3:2 E3:2 A2:2 A2:2 G2:2 G2:2 A2:8",
      drm: "k.s.k.s.k.s.k.s.k.s.k.s.x.......",
    },
    boogie: {
      bpm: 132,
      gtr: "e2:2 g#2:2 b2:2 c#3:2 d3:2 c#3:2 b2:2 g#2:2 E2:2 -:2 E2:8",
      drm: "k.h.s.h.k.h.s.h.k.h.s.h.x.......",
    },
    anthem: {
      bpm: 96,
      gtr: "E2:4 C3:4 D3:4 E3:12",
      drm: "x...s...k.k.s...x.......",
    },
    gallop: {
      bpm: 150,
      gtr: "E2:2m E2:1m E2:1m E2:2m E2:1m E2:1m E2:2m E2:1m E2:1m G2:2 F#2:2 E2:8",
      drm: "k.kkk.kkk.kks.s.c.......",
    },
    shred: {
      bpm: 150,
      gtr: "E2:4 e4 g4 a4 b4 d5 e5 d5 b4 a4 g4 a4 b4 d5 e5 g5 e5:8",
      drm: "x...h.h.h.h.h.h.k.k.k.k.c.......",
    },
    drums: {
      bpm: 140,
      gtr: "-:24 E2:8",
      drm: "k.s.ksksttttffffssssssssx.......",
    },
    trent: {
      bpm: 128,
      gtr: "-:8 E2:2 E2:2 E3:2 D3:2 E2:2 E2:2 G2:2 A2:2 E2:8",
      drm: "ttttffffk.s.k.s.k.s.k.s.x.......",
    },
    master: {
      bpm: 152,
      gtr: "E2:1m E2:1m G2:2 A2:2 E2:1m E2:1m A#2:2 A2:4 b4 d5 e5 g5 a5 g5 e5 d5 e5:8",
      drm: "k.s.k.s.k.s.k.s.h.h.h.h.x.......",
    },
  };

  const NOTE = { c: 0, "c#": 1, d: 2, "d#": 3, e: 4, f: 5, "f#": 6, g: 7, "g#": 8, a: 9, "a#": 10, b: 11 };
  function freq(name) {
    const m = /^([a-g]#?)(\d)$/i.exec(name);
    if (!m) return 0;
    const midi = 12 * (Number(m[2]) + 1) + NOTE[m[1].toLowerCase()];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function parseGuitar(str) {
    let step = 0;
    return str.trim().split(/\s+/).map((tok) => {
      const m = /^([^:]+?)(?::(\d+))?(m?)$/.exec(tok);
      const len = Number(m[2] || 1), ev = { step, len, rest: m[1] === "-", chord: /^[A-G]/.test(m[1]), mute: !!m[3], f: freq(m[1]) };
      step += len;
      return ev;
    });
  }
  function length(riff) {
    const g = parseGuitar(riff.gtr).reduce((t, e) => Math.max(t, e.step + e.len), 0);
    return Math.max(g, riff.drm.length) * (60 / riff.bpm / 4);
  }

  // A soft-clipping curve: turns clean oscillators into a crunchy rock guitar.
  let curve = null;
  function distCurve() {
    if (curve) return curve;
    const n = 1024, k = 60;
    curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
    return curve;
  }
  const noiseCache = new WeakMap();
  function whiteNoise(a) {
    if (noiseCache.has(a)) return noiseCache.get(a);
    const len = a.sampleRate, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(a, buf);
    return buf;
  }

  function guitarHit(a, out, ev, t0, dur) {
    const notes = ev.chord ? [ev.f, ev.f * 1.4983, ev.f * 2] : [ev.f];
    const sum = a.createGain(); sum.gain.value = ev.chord ? 0.3 : 0.45;
    const oscs = [];
    notes.forEach((f) => [-6, 6].forEach((cents) => {
      const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = cents;
      if (!ev.chord && dur > 0.4) {
        // Lead notes that ring get a little vibrato, like a real guitarist.
        const lfo = a.createOscillator(), lg = a.createGain();
        lfo.frequency.value = 6; lg.gain.value = 14;
        lfo.connect(lg); lg.connect(o.detune); lfo.start(t0 + 0.15); lfo.stop(t0 + dur + 0.1);
      }
      o.connect(sum); oscs.push(o);
    }));
    const shaper = a.createWaveShaper(); shaper.curve = distCurve(); shaper.oversample = "2x";
    const tone = a.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = ev.mute ? 1200 : 3200; tone.Q.value = 0.8;
    const body = a.createBiquadFilter(); body.type = "peaking"; body.frequency.value = 800; body.gain.value = -5;
    const env = a.createGain();
    const ring = ev.mute ? Math.min(dur, 0.09) : dur * 0.95;
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(0.5, t0 + 0.006);
    env.gain.setValueAtTime(0.5, t0 + ring * 0.6);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + ring + 0.05);
    sum.connect(shaper); shaper.connect(tone); tone.connect(body); body.connect(env); env.connect(out);
    oscs.forEach((o) => { o.start(t0); o.stop(t0 + ring + 0.08); });
    // Bass guitar follows the chords, an octave down.
    if (ev.chord) {
      const b = a.createOscillator(), bg = a.createGain(), bf = a.createBiquadFilter();
      b.type = "square"; b.frequency.value = ev.f / 2; bf.type = "lowpass"; bf.frequency.value = 500;
      bg.gain.setValueAtTime(0.18, t0); bg.gain.exponentialRampToValueAtTime(0.001, t0 + ring + 0.05);
      b.connect(bf); bf.connect(bg); bg.connect(out); b.start(t0); b.stop(t0 + ring + 0.08);
    }
  }

  function drumHit(a, out, ch, t0) {
    const noise = (dur, type, f, vol, q) => {
      const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
      s.buffer = whiteNoise(a); fl.type = type; fl.frequency.value = f; if (q) fl.Q.value = q;
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      s.connect(fl); fl.connect(g); g.connect(out); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
    };
    const thump = (from, to, dur, vol) => {
      const o = a.createOscillator(), g = a.createGain();
      o.frequency.setValueAtTime(from, t0); o.frequency.exponentialRampToValueAtTime(to, t0 + dur * 0.8);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.02);
    };
    if (ch === "k" || ch === "x") thump(130, 42, 0.32, 0.9);
    if (ch === "x" || ch === "c") noise(1.4, "highpass", 5000, 0.28);
    if (ch === "s") { noise(0.18, "highpass", 1400, 0.45); thump(220, 160, 0.1, 0.3); }
    if (ch === "h") noise(0.05, "highpass", 7500, 0.16);
    if (ch === "p") [0, 0.012, 0.024].forEach((d) => { const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); s.buffer = whiteNoise(a); fl.type = "bandpass"; fl.frequency.value = 1500; fl.Q.value = 1.2; g.gain.setValueAtTime(0.7, t0 + d); g.gain.exponentialRampToValueAtTime(0.001, t0 + d + 0.09); s.connect(fl); fl.connect(g); g.connect(out); s.start(t0 + d, Math.random() * 0.5); s.stop(t0 + d + 0.1); });
    if (ch === "t") thump(200, 120, 0.22, 0.6);
    if (ch === "f") thump(120, 70, 0.3, 0.7);
  }

  /* Play a riff now. ctx is an AudioContext (or null when the sound is
     off). Returns { duration, stop() } so a skipped celebration can fade it. */
  function play(ctx, id) {
    const riff = RIFFS[id];
    if (!ctx || !riff) return { duration: 0, stop() {} };
    const out = ctx.createGain(), comp = ctx.createDynamicsCompressor();
    out.gain.value = 0.55;
    out.connect(comp); comp.connect(ctx.destination);
    const s16 = 60 / riff.bpm / 4, t0 = ctx.currentTime + 0.05;
    parseGuitar(riff.gtr).forEach((ev) => { if (!ev.rest && ev.f) guitarHit(ctx, out, ev, t0 + ev.step * s16, ev.len * s16); });
    [...riff.drm].forEach((ch, i) => { if (ch !== ".") drumHit(ctx, out, ch, t0 + i * s16); });
    const duration = length(riff);
    return {
      duration,
      stop() {
        try { const t = ctx.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + 0.25); } catch (e) {}
        setTimeout(() => { try { out.disconnect(); } catch (e) {} }, 400);
      },
    };
  }

  // The career locker plays a riff when George picks it. The game sets MDR.ctx.
  let current = null;
  function preview(id) {
    if (current) current.stop();
    current = play(MDR.ctx ? MDR.ctx() : null, id);
  }

  MDR.RIFFS = RIFFS;
  MDR.play = play;
  MDR.preview = preview;
  MDR.length = (id) => (RIFFS[id] ? length(RIFFS[id]) : 0);
  MDR.ctx = null;
})(window.MDR = window.MDR || {});
