(function () {
  const scripts = [
    '/assets/telemetry-matrix.js',
    '/assets/micro-feedback.js',
    '/assets/member-voices.js',
    '/assets/membership-live-tier.js',
    '/assets/rank-projector.js',
    // S172 membership-orphan-dossier: re-wired — the AI tier-recommendation
    // interview lost its loader entry while its mount div stayed in
    // membership/index.html (accidental severance, not retirement).
    '/assets/membership-interview.js',
  ];

  function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
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
