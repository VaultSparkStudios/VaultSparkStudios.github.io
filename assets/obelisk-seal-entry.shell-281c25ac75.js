/* Mount the provider's public seal after each entrance has prepared its safe
 * destination. The provider snapshots that URL when mounting the iframe. */
(function () {
  'use strict';
  function theme() { return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function syncTheme() {
    document.querySelectorAll('[data-obelisk-seal]').forEach(function (mount) {
      mount.setAttribute('data-theme', theme());
      var frame = mount.querySelector('iframe');
      if (!frame) return;
      try {
        var url = new URL(frame.src);
        if (url.origin !== 'https://obeliskgate.com' || url.pathname !== '/embed/v1/seal') return;
        if (url.searchParams.get('theme') !== theme()) { url.searchParams.set('theme', theme()); frame.src = url.href; }
      } catch (_) {}
    });
  }
  function init() {
    if (!document.querySelector('[data-obelisk-seal]')) return;
    syncTheme();
    var loader = document.createElement('script');
    loader.src = 'https://obeliskgate.com/embed/seal.js';
    loader.async = true;
    document.head.appendChild(loader);
    window.addEventListener('vs:theme-changed', syncTheme);
  }
  if (document.readyState === 'loading' || document.readyState === 'interactive') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
