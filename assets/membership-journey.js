/* membership-journey.js — adaptive /membership/ narrative for 3 conversion stages.
 *
 * Reads vs:session-ready + VS_TRUST_DEPTH + visit-count from sessionStorage/localStorage.
 * Sets body[data-journey-stage] to one of: curious | interested | committed
 *
 * CSS in the membership page responds to this attribute to show/hide sections
 * and swap copy without any additional network requests.
 *
 * Stages:
 *   curious     — new or single-visit anonymous visitor; show full story
 *   interested  — returning anonymous visitor (≥2 visits) or free member; show 'what you're missing'
 *   committed   — signed-in sparked/eternal member; show value delivered + upgrade path
 */
(function () {
  'use strict';

  if (!document.querySelector('.mem-hero')) return; // Only runs on /membership/

  var STAGE_KEY = 'vs-mj-stage';
  var VISIT_KEY = 'vs_visit_count'; // canonical key set by intent-state.js noteVisit()

  function getVisitCount() {
    try {
      return parseInt(localStorage.getItem(VISIT_KEY), 10) || 0;
    } catch (_) { return 0; }
  }

  function applyStage(stage) {
    document.documentElement.setAttribute('data-journey-stage', stage);
    try { sessionStorage.setItem(STAGE_KEY, stage); } catch (_) {}
  }

  function computeStage(signedIn, tier, visits) {
    if (signedIn) {
      var t = String(tier || '').toLowerCase();
      if (t === 'sparked' || t === 'eternal') return 'committed';
      return 'interested'; // free member — show what they're missing
    }
    return visits >= 2 ? 'interested' : 'curious';
  }

  function resolveFromSession(detail) {
    var signedIn = detail && detail.signedIn;
    var session = detail && detail.session;
    var tier = session && session.tier ? session.tier : 'member';
    var visits = getVisitCount();
    applyStage(computeStage(signedIn, tier, visits));
  }

  // Fast path: use cached stage from this session (avoids flash on navigation).
  // The inline head script already applied this pre-paint; this is a safety net.
  try {
    var cached = sessionStorage.getItem(STAGE_KEY);
    if (cached) {
      document.documentElement.setAttribute('data-journey-stage', cached);
    }
  } catch (_) {}

  // Authoritative path: wait for session-ready event.
  if (window.VSSignedInState && window.VSSignedInState.isResolved()) {
    var s = window.VSSignedInState.getSession();
    resolveFromSession({ signedIn: !!(s && s.userId), session: s });
  } else {
    document.addEventListener('vs:session-ready', function handler(e) {
      document.removeEventListener('vs:session-ready', handler);
      resolveFromSession(e && e.detail);
    });
    // Fallback for no signed-in-state.js: use visit count only.
    setTimeout(function () {
      if (!document.documentElement.hasAttribute('data-journey-stage')) {
        applyStage(getVisitCount() >= 2 ? 'interested' : 'curious');
      }
    }, 1200);
  }
})();
