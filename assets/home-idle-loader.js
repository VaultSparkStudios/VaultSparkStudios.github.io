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

  function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
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
