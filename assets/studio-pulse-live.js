(function () {
  'use strict';

  var STATUS_COPY = {
    SPARKED: { label: 'PLAYABLE NOW', tone: 'sparked' },
    FORGE:   { label: 'TAKING SHAPE', tone: 'forge' },
    VAULTED: { label: 'RESTING',      tone: 'vaulted' },
  };

  var TYPE_HOME = {
    game: '/games/',
    tool: '/projects/',
    platform: '/projects/',
    project: '/projects/',
  };

  var SLUG_TO_PATH = {
    'call-of-doodie': '/games/call-of-doodie/',
    'gridiron-gm': '/games/gridiron-gm/',
    'gridiron-gm-play': '/games/gridiron-gm/',
    'football-gm': '/games/vaultspark-football-gm/',
    'solara': '/games/solara/',
    'vaultfront': '/games/vaultfront/',
    'vaultspark-forge': '/games/',
    'the-exodus': '/games/the-exodus/',
    'voidfall': '/universe/voidfall/',
    'promogrind': '/projects/promogrind/',
    'mindframe': '/games/mindframe/',
    'velaxis': '/projects/velaxis/',
    'statsforge': '/projects/statvault/',
    'vorn': '/projects/vorn/',
    'social-dashboard': '/social/',
  };

  function routeFor(item) {
    var slugPath = SLUG_TO_PATH[item.id];
    if (slugPath) return slugPath;
    if (item.deployedUrl) return item.deployedUrl;
    return TYPE_HOME[item.type] || '/games/';
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function renderHeartbeat(portfolio) {
    var el = document.getElementById('forge-heartbeat');
    if (!el || !portfolio) return;
    el.innerHTML = [
      statTile(portfolio.sparked, 'Playable now', 'sparked'),
      statTile(portfolio.forge, 'Taking shape in the forge', 'forge'),
      statTile(portfolio.sealedCount, 'Sealed in the deep vault', 'sealed'),
      statTile(portfolio.total, 'Initiatives under the vault banner', 'total'),
    ].join('');
  }

  function statTile(value, label, tone) {
    return '<div class="forge-heartbeat-tile tone-' + tone + '">' +
      '<strong>' + escapeHtml(value) + '</strong>' +
      '<span>' + escapeHtml(label) + '</span>' +
    '</div>';
  }

  function renderCurrentFocus(catalog) {
    var el = document.getElementById('forge-current-focus');
    if (!el || !catalog || !catalog.length) return;
    // Prefer the highest-progress FORGE game; fall back to highest-progress overall.
    var forgeGames = catalog.filter(function (c) { return c.status === 'FORGE' && c.type === 'game'; });
    var pool = forgeGames.length ? forgeGames : catalog;
    var top = pool.slice().sort(function (a, b) { return b.progress - a.progress; })[0];
    if (!top) return;
    var href = routeFor(top);
    el.innerHTML =
      '<div class="focus-eyebrow"><span class="focus-dot" aria-hidden="true"></span>Right now in the forge</div>' +
      '<div class="focus-name">' + escapeHtml(top.name) + '</div>' +
      '<div class="focus-note">' + escapeHtml(top.note) + '</div>' +
      '<a class="focus-link" href="' + escapeHtml(href) + '">Follow the build &rarr;</a>';
  }

  function renderCatalogGrid(targetId, items) {
    var container = document.getElementById(targetId);
    if (!container) return;
    if (!items || !items.length) {
      container.innerHTML = '<p class="forge-empty">The forge is quiet. Check back next session.</p>';
      return;
    }
    container.innerHTML = items.map(function (item) {
      var meta = STATUS_COPY[item.status] || { label: item.status, tone: 'forge' };
      var href = routeFor(item);
      return '<a class="forge-world-card tone-' + meta.tone + '" href="' + escapeHtml(href) + '" aria-label="' + escapeHtml(item.name + ' — ' + meta.label) + '">' +
        '<div class="forge-world-glow" aria-hidden="true"></div>' +
        '<div class="forge-world-head">' +
          '<span class="forge-world-status">' + escapeHtml(meta.label) + '</span>' +
        '</div>' +
        '<div class="forge-world-name">' + escapeHtml(item.name) + '</div>' +
        '<div class="forge-world-note">' + escapeHtml(item.note) + '</div>' +
        '<div class="forge-world-heat" role="presentation">' +
          '<div class="forge-world-heat-fill" style="width:' + Math.max(6, Math.min(100, Number(item.progress) || 0)) + '%"></div>' +
        '</div>' +
        '<div class="forge-world-enter" aria-hidden="true">Enter &rarr;</div>' +
      '</a>';
    }).join('');
  }

  function renderSealedVault(portfolio) {
    var container = document.getElementById('forge-sealed-grid');
    var caption = document.getElementById('forge-sealed-caption');
    if (!container || !portfolio) return;
    var count = portfolio.sealedCount || 0;
    if (caption) {
      caption.innerHTML = '<strong>' + count + '</strong> more initiatives are taking shape in sealed vaults. ' +
        'Not ready to speak yet. When a seal breaks, Vault Members hear first.';
    }
    var tiles = [];
    for (var i = 0; i < count; i += 1) {
      tiles.push(
        '<div class="forge-sealed-tile" aria-hidden="true" style="--seal-delay:' + ((i * 0.18) % 2.4).toFixed(2) + 's">' +
          '<svg class="forge-sealed-sigil" viewBox="0 0 48 48" aria-hidden="true">' +
            '<circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 5" />' +
            '<circle cx="24" cy="24" r="11" fill="none" stroke="currentColor" stroke-width="1.2" />' +
            '<path d="M24 15 v10 M19 24 h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />' +
          '</svg>' +
          '<span class="forge-sealed-label">SEALED</span>' +
        '</div>'
      );
    }
    container.innerHTML = tiles.join('');
  }

  function renderSignalStrip(intel) {
    var el = document.getElementById('forge-signal-strip');
    if (!el || !intel) return;
    var session = intel.project && intel.project.currentSession;
    var updated = intel.project && intel.project.lastUpdated;
    var shipped = (intel.pulse && intel.pulse.shipped) || [];
    var count = shipped.length;
    el.innerHTML =
      '<div class="signal-strip-eyebrow">Latest signal from the forge floor</div>' +
      '<div class="signal-strip-head">' +
        '<div>' +
          '<div class="signal-strip-session">Session ' + escapeHtml(session || '—') + '</div>' +
          '<div class="signal-strip-updated">Updated ' + escapeHtml(updated || 'recently') + '</div>' +
        '</div>' +
        '<div class="signal-strip-count"><strong>' + count + '</strong><span>' + (count === 1 ? 'move shipped' : 'moves shipped') + ' this session</span></div>' +
      '</div>' +
      '<p class="signal-strip-body">Every session, the forge breathes and the vault gets deeper. The <a href="/changelog/">changelog</a> tracks what shipped. The <a href="/journal/">Signal Log</a> tells the story behind it.</p>' +
      '<div class="signal-strip-cta">' +
        '<a class="button button-sm" href="/journal/">Read the Signal Log &rarr;</a>' +
        '<a class="button-secondary button-sm" href="/changelog/">Open the changelog</a>' +
      '</div>';
  }

  function renderComingNext() {
    var el = document.getElementById('forge-next-teasers');
    if (!el) return;
    var teasers = [
      { eyebrow: 'A new world is taking shape',  body: 'Another title is sharpening its edges in the forge. Silhouette only — for now.' },
      { eyebrow: 'The membership vault gets deeper', body: 'New recognitions, new rituals, new ways to leave a mark on the wall.' },
      { eyebrow: 'A sealed vault breaks signal',  body: 'One of the deep-forge initiatives prepares to step into the light.' },
    ];
    el.innerHTML = teasers.map(function (t) {
      return '<article class="forge-teaser">' +
        '<div class="forge-teaser-glyph" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2 L22 12 L12 22 L2 12 Z" fill="none" stroke="currentColor" stroke-width="1.2" /><circle cx="12" cy="12" r="2.2" fill="currentColor" /></svg>' +
        '</div>' +
        '<div class="forge-teaser-eyebrow">' + escapeHtml(t.eyebrow) + '</div>' +
        '<p class="forge-teaser-body">' + escapeHtml(t.body) + '</p>' +
      '</article>';
    }).join('');
  }

  function renderLastUpdated(intel) {
    var el = document.getElementById('forge-last-updated');
    if (!el || !intel || !intel.project) return;
    el.textContent = 'Session ' + intel.project.currentSession + ' · ' + intel.project.lastUpdated;
  }

  function partition(catalog) {
    var worlds = catalog.filter(function (c) { return c.type === 'game'; });
    var tools  = catalog.filter(function (c) { return c.type !== 'game'; });
    return { worlds: worlds, tools: tools };
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.VSPublicIntel) return;
    window.VSPublicIntel.get().then(function (intel) {
      if (!intel) return;
      renderLastUpdated(intel);
      renderHeartbeat(intel.portfolio || {});
      renderCurrentFocus(intel.catalog || []);
      var split = partition(intel.catalog || []);
      renderCatalogGrid('forge-worlds-grid', split.worlds);
      renderCatalogGrid('forge-tools-grid', split.tools);
      renderSealedVault(intel.portfolio || {});
      renderSignalStrip(intel);
      renderComingNext();
    });
  });
})();
