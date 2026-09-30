/* ===========================================================
   GEORGE'S WEBSITE: MORE LIVE DATA
   -----------------------------------------------------------
   - weatherFor(): matchday forecasts from Open-Meteo (free, no key)
   - apod():   NASA's Astronomy Picture of the Day (key NASA_KEY,
               or NASA's shared DEMO_KEY if not set)
   - iss():    where the International Space Station is right now
               (wheretheiss.at, free, no key)
   - live():   Forest's live match centre from API-Football
               (key API_FOOTBALL_KEY, free plan = 100 requests a day)
   Each answer is cached so the free limits are never close.
   =========================================================== */

// Premier League grounds: [ground, latitude, longitude]
export const GROUNDS = {
  Forest: ['The City Ground', 52.9400, -1.1328],
  Leeds: ['Elland Road', 53.7778, -1.5722],
  Liverpool: ['Anfield', 53.4308, -2.9608],
  Tottenham: ['Tottenham Hotspur Stadium', 51.6043, -0.0664],
  'Aston Villa': ['Villa Park', 52.5092, -1.8848],
  Coventry: ['Coventry Building Society Arena', 52.4481, -1.4957],
  'Crystal Palace': ['Selhurst Park', 51.3983, -0.0855],
  Arsenal: ['Emirates Stadium', 51.5549, -0.1084],
  Ipswich: ['Portman Road', 52.0550, 1.1447],
  Brentford: ['Gtech Community Stadium', 51.4907, -0.2888],
  'Man City': ['Etihad Stadium', 53.4831, -2.2004],
  Bournemouth: ['Vitality Stadium', 50.7352, -1.8383],
  Chelsea: ['Stamford Bridge', 51.4817, -0.1910],
  Hull: ['MKM Stadium', 53.7462, -0.3680],
  Brighton: ['Amex Stadium', 50.8616, -0.0837],
  Sunderland: ['Stadium of Light', 54.9146, -1.3884],
  Everton: ['Hill Dickinson Stadium', 53.4263, -2.9994],
  'Man Utd': ['Old Trafford', 53.4631, -2.2913],
  Newcastle: ["St James' Park", 54.9756, -1.6217],
  Fulham: ['Craven Cottage', 51.4749, -0.2217],
  'West Ham': ['London Stadium', 51.5387, -0.0166],
  Wolves: ['Molineux', 52.5903, -2.1304],
  Leicester: ['King Power Stadium', 52.6204, -1.1422],
  Burnley: ['Turf Moor', 53.7890, -2.2302],
  Southampton: ["St Mary's Stadium", 50.9058, -1.3910],
  'Sheffield Utd': ['Bramall Lane', 53.3703, -1.4709],
};

// WMO weather codes in plain words, with an emoji.
function describe(code) {
  if (code === 0) return ['☀️', 'Sunny'];
  if (code <= 2) return ['🌤️', 'Some cloud'];
  if (code === 3) return ['☁️', 'Cloudy'];
  if (code <= 48) return ['🌫️', 'Foggy'];
  if (code <= 57) return ['🌦️', 'Drizzle'];
  if (code <= 67) return ['🌧️', 'Rain'];
  if (code <= 77) return ['❄️', 'Snow'];
  if (code <= 82) return ['🌧️', 'Showers'];
  if (code <= 86) return ['🌨️', 'Snow showers'];
  return ['⛈️', 'Thunderstorms'];
}

/* ---------------- Weather for upcoming matches ----------------
   matches: [{ date: '2026-10-11', time: '13:00', opponent, venue }]
   Forecasts only exist about 16 days ahead, so later matches are skipped. */
export async function weatherFor(matches) {
  const today = new Date();
  const limit = new Date(today.getTime() + 15 * 86400000).toISOString().slice(0, 10);
  const soon = matches.filter((m) => m.date >= today.toISOString().slice(0, 10) && m.date <= limit).slice(0, 4);
  const out = {};
  await Promise.all(soon.map(async (m) => {
    const g = GROUNDS[m.venue === 'H' ? 'Forest' : m.opponent];
    if (!g) return;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${g[1]}&longitude=${g[2]}` +
      `&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&timezone=Europe%2FLondon&start_date=${m.date}&end_date=${m.date}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const w = await res.json();
      const h = w.hourly || {};
      const i = (h.time || []).indexOf(`${m.date}T${m.time.slice(0, 2)}:00`);
      if (i < 0) return;
      const code = h.weather_code[i];
      const [emoji, text] = describe(code);
      out[m.date] = {
        ground: g[0], emoji, text, code,
        temp: Math.round(h.temperature_2m[i]),
        rain: h.precipitation_probability ? h.precipitation_probability[i] : null,
        wind: Math.round(h.wind_speed_10m[i]),
      };
    } catch (e) { /* no forecast for this one */ }
  }));
  return out;
}

