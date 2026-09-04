(function () {
  const scripts = [
  // S343 — two entries removed from this list because both were guaranteed no-ops
  // on the only page that loads them:
  //   home-personalized.js  — S123 made it early-return on `/` (line 6-8), and its
  //                           mount `#home-personalized-welcome` exists in ZERO
  //                           html files. ~6 KB fetched + parsed per homepage view
  //                           to reach a `return`.
  //   pathways-router.js    — requires `[data-pathways-root]`, which `index.html`
  //                           does not contain; init() returns immediately. It is
  //                           still loaded (correctly) by games/, universe/, invite/.
  // Neither file is deleted: both hold logic Phase 3's adaptive front door will
  // either reuse or retire deliberately. What is removed is shipping them to a
  // page where they provably cannot run.
    '/assets/studio-milestones.js',
    '/assets/home-intelligence.js',
    '/assets/studio-stats.js',
    '/assets/ignis-live.js',
    '/assets/micro-feedback.js',
    '/assets/showcase-spine.js',
    '/assets/recent-ships.js',
    '/assets/ignis-tour.js',
    '/assets/vault-resonance.js',
    '/assets/vault-pulse.js',
    // S228: moved from defer → idle (below-fold, non-critical for initial paint)
    '/assets/trust-depth.js',
    '/assets/related-content.js',
  ];

  // S174 TT burndown: script.src is a TrustedScriptURL sink. Narrow policy
  // that only passes same-origin /assets/ paths. No-op when TT is absent.
  let ttPolicy = null;
  try {
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      ttPolicy = window.trustedTypes.createPolicy('vs-idle-loader', {
        createScriptURL: (u) => (u.startsWith('/assets/') ? u : ''),
      });
    }
  } catch (_e) { /* duplicate policy name or restricted — fall through */ }

  function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = ttPolicy ? ttPolicy.createScriptURL(src) : src;
    script.defer = true;
    script.dataset.homeIdle = 'true';
    document.body.appendChild(script);
  }

  function loadQueue(queue) {
    function next() {
      const src = queue.shift();
      if (!src) return;
      loadScript(src);
      if (queue.length) {
        if ('requestIdleCallback' in window) requestIdleCallback(next, { timeout: 1500 });
        else setTimeout(next, 120);
      }
    }
    if ('requestIdleCallback' in window) requestIdleCallback(next, { timeout: 1500 });
    else setTimeout(next, 120);
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () { loadQueue(scripts.slice()); }, 1200);
  }
  ['pointerdown', 'keydown', 'scroll'].forEach(function (type) {
    window.addEventListener(type, schedule, { once: true, passive: type !== 'keydown' });
  });
  setTimeout(schedule, 12000);
})();
