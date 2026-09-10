/* ===========================================================
   GEORGE'S WEBSITE — shared behaviour for every page
   No build step, no framework — plain JS so it's easy to read
   and easy to change later.
   =========================================================== */

/* ---- Mobile nav toggle ------------------------------------------------ */
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (!toggle || !mobileNav) return;

  toggle.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close the mobile menu when a link is tapped.
  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ---- Scroll reveal ------------------------------------------------------
   Fades sections in as they enter the viewport. Skipped entirely for
   anyone with "reduce motion" turned on (handled in CSS too, but this
   avoids doing pointless work). */
function initScrollReveal() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const targets = document.querySelectorAll('.reveal:not(.is-visible)');
  if (!targets.length) return;

  // Very old browsers without IntersectionObserver: just show everything
  // immediately rather than leaving it hidden forever.
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ---- Card renderer --------------------------------------------------------
   Every content page (football / games / school) keeps its real content
   as a plain JS array near the bottom of the HTML file — see the
   comment block in each page. This function turns that array into the
   card markup, so updating the site is "edit a list", not "edit HTML".

   type: 'football' | 'gaming' | 'school' — controls the accent colour
   and the tag label shown on each card. */
function renderCards(containerId, items, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const tagLabel = {
    football: 'Football',
    gaming: 'Video Games',
    school: 'School Zone',
  }[type] || '';

  // A quiet, generic "photo coming soon" glyph — not a dashed wireframe
  // box. Coloured by the card's own accent via CSS (.card.football svg,
  // etc.), so one icon works for every section.
  const placeholderIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2"/>
      <circle cx="9" cy="10" r="1.6"/>
      <path d="M3 16l5-4.5 4 3.2 3.5-3.7L21 15"/>
    </svg>`;

  container.innerHTML = items
    .map((item) => {
      const photoText = item.photoAlt || 'Photo coming soon';
      // If the data entry has a real "photo" path, show that image instead
      // of the "coming soon" placeholder. object-fit:contain (set in CSS)
      // means logos/cover art of any shape show whole, never cropped.
      const photoBlock = item.photo
        ? `<div class="card-photo"><img src="${escapeAttr(item.photo)}" alt="${escapeAttr(photoText)}" loading="lazy"></div>`
        : `<div class="photo-slot" aria-hidden="true">${placeholderIcon}<span>${escapeHtml(photoText)}</span></div>`;
      return `
        <article class="card ${type} reveal">
          ${photoBlock}
          <span class="tag">${escapeHtml(tagLabel)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          ${item.meta ? `<p class="mono-num" style="margin-bottom:0;">${escapeHtml(item.meta)}</p>` : ''}
          <p>${escapeHtml(item.description)}</p>
        </article>
      `;
    })
    .join('');

  // Newly-injected cards need their own reveal observer.
  initScrollReveal();
}

/* Basic HTML-escaping so anything typed into the data arrays (an
   apostrophe in a player's name, for example) can't break the markup. */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

/* Same as escapeHtml, but also safe to drop inside a double-quoted HTML
   attribute (escapes " too, which escapeHtml alone doesn't need to). */
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initScrollReveal();
});