/* ---------------- NASA picture of the day ----------------
   NASA is retiring the old api.nasa.gov/planetary/apod endpoint (shutting
   down 1 Dec 2026) in favour of a WordPress-backed one on science.nasa.gov.
   In the meantime the old one has started answering with 200 OK but a
   generic placeholder (title "NASA Science", the NASA logo as the image)
   instead of real content — worse than an outright error, since nothing
   here treated it as a failure. This calls the new endpoint instead, and
   is strict about what counts as a real result: anything that doesn't
   parse into an actual title + image throws, which shows the site's
   normal "couldn't reach NASA" message rather than the wrong picture. */
export async function apod() {
  const res = await fetch('https://science.nasa.gov/wp-json/wp/v2/apod-basic?per_page=1');
  if (!res.ok) throw new Error(`apod ${res.status}`);
  const list = await res.json();
  const a = Array.isArray(list) ? list[0] : list;
  if (!a) throw new Error('apod empty');

  // Confirmed shape (2026-09): a flat object, not the nested WordPress
  // post shape guessed at first — title/explanation/credit are plain
  // strings (explanation and credit contain HTML links), and the real
  // image is at hdurl, not behind any _embedded media.
  const stripHtml = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^Explanation:\s*/, '');
  const title = stripHtml(a.title);
  const explanation = stripHtml(a.explanation);
  const video = a.media_type === 'video';
  const image = a.hdurl || null;
  if (!title || (!video && !image)) throw new Error('apod: unexpected response shape');

  return {
    date: a.date ? String(a.date).slice(0, 10) : null,
    title, explanation,
    image: video ? null : image,
    hd: video ? null : image,
    video: video ? (a.hdurl || a.url || null) : null,
    credit: stripHtml(a.credit || a.copyright) || 'NASA',
  };
}

/* ---------------- Quickfire Quiz questions (Open Trivia DB) ----------------
   Fetched and cached here instead of straight from the browser: opentdb.com
   rate-limits by IP, and every visitor sharing a home/school network shares
   one IP, so this shields them from each other and from opentdb's own
   outages (it's known to go down or 403 from time to time). */
export async function trivia(catId) {
  const catParam = catId ? `&category=${catId}` : '';
  const res = await fetch(`https://opentdb.com/api.php?amount=20&difficulty=easy&type=multiple${catParam}`);
  if (!res.ok) throw new Error(`trivia ${res.status}`);
  const data = await res.json();
  if (data.response_code !== 0 || !data.results || !data.results.length) throw new Error(`trivia response_code ${data.response_code}`);
  return { results: data.results };
}

/* ---------------- Country populations (World Bank, free, no key) ----------------
   Capital Quest ships its own ~2018 figures; this refreshes them. Rows are
   keyed by ISO alpha-3, the same codes the game uses; regional aggregates
   ("WLD", "EUU"…) simply never match a country in the game. Unverified
   against the live API when written, so the game treats any odd shape as
   "no update" and keeps its built-in numbers. */
export async function population() {
  const res = await fetch('https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&mrv=1&per_page=400');
  if (!res.ok) throw new Error(`worldbank ${res.status}`);
  const j = await res.json();
  const rows = Array.isArray(j) && Array.isArray(j[1]) ? j[1] : [];
  const pop = {};
  let year = null;
  for (const r of rows) {
    if (r && /^[A-Z]{3}$/.test(r.countryiso3code || '') && typeof r.value === 'number' && r.value > 0) {
      pop[r.countryiso3code] = r.value;
      if (!year || r.date > year) year = r.date;
    }
  }
  if (Object.keys(pop).length < 100) throw new Error('worldbank: unexpected response shape');
  return { year, pop };
}

