/* ===========================================================
   SPACE CORNER (School Zone)
   - NASA's Astronomy Picture of the Day (/api/apod)
   - Where the International Space Station is right now (/api/iss),
     on a world map that loads only when you scroll to it.
   Both come through worker/extras.js. Needs js/main.js (apiUrl).
   =========================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const regionName = (code) => { try { return new Intl.DisplayNames(['en-GB'], { type: 'region' }).of(code); } catch (e) { return code; } };
  const flag = (code) => code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

  /* ---------------- Picture of the day ---------------- */
  async function apod() {
    const el = $('apod');
    if (!el) return;
    try {
      // A slow/hung upstream shouldn't leave this stuck on "Loading…" forever.
      const res = await fetch(apiUrl('apod'), { signal: AbortSignal.timeout(12000) });
      const a = await res.json();
      if (!res.ok || a.error) throw new Error(a.error || res.status);
      // NASA moved APOD from apod.nasa.gov to science.nasa.gov in 2026;
      // the old per-day URL pattern doesn't carry over, so this links to
      // today's picture on the new site rather than guessing a dated URL.
      const page = 'https://science.nasa.gov/apod/';
      const day = new Date(a.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
      el.innerHTML = `
        <a class="apod-img" href="${esc(a.hd || page)}" target="_blank" rel="noopener">
          ${a.image ? `<img id="apod-photo" src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy" decoding="async">` : '<span class="apod-none" aria-hidden="true">🌌</span>'}
          ${a.video ? '<span class="apod-play" aria-hidden="true">▶</span>' : ''}
        </a>
        <p class="space-kicker">NASA picture of the day · ${esc(day)}</p>
        <h3>${esc(a.title)}</h3>
        <p class="space-credit">${a.video ? 'Video' : 'Image'}: ${esc(a.credit)}</p>
        <p class="apod-open"><a href="${esc(page)}" target="_blank" rel="noopener">Open today's picture on NASA's website ↗</a></p>
        <details class="apod-more"><summary>What am I looking at?</summary><p>${esc(a.explanation)}</p></details>`;
      // NASA's own image link occasionally 404s (their site moved in 2025) —
      // if the photo genuinely won't load, swap in the same "no picture"
      // look rather than leaving a broken image icon.
      const img = document.getElementById('apod-photo');
      if (img) img.addEventListener('error', () => {
        img.closest('.apod-img').innerHTML = '<span class="apod-none" aria-hidden="true">🌌</span>';
      }, { once: true });
    } catch (e) {
      el.innerHTML = '<p class="space-kicker">NASA picture of the day</p><p class="space-off">Couldn\'t reach NASA right now. Try again later! 🌌</p>';
    }
  }

  /* ---------------- The ISS on a world map ---------------- */
  const trail = [];
  let map = null, timer = null, visible = false;

  function loadScript(src) {
    return new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
  }
  // One flat world map (used by the ISS and the earthquakes), with Nottingham marked.
  let worldData = null;
  async function worldMap(box, label) {
    if (!window.d3) await loadScript('https://cdn.jsdelivr.net/npm/d3@7');
    if (!window.topojson) await loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3');
    if (!worldData) worldData = fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then((r) => r.json());
    const world = await worldData;
    const W = 720, H = 360;
    const projection = d3.geoEquirectangular().fitSize([W, H], { type: 'Sphere' });
    const path = d3.geoPath(projection);
    const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', label);
    svg.append('path').attr('class', 'iss-sea').attr('d', path({ type: 'Sphere' }));
    svg.append('path').attr('class', 'iss-grid').attr('d', path(d3.geoGraticule10()));
    svg.append('path').attr('class', 'iss-land').attr('d', path(topojson.feature(world, world.objects.countries)));
    const [nx, ny] = projection([-1.13, 52.94]);
    svg.append('circle').attr('class', 'iss-home').attr('cx', nx).attr('cy', ny).attr('r', 3.5);
    svg.append('text').attr('class', 'iss-home-label').attr('x', nx + 6).attr('y', ny - 6).text('Nottingham');
    return { svg, projection };
  }

  async function makeMap() {
    const box = $('iss-map');
    const { svg, projection } = await worldMap(box, 'World map showing where the International Space Station is');
    const trailPath = svg.append('path').attr('class', 'iss-trail');
    const g = svg.append('g').attr('class', 'iss-dot');
    g.append('circle').attr('r', 14).attr('class', 'iss-ring');
    g.append('circle').attr('r', 6);
    g.append('text').attr('y', -14).attr('text-anchor', 'middle').text('🛰️');
    box.classList.add('ready');
    return { projection, trailPath, g };
  }

  async function tick() {
    clearTimeout(timer);
    try {
      const res = await fetch(apiUrl('iss'), { cache: 'no-store' });
      const s = await res.json();
      if (!res.ok || s.error) throw new Error('iss');
      trail.push([s.lon, s.lat]);
      if (trail.length > 60) trail.shift();
      if (map) {
        const [x, y] = map.projection([s.lon, s.lat]);
        map.g.transition().duration(reduced ? 0 : 900).attr('transform', `translate(${x},${y})`);
        // Break the line where it wraps round the edge of the map.
        let d = '', prev = null;
        trail.forEach(([lo, la]) => { const [px, py] = map.projection([lo, la]); d += (prev == null || Math.abs(lo - prev) > 180 ? 'M' : 'L') + px.toFixed(1) + ',' + py.toFixed(1); prev = lo; });
        map.trailPath.attr('d', d);
      }
      const where = s.country ? `over ${flag(s.country)} <b>${esc(regionName(s.country))}</b>` : 'over the <b>ocean</b> 🌊';
      $('iss-text').innerHTML = `Right now the ISS is ${where}.<br><span>${s.altitude} km up · ${s.speed.toLocaleString('en-GB')} km/h · ${s.daylight ? '☀️ in sunlight' : '🌙 in Earth\'s shadow'} · once round the Earth about every 90 minutes</span>`;
    } catch (e) {
      $('iss-text').textContent = 'Couldn\'t find the ISS right now. It\'s definitely still up there! 🛰️';
    }
    if (visible && document.visibilityState === 'visible') timer = setTimeout(tick, 10000);
  }

  function start() {
    const box = $('iss-map');
    if (!box) return;
    new IntersectionObserver(async (entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible && !map) { try { map = await makeMap(); } catch (e) { box.classList.add('failed'); } }
      if (visible) tick(); else clearTimeout(timer);
    }, { rootMargin: '200px' }).observe(box);
    document.addEventListener('visibilitychange', () => { if (visible && document.visibilityState === 'visible') tick(); });
  }

  // Fetch one of our /api/ answers, treating any error reply as a failure.
  async function getJson(name) {
    const res = await fetch(apiUrl(name), { signal: AbortSignal.timeout(12000) });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || res.status);
    return data;
  }
  const ukTime = (d, opts) => new Date(d).toLocaleString('en-GB', Object.assign({ timeZone: 'Europe/London' }, opts));
  const ago = (t) => {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 60) return `${Math.max(m, 1)} min ago`;
    const h = Math.round(m / 60);
    return `${h} hour${h === 1 ? '' : 's'} ago`;
  };

  /* ---------------- Next rocket launch (Launch Library 2) ---------------- */
  async function nextLaunch() {
    const el = $('launch');
    if (!el) return;
    try {
      const l = await getJson('launch');
      const [rocketBit, missionBit] = String(l.name).split(' | ');
      const status = {
        Go: ['✅ Go for launch', ' go'], TBC: ['🗓️ Date to be confirmed', ''], TBD: ['🗓️ Date not fixed yet', ''], Hold: ['⏸️ On hold', ''],
      }[l.statusCode] || [l.status ? `ℹ️ ${l.status}` : '', ''];
      el.innerHTML = `
        ${l.image ? `<span class="apod-img"><img src="${esc(l.image)}" alt="" loading="lazy" decoding="async"></span>` : ''}
        <p class="space-kicker">🚀 Next rocket launch</p>
        <h3>${esc(l.mission || missionBit || l.name)}</h3>
        <p class="space-credit">${esc(l.rocket || rocketBit || '')}${l.provider ? ` · ${esc(l.provider)}` : ''}</p>
        <p class="launch-count" id="launch-count" aria-live="off">—</p>
        ${status[0] ? `<span class="space-chip${status[1]}">${esc(status[0])}</span>` : ''}
        <p class="space-credit">${esc(ukTime(l.net, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))} UK time${l.place ? ` · ${esc(l.place)}` : ''}</p>
        ${l.about ? `<details class="apod-more"><summary>What's it launching?</summary><p>${esc(l.about)}</p></details>` : ''}`;
      const img = el.querySelector('.apod-img img');
      if (img) img.addEventListener('error', () => img.parentElement.remove(), { once: true });
      const count = $('launch-count');
      const when = Date.parse(l.net);
      const pad = (n) => String(n).padStart(2, '0');
      const tickDown = () => {
        const ms = when - Date.now();
        if (ms <= 0) { count.textContent = 'Lift-off time! 🔥'; return false; }
        const s = Math.floor(ms / 1000);
        const d = Math.floor(s / 86400);
        count.textContent = `${d ? `${d}d ` : ''}${pad(Math.floor(s / 3600) % 24)}h ${pad(Math.floor(s / 60) % 60)}m ${pad(s % 60)}s`;
        return true;
      };
      if (tickDown()) { const t = setInterval(() => { if (!tickDown()) clearInterval(t); }, 1000); }
    } catch (e) {
      el.innerHTML = '<p class="space-kicker">🚀 Next rocket launch</p><p class="space-off">Couldn\'t get the launch list right now. Try again later! 🚀</p>';
    }
  }

  /* ---------------- The whole Earth today (NASA EPIC) ---------------- */
  async function earthToday() {
    const el = $('earth');
    if (!el) return;
    try {
      const e = await getJson('earth');
      const taken = ukTime(`${e.date.replace(' ', 'T')}Z`, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      el.innerHTML = `
        <span class="apod-img contain"><img src="${esc(e.image)}" alt="Photo of the whole Earth from space, taken by NASA's DSCOVR satellite" loading="lazy" decoding="async"></span>
        <p class="space-kicker">🌍 Earth today</p>
        <h3>Our whole planet in one photo</h3>
        <p class="space-credit">Taken ${esc(taken)} (UK time) by NASA's DSCOVR satellite, about 1.5 million km away. That's 4 times further than the Moon!</p>`;
      const img = el.querySelector('img');
      img.addEventListener('error', () => { img.parentElement.innerHTML = '<span class="apod-none" aria-hidden="true">🌍</span>'; }, { once: true });
    } catch (err) {
      el.innerHTML = '<p class="space-kicker">🌍 Earth today</p><p class="space-off">Couldn\'t reach NASA\'s Earth camera right now. Try again later! 🌍</p>';
    }
  }

  /* ---------------- Earthquakes in the last day (USGS) ---------------- */
  async function earthquakes() {
    const box = $('quake-map'), text = $('quake-text');
    if (!box || !text) return;
    let data;
    try { data = await getJson('quakes'); } catch (e) {
      box.classList.add('failed');
      text.textContent = 'Couldn\'t check for earthquakes right now. Try again later!';
      return;
    }
    const list = data.quakes || [];
    const top = list[0];
    text.innerHTML = top
      ? `${list.length} earthquake${list.length === 1 ? '' : 's'} (2.5 or bigger) in the last day.<br><span>Biggest: <b>${esc(top.mag.toFixed(1))}</b> · ${esc(top.place)} · ${esc(ago(top.time))}. Most are too small to feel.</span>`
      : 'No earthquakes bigger than 2.5 in the last day. Very quiet!';
    // Draw the map only when it scrolls into view, like the ISS one.
    new IntersectionObserver(async (entries, obs) => {
      if (!entries.some((en) => en.isIntersecting)) return;
      obs.disconnect();
      try {
        const { svg, projection } = await worldMap(box, `World map with ${list.length} earthquakes from the last day`);
        [...list].reverse().forEach((q) => {
          const [x, y] = projection([q.lon, q.lat]);
          svg.append('circle').attr('class', `quake-dot${q === top ? ' big' : ''}`).attr('cx', x).attr('cy', y)
            .attr('r', Math.max(2, (q.mag - 2) * 2.2)).append('title').text(`${q.mag.toFixed(1)} · ${q.place}`);
        });
        box.classList.add('ready');
      } catch (e) { box.classList.add('failed'); }
    }, { rootMargin: '200px' }).observe(box);
  }

  /* ---------------- Northern Lights tonight? (NOAA Kp forecast) ---------------- */
  async function auroraTonight() {
    const el = $('aurora');
    if (!el) return;
    try {
      const a = await getJson('aurora');
      const kp = a.kp;
      // Nottingham is quite far south for the aurora: it usually needs Kp 6+.
      const level = kp >= 7 ? ['🤩', 'High chance! Look north after dark.']
        : kp >= 6 ? ['👀', 'Good chance: look low in the north after dark.']
          : kp >= 5 ? ['📸', 'Small chance: a phone camera might catch a glow to the north.']
            : ['😴', 'Very unlikely tonight. The Sun is quiet.'];
      el.innerHTML = `
        <p class="space-kicker">🌌 Northern Lights tonight?</p>
        <p class="aurora-level">${level[0]} ${esc(level[1])}</p>
        <div class="aurora-meter" role="img" aria-label="Forecast Kp ${esc(kp)} out of 9"><span style="width:${Math.max(4, Math.min(100, (kp / 9) * 100))}%"></span></div>
        <div class="aurora-scale"><span>0 calm</span><span>6 · Nottingham</span><span>9 huge storm</span></div>
        <p class="space-credit">Tonight's forecast: Kp <b>${esc(kp)}</b> out of 9${a.now != null ? ` (right now: ${esc(a.now)})` : ''}. Kp shows how stirred up Earth's magnetic field is by the Sun. From NOAA's Space Weather Prediction Center.</p>`;
    } catch (e) {
      el.innerHTML = '<p class="space-kicker">🌌 Northern Lights tonight?</p><p class="space-off">Couldn\'t get the space weather forecast right now. Try again later! 🌌</p>';
    }
  }

  apod();
  start();
  nextLaunch();
  earthToday();
  earthquakes();
  auroraTonight();
})();
