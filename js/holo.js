/* ===========================================================
   HOLOGRAPHIC CARDS
   Any element with data-holo tilts in 3D as the mouse moves
   over it (or as the phone tilts), with a rainbow foil shine,
   like special FC Ultimate Team cards. The look is in
   css/shell.css. Cards added later (like George's Matchday
   card) are picked up automatically.
   =========================================================== */
(function () {
  'use strict';
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MAX_X = 14, MAX_Y = 18; // degrees of tilt
  const cards = new Set();

  function set(el, px, py, live) {
    el.style.setProperty('--rx', `${((0.5 - py) * MAX_X * 2).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((px - 0.5) * MAX_Y * 2).toFixed(2)}deg`);
    el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    el.classList.toggle('holo-live', live);
  }
  function reset(el) {
    el.classList.remove('holo-live');
    ['--rx', '--ry', '--mx', '--my'].forEach((p) => el.style.removeProperty(p));
  }

  function init(el) {
    if (el.dataset.holoReady) return;
    el.dataset.holoReady = '1';
    const shine = document.createElement('span'); shine.className = 'holo-shine'; shine.setAttribute('aria-hidden', 'true');
    const glare = document.createElement('span'); glare.className = 'holo-glare'; glare.setAttribute('aria-hidden', 'true');
    el.append(shine, glare);
    cards.add(el);
    if (reduced) return;
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return; // phones use the tilt sensor instead
      const r = el.getBoundingClientRect();
      set(el, Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)), true);
    });
    el.addEventListener('pointerleave', () => reset(el));
    // iPhones only share the tilt sensor after a tap and a "yes".
    el.addEventListener('click', askForTilt);
  }

  /* Phones: follow how the phone is being held. */
  let tiltOn = false, base = null;
  function onTilt(e) {
    if (e.beta == null || e.gamma == null) return;
    if (!base) base = { beta: e.beta, gamma: e.gamma };
    // Slowly follow how the phone is held, so the card re-centres by itself.
    base.beta += (e.beta - base.beta) * 0.02; base.gamma += (e.gamma - base.gamma) * 0.02;
    const px = Math.min(1, Math.max(0, 0.5 + (e.gamma - base.gamma) / 50));
    const py = Math.min(1, Math.max(0, 0.5 + (e.beta - base.beta) / 50));
    cards.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) set(el, px, py, true);
    });
  }
  function startTilt() {
    if (tiltOn || reduced) return;
    tiltOn = true;
    window.addEventListener('deviceorientation', onTilt);
  }
  function askForTilt() {
    const D = window.DeviceOrientationEvent;
    if (tiltOn || !D || typeof D.requestPermission !== 'function') return;
    D.requestPermission().then((s) => { if (s === 'granted') startTilt(); }).catch(() => {});
  }
  // Android and others: no permission needed.
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (coarse && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') startTilt();

  function scan(root) { (root.querySelectorAll ? root.querySelectorAll('[data-holo]') : []).forEach(init); if (root.matches && root.matches('[data-holo]')) init(root); }
  scan(document);
  new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) scan(n); }))).observe(document.body, { childList: true, subtree: true });
})();
