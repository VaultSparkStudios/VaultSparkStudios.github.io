(() => {
  'use strict';
  const sent = new Set();
  function emitUx(name) {
    if (!name || sent.has(name) && name.endsWith(':shown')) return;
    if (name.endsWith(':shown')) sent.add(name);
    const body = JSON.stringify({ route: location.pathname || '/', ux: name });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
      else fetch('/v/rum', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
    } catch (_) {}
  }
  function observe(element, eventName) {
    if (!element) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) return;
      emitUx(eventName);
      observer.disconnect();
    }, { threshold: [0.5] });
    observer.observe(element);
  }
  const choices = document.querySelector('[data-hero-choice-group]');
  observe(choices, 'cta:hero-choice:shown');
  choices?.addEventListener('click', (event) => {
    const link = event.target.closest('[data-hero-choice]');
    if (link) emitUx('cta:hero-choice:click:' + link.dataset.heroChoice);
  });
  document.querySelectorAll('.hero-showcase .hero-tile').forEach((tile) => {
    const match = [...tile.classList].find((name) => name.startsWith('ht-'));
    const slug = match ? match.slice(3) : '';
    if (!slug) return;
    observe(tile, 'cta:hero-portfolio:shown:' + slug);
  });
  document.querySelector('.hero-showcase')?.addEventListener('click', (event) => {
    const tile = event.target.closest('.hero-tile');
    const match = tile && [...tile.classList].find((name) => name.startsWith('ht-'));
    if (match) emitUx('cta:hero-portfolio:click:' + match.slice(3));
  });
})();