/* ---------------- Next rocket launch ----------------
   Launch Library 2 first (pictures and a go/no-go status). Its free tier
   is ~15 calls an hour per IP, and Cloudflare Workers share IPs with lots
   of other sites, so it often answers 429 from here; then RocketLaunch.Live's
   free "next 5" list is used instead (no pictures, and sometimes only an
   estimated date). */
const LAUNCH_HEADERS = { Accept: 'application/json', 'User-Agent': 'GeorgesWebsite/1.0 (+https://georgeneagu.win)' };
const clipText = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 3)}…` : t || null; };

export async function launch() {
  try {
    return await launchFromLL2();
  } catch (e) {
    try {
      return await launchFromRLL();
    } catch (e2) {
      throw new Error(`${e.message}; ${e2.message}`);
    }
  }
}

async function launchFromRLL() {
  const res = await fetch('https://fdo.rocketlaunch.live/json/launches/next/5', { headers: LAUNCH_HEADERS });
  if (!res.ok) throw new Error(`rocketlaunch.live ${res.status}`);
  const j = await res.json();
  if (!j || !Array.isArray(j.result)) throw new Error('rocketlaunch.live: unexpected response shape');
  const when = (x) => {
    const t = x.t0 || x.win_open;
    if (t) return Date.parse(t);
    const s = Number(x.sort_date);
    return s > 0 ? s * 1000 : NaN;
  };
  const l = j.result.find((x) => x && x.name && Number.isFinite(when(x)) && when(x) > Date.now() - 3600e3);
  if (!l) throw new Error('rocketlaunch.live: none upcoming');
  const exact = !!(l.t0 || l.win_open);
  const m = Array.isArray(l.missions) && l.missions[0];
  const loc = (l.pad && l.pad.location) || {};
  const place = [loc.name, loc.country].filter((x) => typeof x === 'string' && x).join(', ');
  return {
    name: String(l.name),
    net: new Date(when(l)).toISOString(),
    status: exact ? '' : 'Date not fixed yet',
    statusCode: exact ? '' : 'TBD',
    rocket: (l.vehicle && l.vehicle.name) || null,
    provider: (l.provider && l.provider.name) || null,
    mission: (m && m.name) || String(l.name),
    about: clipText((m && m.description) || l.mission_description || l.launch_description, 320),
    pad: (l.pad && l.pad.name) || null,
    place: place || null,
    image: null,
    source: 'RocketLaunch.Live',
  };
}

async function launchFromLL2() {
  const res = await fetch('https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=6&mode=normal', { headers: LAUNCH_HEADERS });
  if (!res.ok) throw new Error(`launches ${res.status}`);
  const j = await res.json();
  if (!j || !Array.isArray(j.results)) throw new Error('launches: unexpected response shape');
  const l = j.results.find((x) => x && x.name && x.net && Date.parse(x.net) > Date.now() - 3600e3);
  if (!l) throw new Error('launches: none upcoming');
  const img = typeof l.image === 'string' ? l.image : (l.image && (l.image.thumbnail_url || l.image.image_url)) || null;
  const conf = (l.rocket && l.rocket.configuration) || {};
  const pad = l.pad || {};
  const about = l.mission && l.mission.description ? String(l.mission.description).replace(/\s+/g, ' ').trim() : '';
  return {
    name: String(l.name),
    net: l.net,
    status: (l.status && l.status.name) || '',
    statusCode: (l.status && l.status.abbrev) || '',
    rocket: conf.full_name || conf.name || null,
    provider: (l.launch_service_provider && l.launch_service_provider.name) || null,
    mission: (l.mission && l.mission.name) || null,
    about: about.length > 320 ? `${about.slice(0, 317)}…` : about || null,
    pad: pad.name || null,
    place: (pad.location && pad.location.name) || null,
    image: img && /^https:\/\//.test(img) ? img : null,
    source: 'Launch Library 2',
  };
}

/* ---------------- The whole Earth today (NASA EPIC, free, no key) ----------------
   DSCOVR photographs the sunlit side of Earth several times a day from
   ~1.5 million km away. Picks the photo whose centre is nearest
   Nottingham's longitude, so it's "our" side of the planet. */
export async function earth() {
  const res = await fetch('https://epic.gsfc.nasa.gov/api/natural');
  if (!res.ok) throw new Error(`epic ${res.status}`);
  const list = await res.json();
  const good = Array.isArray(list) ? list.filter((x) => x && /^[\w-]+$/.test(x.image || '') && /^\d{4}-\d{2}-\d{2}/.test(x.date || '')
    && x.centroid_coordinates && typeof x.centroid_coordinates.lon === 'number') : [];
  if (!good.length) throw new Error('epic: unexpected response shape');
  const away = (x) => Math.abs(((x.centroid_coordinates.lon + 1.13 + 540) % 360) - 180);
  const pick = good.reduce((a, b) => (away(b) < away(a) ? b : a));
  const [y, m, d] = pick.date.slice(0, 10).split('-');
  return {
    image: `https://epic.gsfc.nasa.gov/archive/natural/${y}/${m}/${d}/jpg/${pick.image}.jpg`,
    date: pick.date,
    lat: pick.centroid_coordinates.lat,
    lon: pick.centroid_coordinates.lon,
  };
}

