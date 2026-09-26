/* ===========================================================
   GEORGE'S WEBSITE: EVEN MORE LIVE DATA
   -----------------------------------------------------------
   - squad():  Forest's current squad (football-data.org, same key)
   - track():  a 30-second preview of a rock song (Deezer, or Apple's
               iTunes previews as a backup; no keys).
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
  // More for the Name That Riff game (quiz-zone/name-that-riff.html).
  breakfree: ['Queen', 'I Want To Break Free'],
  radiogaga: ['Queen', 'Radio Ga Ga'],
  mylife: ['Bon Jovi', "It's My Life"],
  believin: ['Journey', "Don't Stop Believin'"],
  rocknroll: ['KISS', 'Rock And Roll All Nite'],
  nottake: ['Twisted Sister', "We're Not Gonna Take It"],
  learnfly: ['Foo Fighters', 'Learn To Fly'],
  pretender: ['Foo Fighters', 'The Pretender'],
  reallygot: ['The Kinks', 'You Really Got Me'],
  immigrant: ['Led Zeppelin', 'Immigrant Song'],
  ironman: ['Black Sabbath', 'Iron Man'],
  uprising: ['Muse', 'Uprising'],
  song2: ['Blur', 'Song 2'],
  lookback: ['Oasis', "Don't Look Back In Anger"],
  thingcalled: ['The Darkness', 'I Believe In A Thing Called Love'],
  paradise: ["Guns N' Roses", 'Paradise City'],
  jump: ['Van Halen', 'Jump'],
  sharp: ['ZZ Top', 'Sharp Dressed Man'],
  summer69: ['Bryan Adams', 'Summer Of 69'],
  takemeout: ['Franz Ferdinand', 'Take Me Out'],
  miles500: ['The Proclaimers', "I'm Gonna Be (500 Miles)"],
  babaoriley: ['The Who', "Baba O'Riley"],
  believer: ['Imagine Dragons', 'Believer'],
  thunder: ['Imagine Dragons', 'Thunder'],
  ruby: ['Kaiser Chiefs', 'Ruby'],
  dreamon: ['Aerosmith', 'Dream On'],
  mrblue: ['Electric Light Orchestra', 'Mr. Blue Sky'],
};

// Lots more for the Name That Riff game, by band. Ids are made from the
// title (the band is added if two songs share a title). Family-friendly
// picks; versions marked as explicit are skipped when looking up clips.
const MORE_SONGS = {
  'Queen': ['Bohemian Rhapsody', 'Under Pressure', 'Killer Queen', 'Somebody To Love', 'Crazy Little Thing Called Love', 'A Kind Of Magic', 'Flash', 'The Show Must Go On', 'Who Wants To Live Forever'],
  'Linkin Park': ['In The End', 'Numb', "What I've Done", 'New Divide', 'Faint', 'Castle Of Glass'],
  'Limp Bizkit': ['Behind Blue Eyes', "Rollin'", 'My Way'],
  'Bruce Springsteen': ['Born In The U.S.A.', 'Dancing In The Dark', 'Born To Run', 'Glory Days', 'Hungry Heart'],
  'Bob Dylan': ['Like A Rolling Stone', "Blowin' In The Wind", "The Times They Are A-Changin'", 'Mr. Tambourine Man', "Knockin' On Heaven's Door"],
  'The Police': ['Every Breath You Take', 'Message In A Bottle', 'Walking On The Moon', 'Every Little Thing She Does Is Magic', 'So Lonely'],
  'Sting': ['Englishman In New York', 'Fields Of Gold', 'Shape Of My Heart', 'Desert Rose'],
  'The Beatles': ['Here Comes The Sun', 'Hey Jude', 'Come Together', 'Yellow Submarine', 'Help!', 'Twist And Shout', 'Let It Be'],
  'The Rolling Stones': ['Paint It Black', 'Start Me Up', "Jumpin' Jack Flash"],
  'David Bowie': ['Heroes', 'Starman', 'Space Oddity', "Let's Dance"],
  'Dire Straits': ['Sultans Of Swing', 'Walk Of Life'],
  'U2': ['Beautiful Day', 'With Or Without You', 'Where The Streets Have No Name', 'Vertigo'],
  'Red Hot Chili Peppers': ["Can't Stop", 'Snow (Hey Oh)', 'Dani California', 'By The Way'],
  'Nirvana': ['Smells Like Teen Spirit', 'Come As You Are'],
  'Green Day': ['Boulevard Of Broken Dreams', 'Wake Me Up When September Ends'],
  'The Killers': ['Mr. Brightside', 'Somebody Told Me', 'Human', 'When You Were Young'],
  'Arctic Monkeys': ['I Bet You Look Good On The Dancefloor', 'R U Mine?', 'Do I Wanna Know?'],
  'Coldplay': ['Viva La Vida', 'Yellow', 'Fix You', 'Paradise', 'Clocks'],
  'Muse': ['Supermassive Black Hole', 'Starlight', 'Knights Of Cydonia', 'Plug In Baby'],
  'Metallica': ['Enter Sandman', 'Nothing Else Matters'],
  'Iron Maiden': ['The Trooper', 'Run To The Hills'],
  'Bon Jovi': ['Wanted Dead Or Alive', 'You Give Love A Bad Name'],
  'Aerosmith': ["I Don't Want To Miss A Thing"],
  'Fleetwood Mac': ['Go Your Own Way', 'The Chain', 'Dreams'],
  'Eagles': ['Hotel California'],
  'Tom Petty': ["Free Fallin'", "I Won't Back Down"],
  'Creedence Clearwater Revival': ['Bad Moon Rising', 'Proud Mary', 'Fortunate Son'],
  'Toto': ['Africa', 'Hold The Line'],
  'Elton John': ["I'm Still Standing", 'Rocket Man', 'Crocodile Rock', 'Your Song'],
  'Billy Joel': ['Uptown Girl', "We Didn't Start The Fire", 'Piano Man'],
  'The Clash': ['London Calling', 'Should I Stay Or Should I Go'],
  'The Jam': ['Town Called Malice'],
  'Oasis': ['Champagne Supernova', 'Live Forever', 'Supersonic', 'Stop Crying Your Heart Out', 'Some Might Say'],
  'Blur': ['Parklife', 'The Universal'],
  'The Verve': ['Bitter Sweet Symphony'],
  'Pulp': ['Common People'],
  'Kasabian': ['Fire', 'Club Foot', 'Underdog'],
  'Foo Fighters': ['Everlong', 'Best Of You', 'Times Like These', 'My Hero'],
  'Blink-182': ['All The Small Things', 'I Miss You'],
  'Evanescence': ['Bring Me To Life'],
  'Fall Out Boy': ['Centuries', 'My Songs Know What You Did In The Dark'],
  'Jet': ['Are You Gonna Be My Girl'],
  'The Hives': ['Hate To Say I Told You So'],
  'Kings Of Leon': ['Use Somebody'],
  'Snow Patrol': ['Chasing Cars'],
  'Thin Lizzy': ['The Boys Are Back In Town'],
  'Rainbow': ['Since You Been Gone'],
  'Def Leppard': ['Photograph', 'Hysteria'],
  'Ozzy Osbourne': ['Crazy Train'],
  'Black Sabbath': ['Paranoid'],
  'Pink Floyd': ['Another Brick In The Wall, Pt. 2', 'Wish You Were Here'],
  'Neil Young': ["Rockin' In The Free World", 'Heart Of Gold'],
  'Cream': ['Sunshine Of Your Love'],
  'Jimi Hendrix': ['Purple Haze', 'All Along The Watchtower'],
  'Led Zeppelin': ['Stairway To Heaven', 'Kashmir', 'Rock And Roll'],
  'The Who': ['My Generation', 'Pinball Wizard', "Won't Get Fooled Again"],
  'Journey': ['Separate Ways', 'Any Way You Want It'],
  'Starship': ['We Built This City'],
  'KISS': ["I Was Made For Lovin' You"],
  'The Cure': ["Friday I'm In Love", 'Just Like Heaven'],
  'Tears For Fears': ['Everybody Wants To Rule The World'],
  'a-ha': ['Take On Me'],
  'Simple Minds': ["Don't You (Forget About Me)"],
  'Phil Collins': ['In The Air Tonight'],
  'Genesis': ['Invisible Touch'],
  'Chuck Berry': ['Johnny B. Goode'],
  'Elvis Presley': ['Jailhouse Rock', 'Hound Dog'],
  'Imagine Dragons': ['Radioactive', 'Demons'],
  'Status Quo': ['Whatever You Want'],
  'AC/DC': ['Shoot To Thrill'],
  "Guns N' Roses": ['November Rain'],
  'Bryan Adams': ['Run To You'],
};
{
  const slug = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 28);
  const have = new Set(Object.values(SONGS).map(([a, t]) => slug(a) + '|' + slug(t)));
  for (const [artist, titles] of Object.entries(MORE_SONGS)) {
    for (const title of titles) {
      if (have.has(slug(artist) + '|' + slug(title))) continue;
      let id = slug(title);
      if (SONGS[id]) id = slug(title + artist);
      SONGS[id] = [artist, title];
    }
  }
}

// The list for the Name That Riff page.
export const songList = () => Object.entries(SONGS).map(([id, [artist, title]]) => ({ id, artist, title }));


// Some music services turn away requests that don't say who they are.
const HEADERS = { 'User-Agent': 'GeorgesWebsite/1.0 (+https://georgeneagu.win)', Accept: 'application/json' };
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const short = (s) => norm(String(s || '').replace(/\s*[([-].*$/, ''));
// Prefer the exact title (not a live or remix version), then the closest.
// (Never just "the first result": that could be a different song.)
const bestOf = (hits, title) => hits.find((t) => norm(t.title) === norm(title)) || hits.find((t) => norm(t.title).startsWith(norm(title))) ||
  hits.find((t) => short(t.title) && short(t.title) === short(title));
// "Tom Petty" should match "Tom Petty and the Heartbreakers", "Queen" should match "Queen & David Bowie".
const sameArtist = (found, wanted) => { const f = norm(found), w = norm(wanted); return !!f && (f === w || (w.length >= 4 && f.includes(w))); };

async function fromDeezer(artist, title) {
  for (const q of [`artist:"${artist}" track:"${title}"`, `${artist} ${title}`]) {
    const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=15`, { headers: HEADERS });
    if (!res.ok) throw new Error(`deezer ${res.status}`);
    const j = await res.json();
    if (j.error) throw new Error(`deezer ${j.error.message || j.error.type || 'error'}`);
    const hits = (j.data || []).filter((t) => t.preview && !t.explicit_lyrics && sameArtist(t.artist && t.artist.name, artist));
    const best = bestOf(hits, title);
    if (best) return { preview: best.preview, cover: best.album && best.album.cover_medium || null, link: best.link || null, source: 'Deezer' };
  }
  return null;
}

async function fromItunes(artist, title) {
  const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}&media=music&entity=song&country=GB&limit=15`, { headers: HEADERS });
  if (!res.ok) throw new Error(`itunes ${res.status}`);
  const j = await res.json();
  const hits = (j.results || []).filter((t) => t.previewUrl && t.trackExplicitness !== 'explicit' && sameArtist(t.artistName, artist)).map((t) => ({ ...t, title: t.trackName }));
  const best = bestOf(hits, title);
  if (!best) return null;
  return { preview: best.previewUrl, cover: best.artworkUrl100 ? best.artworkUrl100.replace('100x100bb', '250x250bb') : null, link: best.trackViewUrl || null, source: 'Apple Music' };
}

export async function track(id) {
  const song = SONGS[id];
  if (!song) return { error: 'unknown-song' };
  const [artist, title] = song;
  const problems = [];
  // Deezer first, then Apple's iTunes previews if Deezer can't help.
  for (const find of [fromDeezer, fromItunes]) {
    try {
      const hit = await find(artist, title);
      if (hit) return { id, artist, title, ...hit };
      problems.push(`${find.name}: not found`);
    } catch (e) { problems.push(`${find.name}: ${e.message}`); }
  }
  throw new Error(problems.join('; '));
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
