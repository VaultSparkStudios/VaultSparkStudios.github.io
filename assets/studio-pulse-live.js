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
    'football-gm': '/games/franchise-architect/',
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
      statTile(portfolio.sealedCount, 'Vaulted in the deep', 'sealed'),
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
      caption.innerHTML = '<strong>' + count + '</strong> more initiatives are taking shape behind vault doors. ' +
        'Not ready to speak yet. When a vault opens, Vault Members hear first.';
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
          '<span class="forge-sealed-label">VAULTED</span>' +
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
    var latest = (intel.normalizedActivity && intel.normalizedActivity.latest) || [];
    var recent = latest.slice(0, 3).map(function (item) {
      return item && item.title ? escapeHtml(item.title) : '';
    }).filter(Boolean);
    var recentHtml = recent.length
      ? '<div style="display:flex;flex-wrap:wrap;gap:0.45rem;margin:0.2rem 0 1rem;">'
        + recent.map(function (title) {
            return '<span style="display:inline-flex;align-items:center;padding:0.28rem 0.6rem;border-radius:999px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:0.74rem;color:var(--text);">' + title + '</span>';
          }).join('')
        + '</div>'
      : '';
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
      recentHtml +
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
      { eyebrow: 'A vault breaks signal',  body: 'One of the deep-forge initiatives prepares to step into the light.' },
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

  // The forge ledger — recent commits rendered as a public timeline of moves.
  // Fetched separately from /api/commit-map.json (built by build-commit-map.mjs).
  // Soft-fails: the section stays hidden if the file is missing or empty.
  function renderForgeLedger() {
    var section = document.getElementById('forge-ledger');
    var list = document.getElementById('forge-ledger-list');
    if (!section || !list) return;
    fetch('/api/commit-map.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.entries) || !data.entries.length) return;
        var rows = data.entries.slice(0, 12).map(function (e) {
          var when = '';
          try {
            when = new Date(e.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          } catch (_e) { when = ''; }
          return '<li class="forge-ledger-row tone-' + escapeHtml(e.tone || 'forge') + '">' +
            '<span class="forge-ledger-move">' + escapeHtml(e.move || '') + '</span>' +
            '<span class="forge-ledger-summary">' + escapeHtml(e.summary || '') + '</span>' +
            '<span class="forge-ledger-when">' + escapeHtml(when) + '</span>' +
          '</li>';
        }).join('');
        list.innerHTML = rows;
        section.style.display = '';
      })
      .catch(function () { /* silent — section stays hidden */ });
  }

  function renderLastUpdated(intel) {
    var el = document.getElementById('forge-last-updated');
    if (!el || !intel || !intel.project) return;
    el.textContent = 'Session ' + intel.project.currentSession + ' · ' + intel.project.lastUpdated;
  }

  function renderCiHealth(intel) {
    var el = document.getElementById('forge-ci-health');
    if (!el) return;
    var ci = intel && intel.ciHealth;
    if (!ci) { el.hidden = true; return; }
    el.hidden = false;
    var allGreen = ci.allGreen;
    var icon = allGreen ? '✓' : '!';
    var label = allGreen ? 'All gates green' : 'Gate failure';
    var tone = allGreen ? 'sparked' : 'forge';
    el.innerHTML =
      '<span class="forge-ci-icon tone-' + tone + '" aria-hidden="true">' + icon + '</span>' +
      '<span class="forge-ci-label">' + escapeHtml(ci.summary || label) + '</span>';
  }

  function renderNervousDigest() {
    var el = document.getElementById('studio-signal-digest');
    if (!el) return;
    fetch('/api/nervous-system.json', { cache: 'no-cache', credentials: 'omit' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.tiles) || !data.tiles.length) throw new Error('signal digest unavailable');
        el.innerHTML = data.tiles.map(function (tile) {
          return '<a class="forge-heartbeat-tile tone-total" role="listitem" href="' + escapeHtml(tile.href || '/status/') + '">' +
            '<strong>' + escapeHtml(tile.value || '—') + '</strong><span>' + escapeHtml(tile.label || 'Signal') + '</span></a>';
        }).join('');
      })
      .catch(function () {
        el.innerHTML = '<a class="forge-heartbeat-tile tone-forge" role="listitem" href="/status/"><strong>Check status</strong><span>Live digest is briefly unavailable</span></a>';
      });
  }

  function partition(catalog) {
    var worlds = catalog.filter(function (c) { return c.type === 'game'; });
    var tools  = catalog.filter(function (c) { return c.type !== 'game'; });
    return { worlds: worlds, tools: tools };
  }

  // Broadcast a `vault_event` to the Supabase Realtime channel `vault:events` when
  // we detect the top "shipped" entry has changed since last visit. Other clients
  // viewing /studio-pulse/ will see the vault-heartbeat ticker animate.
  // No-op when supabase isn't initialized, offline, or the entry hasn't changed.
  function maybeBroadcastShipped(intel) {
    try {
      if (!intel || !intel.pulse || !Array.isArray(intel.pulse.shipped) || !intel.pulse.shipped.length) return;
      var top = String(intel.pulse.shipped[0] || '').trim();
      if (!top) return;
      var lastSeen = null;
      try { lastSeen = localStorage.getItem('vs_pulse_last_shipped'); } catch (_e) {}
      if (lastSeen === top) return;
      try { localStorage.setItem('vs_pulse_last_shipped', top); } catch (_e) {}
      // Don't broadcast on first-ever visit — the initial read shouldn't ping other clients.
      if (lastSeen == null) return;
      var supabase = window.VSSupabase || (window.VSPublic && window.VSPublic._sb) || null;
      if (!supabase || !supabase.channel) return;
      var ch = supabase.channel('vault:events');
      ch.subscribe(function (status) {
        if (status !== 'SUBSCRIBED') return;
        ch.send({
          type: 'broadcast',
          event: 'vault_event',
          payload: { type: 'drop_shipped', title: top, ts: new Date().toISOString() }
        }).finally(function () {
          // Tidy — don't leave the producer channel open.
          try { ch.unsubscribe(); } catch (_e) {}
        });
      });
    } catch (_e) { /* silent — producer must never throw */ }
  }

  // S172 field-health-public-badge — visitor-measured CWV proof strip.
  // Honest by design: quotes p75 numbers only when api/site-health.json says
  // fieldReady (>=50 real samples on a route); otherwise shows the
  // accumulating state with the live sample count. DOM API only (no innerHTML
  // — Trusted Types soak is active).
  function renderFieldHealth() {
    var strip = document.getElementById('field-health-strip');
    if (!strip) return;
    fetch('/api/site-health.json', { credentials: 'omit' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (health) {
        if (!health || health.publicSafe !== true) { strip.closest('section').hidden = true; return; }
        while (strip.firstChild) strip.removeChild(strip.firstChild);
        strip.removeAttribute('data-state');
        var eyebrow = document.createElement('div');
        eyebrow.className = 'eyebrow';
        eyebrow.textContent = 'Measured from real visits';
        strip.appendChild(eyebrow);
        var line = document.createElement('p');
        if (health.fieldReady && health.measured.length) {
          var top = health.measured[0];
          var lcpSec = top.p75.lcp != null ? (top.p75.lcp / 1000).toFixed(1) + 's' : '—';
          line.textContent = 'p75 LCP ' + lcpSec + ' on ' + top.route + ' · ' + top.samples
            + ' real visits over ' + health.windowDays + ' days. No lab numbers — this is what actual visitors experienced.';
        } else {
          line.textContent = 'Field telemetry is accumulating: ' + health.totalSamples
            + ' real-visit sample(s) across ' + health.routesObserved
            + ' routes so far. Visitor-measured vitals publish here once any route reaches '
            + health.minSamples + ' samples — no lab substitutes.';
        }
        strip.appendChild(line);
        renderFieldVerdicts(strip);
      })
      .catch(function () { var sec = strip.closest('section'); if (sec) sec.hidden = true; });
  }

  // S174 field-verdict-engine — deploy-annotated field verdicts. Each deploy
  // boundary is graded by what real visitors measured afterward: improved,
  // regressed, neutral, or honestly pending while samples accrue.
  function renderFieldVerdicts(strip) {
    fetch('/api/field-verdicts.json', { credentials: 'omit' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (doc) {
        if (!doc || doc.publicSafe !== true || !doc.boundaries || !doc.boundaries.length) return;
        var b = doc.boundaries[doc.boundaries.length - 1];
        var home = b.routes && b.routes['/'];
        var line = document.createElement('p');
        line.className = 'field-verdict-line';
        if (home && b.overall && b.overall !== 'pending') {
          var arrow = b.overall === 'improved' ? '↓ faster' : b.overall === 'regressed' ? '↑ slower' : '→ steady';
          line.textContent = 'Deploy ' + b.date + ' (' + b.label + '): homepage LCP ' + arrow
            + ' ' + Math.abs(home.lcpDeltaPct) + '% since ship · ' + home.pre.samples + ' visits before / '
            + home.post.samples + ' after · ' + home.confidence + ' confidence. Verdicts come from real visitors, not lab runs.';
        } else {
          var pre = home && home.pre ? home.pre.samples : 0;
          var post = home && home.post ? home.post.samples : 0;
          line.textContent = 'Deploy ' + b.date + ' (' + b.label + '): field verdict pending — '
            + pre + ' visit(s) before / ' + post + ' after. Real visitors grade this deploy as samples accrue.';
        }
        strip.appendChild(line);
      })
      .catch(function () { /* verdict line is additive — never break the strip */ });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderFieldHealth();
    renderNervousDigest();
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
      renderCiHealth(intel);
      renderComingNext();
      maybeBroadcastShipped(intel);
    });
    renderForgeLedger();
  });
})();
