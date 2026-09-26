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

/* ---------------- NASA picture of the day ---------------- */
export async function apod(env) {
  const key = env.NASA_KEY || 'DEMO_KEY';
  const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(key)}&thumbs=true`);
  if (!res.ok) throw new Error(`apod ${res.status}`);
  const a = await res.json();
  const video = a.media_type === 'video';
  return {
    date: a.date, title: a.title, explanation: a.explanation,
    image: video ? (a.thumbnail_url || null) : a.url,
    hd: video ? null : (a.hdurl || a.url),
    video: video ? a.url : null,
    credit: a.copyright ? String(a.copyright).replace(/\s+/g, ' ').trim() : 'NASA',
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
