(function () {
  'use strict';

  var SLUG_MAP = {
    'Call of Doodie': { slug: 'call-of-doodie', kind: 'game' },
    'Franchise Architect': { slug: 'franchise-architect', kind: 'game' },
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

    root.textContent = '';
    var a = document.createElement('a');
    a.className = 'home-spotlight';
    a.href = link;
    a.setAttribute('data-track-event', 'home_dynamic_spotlight_click');

    var eyebrowEl = document.createElement('span');
    eyebrowEl.className = 'home-spotlight-eyebrow';
    eyebrowEl.style.color = badgeColor;
    eyebrowEl.textContent = badgeIcon + ' ' + eyebrow;

    var nameEl = document.createElement('span');
    nameEl.className = 'home-spotlight-name';
    nameEl.textContent = item.name;

    var progressEl = document.createElement('span');
    progressEl.className = 'home-spotlight-progress';
    progressEl.setAttribute('aria-label', 'Current progress');
    progressEl.textContent = (item.progress || 0) + '%';

    var caretEl = document.createElement('span');
    caretEl.className = 'home-spotlight-caret';
    caretEl.setAttribute('aria-hidden', 'true');
    caretEl.textContent = '→';

    a.appendChild(eyebrowEl);
    a.appendChild(nameEl);
    a.appendChild(progressEl);
    a.appendChild(caretEl);
    root.appendChild(a);

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

    var source = (window.VSPublicIntel && typeof window.VSPublicIntel.get === 'function')
      ? window.VSPublicIntel.get()
      : fetch('/api/public-intelligence.json', { cache: 'no-cache' })
          .then(function (r) { if (!r.ok) throw new Error('fetch'); return r.json(); });
    Promise.resolve(source)
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
