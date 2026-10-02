/* ================================================================
   GZ MUSIC: the walk-out tune, goal song and crowd chants.

   Every sound is made in the browser (synthesised brass, a "crowd
   choir", stomps, claps and drums), so there are no sound files and
   nothing copyrighted: all the tunes are made up for the game.

   Real recordings can replace any of them: drop a file in assets/audio/
   called  walkout.mp3, goal.mp3, chant.mp3  or  win.mp3  (or .ogg; see the README
   there) and the game plays that instead.

   Use it from a game like this:
     const MUSIC = GZMusic.attach(SOUND);     // SOUND = GK.createSound(...)
     MUSIC.walkOut();  MUSIC.goalSong();  MUSIC.chant();  MUSIC.winTune();
     MUSIC.fadeOut(600);
     GZMusic.mountToggle(buttonElement);      // "Music: Loud / Quiet / Off"

   Level (Loud, Quiet, Off) is saved as gz_music and shared by all games.
   Nothing plays if the game's own sound is switched off.
   ================================================================ */
(function (GZMusic) {
  "use strict";

  const KEY = "gz_music";
  const LEVELS = { loud: 1, quiet: 0.35, off: 0 };
  const rnd = Math.random;
  const level = () => { try { const v = localStorage.getItem(KEY); return LEVELS[v] != null ? v : "loud"; } catch (e) { return "loud"; } };

  /* ---------------- notes ---------------- */
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function hz(name) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!m) return 440;
    const semi = SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
    return 440 * Math.pow(2, (semi - 69) / 12);
  }
  // Vowel formants (Hz): the "ah", "oh" and "ee" shapes that make a crowd sound like people.
  const VOWELS = {
    oh: [500, 900, 2600], ah: [730, 1090, 2440], eh: [530, 1840, 2480], ee: [270, 2290, 3010],
    oo: [300, 870, 2240], uh: [640, 1190, 2390], ay: [450, 2000, 2700],
  };

  /* ================================================================
     The instruments. Each takes a time t (seconds on the audio clock)
     and plays through "out". They work on a live AudioContext or an
     OfflineAudioContext (which is how the tunes are tested).
     ================================================================ */
  function makeKit(ctx, out) {
    const sr = ctx.sampleRate;
    const noiseBuf = (() => {
      const len = Math.floor(sr * 2), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = rnd() * 2 - 1;
      return b;
    })();

    function env(g, t, peak, a, dur, r) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.setValueAtTime(peak, Math.max(t + a, t + dur - 0.001));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r);
    }
    function noise(t, dur, o) {
      o = o || {};
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = o.type || "bandpass"; f.frequency.value = o.f || 1000; f.Q.value = o.q || 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(o.vol || 0.3, t + (o.a || 0.004));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(out);
      src.start(t, rnd() * 1.5); src.stop(t + dur + 0.05);
    }
    function tone(t, freq, dur, o) {
      o = o || {};
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = o.type || "sine";
      osc.frequency.setValueAtTime(freq, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || dur));
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(o.vol || 0.2, t + (o.a || 0.003));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + dur + 0.05);
    }

    /* ---- drums and crowd percussion ---- */
    const kick = (t, v) => { tone(t, 150, 0.4, { to: 42, glide: 0.12, vol: 0.95 * (v || 1) }); noise(t, 0.02, { f: 3000, vol: 0.18 * (v || 1) }); };
    const snare = (t, v) => { noise(t, 0.2, { f: 1900, q: 0.6, vol: 0.4 * (v || 1) }); tone(t, 200, 0.12, { type: "triangle", vol: 0.25 * (v || 1) }); };
    const clap = (t, v) => { [0, 0.011, 0.024].forEach((d) => noise(t + d, 0.05, { f: 1500, q: 0.9, vol: 0.34 * (v || 1) })); noise(t + 0.03, 0.16, { f: 1300, q: 0.7, vol: 0.2 * (v || 1) }); };
    const stomp = (t, v) => { tone(t, 95, 0.3, { to: 48, glide: 0.18, vol: 0.9 * (v || 1) }); noise(t, 0.18, { f: 320, type: "lowpass", q: 0.5, vol: 0.5 * (v || 1) }); };
    const hat = (t, v) => noise(t, 0.05, { f: 8000, type: "highpass", vol: 0.12 * (v || 1) });
    const tom = (t, f, v) => tone(t, f, 0.3, { to: f * 0.6, glide: 0.25, vol: 0.55 * (v || 1) });
    const crash = (t, v) => noise(t, 1.6, { f: 4000, type: "highpass", q: 0.3, vol: 0.38 * (v || 1), a: 0.01 });

    /* ---- stadium brass ---- */
    function brass(t, freq, dur, v) {
      const g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.Q.value = 2;
      f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(2600, t + 0.07); f.frequency.exponentialRampToValueAtTime(1500, t + dur);
      env(g, t, 0.13 * (v || 1), 0.035, dur, 0.1);
      [-7, 7].forEach((c) => {
        const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq; o.detune.value = c;
        o.connect(f); o.start(t); o.stop(t + dur + 0.15);
      });
      f.connect(g); g.connect(out);
    }
    function bass(t, freq, dur, v) {
      const g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 380;
      env(g, t, 0.34 * (v || 1), 0.01, dur, 0.06);
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq; o.connect(f);
      const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = freq / 2; o2.connect(f);
      f.connect(g); g.connect(out);
      o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
    }

    /* ---- the crowd choir: many slightly different voices through vowel filters ---- */
    function voices(t, freq, dur, vowel, o) {
      o = o || {};
      const n = o.n || 5, F = VOWELS[vowel] || VOWELS.oh;
      for (let i = 0; i < n; i++) {
        const st = t + (rnd() - 0.5) * (o.spread || 0.03);
        const osc = ctx.createOscillator(); osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq * (o.from || 1), st);
        if (o.from) osc.frequency.exponentialRampToValueAtTime(freq, st + (o.slide || 0.08));
        osc.detune.value = (rnd() - 0.5) * (o.detune || 28);
        const lfo = ctx.createOscillator(); lfo.frequency.value = 4.6 + rnd() * 1.4;
        const lg = ctx.createGain(); lg.gain.value = (o.vibrato == null ? 7 : o.vibrato);
        lfo.connect(lg); lg.connect(osc.detune); lfo.start(st); lfo.stop(st + dur + 0.4);
        const g = ctx.createGain();
        const a = o.attack || 0.07, peak = (o.vol || 0.1) / Math.sqrt(n);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(peak, st + a);
        g.gain.setValueAtTime(peak, Math.max(st + a, st + dur - 0.02));
        g.gain.exponentialRampToValueAtTime(0.0001, st + dur + (o.release || 0.22));
        F.forEach((fr, k) => {
          const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = fr * (0.96 + rnd() * 0.08); bp.Q.value = 7 + k * 3;
          const fg = ctx.createGain(); fg.gain.value = [1, 0.55, 0.3][k];
          osc.connect(bp); bp.connect(fg); fg.connect(g);
        });
        g.connect(out);
        osc.start(st); osc.stop(st + dur + (o.release || 0.22) + 0.1);
      }
      if (o.breath !== false) noise(t, Math.min(dur, 0.5), { f: F[1], q: 1.2, vol: 0.05 * (o.vol || 0.1) / 0.1 });
    }
    // A shouted word: a rough, fast voice, a bit of grit, dropping in pitch.
    const shout = (t, freq, dur, vowel, v) => voices(t, freq, dur, vowel, { n: 8, vol: 0.32 * (v || 1), attack: 0.015, release: 0.12, from: 1.12, slide: 0.07, detune: 70, vibrato: 2, spread: 0.02 });
    function roar(t, dur, v) {
      const vv = v || 1;
      noise(t, dur, { f: 700, q: 0.4, vol: 0.34 * vv, a: dur * 0.3 });
      noise(t, dur, { f: 1500, q: 0.5, vol: 0.18 * vv, a: dur * 0.35 });
      voices(t, 196, dur * 0.8, "ah", { n: 6, vol: 0.16 * vv, attack: dur * 0.3, detune: 90, vibrato: 3 });
    }

    return { noise, tone, kick, snare, clap, stomp, hat, tom, crash, brass, bass, voices, shout, roar };
  }

  /* ================================================================
     The tunes. t0 = when to start; returns how many seconds it lasts.
     ================================================================ */
  const CHORDS = {
    Am: ["A3", "C4", "E4"], F: ["F3", "A3", "C4"], C: ["C4", "E4", "G4"], G: ["G3", "B3", "D4"],
    D: ["D4", "F4", "A4"], Dm: ["D4", "F4", "A4"], E: ["E4", "G#4", "B4"],
  };
  const ROOT = { Am: "A2", F: "F2", C: "C3", G: "G2", Dm: "D3", D: "D3", E: "E2" };

  /* THE WALK-OUT: the teams come out. A drum roll builds, then a big stadium theme.
     (Made up for the game.) 24 beats at 120 bpm = 12 seconds. */
  function walkOut(k, t0, o) {
    o = o || {};
    const bpm = 120, B = 60 / bpm, from = o.skipIntro ? 8 : 0;
    const T = (beat) => t0 + (beat - from) * B;
    // Intro: low drone, a rolling snare that gets louder, a rising crowd.
    if (!o.skipIntro) {
      k.bass(T(0), hz("A1"), 8 * B, 0.9);
      for (let i = 0; i < 28; i++) k.snare(T(i * 0.25), 0.1 + (i / 28) * 0.55);
      k.roar(T(0), 3.6, 0.9);
      [6, 6.5, 7, 7.25, 7.5, 7.75].forEach((b, i) => k.tom(T(b), [200, 160, 130, 110, 90, 80][i], 0.9));
      k.crash(T(8), 1);
      k.stomp(T(8), 1);
    }
    // The theme, 4 bars: Am F C G.
    const bars = ["Am", "F", "C", "G"];
    const melody = [
      [0, "E5", 1], [1, "E5", 0.5], [1.5, "D5", 0.5], [2, "C5", 1], [3, "A4", 1],
      [4, "C5", 1], [5, "C5", 0.5], [5.5, "A4", 0.5], [6, "F4", 1], [7, "A4", 1],
      [8, "G4", 1], [9, "C5", 1], [10, "E5", 1], [11, "G5", 1],
      [12, "D5", 1.5], [13.5, "B4", 0.5], [14, "G4", 2],
    ];
    melody.forEach(([b, n, d]) => k.brass(T(8 + b), hz(n), d * B * 0.95, 1));
    bars.forEach((c, i) => {
      const b0 = 8 + i * 4;
      for (let j = 0; j < 8; j++) k.bass(T(b0 + j * 0.5), hz(ROOT[c]), B * 0.45, 0.8);
      k.voices(T(b0), hz(CHORDS[c][0]), 4 * B * 0.98, "oh", { n: 4, vol: i >= 2 ? 0.2 : 0.13, attack: 0.25, release: 0.5 });
      k.voices(T(b0), hz(CHORDS[c][1]), 4 * B * 0.98, "oh", { n: 4, vol: i >= 2 ? 0.2 : 0.13, attack: 0.25, release: 0.5, breath: false });
      k.voices(T(b0), hz(CHORDS[c][2]), 4 * B * 0.98, "ah", { n: 4, vol: i >= 2 ? 0.2 : 0.13, attack: 0.25, release: 0.5, breath: false });
      for (let j = 0; j < 4; j++) {
        k.kick(T(b0 + j));
        if (j % 2 === 1) { k.clap(T(b0 + j), 1); k.snare(T(b0 + j), 0.5); }
        k.hat(T(b0 + j + 0.5), 1); k.hat(T(b0 + j), 0.5);
        k.stomp(T(b0 + j + 0.5), 0.4);
      }
    });
    // The finish: a big chord, a crash and a roar.
    CHORDS.Am.concat(["A4", "E5"]).forEach((n) => k.brass(T(24), hz(n), 2.2, 0.9));
    k.crash(T(24), 1); k.kick(T(24)); k.stomp(T(24));
    k.shout(T(24), hz("A3"), 0.5, "ay", 1);
    k.roar(T(24), 2.6, 1);
    return (24 - from) * B + 2.8;
  }

  /* THE GOAL SONG: a roar, a horn, then a sing-along hook with claps. 16 beats at 132 bpm. */
  function goalSong(k, t0, o) {
    o = o || {};
    const bpm = 132, B = 60 / bpm, T = (b) => t0 + b * B;
    k.crash(T(0), 1); k.kick(T(0)); k.stomp(T(0));
    k.roar(T(0), 1.6, 1);
    CHORDS.C.forEach((n) => k.brass(T(0), hz(n), 0.9, 1));
    k.shout(T(0), hz("C3"), 0.55, "ay", 1);
    k.brass(T(0), hz("C5"), 0.9, 0.8);
    // The hook, on "oh" and "ah", twice: a rising run, then it settles.
    const hook = [
      [1, "C4", 0.5], [1.5, "E4", 0.5], [2, "G4", 0.5], [2.5, "C5", 0.5], [3, "G4", 1], [4, "E4", 1],
      [5, "D4", 0.5], [5.5, "F4", 0.5], [6, "A4", 0.5], [6.5, "D5", 0.5], [7, "A4", 1], [8, "F4", 1],
      [9, "E4", 0.5], [9.5, "G4", 0.5], [10, "B4", 0.5], [10.5, "E5", 0.5], [11, "D5", 1], [12, "B4", 1],
      [13, "C5", 2], [15, "G4", 1],
    ];
    const last = o.short ? 8 : 16;
    hook.filter(([b]) => b < last).forEach(([b, n, d], i) => {
      k.voices(T(b), hz(n), d * B * 0.95, i % 4 === 3 ? "ah" : "oh", { n: 6, vol: 0.24, attack: 0.03, release: 0.12, vibrato: 4 });
      k.brass(T(b), hz(n), d * B * 0.9, 0.55);
    });
    for (let b = 1; b < last; b++) {
      k.stomp(T(b), 0.9);
      if (b % 2 === 0) k.clap(T(b), 1);
      k.hat(T(b + 0.5), 1);
      if (b % 4 === 1) k.bass(T(b), hz(["C2", "D2", "E2", "C2"][Math.floor((b - 1) / 4) % 4]), 3.6 * B, 0.9);
    }
    if (!o.short) {
      k.shout(T(15), hz("G3"), 0.5, "ay", 1);
      CHORDS.C.forEach((n) => k.brass(T(16), hz(n), 1.4, 0.9));
      k.crash(T(16), 1); k.kick(T(16)); k.roar(T(16), 1.8, 0.8);
    }
    return (o.short ? 8 : 16.5) * B + 1.2;
  }

  /* THE CHANTS: stomps, claps and shouted words. */
  const CHANTS = {
    // stomp, stomp, CLAP, with a "HEY!" on every clap
    stomp(k, t0) {
      const B = 0.6;
      for (let bar = 0; bar < 4; bar++) {
        const b = t0 + bar * 4 * B;
        k.stomp(b, 1); k.stomp(b + B, 1); k.clap(b + 2 * B, 1); k.shout(b + 2 * B, hz("D3"), 0.25, "ay", 0.9);
        k.stomp(b + 3 * B, 0.7); k.clap(b + 3.5 * B, 0.8);
      }
      k.roar(t0 + 8 * B, 1.6, 0.4);
      return 16 * B + 0.4;
    },
    // FOR-EST! (clap clap clap-clap-clap)
    forest(k, t0) {
      const B = 0.62;
      for (let bar = 0; bar < 3; bar++) {
        const b = t0 + bar * 4 * B;
        k.shout(b, hz("A3"), 0.38, "oh", 1); k.stomp(b, 0.8);
        k.shout(b + 0.5 * B, hz("F#3"), 0.55, "eh", 1);
        [1.6, 2.1, 2.6, 3, 3.4].forEach((x) => k.clap(b + x * B, 0.9));
      }
      return 12 * B + 0.4;
    },
    // COME ON YOU REDS! clap clap
    comeon(k, t0) {
      const B = 0.55;
      for (let bar = 0; bar < 3; bar++) {
        const b = t0 + bar * 4 * B;
        [["G3", "uh"], ["G3", "oh"], ["E3", "oo"], ["G3", "eh"]].forEach(([n, v], i) => { k.shout(b + i * 0.5 * B, hz(n), 0.36, v, 1); k.stomp(b + i * 0.5 * B, 0.7); });
        k.clap(b + 2.5 * B, 1); k.clap(b + 3 * B, 1);
      }
      return 12 * B + 0.4;
    },
  };
  const CHANT_NAMES = Object.keys(CHANTS);

  /* Full time, if Forest won: the big theme once more. */
  const winTune = (k, t0) => walkOut(k, t0, { skipIntro: true });

  const TUNES = {
    walkout: { file: "walkout", make: (k, t) => walkOut(k, t), fade: 1.2 },
    goal: { file: "goal", make: (k, t, o) => goalSong(k, t, o), fade: 0.8 },
    win: { file: "win", make: (k, t) => winTune(k, t), fade: 1.2 },
    chant: { file: "chant", make: (k, t, o) => CHANTS[o.name || CHANT_NAMES[Math.floor(rnd() * CHANT_NAMES.length)]](k, t), fade: 0.4, gain: 2.4 },
  };

  /* ================================================================
     Playing on a page
     ================================================================ */
  const base = (() => {
    const me = document.currentScript;
    return me && me.src ? me.src.replace(/quiz-zone\/gz-music\.js.*$/, "") : "/";
  })();

  // Real recordings dropped into assets/audio/ replace the made-up tunes.
  const real = {};          // file -> AudioBuffer | false (none) | "loading"
  function loadReal(ctx, file) {
    if (real[file] !== undefined) return;
    // Already found nothing this visit? Don't ask again on every page.
    try { if (sessionStorage.getItem("gz_audio_none_" + file)) { real[file] = false; return; } } catch (e) {}
    real[file] = "loading";
    const tryExt = (exts) => {
      if (!exts.length) { real[file] = false; try { sessionStorage.setItem("gz_audio_none_" + file, "1"); } catch (e) {} return; }
      fetch(`${base}assets/audio/${file}.${exts[0]}`).then((r) => {
        if (!r.ok || !/audio|ogg|mpeg|octet/i.test(r.headers.get("content-type") || "")) throw new Error("none");
        return r.arrayBuffer();
      }).then((buf) => ctx.decodeAudioData(buf)).then((d) => { real[file] = d; }).catch(() => tryExt(exts.slice(1)));
    };
    tryExt(["mp3", "ogg"]);
  }

  function master(ctx) {
    if (ctx.__gzMusic) return ctx.__gzMusic;
    const m = ctx.createGain(), comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.25;
    const lim = ctx.createDynamicsCompressor();          // a hard limiter, so loud never means crackly
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
    m.connect(comp); comp.connect(lim); lim.connect(ctx.destination);
    ctx.__gzMusic = m;
    return m;
  }

  function attach(SOUND) {
    let live = null;                      // the tune playing now: { bus, ctx, end }
    let last = 0;

    function play(name, opts) {
      opts = opts || {};
      const lvl = level();
      if (lvl === "off" || !SOUND || !SOUND.isOn()) return 0;
      const ctx = SOUND.wake();
      if (!ctx) return 0;
      const tune = TUNES[name];
      if (!tune) return 0;
      if (live && !opts.layer) fade(0.25);
      const bus = ctx.createGain();
      bus.gain.value = (tune.gain || 1) * LEVELS[lvl] * (opts.vol == null ? 1 : opts.vol);
      bus.connect(master(ctx));
      const t0 = ctx.currentTime + 0.05;
      let dur = 0;
      const rb = real[tune.file];
      if (rb && rb !== "loading") {
        const src = ctx.createBufferSource(); src.buffer = rb; src.connect(bus); src.start(t0);
        dur = rb.duration;
      } else {
        if (rb === undefined) loadReal(ctx, tune.file);
        dur = tune.make(makeKit(ctx, bus), t0, opts);
      }
      const rec = { bus, ctx, end: t0 + dur };
      if (!opts.layer) live = rec;
      if (opts.ms) {
        const g = bus.gain, t = t0 + opts.ms / 1000;
        g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.0001, t + (tune.fade || 1));
      }
      last = performance.now();
      setTimeout(() => { try { bus.disconnect(); } catch (e) {} if (live === rec) live = null; }, (dur + 1.5) * 1000);
      return dur;
    }
    function fade(secs) {
      if (!live) return;
      const { bus, ctx } = live, t = ctx.currentTime;
      try { bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(0.0001, t + (secs || 0.5)); } catch (e) {}
      live = null;
    }

    return {
      walkOut: (o) => play("walkout", o),
      goalSong: (o) => play("goal", o),
      winTune: (o) => play("win", o),
      chant: (name, o) => play("chant", Object.assign({ name }, o)),
      // A chant now and then, never straight after another tune.
      maybeChant: (gapMs) => (performance.now() - last > (gapMs || 30000) && !live ? play("chant") : 0),
      fadeOut: fade,
      isPlaying: () => !!live,
    };
  }

  /* The "Music: Loud / Quiet / Off" button in each game's menu. */
  const LABEL = { loud: "🎶 Music: Loud", quiet: "🎶 Music: Quiet", off: "🎶 Music: Off" };
  function mountToggle(btn) {
    if (!btn) return;
    const paint = () => { const l = level(); btn.textContent = LABEL[l]; btn.setAttribute("aria-pressed", String(l !== "off")); };
    btn.addEventListener("click", () => {
      const order = ["loud", "quiet", "off"], next = order[(order.indexOf(level()) + 1) % 3];
      try { localStorage.setItem(KEY, next); } catch (e) {}
      paint();
    });
    paint();
  }

  GZMusic.attach = attach;
  GZMusic.mountToggle = mountToggle;
  GZMusic.level = level;
  GZMusic.CHANTS = CHANT_NAMES;
  // For tests: build a tune on any (offline) audio context.
  GZMusic._render = function (ctx, name, opts) {
    const bus = ctx.createGain(); bus.gain.value = TUNES[name].gain || 1; bus.connect(master(ctx));
    return TUNES[name].make(makeKit(ctx, bus), 0.05, opts || {});
  };
})(window.GZMusic = window.GZMusic || {});
