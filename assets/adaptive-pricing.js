/* adaptive-pricing.js — S206 audit item #8 (adaptive-pricing-reveal)
   Personalizes the /membership/ tier grid by highlighting the tier most
   relevant to each visitor's demonstrated interests.

   Profile detection (client-side, no backend):
     PLAYER   — referrer is a game page OR vs_ignis_history has game queries
     EXPLORER — vs_ignis_history ≥1 entry (curious about studio intelligence)
     ENGAGED  — vs_visit_count ≥5 (invested repeat visitor)
     COLD     — no signal → no highlight (honest-dark)

   Action: adds .mem-tier-card--recommended to the best-fit tier card,
   which CSS styles with a gold ring + "★ Recommended for you" label chip.

   Safe: presentational only — no payment gate or tier logic changed.
   Predicate-loaded on /membership/ only by ambient-loader.js. */
(function () {
  'use strict';

  if (!(location.pathname || '/').startsWith('/membership')) return;
  if (document.body && document.body.hasAttribute('data-vs-signed-in')) return;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsParse(k) { try { return JSON.parse(lsGet(k) || 'null'); } catch (_) { return null; } }

  // Signal reading
  var visitCount = parseInt(lsGet('vs_visit_count') || '0', 10);
  var ignisHistory = lsParse('vs_ignis_history');
  var hasIgnisHistory = Array.isArray(ignisHistory) && ignisHistory.length >= 1;
  var referrer = (typeof document !== 'undefined' && document.referrer) || '';

  var GAME_PATHS = ['/games/', '/call-of-doodie/', '/vaultspark-football-gm/', '/vaultfront/', '/mindframe/', '/solara/', '/the-exodus/', '/gridiron-gm/'];
  var isGameReferral = GAME_PATHS.some(function (p) { return referrer.indexOf(p) !== -1; });
  var isIntelReferral = referrer.indexOf('/ignis') !== -1 || referrer.indexOf('/oracle') !== -1;

  // Profile classification
  var profile;
  if (isGameReferral) {
    profile = 'player';
  } else if (isIntelReferral || hasIgnisHistory) {
    profile = 'explorer';
  } else if (visitCount >= 5) {
    profile = 'engaged';
  } else {
    return; // cold visitor — honest-dark, no highlight
  }

  // Tier recommendation map
  var PROFILES = {
    player: {
      tierClass: 'tier-sparked',
      reason: 'For your playstyle — 2× XP on every game you play.',
    },
    explorer: {
      tierClass: 'tier-sparked',
      reason: 'For deep intel — unlock your monthly IGNIS quota.',
    },
    engaged: {
      tierClass: 'tier-sparked',
      reason: 'For committed members — the core supporter tier.',
    },
  };

  var rec = PROFILES[profile];
  if (!rec) return;

  function ensureStyles() {
    if (document.getElementById('vs-ap-css')) return;
    var s = document.createElement('style');
    s.id = 'vs-ap-css';
    s.textContent =
      '.mem-tier-card--recommended{' +
        'outline:2px solid rgba(255,196,0,.55);' +
        'outline-offset:2px;' +
        'position:relative;}' +
      '.mem-tier-card--recommended .vs-ap-chip{' +
        'position:absolute;top:-14px;left:50%;transform:translateX(-50%);' +
        'display:inline-flex;align-items:center;gap:.25rem;white-space:nowrap;' +
        'padding:.2rem .65rem;border-radius:999px;' +
        'background:var(--gold,#ffc400);color:#1a1205;' +
        'font-size:.7rem;font-weight:700;letter-spacing:.04em;}' +
      '.mem-tier-card--recommended .vs-ap-reason{' +
        'margin:.5rem 0 0;padding:.4rem .6rem;border-radius:6px;' +
        'background:rgba(255,196,0,.07);border-left:2px solid rgba(255,196,0,.35);' +
        'font-size:.78rem;color:var(--muted,#9aa3b2);font-style:italic;}';
    (document.head || document.body).appendChild(s);
  }

  function apply() {
    var tierCard = document.querySelector('.mem-tier-card.' + rec.tierClass);
    if (!tierCard) return;

    ensureStyles();
    tierCard.classList.add('mem-tier-card--recommended');

    // Recommendation chip (top-center)
    var chip = document.createElement('span');
    chip.className = 'vs-ap-chip';
    chip.setAttribute('aria-hidden', 'true');
    chip.textContent = '★ Recommended for you';
    tierCard.insertBefore(chip, tierCard.firstChild);

    // Reason line injected above the tier CTA
    var cta = tierCard.querySelector('.mem-tier-cta');
    var reason = document.createElement('p');
    reason.className = 'vs-ap-reason';
    reason.textContent = rec.reason;
    if (cta) {
      tierCard.insertBefore(reason, cta);
    } else {
      tierCard.appendChild(reason);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
}());