/* ---------------- Earthquakes in the last day (USGS, free, no key) ---------------- */
export async function quakes() {
  const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
  if (!res.ok) throw new Error(`usgs ${res.status}`);
  const j = await res.json();
  if (!j || !Array.isArray(j.features)) throw new Error('usgs: unexpected response shape');
  const list = j.features
    .map((f) => {
      const p = (f && f.properties) || {};
      const c = (f && f.geometry && f.geometry.coordinates) || [];
      return { mag: p.mag, place: p.place, time: p.time, lon: c[0], lat: c[1] };
    })
    .filter((q) => typeof q.mag === 'number' && typeof q.lat === 'number' && typeof q.lon === 'number' && typeof q.time === 'number')
    .sort((a, b) => b.mag - a.mag)
    .slice(0, 150)
    .map((q) => ({ ...q, mag: Math.round(q.mag * 10) / 10, place: String(q.place || 'Out at sea').slice(0, 90) }));
  return { count: list.length, quakes: list };
}

/* ---------------- Northern Lights tonight? (NOAA SWPC Kp forecast, free, no key) ----------------
   NOAA changed this file in March 2026 from rows of arrays (first row =
   headers, values as strings) to an array of objects with numbers. Both
   are read. Returns the highest forecast Kp for the next UK night
   (3-hour slots starting 18:00–03:00 UTC). */
export async function aurora() {
  const res = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json');
  if (!res.ok) throw new Error(`swpc ${res.status}`);
  const j = await res.json();
  if (!Array.isArray(j) || !j.length) throw new Error('swpc: unexpected response shape');
  const rows = Array.isArray(j[0]) ? j.slice(1).map((r) => Object.fromEntries(j[0].map((k, i) => [k, r[i]]))) : j;
  const when = (s) => {
    const t = String(s || '').trim().replace(' ', 'T');
    return Date.parse(/(Z|[+-]\d\d:?\d\d)$/.test(t) ? t : `${t}Z`);
  };
  const slots = rows
    .map((r) => ({ t: when(r && r.time_tag), kp: Number(r && r.kp) }))
    .filter((r) => Number.isFinite(r.t) && Number.isFinite(r.kp) && r.kp >= 0 && r.kp <= 9);
  if (!slots.length) throw new Error('swpc: unexpected response shape');
  const now = Date.now();
  const ahead = slots.filter((r) => r.t > now - 3 * 3600e3 && r.t < now + 24 * 3600e3);
  const night = ahead.filter((r) => { const h = new Date(r.t).getUTCHours(); return h >= 18 || h < 6; });
  const pool = night.length ? night : ahead.length ? ahead : slots.slice(-8);
  const past = slots.filter((r) => r.t <= now);
  return {
    kp: Math.round(Math.max(...pool.map((r) => r.kp)) * 10) / 10,
    now: past.length ? Math.round(past[past.length - 1].kp * 10) / 10 : null,
  };
}

