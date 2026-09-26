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
      const res = await fetch(apiUrl('apod'));
      const a = await res.json();
      if (!res.ok || a.error) throw new Error(a.error || res.status);
      const page = `https://apod.nasa.gov/apod/ap${a.date.slice(2).replace(/-/g, '')}.html`;
      const day = new Date(a.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
      el.innerHTML = `
        <a class="apod-img" href="${esc(a.hd || page)}" target="_blank" rel="noopener">
          ${a.image ? `<img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy" decoding="async">` : '<span class="apod-none" aria-hidden="true">🌌</span>'}
          ${a.video ? '<span class="apod-play" aria-hidden="true">▶</span>' : ''}
        </a>
        <p class="space-kicker">NASA picture of the day · ${esc(day)}</p>
        <h3>${esc(a.title)}</h3>
        <p class="space-credit">${a.video ? 'Video' : 'Image'}: ${esc(a.credit)}</p>
        <details class="apod-more"><summary>What am I looking at?</summary><p>${esc(a.explanation)}</p>
          <p><a href="${esc(page)}" target="_blank" rel="noopener">See it on NASA's website ↗</a></p></details>`;
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
  async function makeMap() {
    const box = $('iss-map');
    if (!window.d3) await loadScript('https://cdn.jsdelivr.net/npm/d3@7');
    if (!window.topojson) await loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3');
    const world = await (await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')).json();
    const W = 720, H = 360;
    const projection = d3.geoEquirectangular().fitSize([W, H], { type: 'Sphere' });
    const path = d3.geoPath(projection);
    const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'World map showing where the International Space Station is');
    svg.append('path').attr('class', 'iss-sea').attr('d', path({ type: 'Sphere' }));
    svg.append('path').attr('class', 'iss-grid').attr('d', path(d3.geoGraticule10()));
    svg.append('path').attr('class', 'iss-land').attr('d', path(topojson.feature(world, world.objects.countries)));
    // Nottingham, so George can see how close it gets.
    const [nx, ny] = projection([-1.13, 52.94]);
    svg.append('circle').attr('class', 'iss-home').attr('cx', nx).attr('cy', ny).attr('r', 3.5);
    svg.append('text').attr('class', 'iss-home-label').attr('x', nx + 6).attr('y', ny - 6).text('Nottingham');
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

  apod();
  start();
})();
