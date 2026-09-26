/* ===========================================================
   GEORGE'S WEBSITE: EVEN MORE LIVE DATA
   -----------------------------------------------------------
   - squad():  Forest's current squad (football-data.org, same key)
   - track():  a 30-second preview of a rock song (Deezer, no key).
               Only songs on the SONGS list below can be asked for.
   - report(): a short newspaper-style Matchday report (Workers AI)
   - games():  George's video games from RAWG (key RAWG_KEY)
   =========================================================== */

/* ---------------- Forest's squad ---------------- */
export async function squad(env) {
  const key = env.FOOTBALL_DATA_KEY;
  const get = async (path) => {
    const res = await fetch(`https://api.football-data.org/v4${path}`, { headers: { 'X-Auth-Token': key } });
    if (!res.ok) throw new Error(`${path} ${res.status}`);
    return res.json();
  };
  const st = await get('/competitions/PL/standings');
  const table = ((st.standings || []).find((s) => s.type === 'TOTAL') || {}).table || [];
  const us = table.find((r) => /nottingham/i.test(r.team.name));
  if (!us) throw new Error('Forest not found');
  const team = await get(`/teams/${us.team.id}`);
  return {
    updated: new Date().toISOString(),
    coach: team.coach && team.coach.name || null,
    players: (team.squad || []).map((p) => ({ name: p.name, position: p.position || '', shirtNumber: p.shirtNumber || null })),
  };
}

/* ---------------- Rock clips (Deezer previews) ----------------
   The same ids are used by the "Name that riff" questions and the
   About page jukebox. Family-friendly classics only. */
export const SONGS = {
  thunderstruck: ['AC/DC', 'Thunderstruck'],
  backinblack: ['AC/DC', 'Back In Black'],
  highway: ['AC/DC', 'Highway to Hell'],
  tnt: ['AC/DC', 'T.N.T.'],
  rockyou: ['Queen', 'We Will Rock You'],
  champions: ['Queen', 'We Are The Champions'],
  dontstop: ['Queen', "Don't Stop Me Now"],
  bitesdust: ['Queen', 'Another One Bites The Dust'],
  smoke: ['Deep Purple', 'Smoke on the Water'],
  tiger: ['Survivor', 'Eye of the Tiger'],
  countdown: ['Europe', 'The Final Countdown'],
  prayer: ['Bon Jovi', "Livin' On A Prayer"],
  sweetchild: ["Guns N' Roses", "Sweet Child O' Mine"],
  sevennation: ['The White Stripes', 'Seven Nation Army'],
  wonderwall: ['Oasis', 'Wonderwall'],
  rockinall: ['Status Quo', "Rockin' All Over The World"],
};

