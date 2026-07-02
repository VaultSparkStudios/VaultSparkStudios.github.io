// S229/S232: INP attribution telemetry — identifies WHICH interaction exceeds the 200ms
// budget AND where its time goes. Field data shows / at 208ms p75, /games/ at 224ms, but
// the S229 version beaconed only the target tagName ("button"/"a") — too coarse on /games/,
// where filter chips, quiz buttons, and card links are all the same tag, so a slow sample
// couldn't pin the offender. S232 enriches each beacon with (a) a STABLE target hint
// (id → identifying data-* → first class token → tag) and (b) the INP phase breakdown
// (input delay · processing · presentation) from the Event Timing API, so the FIRST slow
// sample is immediately actionable — turning "we know /games/ is slow" into "we know which
// control and which phase." Event name is unchanged (`inp:slow_interaction`, RUM-allowlisted);
// only body fields are added, and no user-entered text is read (no PII).
// Gated: only loads when 'event' entry type is supported (~95%+ modern browsers).
(function () {
  if (typeof PerformanceObserver === 'undefined') return;
  var supported = typeof PerformanceObserver.supportedEntryTypes !== 'undefined' &&
    PerformanceObserver.supportedEntryTypes.indexOf('event') !== -1;
  if (!supported) return;

  // Identifying data-* attributes that name an interaction without exposing user data.
  var ID_ATTRS = ['data-filter', 'data-game', 'data-action', 'data-track-event', 'data-quiz', 'data-cta'];

  // A stable, privacy-safe hint for WHICH element was interacted with. Prefers a semantic
  // id/data-attr over a brittle class; never reads input values or text content.
  function targetHint(el) {
    if (!el || el.nodeType !== 1) return 'unknown';
    try {
      if (el.id) return '#' + el.id;
      for (var i = 0; i < ID_ATTRS.length; i++) {
        if (el.hasAttribute(ID_ATTRS[i])) {
          return '[' + ID_ATTRS[i] + '=' + (el.getAttribute(ID_ATTRS[i]) || '').slice(0, 24) + ']';
        }
      }
      var tag = (el.tagName || 'unknown').toLowerCase();
      var cls = (typeof el.className === 'string' && el.className.trim())
        ? '.' + el.className.trim().split(/\s+/)[0]
        : '';
      return (tag + cls).slice(0, 40);
    } catch (_) {
      return (el.tagName || 'unknown').toLowerCase();
    }
  }

  var po = new PerformanceObserver(function (list) {
    var entries = list.getEntries();
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (!entry || entry.duration < 150) continue;
      // S247: INP only counts real interactions (pointer/tap/key — entries the
      // browser assigns an interactionId). Without this filter the stream was
      // ~90% pointerenter/mouseover hover events: real paint jank, but not INP,
      // and it drowned the actionable click/tap samples.
      if (!entry.interactionId) continue;
      try {
        // INP phase breakdown (Event Timing API). Defensive: fields may be absent.
        var start = entry.startTime || 0;
        var pStart = (typeof entry.processingStart === 'number') ? entry.processingStart : start;
        var pEnd = (typeof entry.processingEnd === 'number') ? entry.processingEnd : pStart;
        var inputDelay = Math.max(0, Math.round(pStart - start));
        var processing = Math.max(0, Math.round(pEnd - pStart));
        var presentation = Math.max(0, Math.round((start + entry.duration) - pEnd));

        var body = JSON.stringify({
          event: 'inp:slow_interaction',
          route: (location.pathname || '/').split('?')[0] || '/',
          element: (entry.target && entry.target.tagName)
            ? entry.target.tagName.toLowerCase()
            : 'unknown',
          target: targetHint(entry.target),   // S232: which control, not just which tag
          type: entry.name || 'unknown',
          duration: Math.round(entry.duration),
          // S232: where the time went — pinpoints the fix (handler vs main-thread vs render).
          inputDelay: inputDelay,
          processing: processing,
          presentation: presentation,
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
