/**
 * VaultSpark Studios — PWA Desktop Navigation Bar
 *
 * Renders back / forward / refresh buttons only when the site is
 * running as an installed PWA (display-mode: standalone). Hidden
 * in normal browser tabs where the browser chrome provides these.
 */
(function () {
  'use strict';

  var isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (!isStandalone) return;

  var bar = document.createElement('div');
  bar.className = 'pwa-nav-bar';
  bar.setAttribute('role', 'navigation');
  bar.setAttribute('aria-label', 'App navigation');

  bar.innerHTML =
    '<button class="pwa-nav-btn" id="pwa-back" aria-label="Go back" title="Back">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>' +
    '</button>' +
    '<button class="pwa-nav-btn" id="pwa-forward" aria-label="Go forward" title="Forward">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>' +
    '</button>' +
    '<button class="pwa-nav-btn" id="pwa-refresh" aria-label="Refresh page" title="Refresh">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10"/><path d="M20.49 15a9 9 0 01-14.85 3.36L1 14"/></svg>' +
    '</button>';

  document.body.prepend(bar);

  document.getElementById('pwa-back').addEventListener('click', function () {
    history.back();
  });

  document.getElementById('pwa-forward').addEventListener('click', function () {
    history.forward();
  });

  document.getElementById('pwa-refresh').addEventListener('click', function () {
    location.reload();
  });
})();
