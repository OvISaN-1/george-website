/* ===========================================================
   GEORGE'S WEBSITE: shared Supabase helpers
   Used by the Football page (prediction tracker) and the Quiz
   Zone (top scores + keepy-uppy leaderboard). The three original
   quiz games still carry their own copy of the same URL and key.
   The anon key is meant to be public; what it can do is limited by
   the row-level security rules set up in Supabase.
   =========================================================== */
(function (DB) {
  const SUPABASE_URL = 'https://hucnucpfyjltlhmvprso.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Y251Y3BmeWpsdGxobXZwcnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDgzNjEsImV4cCI6MjEwMzU4NDM2MX0.DSjLCkiUWB47wVd4wnW_2RvWFoISbH80JI9ukB1bBdg';

  function headers(extra) {
    return Object.assign({
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    }, extra || {});
  }

  /* GET rows from a table. query is the part after "?". Throws on failure
     so callers can tell "no rows" apart from "couldn't reach the database". */
  async function select(table, query) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: headers() });
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    return res.json();
  }

  async function insert(table, row) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
  }

  /* Call a database function (used for PIN-protected writes). */
  async function rpc(fn, args) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      let msg = '';
      try { msg = (await res.json()).message || ''; } catch (e) { /* ignore */ }
      const err = new Error(msg || `Supabase ${res.status}`);
      err.status = res.status;
      throw err;
    }
  }

  async function topScores(gameId, limit) {
    return select('leaderboard',
      `game=eq.${encodeURIComponent(gameId)}&select=player_name,score&order=score.desc&limit=${limit || 1}`);
  }

  async function saveScore(gameId, name, score) {
    return insert('leaderboard', { game: gameId, player_name: name, score: score });
  }

  DB.select = select;
  DB.insert = insert;
  DB.rpc = rpc;
  DB.topScores = topScores;
  DB.saveScore = saveScore;
})(window.DB = window.DB || {});
