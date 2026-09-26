/* ===========================================================
   GEORGE'S WEBSITE: LIVE FOREST DATA
   -----------------------------------------------------------
   A tiny Cloudflare Worker. Everything on the site is plain
   files, except GET /api/forest, which this file answers:
   Forest's league position, the table, fixtures, results and
   the team's top scorers, from football-data.org.

   The API key lives in Cloudflare as a secret called
   FOOTBALL_DATA_KEY (Worker > Settings > Variables and secrets),
   never in this file. Answers are cached for 30 minutes, or
   2 minutes while Forest are playing, so the free API limit
   (10 requests a minute) is never close.
   =========================================================== */

import { coach } from './coach.js';

const API = 'https://api.football-data.org/v4';
const CACHE_VERSION = 'v1';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/forest') {
      // Public football data: the old github.io copy of the site may read it too.
      const res = await forest(request, env, ctx);
      const open = new Response(res.body, res);
      open.headers.set('access-control-allow-origin', '*');
      return open;
    }
    if (url.pathname === '/api/coach') return coach(request, env, json);
    if (url.pathname.startsWith('/api/')) return json({ error: 'not-found' }, 404, 0);
    return env.ASSETS.fetch(request);
  },
};

async function forest(request, env, ctx) {
  if (!env.FOOTBALL_DATA_KEY) return json({ error: 'no-key' }, 503, 0);

  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(new URL(`/api/forest?${CACHE_VERSION}`, request.url).toString());
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  let data;
  try {
    data = await build(env.FOOTBALL_DATA_KEY);
  } catch (err) {
    return json({ error: 'upstream', detail: String(err && err.message || err).slice(0, 120) }, 502, 0);
  }

  const ttl = data.live ? 120 : 1800;
  const res = json(data, 200, ttl);
  if (cache) ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

async function api(path, key) {
  const res = await fetch(`${API}${path}`, { headers: { 'X-Auth-Token': key } });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

export async function build(key) {
  const [standings, scorers] = await Promise.all([
    api('/competitions/PL/standings', key),
    api('/competitions/PL/scorers?limit=100', key).catch(() => ({ scorers: [] })),
  ]);

  const total = (standings.standings || []).find((s) => s.type === 'TOTAL') || (standings.standings || [])[0];
  const table = (total && total.table) || [];
  const us = table.find((r) => /nottingham/i.test(r.team.name));
  if (!us) throw new Error('Forest not found in the table');
  const forestId = us.team.id;

  const matchesRes = await api(`/teams/${forestId}/matches?competitions=PL`, key);
  const matches = (matchesRes.matches || []).map((m) => {
    const home = m.homeTeam.id === forestId;
    const other = home ? m.awayTeam : m.homeTeam;
    const ft = (m.score && m.score.fullTime) || {};
    const ours = home ? ft.home : ft.away;
    const theirs = home ? ft.away : ft.home;
    const uk = ukDateTime(m.utcDate);
    return {
      date: uk.date,
      time: uk.time,
      utc: m.utcDate,
      opponent: teamName(other),
      venue: home ? 'H' : 'A',
      status: m.status,
      forest: ours == null ? null : ours,
      opp: theirs == null ? null : theirs,
    };
  }).sort((a, b) => a.utc.localeCompare(b.utc));

  const ourScorers = (scorers.scorers || [])
    .filter((s) => s.team && s.team.id === forestId)
    .map((s) => ({ name: s.player.name, goals: s.goals || 0, assists: s.assists || 0 }))
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists);

  return {
    updated: new Date().toISOString(),
    live: matches.some((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED'),
    league: {
      position: us.position,
      played: us.playedGames,
      points: us.points,
      won: us.won,
      drawn: us.draw,
      lost: us.lost,
      goalDifference: us.goalDifference,
      table: table.map((r) => ({
        position: r.position,
        team: teamName(r.team),
        played: r.playedGames,
        goalDifference: r.goalDifference,
        points: r.points,
        forest: r.team.id === forestId,
      })),
    },
    matches,
    scorers: ourScorers.slice(0, 5),
  };
}

// Friendly club names, matching the ones the site has always used.
const NAMES = {
  'Man United': 'Man Utd', 'Manchester United FC': 'Man Utd', 'Manchester City FC': 'Man City',
  'Brighton Hove': 'Brighton', 'Brighton & Hove Albion FC': 'Brighton',
  'Wolverhampton': 'Wolves', 'Wolverhampton Wanderers FC': 'Wolves',
  'Tottenham Hotspur FC': 'Tottenham', 'Spurs': 'Tottenham',
  'Leeds United': 'Leeds', 'Ipswich Town': 'Ipswich', 'Coventry City': 'Coventry', 'Hull City': 'Hull',
  'Newcastle United': 'Newcastle', 'West Ham United': 'West Ham', 'Leicester City': 'Leicester',
  'Nottingham': 'Forest', 'Nottingham Forest FC': 'Forest', 'Nottm Forest': 'Forest',
};
function teamName(t) {
  const raw = t.shortName || t.name || '';
  if (NAMES[raw]) return NAMES[raw];
  if (NAMES[t.name]) return NAMES[t.name];
  return raw.replace(/^AFC\s+/, '').replace(/\s+(A?FC)$/, '');
}

// Kick-off in UK time, as "2026-10-11" and "13:00".
function ukDateTime(utc) {
  const parts = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(utc)).forEach((p) => { parts[p.type] = p.value; });
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function json(body, status, maxAge) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Browsers re-check every minute; Cloudflare's cache keeps it for maxAge.
      'cache-control': maxAge ? `public, max-age=60, s-maxage=${maxAge}` : 'no-store',
    },
  });
}
