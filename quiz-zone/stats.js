/* ============================================================
   George's Game Zone — shared stats, badges, streaks & nicknames
   Loaded by quiz-zone.html, football-quiz.html, geography-quiz.html,
   mountain-quiz.html, name-that-riff.html, quickfire-quiz.html, guess-the-player.html, pack-opener.html, times-tables-quiz.html, penalty-shootout.html, free-kick.html and matchday.html. Everything is stored in this browser
   only (localStorage). The online top scores are separate: they live in
   the Supabase leaderboard table.
   ============================================================ */
(function (GZ) {
  const KEY = "gamezone_stats_v1";
  const NICKNAMES = ["ClawsTiger", "MiniDragon", "George"];

  const BADGES = [
    { id: "first-whistle",     emoji: "🎮", name: "First Whistle",   desc: "Play your very first quiz" },
    { id: "globe-trotter",     emoji: "🌍", name: "Globe Trotter",   desc: "Finish a round of Capital Quest" },
    { id: "flag-spotter",      emoji: "🚩", name: "Flag Spotter",    desc: "Finish a round of Capital Quest in Flags mode" },
    { id: "peak-bagger",       emoji: "🏔️", name: "Peak Bagger",     desc: "Finish a round of Peak Challenge" },
    { id: "riff-master",       emoji: "🎸", name: "Riff Master",     desc: "Finish a round of Name That Riff" },
    { id: "trivia-titan",      emoji: "🧠", name: "Trivia Titan",    desc: "Finish a round of Quickfire Quiz" },
    { id: "scout-eye",         emoji: "📸", name: "Scout's Eye",     desc: "Finish a round of Guess the Player" },
    { id: "forest-frenzy",     emoji: "🌳", name: "Tricky Trees",    desc: "Finish a round of Football Frenzy" },
    { id: "perfect-round",     emoji: "💯", name: "Perfect Round",   desc: "Get every question right in one round" },
    { id: "quickfire-king",    emoji: "⚡", name: "Quickfire King",  desc: "Score 15 or more correct in one round" },
    { id: "three-day-streak",  emoji: "🔥", name: "On Fire",         desc: "Play on 3 days in a row" },
    { id: "all-rounder",       emoji: "🌟", name: "All-Rounder",     desc: "Play all three games at least once" },
    { id: "keepy-uppy-king",   emoji: "🤹", name: "Keepy-Uppy King", desc: "Get 25 keepy-uppies in one go" },
    { id: "times-titan",       emoji: "✖️", name: "Times Titan",     desc: "Finish a round of Times Tables Blitz" },
    { id: "maths-machine",     emoji: "🧮", name: "Maths Machine",   desc: "Get 25 or more right in Times Tables Blitz" },
    { id: "penalty-hero",      emoji: "🥅", name: "Penalty Hero",    desc: "Win a penalty shootout" },
    { id: "george-cup",        emoji: "🏆", name: "George Cup",      desc: "Win the George Cup" },
    { id: "top-bins",          emoji: "🎯", name: "Top Bins",        desc: "Score a penalty in the top corner" },
    { id: "safe-hands",        emoji: "🧤", name: "Safe Hands",      desc: "Save 2 penalties in one shootout" },
    { id: "dead-ball",         emoji: "🎯", name: "Dead Ball King",  desc: "Score 3 free kicks in one match" },
    { id: "banana-kick",       emoji: "🍌", name: "Banana Kick",     desc: "Curl a free kick in with loads of bend" },
    { id: "worldie",           emoji: "🚀", name: "Worldie",         desc: "Score a free kick from 26 yards or more" },
    { id: "derby-hero",        emoji: "🌳", name: "Derby Day Hero",  desc: "Win the Brian Clough Trophy against Derby" },
    { id: "daily-grinder",     emoji: "📅", name: "Daily Grinder",   desc: "Do the Daily Challenge 3 days in a row" },
    { id: "matchday-winner",   emoji: "🏟️", name: "Three Points",    desc: "Win a match in Matchday" },
    { id: "hat-trick-hero",    emoji: "🎩", name: "Hat-trick Hero",  desc: "George scores a hat-trick in Matchday" },
    { id: "clean-sheet",       emoji: "🧱", name: "Clean Sheet",     desc: "Keep a clean sheet in Matchday" },
    { id: "giant-killer",      emoji: "🗡️", name: "Giant Killer",    desc: "Beat Arsenal, Liverpool, Chelsea or Man City in Matchday" },
    { id: "var-drama",         emoji: "📺", name: "VAR Drama",       desc: "Win a VAR check in Matchday" },
    { id: "halfway-hero",      emoji: "🌠", name: "Halfway Hero",    desc: "Score from the halfway line in Matchday" },
    { id: "red-mist",          emoji: "🟥", name: "Seeing Red",      desc: "Get an opposition player sent off in Matchday" },
    { id: "pack-icon",         emoji: "🌟", name: "Icon Pulled",     desc: "Pull an Icon card from a pack" },
    { id: "pack-regular",      emoji: "📦", name: "Pack Regular",    desc: "Open 10 packs" },
    { id: "tt-first-goal",     emoji: "⚽", name: "Tiki-Taka Goal",  desc: "Score a goal in Tiki-Taka" },
    { id: "tt-hattrick",       emoji: "🎩", name: "Tiki-Taka Hat-trick", desc: "Score 3 goals in one game of Tiki-Taka" },
    { id: "tt-chain5",         emoji: "🔁", name: "Pass Master",     desc: "Make 5 passes in a row in Tiki-Taka" },
    { id: "tt-super",          emoji: "⚡", name: "Super Skill",     desc: "Use a super skill in Tiki-Taka" },
    { id: "tt-upgrade",        emoji: "💪", name: "In Training",     desc: "Buy your first Tiki-Taka upgrade" },
  ];

  // Coins, level and daily missions live in gz-rewards.js. It is loaded for us if the page did not.
  function gzr(fn) {
    const args = Array.prototype.slice.call(arguments, 1);
    if (window.GZR && GZR.ready) { try { GZR[fn].apply(GZR, args); } catch (e) {} return; }
    (window.__gzrQueue = window.__gzrQueue || []).push([fn, args]);
    if (!gzr.loading) {
      gzr.loading = true;
      const el = document.createElement("script");
      el.src = SCRIPT_DIR + "gz-rewards.js";
      document.head.appendChild(el);
    }
  }
  const SCRIPT_DIR = (document.currentScript && document.currentScript.src ? document.currentScript.src : location.href).replace(/[^\/]*$/, "");

  function defaultStats() {
    return {
      gamesPlayed: { "football-frenzy": 0, "capital-quest": 0, "mountain-peaks": 0, "times-tables": 0, "penalty-shootout": 0, "free-kick": 0, "matchday": 0, "name-that-riff": 0, "quickfire-quiz": 0, "guess-the-player": 0 },
      bestScore:   { "football-frenzy": 0, "capital-quest": 0, "mountain-peaks": 0, "times-tables": 0, "penalty-shootout": 0, "free-kick": 0, "matchday": 0, "name-that-riff": 0, "quickfire-quiz": 0, "guess-the-player": 0 },
      keepyUppyBest: 0,
      packsOpened: 0,
      badges: [],
      streak: 0,
      lastPlayed: null,
      totalGames: 0
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultStats();
      const parsed = JSON.parse(raw);
      const merged = Object.assign(defaultStats(), parsed);
      merged.gamesPlayed = Object.assign(defaultStats().gamesPlayed, parsed.gamesPlayed || {});
      merged.bestScore = Object.assign(defaultStats().bestScore, parsed.bestScore || {});
      return merged;
    } catch (e) {
      return defaultStats();
    }
  }

  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  }

  function midnight(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function touch(s, id) { s.lastGame = id; }

  function updateStreak(s) {
    const today = midnight(new Date());
    if (!s.lastPlayed) {
      s.streak = 1;
    } else {
      const last = midnight(new Date(s.lastPlayed));
      const diffDays = Math.round((today - last) / 86400000);
      if (diffDays === 0) {
        // already played today — streak unchanged
      } else if (diffDays === 1) {
        s.streak = (s.streak || 0) + 1;
      } else {
        s.streak = 1;
      }
    }
    s.lastPlayed = today.toISOString();
  }

  function recordResult(gameId, correctCount, totalAnswered) {
    const s = load();
    s.gamesPlayed[gameId] = (s.gamesPlayed[gameId] || 0) + 1;
    s.totalGames = (s.totalGames || 0) + 1;
    if (correctCount > (s.bestScore[gameId] || 0)) s.bestScore[gameId] = correctCount;
    updateStreak(s); touch(s, gameId);

    const newlyAwarded = [];
    function award(id) {
      if (!s.badges.includes(id)) {
        s.badges.push(id);
        newlyAwarded.push(id);
      }
    }
    award("first-whistle");
    if (gameId === "capital-quest") award("globe-trotter");
    if (gameId === "flag-quest") award("flag-spotter");
    if (gameId === "mountain-peaks") award("peak-bagger");
    if (gameId === "name-that-riff") award("riff-master");
    if (gameId === "quickfire-quiz") award("trivia-titan");
    if (gameId === "guess-the-player") award("scout-eye");
    if (gameId === "football-frenzy") award("forest-frenzy");
    if (gameId === "times-tables") award("times-titan");
    if (gameId === "times-tables" && correctCount >= 25) award("maths-machine");
    if (totalAnswered >= 5 && correctCount === totalAnswered) award("perfect-round");
    if (correctCount >= 15) award("quickfire-king");
    if ((s.streak || 0) >= 3) award("three-day-streak");
    if (s.gamesPlayed["capital-quest"] > 0 && s.gamesPlayed["mountain-peaks"] > 0 && s.gamesPlayed["football-frenzy"] > 0) {
      award("all-rounder");
    }

    save(s);
    gzr("gameFinished", gameId, { correct: correctCount });
    return {
      stats: s,
      newBadges: newlyAwarded.map(id => BADGES.find(b => b.id === id)).filter(Boolean)
    };
  }

  function recordKeepyUppy(score) {
    const s = load();
    const isNewBest = score > (s.keepyUppyBest || 0);
    if (isNewBest) s.keepyUppyBest = score;
    touch(s, "keepy-uppy");

    const newlyAwarded = [];
    function award(id) {
      if (!s.badges.includes(id)) {
        s.badges.push(id);
        newlyAwarded.push(id);
      }
    }
    if (score >= 25) award("keepy-uppy-king");

    save(s);
    gzr("gameFinished", "keepy-uppy");
    return {
      stats: s,
      isNewBest,
      newBadges: newlyAwarded.map(id => BADGES.find(b => b.id === id)).filter(Boolean)
    };
  }

  /* Penalty Shootout: r = { score, won, cupWon, topBins, maxSaves } */
  function recordPenalty(r) {
    const s = load();
    const id = "penalty-shootout";
    s.gamesPlayed[id] = (s.gamesPlayed[id] || 0) + 1;
    s.totalGames = (s.totalGames || 0) + 1;
    if (r.score > (s.bestScore[id] || 0)) s.bestScore[id] = r.score;
    updateStreak(s); touch(s, id);
    const newlyAwarded = [];
    function award(bid) {
      if (!s.badges.includes(bid)) { s.badges.push(bid); newlyAwarded.push(bid); }
    }
    award("first-whistle");
    if (r.won) award("penalty-hero");
    if (r.cupWon) award("george-cup");
    if (r.topBins > 0) award("top-bins");
    if (r.maxSaves >= 2) award("safe-hands");
    if ((s.streak || 0) >= 3) award("three-day-streak");
    save(s);
    gzr("gameFinished", id);
    return { stats: s, newBadges: newlyAwarded.map(bid => BADGES.find(b => b.id === bid)).filter(Boolean) };
  }

  /* Free Kick Masters: r = { score, goals, banana, worldie, derbyWon, dailyStreak } */
  function recordFreeKick(r) {
    const s = load();
    const id = "free-kick";
    s.gamesPlayed[id] = (s.gamesPlayed[id] || 0) + 1;
    s.totalGames = (s.totalGames || 0) + 1;
    if (r.score > (s.bestScore[id] || 0)) s.bestScore[id] = r.score;
    updateStreak(s); touch(s, id);
    const newlyAwarded = [];
    function award(bid) {
      if (!s.badges.includes(bid)) { s.badges.push(bid); newlyAwarded.push(bid); }
    }
    award("first-whistle");
    if (r.goals >= 3) award("dead-ball");
    if (r.banana > 0) award("banana-kick");
    if (r.worldie > 0) award("worldie");
    if (r.derbyWon) award("derby-hero");
    if ((r.dailyStreak || 0) >= 3) award("daily-grinder");
    if ((s.streak || 0) >= 3) award("three-day-streak");
    save(s);
    gzr("gameFinished", id, { goals: r.goals || 0 });
    return { stats: s, newBadges: newlyAwarded.map(bid => BADGES.find(b => b.id === bid)).filter(Boolean) };
  }

  /* Pack Opener: r = { tier: best card's tier in that pack } */
  function recordPackOpener(r) {
    const s = load();
    s.packsOpened = (s.packsOpened || 0) + 1;
    updateStreak(s); touch(s, "pack-opener");
    const newlyAwarded = [];
    function award(bid) {
      if (!s.badges.includes(bid)) { s.badges.push(bid); newlyAwarded.push(bid); }
    }
    award("first-whistle");
    if (r.tier === "icon") award("pack-icon");
    if (s.packsOpened >= 10) award("pack-regular");
    if ((s.streak || 0) >= 3) award("three-day-streak");
    save(s);
    gzr("gameFinished", "pack-opener");
    return { stats: s, newBadges: newlyAwarded.map(bid => BADGES.find(b => b.id === bid)).filter(Boolean) };
  }

  /* Matchday: r = { score, won, georgeGoals, cleanSheet, giantKiller, varWin, halfway, oppReds } */
  function recordMatchday(r) {
    const s = load();
    const id = "matchday";
    s.gamesPlayed[id] = (s.gamesPlayed[id] || 0) + 1;
    s.totalGames = (s.totalGames || 0) + 1;
    if (r.score > (s.bestScore[id] || 0)) s.bestScore[id] = r.score;
    updateStreak(s); touch(s, id);
    const newlyAwarded = [];
    function award(bid) {
      if (!s.badges.includes(bid)) { s.badges.push(bid); newlyAwarded.push(bid); }
    }
    award("first-whistle");
    if (r.won) award("matchday-winner");
    if (r.georgeGoals >= 3) award("hat-trick-hero");
    if (r.cleanSheet) award("clean-sheet");
    if (r.giantKiller) award("giant-killer");
    if (r.varWin) award("var-drama");
    if (r.halfway) award("halfway-hero");
    if (r.oppReds > 0) award("red-mist");
    if ((s.streak || 0) >= 3) award("three-day-streak");
    save(s);
    gzr("gameFinished", id);
    return { stats: s, newBadges: newlyAwarded.map(bid => BADGES.find(b => b.id === bid)).filter(Boolean) };
  }

  /* Tiki-Taka: r = { score, goals, bestChain, superUsed } */
  function recordTikiTaka(r) {
    const s = load();
    const id = "tiki-taka";
    s.gamesPlayed[id] = (s.gamesPlayed[id] || 0) + 1;
    s.totalGames = (s.totalGames || 0) + 1;
    if (r.score > (s.bestScore[id] || 0)) s.bestScore[id] = r.score;
    updateStreak(s); touch(s, id);
    const newlyAwarded = [];
    function award(bid) {
      if (!s.badges.includes(bid)) { s.badges.push(bid); newlyAwarded.push(bid); }
    }
    award("first-whistle");
    if (r.goals >= 1) award("tt-first-goal");
    if (r.goals >= 3) award("tt-hattrick");
    if (r.bestChain >= 5) award("tt-chain5");
    if (r.superUsed) award("tt-super");
    if ((s.streak || 0) >= 3) award("three-day-streak");
    save(s);
    gzr("gameFinished", id, { goals: r.goals || 0 });
    return { stats: s, newBadges: newlyAwarded.map(bid => BADGES.find(b => b.id === bid)).filter(Boolean) };
  }

  /* Hand out one badge on its own (for things that are not the end of a game). */
  function awardBadge(bid) {
    const s = load();
    if (s.badges.includes(bid)) return [];
    s.badges.push(bid);
    save(s);
    return [BADGES.find(b => b.id === bid)].filter(Boolean);
  }

  function randomNickname() {
    return NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)];
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  function showToast(text) {
    let toast = document.getElementById("gz-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "gz-toast";
      toast.className = "gz-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.remove("show");
    void toast.offsetWidth; // restart animation
    toast.classList.add("show");
    clearTimeout(toast._gzTimer);
    toast._gzTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function announceBadges(newBadges) {
    (newBadges || []).forEach((b, i) => {
      setTimeout(() => showToast(`${b.emoji} New badge unlocked: ${b.name}!`), i * 3200 + 400);
    });
  }

  function renderCategoryChart(container, breakdown) {
    if (!container) return;
    const entries = Object.entries(breakdown || {}).sort((a, b) => b[1].total - a[1].total);
    if (entries.length === 0) {
      container.innerHTML = "";
      return;
    }
    let html = '<div class="gz-chart">';
    entries.forEach(([cat, v]) => {
      const pct = v.total ? Math.round((v.correct / v.total) * 100) : 0;
      html += `
        <div class="gz-chart-row">
          <div class="gz-chart-label">${escapeHtml(cat)}</div>
          <div class="gz-chart-track"><div class="gz-chart-fill" style="width:${pct}%"></div></div>
          <div class="gz-chart-value">${v.correct}/${v.total}</div>
        </div>`;
    });
    html += "</div>";
    container.innerHTML = html;
  }

  function renderBadgesGrid(container) {
    if (!container) return;
    const s = load();
    let html = "";
    BADGES.forEach(b => {
      const earned = s.badges.includes(b.id);
      html += `
        <div class="gz-badge ${earned ? "earned" : "locked"}" title="${escapeHtml(b.desc)}">
          <div class="gz-badge-emoji">${earned ? b.emoji : "🔒"}</div>
          <div class="gz-badge-name">${escapeHtml(b.name)}</div>
        </div>`;
    });
    container.innerHTML = html;
  }

  function renderBestScores(container) {
    if (!container) return;
    const s = load();
    const games = [
      { id: "football-frenzy", label: "Football Frenzy", emoji: "⚽" },
      { id: "capital-quest", label: "Capital Quest", emoji: "🌍" },
      { id: "flag-quest", label: "Capital Quest: Flags", emoji: "🚩" },
      { id: "mountain-peaks", label: "Peak Challenge", emoji: "🏔️" },
      { id: "name-that-riff", label: "Name That Riff (songs right)", emoji: "🎸" },
      { id: "quickfire-quiz", label: "Quickfire Quiz", emoji: "🧠" },
      { id: "guess-the-player", label: "Guess the Player", emoji: "📸" },
      { id: "times-tables", label: "Times Tables Blitz", emoji: "✖️" },
      { id: "tiki-taka", label: "Tiki-Taka", emoji: "🔁", scale: 600 }
    ];
    const scale = 30; // nominal "great score" ceiling for the bar fill
    let html = '<div class="gz-chart">';
    games.forEach(g => {
      const best = s.bestScore[g.id] || 0;
      const pct = Math.max(best > 0 ? 6 : 0, Math.min(100, Math.round((best / (g.scale || scale)) * 100)));
      html += `
        <div class="gz-chart-row">
          <div class="gz-chart-label">${g.emoji} ${escapeHtml(g.label)}</div>
          <div class="gz-chart-track"><div class="gz-chart-fill" style="width:${pct}%"></div></div>
          <div class="gz-chart-value">${best}</div>
        </div>`;
    });
    html += "</div>";
    container.innerHTML = html;
  }

  function renderStreak(container) {
    if (!container) return;
    const s = load();
    const streak = s.streak || 0;
    container.innerHTML = streak > 0
      ? `<span class="gz-flame">🔥</span> <strong>${streak}</strong> day${streak === 1 ? "" : "s"} in a row`
      : `Play today to start a streak! 🔥`;
  }

  GZ.load = load;
  GZ.recordResult = recordResult;
  GZ.recordKeepyUppy = recordKeepyUppy;
  GZ.recordPenalty = recordPenalty;
  GZ.recordFreeKick = recordFreeKick;
  GZ.recordMatchday = recordMatchday;
  GZ.recordPackOpener = recordPackOpener;
  GZ.recordTikiTaka = recordTikiTaka;
  GZ.awardBadge = awardBadge;
  GZ.randomNickname = randomNickname;
  GZ.showToast = showToast;
  GZ.announceBadges = announceBadges;
  GZ.renderCategoryChart = renderCategoryChart;
  GZ.renderBadgesGrid = renderBadgesGrid;
  GZ.renderBestScores = renderBestScores;
  GZ.renderStreak = renderStreak;
  GZ.BADGES = BADGES;
  GZ.NICKNAMES = NICKNAMES;
})(window.GZ = window.GZ || {});
