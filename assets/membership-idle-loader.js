(function () {
  const scripts = [
    '/assets/telemetry-matrix.js',
    '/assets/micro-feedback.js',
    '/assets/member-voices.js',
    '/assets/membership-live-tier.js',
    '/assets/rank-projector.js',
    '/assets/membership-proof-loop.js',
    // S172 membership-orphan-dossier: re-wired — the AI tier-recommendation
    // interview lost its loader entry while its mount div stayed in
    // membership/index.html (accidental severance, not retirement).
    '/assets/membership-interview.js',
  ];

  let ttPolicy = null;
  try {
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      ttPolicy = window.trustedTypes.createPolicy('vs-membership-idle-loader', {
        createScriptURL: (u) => (u.startsWith('/assets/') ? u : ''),
      });
    }
  } catch (_e) { /* duplicate policy name or restricted — fall through */ }

  function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = ttPolicy ? ttPolicy.createScriptURL(src) : src;
    script.defer = true;
    script.dataset.membershipIdle = 'true';
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
