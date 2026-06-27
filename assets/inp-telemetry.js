// S229: INP attribution telemetry — identifies WHICH interactions exceed the 200ms budget.
// Field data shows / at 208ms p75, /games/ at 224ms, but without attribution we can't
// pin the cause. This module observes PerformanceObserver('event') entries > 150ms and
// beacons the element type + interaction type so we can target the right fix.
// Gated: only loads when 'event' entry type is supported (~95%+ modern browsers).
(function () {
  if (typeof PerformanceObserver === 'undefined') return;
  var supported = typeof PerformanceObserver.supportedEntryTypes !== 'undefined' &&
    PerformanceObserver.supportedEntryTypes.indexOf('event') !== -1;
  if (!supported) return;

  var po = new PerformanceObserver(function (list) {
    var entries = list.getEntries();
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (!entry || entry.duration < 150) continue;
      try {
        var body = JSON.stringify({
          event: 'inp:slow_interaction',
          route: (location.pathname || '/').split('?')[0] || '/',
          element: (entry.target && entry.target.tagName)
            ? entry.target.tagName.toLowerCase()
            : 'unknown',
          type: entry.name || 'unknown',
          duration: Math.round(entry.duration),
        });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
        }
      } catch (_) {}
    }
  });
  try {
    po.observe({ type: 'event', buffered: true, durationThreshold: 150 });
  } catch (_) {}
})();
