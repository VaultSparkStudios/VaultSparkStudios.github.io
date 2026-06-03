/* founder-presence-handle.js — S159 audit #13.
 *
 * When the founder is active in studio-hub (signal from /api/founder-presence.json),
 * set body[data-founder-active]. Sitewide CSS gives the wordmark a 1px gold
 * underline. Subtle parasocial cue: "the studio is a person, and they're here."
 *
 * Listens to the same BroadcastChannel('vault-presence') that favicon-pulse.js
 * uses — zero extra polling. Falls back to a single fetch when broadcast hasn't
 * arrived yet (page loaded after favicon-pulse already drained the channel).
 *
 * No DOM mutation beyond a body attribute. CSS does the rest. CLS-safe.
 */
(function () {
  'use strict';
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const BC_NAME = 'vault-presence';
  const PRESENCE_URL = '/api/founder-presence.json';
  const ATTR = 'data-founder-active';

  function apply(active) {
    const wasActive = document.body.hasAttribute(ATTR);
    if (active && !wasActive) document.body.setAttribute(ATTR, '');
    else if (!active && wasActive) document.body.removeAttribute(ATTR);
  }

  // Listen for sibling-tab broadcasts from favicon-pulse.js leader.
  let bc = null;
  try { bc = ('BroadcastChannel' in window) ? new BroadcastChannel(BC_NAME) : null; } catch (_) { bc = null; }
  if (bc) {
    bc.onmessage = (e) => {
      const d = e && e.data;
      if (!d || typeof d.active !== 'boolean') return;
      apply(d.active);
    };
  }

  // Cold-start fallback: one fetch on idle to get initial state before the
  // first broadcast tick. Cheap; same shape favicon-pulse reads.
  function coldFetch() {
    fetch(PRESENCE_URL, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        const active = !!(j && (j.active === true || j.live === true || j.activeUntil));
        apply(active);
      })
      .catch(() => { /* fail-silent */ });
  }
  if ('requestIdleCallback' in window) {
    requestIdleCallback(coldFetch, { timeout: 3000 });
  } else {
    setTimeout(coldFetch, 1500);
  }
})();
