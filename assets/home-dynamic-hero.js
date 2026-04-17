(function () {
  'use strict';

  var SLUG_MAP = {
    'Call of Doodie': { slug: 'call-of-doodie', kind: 'game' },
    'VaultSpark Football GM': { slug: 'vaultspark-football-gm', kind: 'game' },
    'MindFrame': { slug: 'mindframe', kind: 'game' },
    'Solara': { slug: 'solara', kind: 'game' },
    'VaultFront': { slug: 'vaultfront', kind: 'game' },
    'The Exodus': { slug: 'the-exodus', kind: 'game' },
    'Voidfall': { slug: 'voidfall', kind: 'universe' },
    'DreadSpike': { slug: 'dreadspike', kind: 'universe' },
    'Gridiron GM': { slug: 'gridiron-gm', kind: 'game' },
    'Project Unknown': { slug: 'project-unknown', kind: 'game' }
  };

  function hrefFor(name) {
    var entry = SLUG_MAP[name];
    if (!entry) return '/games/';
    if (entry.kind === 'universe') return '/universe/' + entry.slug + '/';
    return '/games/' + entry.slug + '/';
  }

  function pickSpotlight(catalog) {
    if (!Array.isArray(catalog) || !catalog.length) return null;
    // Preference: most recently sparked (highest progress SPARKED) → else highest-progress FORGE
    var sparked = catalog.filter(function (c) { return c.status === 'SPARKED' && c.type !== 'project'; });
    var forge = catalog.filter(function (c) { return c.status === 'FORGE' && c.type !== 'project'; });
    if (sparked.length) {
      sparked.sort(function (a, b) { return (b.progress || 0) - (a.progress || 0); });
      return { item: sparked[0], mode: 'sparked' };
    }
    if (forge.length) {
      forge.sort(function (a, b) { return (b.progress || 0) - (a.progress || 0); });
      return { item: forge[0], mode: 'forge' };
    }
    return null;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function render(root, pick) {
    var item = pick.item;
    var isSparked = pick.mode === 'sparked';
    var badgeColor = isSparked ? '#fbbf24' : '#f59e0b';
    var badgeIcon = isSparked ? '🔥' : '⚒️';
    var eyebrow = isSparked ? 'Most-played right now' : 'Hottest in the forge';
    var link = hrefFor(item.name);

    root.innerHTML =
      '<a class="home-spotlight" href="' + esc(link) + '" data-track-event="home_dynamic_spotlight_click">' +
        '<span class="home-spotlight-eyebrow" style="color:' + badgeColor + ';">' + badgeIcon + ' ' + esc(eyebrow) + '</span>' +
        '<span class="home-spotlight-name">' + esc(item.name) + '</span>' +
        '<span class="home-spotlight-progress" aria-label="Current progress">' + esc(item.progress || 0) + '%</span>' +
        '<span class="home-spotlight-caret" aria-hidden="true">→</span>' +
      '</a>';

    try {
      if (window.gtag) {
        window.gtag('event', 'home_dynamic_spotlight_shown', {
          spotlight_mode: pick.mode,
          spotlight_name: item.name
        });
      }
    } catch (_) {}
  }

  function boot() {
    var root = document.getElementById('home-dynamic-spotlight');
    if (!root) return;

    fetch('/api/public-intelligence.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('fetch'); return r.json(); })
      .then(function (data) {
        var pick = pickSpotlight(data && data.catalog);
        if (!pick) return; // honest empty state — no fake spotlight
        render(root, pick);
      })
      .catch(function () { /* silent — keep hero clean when intelligence is down */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
