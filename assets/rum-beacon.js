/*
 * VaultSpark real-user vitals beacon.
 * Sends route-level CWV only; no query string, no user id, no free text.
 */
(function () {
  'use strict';
  if (!('performance' in window) || !('PerformanceObserver' in window)) return;
  var sent = false;
  var v = { lcp: 0, fcp: 0, cls: 0, inp: 0, ttfb: 0 };
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
  var startedVisible = document.visibilityState !== 'hidden';
  var pageShowPersisted = false;
  function observe(type, cb, opts) {
    try { new PerformanceObserver(function (l) { l.getEntries().forEach(cb); }).observe(opts || { type: type, buffered: true }); } catch (_) {}
  }
  observe('largest-contentful-paint', function (e) { v.lcp = Math.round(e.startTime || 0); });
  observe('paint', function (e) { if (e.name === 'first-contentful-paint') v.fcp = Math.round(e.startTime || 0); }, { type: 'paint', buffered: true });
  observe('layout-shift', function (e) { if (!e.hadRecentInput) v.cls = Math.max(v.cls, +(v.cls + e.value).toFixed(4)); });
  observe('event', function (e) { v.inp = Math.max(v.inp, Math.round(e.duration || 0)); }, { type: 'event', buffered: true, durationThreshold: 40 });
  var nav = performance.getEntriesByType('navigation')[0];
  if (nav) v.ttfb = Math.round(nav.responseStart || 0);
  window.addEventListener('pageshow', function (event) { pageShowPersisted = !!(event && event.persisted); }, { once: true });
  function send() {
    if (sent) return;
    sent = true;
    var body = JSON.stringify({
      route: location.pathname || '/',
      vitals: v,
      context: {
        connection: conn.effectiveType || 'unknown',
        saveData: !!conn.saveData,
        viewport: Math.round(innerWidth) + 'x' + Math.round(innerHeight),
        theme: document.documentElement.getAttribute('data-theme') || 'default',
        startedVisible: startedVisible,
        visibilityState: document.visibilityState || 'unknown',
        navigationType: nav && nav.type ? nav.type : 'unknown',
        activationStart: nav && Number.isFinite(nav.activationStart) ? Math.round(nav.activationStart) : 0,
        pageShowPersisted: pageShowPersisted,
        pageAgeMs: Math.round(performance.now ? performance.now() : 0)
      },
      ts: new Date().toISOString()
    });
    if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    else fetch('/v/rum', { method: 'POST', body: body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function () {});
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') send(); });
  window.addEventListener('pagehide', send);
})();
