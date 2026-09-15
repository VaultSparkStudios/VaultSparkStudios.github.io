(function () {
  'use strict';

  // S123: Hero live ticker. Pulls newest ship from /api/recent-ships.json (or changelog API)
  // and renders one-line marquee in the hero foreground.
  // Silent empty state when no data — never injects placeholder copy.

  var ENDPOINTS = ['/api/ignis-conduit.json', '/api/recent-ships.json', '/api/changelog.json'];

  function appendTickerSpan(link, className, text, hidden) {
    var span = document.createElement('span');
    span.className = className;
    if (hidden) span.setAttribute('aria-hidden', 'true');
    span.textContent = text;
    link.appendChild(span);
    return span;
  }

  function replaceWithTickerLink(root, href, children) {
    root.textContent = '';
    var link = document.createElement('a');
    link.href = href;
    link.className = 'hero-ticker-inner';
    children(link);
    root.appendChild(link);
  }

  function pickNewest(data) {
    if (!data) return null;
    var list = Array.isArray(data) ? data
      : Array.isArray(data.ships) ? data.ships
      : Array.isArray(data.entries) ? data.entries
      : Array.isArray(data.items) ? data.items
      : Array.isArray(data.pulses) ? data.pulses
      : null;
    if (!list || !list.length) return null;
    var sorted = list.slice().sort(function (a, b) {
      var ad = new Date(a.date || a.shipped || a.timestamp || a.ts || 0).getTime();
      var bd = new Date(b.date || b.shipped || b.timestamp || b.ts || 0).getTime();
      return bd - ad;
    });
    return sorted[0];
  }

  function tryFetch(url) {
    var source = window.VSPublicSignals
      ? window.VSPublicSignals.get(url, { ttlMs: 600000 })
      : fetch(url, { credentials: 'same-origin' }).then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          return r.json();
        });
    return source.then(function (data) {
      if (!data) throw new Error('public_signal_unavailable');
      return data;
    });
  }

  function render(root, entry, sourceKind) {
    if (!entry) return;
    var title = entry.title || entry.headline || entry.summary || entry.label || '';
    var project = entry.project || entry.scope || '';
    var when = entry.date || entry.shipped || entry.timestamp || entry.ts || '';
    if (!title) return;

    var dateLabel = '';
    try {
      var d = new Date(when);
      if (!isNaN(d.getTime())) {
        var diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
        dateLabel = diff === 0 ? 'today' : diff === 1 ? 'yesterday' : (diff + 'd ago');
      }
    } catch (_) {}

    var isIgnis = sourceKind === 'ignis-conduit';
    var label = isIgnis ? 'IGNIS is reading the studio' : 'Latest from the forge';
    if (isIgnis) root.setAttribute('data-source', 'ignis-conduit');

    // Deep-link the changelog ticker to the specific entry so clicking the banner
    // scrolls to + flashes the note it referenced, instead of dropping the visitor
    // at the top of the page (S284). IGNIS "reading the studio" keeps its /ignis/ link.
    var linkHref = isIgnis ? '/ignis/' : '/changelog/#cl-latest';
    replaceWithTickerLink(root, linkHref, function (link) {
      appendTickerSpan(link, 'hero-ticker-dot', '', true);
      appendTickerSpan(link, 'hero-ticker-label', label);
      if (!isIgnis && project) appendTickerSpan(link, 'hero-ticker-project', project);
      appendTickerSpan(link, 'hero-ticker-title', title);
      if (dateLabel) appendTickerSpan(link, 'hero-ticker-when', '\u00b7 ' + dateLabel);
    });
  }

  function init() {
    var root = document.querySelector('[data-hero-ticker]');
    if (!root) return;

    (function tryNext(i) {
      if (i >= ENDPOINTS.length) return;
      tryFetch(ENDPOINTS[i])
        .then(function (data) {
          var entry = pickNewest(data);
          if (entry) render(root, entry, data && data.kind);
          else tryNext(i + 1);
        })
        .catch(function () { tryNext(i + 1); });
    })(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
