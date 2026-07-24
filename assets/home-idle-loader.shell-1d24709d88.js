(function () {
  const scripts = [
    '/assets/studio-milestones.js',
    '/assets/home-intelligence.js',
    '/assets/home-personalized.js',
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
    '/assets/pathways-router.js',
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
