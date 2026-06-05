(function () {
  const scripts = [
    '/assets/heartbeat.js',
    '/assets/studio-milestones.js',
    '/assets/home-intelligence.js',
    '/assets/home-personalized.js',
    '/assets/studio-stats.js',
    '/assets/ignis-live.js',
    '/assets/micro-feedback.js',
    '/assets/showcase-spine.js',
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

  function loadAll() {
    scripts.forEach(loadScript);
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadAll, { timeout: 2400 });
  } else {
    window.setTimeout(loadAll, 1800);
  }
})();