/* ---------------- The International Space Station ---------------- */
export async function iss() {
  const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
  if (!res.ok) throw new Error(`iss ${res.status}`);
  const s = await res.json();
  let country = null;
  try {
    const c = await fetch(`https://api.wheretheiss.at/v1/coordinates/${s.latitude.toFixed(3)},${s.longitude.toFixed(3)}`);
    if (c.ok) { const j = await c.json(); if (j.country_code && j.country_code !== '??') country = j.country_code; }
  } catch (e) { /* over the sea */ }
  return {
    lat: s.latitude, lon: s.longitude,
    altitude: Math.round(s.altitude), speed: Math.round(s.velocity),
    daylight: s.visibility === 'daylight', country, at: new Date().toISOString(),
  };
}

/* ---------------- Live match centre (API-Football) ----------------
   The page only asks around kick-off time, for today's date. */
const AF = 'https://v3.football.api-sports.io';
async function af(path, key) {
  const res = await fetch(`${AF}${path}`, { headers: { 'x-apisports-key': key } });
  if (!res.ok) throw new Error(`api-football ${res.status}`);
  const j = await res.json();
  const errs = j.errors && (Array.isArray(j.errors) ? j.errors : Object.values(j.errors));
  if (errs && errs.length) {
    const msg = String(errs[0]);
    const e = new Error(msg);
    e.plan = /plan|season|subscription/i.test(msg);
    throw e;
  }
  return j.response || [];
}

export async function live(env, date, cache, origin) {
  const key = env.API_FOOTBALL_KEY;
  const get = async (name) => { if (!cache) return null; const r = await cache.match(new Request(`${origin}/api/_af/${name}`)); return r ? r.json() : null; };
  const put = async (name, body, secs) => { if (cache) await cache.put(new Request(`${origin}/api/_af/${name}`), new Response(JSON.stringify(body), { headers: { 'cache-control': `public, max-age=${secs}` } })); };

  // Forest's id in API-Football (looked up once a month).
  let team = await get('team');
  if (!team) {
    const t = await af('/teams?search=Nottingham', key);
    const hit = t.find((x) => /nottingham forest/i.test(x.team.name)) || t[0];
    if (!hit) throw new Error('Forest not found');
    team = { id: hit.team.id };
    await put('team', team, 30 * 86400);
  }

  // Today's Forest match, if there is one.
  let fx = await get(`fx-${date}`);
  if (!fx) {
    const list = await af(`/fixtures?team=${team.id}&date=${date}&timezone=Europe/London`, key);
    fx = { id: list[0] ? list[0].fixture.id : null };
    await put(`fx-${date}`, fx, 6 * 3600);
  }
  if (!fx.id) return { match: null };

  const [m] = await af(`/fixtures?id=${fx.id}&timezone=Europe/London`, key);
  if (!m) return { match: null };
  const us = m.teams.home.id === team.id ? 'home' : 'away';
  const them = us === 'home' ? 'away' : 'home';
  const kind = (e) => {
    if (e.type === 'Goal') return e.detail === 'Own Goal' ? 'own' : e.detail === 'Penalty' ? 'pen' : e.detail === 'Missed Penalty' ? 'miss' : 'goal';
    if (e.type === 'Card') return /red/i.test(e.detail) ? 'red' : 'yellow';
    if (e.type === 'subst') return 'sub';
    if (e.type === 'Var') return 'var';
    return 'other';
  };
  const events = (m.events || []).map((e) => ({
    min: e.time.elapsed + (e.time.extra ? `+${e.time.extra}` : ''),
    team: e.team.id === team.id ? 'f' : 'o',
    type: kind(e),
    player: e.player && e.player.name,
    other: e.assist && e.assist.name, // assist for goals; the other player in a substitution
    detail: e.detail,
  })).filter((e) => e.type !== 'other');
  const lu = (m.lineups || []).find((l) => l.team.id === team.id);
  return {
    match: {
      status: m.fixture.status.short,
      statusText: m.fixture.status.long,
      elapsed: m.fixture.status.elapsed,
      kickoff: m.fixture.date,
      venue: m.fixture.venue && m.fixture.venue.name,
      home: us === 'home',
      opponent: m.teams[them].name,
      forest: m.goals[us],
      opp: m.goals[them],
      events,
      lineup: lu ? {
        formation: lu.formation,
        coach: lu.coach && lu.coach.name,
        xi: (lu.startXI || []).map((p) => ({ name: p.player.name, number: p.player.number, pos: p.player.pos })),
        subs: (lu.substitutes || []).map((p) => ({ name: p.player.name, number: p.player.number })),
      } : null,
    },
  };
}