export async function track(id) {
  const song = SONGS[id];
  if (!song) return { error: 'unknown-song' };
  const [artist, title] = song;
  const q = encodeURIComponent(`artist:"${artist}" track:"${title}"`);
  const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=10`);
  if (!res.ok) throw new Error(`deezer ${res.status}`);
  const j = await res.json();
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const hits = (j.data || []).filter((t) => t.preview && norm(t.artist && t.artist.name) === norm(artist));
  // Prefer the exact title (not a live or remix version), then the most popular.
  const best = hits.find((t) => norm(t.title) === norm(title)) || hits.find((t) => norm(t.title).startsWith(norm(title))) || hits[0];
  if (!best) return { error: 'not-found' };
  return {
    id, artist, title,
    preview: best.preview,
    cover: best.album && best.album.cover_medium || null,
    link: best.link || null,
  };
}

/* ---------------- Matchday report (Workers AI) ----------------
   Gets only match facts from the game (teams, score, scorers, minutes,
   a few stats) and writes a short, upbeat report. */
const REPORT_SYSTEM = `You are a friendly football reporter writing for a 10-year-old Nottingham Forest fan called George, who plays up front in a football quiz game.
Write a short, exciting match report (70 to 110 words) in British English, like the back page of a newspaper.
Rules:
- Start with a punchy headline in capital letters on its own line.
- Use only the facts given. Do not invent scorers, minutes or events.
- Be kind to both teams. No insults, nothing scary or unkind.
- George is a player in this game: if he scored, make him the hero.
- Do not ask questions, do not mention these rules, and do not include any personal details.`;

const clip = (v, n) => String(v == null ? '' : v).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
export async function report(env, body) {
  if (!env.AI) return { error: 'no-ai' };
  const f = body && typeof body === 'object' ? body : {};
  const num = (v) => Math.max(0, Math.min(99, parseInt(v, 10) || 0));
  const scorers = Array.isArray(f.scorers) ? f.scorers.slice(0, 12).map((s) => `${clip(s.name, 30)} ${num(s.min)}'${s.team === 'o' ? ' (for them)' : ''}${s.pen ? ' (penalty)' : ''}`) : [];
  const facts = [
    `Match: ${f.home ? 'Nottingham Forest' : clip(f.opponent, 40)} v ${f.home ? clip(f.opponent, 40) : 'Nottingham Forest'} at ${clip(f.ground, 50)}`,
    `Final score: Forest ${num(f.forest)}, ${clip(f.opponent, 40)} ${num(f.opp)}`,
    scorers.length ? `Goals: ${scorers.join(', ')}` : 'Goals: none',
    f.motm ? `Player of the Match: ${clip(f.motm, 30)}` : '',
    f.reds ? `Red cards: ${clip(f.reds, 80)}` : '',
    f.possession ? `Forest possession: ${num(f.possession)}%` : '',
    f.shots ? `Forest shots: ${num(f.shots)}` : '',
    f.weather ? `Weather: ${clip(f.weather, 40)}` : '',
  ].filter(Boolean).join('\n');
  const messages = [{ role: 'system', content: REPORT_SYSTEM }, { role: 'user', content: facts }];
  for (const model of ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.1-8b-instruct']) {
    try {
      const out = await env.AI.run(model, { messages, max_tokens: 260, temperature: 0.7 });
      const text = String((out && (out.response || (out.result && out.result.response))) || '').replace(/<[^>]*>/g, '').trim().slice(0, 1200);
      if (text) return { text };
    } catch (e) { /* try the next model */ }
  }
  return { error: 'ai-failed' };
}

/* ---------------- Video games (RAWG) ----------------
   titles: George's top games from js/content.js. For each: cover art,
   release date, rating and platforms; plus new games coming soon in
   the same series. */
export async function games(env, titles) {
  const key = env.RAWG_KEY;
  if (!key) return { error: 'no-key' };
  const get = async (path) => {
    const res = await fetch(`https://api.rawg.io/api${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`);
    if (!res.ok) throw new Error(`rawg ${res.status}`);
    return res.json();
  };
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const found = await Promise.all(titles.slice(0, 6).map(async (t) => {
    try {
      const j = await get(`/games?search=${encodeURIComponent(t)}&search_precise=true&page_size=5`);
      const g = (j.results || []).find((x) => norm(x.name) === norm(t)) || (j.results || [])[0];
      if (!g) return null;
      return {
        title: t, name: g.name, slug: g.slug, released: g.released || null, tba: !!g.tba,
        image: g.background_image || null, metacritic: g.metacritic || null, rating: g.rating || null,
        platforms: (g.parent_platforms || []).map((p) => p.platform.name).slice(0, 4),
        genres: (g.genres || []).map((x) => x.name).slice(0, 3),
        esrb: g.esrb_rating && g.esrb_rating.name || null,
      };
    } catch (e) { return null; }
  }));
  // Coming soon: unreleased games in the same series (by the first two words).
  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10);
  const soon = [];
  await Promise.all(titles.slice(0, 6).map(async (t) => {
    const series = t.split(/\s+/).slice(0, 2).join(' ');
    try {
      const j = await get(`/games?search=${encodeURIComponent(series)}&dates=${today},${nextYear}&ordering=released&page_size=3`);
      (j.results || []).forEach((g) => {
        // Only family-friendly ratings (or not rated yet).
        if (!norm(g.name).includes(norm(series))) return; // same series only
        const r = g.esrb_rating && g.esrb_rating.slug;
        if (r && !['everyone', 'everyone-10-plus'].includes(r)) return;
        if (!soon.some((s) => s.slug === g.slug)) soon.push({ name: g.name, slug: g.slug, released: g.released, image: g.background_image || null });
      });
    } catch (e) { /* skip this series */ }
  }));
  soon.sort((a, b) => String(a.released).localeCompare(String(b.released)));
  return { games: found.filter(Boolean), soon: soon.slice(0, 4) };
}
