/* pre-paint-stage.js (S163 audit #7 · pre-paint-stage-lib) — CANONICAL SOURCE.
 *
 * Sets the visit-count-based journey stage on <html> BEFORE first paint so a
 * returning visitor's hero transforms never shift layout (the CLS-safe no-flash
 * pattern shipped S161). This file is the single source of truth; it is INLINED
 * at build time into each consumer page's <head> between the pre-paint-stage
 * marker comments by scripts/inject-pre-paint-stage.mjs. It is NOT loaded as an
 * external script:
 * a pre-paint no-flash snippet must run synchronously before paint, so an async
 * or deferred <script src> would reintroduce the very flash it prevents.
 *
 * Signed-in visitors are detected cheaply and deferred to membership-journey.js
 * (which resolves committed/interested by tier after vs:session-ready).
 */
(function () {
  try {
    var d = document.documentElement;
    var cached = sessionStorage.getItem('vs-mj-stage');
    if (cached) { d.setAttribute('data-journey-stage', cached); return; }
    // Authoritative identity is asynchronous. Apply only the anonymous
    // pre-paint fallback here; signed-in-state corrects it after edge proof.
    var visits = parseInt(localStorage.getItem('vs_visit_count'), 10) || 0;
    d.setAttribute('data-journey-stage', visits >= 2 ? 'interested' : 'curious');
  } catch (_) {}
})();
