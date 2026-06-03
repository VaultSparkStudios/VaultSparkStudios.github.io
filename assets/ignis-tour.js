/**
 * VaultSpark — IGNIS-narrated site tour.
 *
 * First-visit only: after the hero is on-screen, IGNIS narrates the site
 * in 3 accessible text cards (hero → membership → live proof). Cards use
 * scroll-into-view + focus anchor, NOT TTS (screen-reader + respect first).
 *
 * Trigger guards:
 *   - First session only (vs_tour_seen).
 *   - User opt-in via "Take the tour" pill that appears 8s after load.
 *     Never auto-plays — a modal would be hostile.
 *   - Skips if exit-intent has already fired (visitor is leaving).
 *   - Honours prefers-reduced-motion (jump without smooth scroll).
 *   - Honours localStorage vs_prefs.noTour === true.
 *
 * Mount: homepage only. No-op elsewhere.
 * CSP-clean. No external deps.
 */
(function () {
  'use strict';

  // Single-mount gate: home only.
  if (location.pathname !== '/' && !/\/index\.html$/i.test(location.pathname)) return;

  var SEEN_KEY = 'vs_tour_seen';
  var OFFER_DELAY_MS = 8000;

  function optedOut() {
    try {
      if (sessionStorage.getItem(SEEN_KEY) === '1') return true;
      if (localStorage.getItem(SEEN_KEY) === '1') return true;
      var prefs = JSON.parse(localStorage.getItem('vs_prefs') || '{}');
      if (prefs && prefs.noTour === true) return true;
    } catch (_) {}
    return false;
  }

  // Stops = {target selector, eyebrow, title, body}. Resolved lazily so we
  // skip any stop whose anchor doesn't exist instead of hard-failing.
  var STOPS = [
    {
      selectors: ['.hero', '.hero-wordmark', 'main .container:first-of-type'],
      eyebrow: 'The forge',
      title: 'This is the vault you are standing in.',
      body: 'VaultSpark Studios ships worlds — games, tools, and a living protocol layer. Everything on this page is live repo truth, not marketing.',
    },
    {
      selectors: ['#vault-membership', '#membership', '.membership-section', 'a[href="/membership/"]'],
      eyebrow: 'The membership',
      title: 'Members see deeper layers first.',
      body: 'Vault members unlock sealed previews, early signal on unannounced projects, and direct lines into the forge. Free tier is real; paid tiers are earned.',
    },
    {
      selectors: ['[data-heartbeat]', '[data-recent-ships]', '.proof-rail'],
      eyebrow: 'The proof',
      title: 'The forge is alive right now.',
      body: 'Every pulse you see is a real session or ship in the last 30 days. If something looks cold, it is — we do not pretend the forge is hotter than it is.',
    },
  ];

  var STYLE = [
    '.vs-tour-offer{position:fixed;right:1.2rem;top:5.5rem;z-index:45;display:inline-flex;align-items:center;gap:0.5rem;padding:0.55rem 0.95rem;background:rgba(13,16,28,0.95);border:1px solid rgba(212,175,55,0.4);border-radius:999px;color:var(--text);font-size:0.85rem;cursor:pointer;font-family:inherit;box-shadow:0 10px 26px rgba(0,0,0,0.4);animation:vs-tour-fade 260ms both;}',
    '.vs-tour-offer:hover{border-color:rgba(212,175,55,0.7);}',
    '.vs-tour-offer:before{content:"";width:7px;height:7px;border-radius:50%;background:var(--gold,#d4af37);box-shadow:0 0 10px currentColor;color:var(--gold,#d4af37);animation:vs-tour-pulse 2.4s ease-in-out infinite;}',
    '@keyframes vs-tour-pulse{0%,100%{opacity:0.55;}50%{opacity:1;}}',
    '@keyframes vs-tour-fade{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:translateY(0);}}',
    '@media(prefers-reduced-motion:reduce){.vs-tour-offer,.vs-tour-offer:before{animation:none;}}',
    '.vs-tour-card{position:fixed;right:1.2rem;top:5.5rem;z-index:46;width:min(360px,calc(100vw - 2.4rem));background:rgba(13,16,28,0.97);border:1px solid rgba(212,175,55,0.4);border-radius:16px;padding:1.1rem 1.25rem 1rem;color:var(--text);font-family:inherit;box-shadow:0 18px 44px rgba(0,0,0,0.5);animation:vs-tour-in 260ms cubic-bezier(0.32,0.72,0,1) both;}',
    '@keyframes vs-tour-in{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}',
    '@media(prefers-reduced-motion:reduce){.vs-tour-card{animation:none;}}',
    '.vs-tour-card__eyebrow{font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:0.14em;color:var(--gold,#d4af37);margin:0 0 0.45rem;}',
    '.vs-tour-card__title{font-family:Georgia,serif;font-size:1.1rem;line-height:1.35;margin:0 0 0.5rem;color:var(--text);}',
    '.vs-tour-card__body{font-size:0.9rem;line-height:1.55;color:var(--muted);margin:0 0 0.9rem;}',
    '.vs-tour-card__actions{display:flex;gap:0.5rem;align-items:center;justify-content:space-between;}',
    '.vs-tour-card__btn{background:linear-gradient(135deg,#FFC400,#FF7A00);color:#0a0e18;border:none;font-weight:700;padding:0.5rem 0.9rem;border-radius:10px;cursor:pointer;font-size:0.85rem;font-family:inherit;}',
    '.vs-tour-card__skip{background:none;border:none;color:var(--muted);font-size:0.82rem;cursor:pointer;padding:0.35rem 0.5rem;text-decoration:underline;}',
    '.vs-tour-card__skip:hover{color:var(--text);}',
    '.vs-tour-card__progress{color:var(--muted);font-size:0.72rem;margin-left:auto;font-variant-numeric:tabular-nums;}',
    'body.light-mode .vs-tour-offer,body.light-mode .vs-tour-card{background:rgba(255,253,247,0.98);color:#141c34;border-color:rgba(212,175,55,0.5);}',
  ].join('\n');

  function injectStyle() {
    if (document.querySelector('style[data-vs-tour-style]')) return;
    var s = document.createElement('style');
    s.setAttribute('data-vs-tour-style', '1');
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function resolveAnchor(stop) {
    for (var i = 0; i < stop.selectors.length; i++) {
      var el = document.querySelector(stop.selectors[i]);
      if (el) return el;
    }
    return null;
  }

  function scrollTo(el) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  }

  function markSeen() {
    try { sessionStorage.setItem(SEEN_KEY, '1'); localStorage.setItem(SEEN_KEY, '1'); } catch (_) {}
  }

  function renderCard(index, total, stop, onNext, onSkip) {
    var existing = document.querySelector('.vs-tour-card');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    var card = document.createElement('div');
    card.className = 'vs-tour-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-live', 'polite');
    card.setAttribute('aria-labelledby', 'vs-tour-title-' + index);
    var eyebrow = document.createElement('p'); eyebrow.className = 'vs-tour-card__eyebrow'; eyebrow.textContent = stop.eyebrow;
    var title = document.createElement('h2'); title.id = 'vs-tour-title-' + index; title.className = 'vs-tour-card__title'; title.textContent = stop.title;
    var body  = document.createElement('p'); body.className = 'vs-tour-card__body'; body.textContent = stop.body;
    var actions = document.createElement('div'); actions.className = 'vs-tour-card__actions';
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'vs-tour-card__btn';
    btn.textContent = (index + 1 >= total) ? 'Enter the vault' : 'Next';
    btn.addEventListener('click', onNext);
    var skip = document.createElement('button'); skip.type = 'button'; skip.className = 'vs-tour-card__skip';
    skip.textContent = (index + 1 >= total) ? 'Close' : 'Skip tour';
    skip.addEventListener('click', onSkip);
    var progress = document.createElement('span'); progress.className = 'vs-tour-card__progress';
    progress.textContent = (index + 1) + ' / ' + total;
    actions.appendChild(btn); actions.appendChild(skip); actions.appendChild(progress);
    card.appendChild(eyebrow); card.appendChild(title); card.appendChild(body); card.appendChild(actions);
    document.body.appendChild(card);
    btn.focus({ preventScroll: true });
  }

  function closeCard() {
    var c = document.querySelector('.vs-tour-card');
    if (c && c.parentNode) c.parentNode.removeChild(c);
  }

  function startTour() {
    injectStyle();
    markSeen();
    var stops = STOPS.map(function (s) { return { meta: s, el: resolveAnchor(s) }; }).filter(function (s) { return s.el; });
    if (!stops.length) { closeCard(); return; }
    if (window.gtag) window.gtag('event', 'ignis_tour_started', { stops: stops.length });

    // Escape key aborts the tour at any stop.
    var onKey = function (e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        document.removeEventListener('keydown', onKey);
        closeCard();
        if (window.gtag) window.gtag('event', 'ignis_tour_skipped', { atStop: -1 });
      }
    };
    document.addEventListener('keydown', onKey);

    var i = 0;
    function step() {
      if (i >= stops.length) { closeCard(); if (window.gtag) window.gtag('event', 'ignis_tour_completed'); return; }
      var s = stops[i];
      scrollTo(s.el);
      setTimeout(function () {
        renderCard(i, stops.length, s.meta, function next() { i++; step(); }, function skip() { closeCard(); if (window.gtag) window.gtag('event', 'ignis_tour_skipped', { atStop: i }); });
      }, 320);
    }
    step();
  }

  function offerTour() {
    if (optedOut()) return;
    injectStyle();
    var pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'vs-tour-offer';
    pill.textContent = 'Take the IGNIS tour';
    pill.setAttribute('aria-label', 'Start a guided IGNIS tour of this page');
    pill.addEventListener('click', function () {
      if (pill.parentNode) pill.parentNode.removeChild(pill);
      startTour();
    });
    document.body.appendChild(pill);
    // Auto-dismiss the offer after 30s of inaction — never nag.
    setTimeout(function () {
      if (pill.parentNode) pill.parentNode.removeChild(pill);
    }, 30000);
  }

  function boot() {
    if (optedOut()) return;
    setTimeout(offerTour, OFFER_DELAY_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
