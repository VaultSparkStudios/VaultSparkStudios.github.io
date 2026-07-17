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

  function replaceWithTickerLink(root, href, ariaLabel, children) {
    root.textContent = '';
    var link = document.createElement('a');
    link.href = href;
    link.className = 'hero-ticker-inner';
    link.setAttribute('aria-label', ariaLabel);
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
      ? window.VSPublicSignals.get(url, { ttlMs: url.indexOf('founder-presence') >= 0 ? 90000 : 600000 })
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
    replaceWithTickerLink(root, linkHref, label, function (link) {
      appendTickerSpan(link, 'hero-ticker-dot', '', true);
      appendTickerSpan(link, 'hero-ticker-label', label);
      if (!isIgnis && project) appendTickerSpan(link, 'hero-ticker-project', project);
      appendTickerSpan(link, 'hero-ticker-title', title);
      if (dateLabel) appendTickerSpan(link, 'hero-ticker-when', '\u00b7 ' + dateLabel);
    });
  }

  // S126 #2: Studio Living Mode — when founder-twin is in-session, replace
  // the "latest from the forge" ticker with a live "in the forge right now"
  // tile. Reads /api/founder-presence.json (generated nightly + on every
  // active-session change by the studio-ops broadcast). Falls back to the
  // ticker on idle.
  function renderForgeLive(root, presence) {
    var label = presence.label || presence.project || 'in the forge';
    var minutesAgo = presence.minutesAgo;
    var freshness = '';
    if (typeof minutesAgo === 'number' && minutesAgo >= 0) {
      if (minutesAgo < 1)      freshness = 'just now';
      else if (minutesAgo < 60) freshness = minutesAgo + 'm ago';
      else                      freshness = Math.floor(minutesAgo / 60) + 'h ago';
    }
    root.classList.add('hero-ticker-live');
    root.setAttribute('data-forge-live', '1');
    replaceWithTickerLink(root, '/ignis/', 'In the forge right now', function (link) {
      appendTickerSpan(link, 'hero-ticker-dot hero-ticker-dot--live', '', true);
      appendTickerSpan(link, 'hero-ticker-label', 'In the forge right now');
      appendTickerSpan(link, 'hero-ticker-title', label);
      if (freshness) appendTickerSpan(link, 'hero-ticker-when', '\u00b7 ' + freshness);
    });
  }

  function init() {
    var root = document.querySelector('[data-hero-ticker]');
    if (!root) return;

    tryFetch('/api/founder-presence.json')
      .then(function (presence) {
        if (presence && presence.live === true) {
          renderForgeLive(root, presence);
          return true;
        }
        return false;
      })
      .catch(function () { return false; })
      .then(function (handled) {
        if (handled) return;
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
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
