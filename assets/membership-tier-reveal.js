/* membership-tier-reveal.js — S206 audit item #4 (progressive-membership-unlock L1)
   Staggered scroll-reveal for .tier-reveal tier cards on /membership/.
   HTML already marks VaultSparked as .tier-reveal.tier-reveal-2 and
   Eternal as .tier-reveal.tier-reveal-3 — this script activates the animation.

   Flow: cards start dimmed → IntersectionObserver fires when card enters
   viewport → .tier-revealed class applied → CSS transitions to full opacity.

   Free tier is always fully visible (no .tier-reveal class on it).
   Predicate-loaded on /membership/ only by ambient-loader.js. */
(function () {
  'use strict';

  if (!(location.pathname || '/').startsWith('/membership')) return;
  if (!window.IntersectionObserver) return;

  function ensureStyles() {
    if (document.getElementById('vs-tr-css')) return;
    var s = document.createElement('style');
    s.id = 'vs-tr-css';
    s.textContent =
      '.tier-reveal{' +
        'opacity:.28;' +
        'transform:translateY(18px);' +
        'transition:opacity .55s ease,transform .55s ease;}' +
      '.tier-reveal.tier-revealed{' +
        'opacity:1;' +
        'transform:none;}' +
      '.tier-reveal.tier-reveal-3.tier-revealed{transition-delay:.12s;}';
    (document.head || document.body).appendChild(s);
  }

  function init() {
    var cards = document.querySelectorAll('.tier-reveal');
    if (!cards.length) return;

    ensureStyles();

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('tier-revealed');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    cards.forEach(function (card) { obs.observe(card); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
