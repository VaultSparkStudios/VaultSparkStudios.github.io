/**
 * VaultSpark — Live Perf Badge.
 *
 * Records real Core Web Vitals (LCP, CLS, INP) for the *current page load* and
 * surfaces a small honest perf badge on host pages declaring `[data-perf-badge]`.
 *
 * The badge shows a session-local snapshot — it's an honesty signal, not a benchmark
 * dashboard. Aggregate RUM lives in Cloudflare Web Analytics (separate surface).
 *
 * No-op on browsers without PerformanceObserver. CSP-clean.
 */
(function () {
  'use strict';

  if (typeof PerformanceObserver === 'undefined') return;

  var STYLE = [
    '.vs-perf{display:inline-flex;align-items:center;gap:0.55rem;padding:0.45rem 0.85rem;background:rgba(13,16,28,0.65);border:1px solid rgba(255,255,255,0.08);border-radius:999px;font-family:Georgia,serif;font-size:0.78rem;letter-spacing:0.04em;color:var(--muted);}',
    '.vs-perf__dot{width:8px;height:8px;border-radius:50%;background:#5cd07b;box-shadow:0 0 8px #5cd07b;}',
    '.vs-perf--warn .vs-perf__dot{background:#ffc400;box-shadow:0 0 8px #ffc400;}',
    '.vs-perf--bad  .vs-perf__dot{background:#ff6464;box-shadow:0 0 8px #ff6464;}',
    '.vs-perf__num{color:var(--text);font-weight:600;}',
    'body.light-mode .vs-perf{background:rgba(255,253,247,0.92);color:#3a4256;}'
  ].join('\n');

  function injectStyle() {
    if (document.querySelector('style[data-perf-badge-style]')) return;
    var s = document.createElement('style');
    s.setAttribute('data-perf-badge-style', '1');
    s.appendChild(document.createTextNode(STYLE));
    document.head.appendChild(s);
  }

  var metrics = { lcp: null, cls: 0, inp: null };

  // LCP
  try {
    new PerformanceObserver(function (list) {
      var entries = list.getEntries();
      var last = entries[entries.length - 1];
      if (last) metrics.lcp = Math.round(last.renderTime || last.loadTime || last.startTime);
      render();
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_e) {}

  // CLS
  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (entry) {
        if (!entry.hadRecentInput) metrics.cls += entry.value;
      });
      render();
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (_e) {}

  // INP (event timing)
  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (entry) {
        if (entry.duration && (!metrics.inp || entry.duration > metrics.inp)) {
          metrics.inp = Math.round(entry.duration);
        }
      });
      render();
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
  } catch (_e) {}

  function tier() {
    var lcp = metrics.lcp;
    var cls = metrics.cls;
    var inp = metrics.inp;
    var bad = (lcp && lcp > 4000) || (cls && cls > 0.25) || (inp && inp > 500);
    var warn = (lcp && lcp > 2500) || (cls && cls > 0.1) || (inp && inp > 200);
    return bad ? 'bad' : (warn ? 'warn' : 'ok');
  }

  function render() {
    var hosts = document.querySelectorAll('[data-perf-badge]');
    if (!hosts.length) return;
    injectStyle();
    var t = tier();
    var lcpStr = metrics.lcp != null ? Math.round(metrics.lcp / 10) / 100 + 's' : '—';
    var clsStr = metrics.cls != null ? metrics.cls.toFixed(2).replace(/^0\./, '.') : '—';
    var inpStr = metrics.inp != null ? metrics.inp + 'ms' : '—';
    hosts.forEach(function (host) {
      host.innerHTML = '';
      var pill = document.createElement('span');
      pill.className = 'vs-perf vs-perf--' + (t === 'ok' ? '' : t);
      pill.innerHTML =
        '<span class="vs-perf__dot" aria-hidden="true"></span>' +
        '<span>Live perf · LCP <span class="vs-perf__num">' + lcpStr + '</span> · CLS <span class="vs-perf__num">' + clsStr + '</span> · INP <span class="vs-perf__num">' + inpStr + '</span></span>';
      pill.title = 'Real Core Web Vitals from your current page load. Honest — not aggregate.';
      host.appendChild(pill);
    });
  }
})();
