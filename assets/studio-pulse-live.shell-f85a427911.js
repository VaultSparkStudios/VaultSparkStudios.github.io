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

  // ── Forge focus (pure; exported for scripts/test-studio-pulse-activity.mjs) ──
  // PRIVACY (CANON-028 Founder Identity Privacy). This page reports studio
  // OUTPUT, never a human schedule. The feed used to carry
  // catalog[].lastActivityAt (the newest work-session closeout per project) and
  // this file re-derived active/resting/dormant from it, rendering dated
  // last-touched / quiet-since / no-recent-sessions copy on every card — a public
  // record of when a private individual was working. Both the field and the
  // derivation are gone. Focus and card copy are now chosen from
  // published STATUS and progress, which carry no timing at all. A card that
  // cannot make a timing-free claim makes NO claim; never infer recency here.
  var MS_MIN = 60000;
  var MS_HOUR = 3600000;
  var MS_DAY = 86400000;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function parseTs(value) {
    var ts = Date.parse(value || '');
    return isFinite(ts) && ts > 0 ? ts : null;
  }

  function formatMonthDay(value) {
    var ts = parseTs(value);
    if (ts === null) return '';
    var d = new Date(ts);
    return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();
  }

  // Which world the focus band features. Deterministic and clock-free: the
  // highest-progress FORGE entry, name as tiebreak. No recency, no "active".
  // → { kind: 'forge', item } | { kind: 'empty' }
  function selectCurrentFocus(catalog) {
    var forge = (catalog || []).filter(function (c) { return c && c.status === 'FORGE'; }).slice().sort(function (a, b) {
      return (Number(b.progress) || 0) - (Number(a.progress) || 0)
        || String(a.name || '').localeCompare(String(b.name || ''));
    });
    return forge.length ? { kind: 'forge', item: forge[0] } : { kind: 'empty' };
  }

  function focusCopy(selection) {
    if (selection && selection.kind === 'forge') {
      var item = selection.item;
      return { state: 'forge', live: false, eyebrow: 'In the forge', name: item.name, note: item.note || '', linkText: 'Follow the build →', href: routeFor(item) };
    }
    return { state: 'empty', live: false, eyebrow: 'In the forge', name: 'Nothing is in the forge right now', note: 'Every world is either sparked or vaulted.', linkText: 'Browse the worlds →', href: '/games/' };
  }

  // Card copy is the editorial note for the world, full stop. It must never be
  // swapped for a recency line (last-touched / quiet-since / last-updated):
  // that would republish the work timing this surface just removed (CANON-028).
  function cardActivityNote(item) {
    return item ? (item.note || '') : '';
  }

  // ── Relative time + feed freshness (pure) ─────────────────────────────────
  function relativeTime(value, nowMs) {
    var ts = parseTs(value);
    if (ts === null) return '';
    var diff = nowMs - ts;
    if (diff < -5 * MS_MIN) return formatMonthDay(value);
    if (diff < MS_MIN) return 'just now';
    if (diff < MS_HOUR) return Math.floor(diff / MS_MIN) + ' min ago';
    if (diff < MS_DAY) return Math.floor(diff / MS_HOUR) + ' h ago';
    if (diff < 7 * MS_DAY) return Math.floor(diff / MS_DAY) + ' d ago';
    return formatMonthDay(value);
  }

  // Day-precision values ("2026-09-12" or an item with precision:'day') never
  // claim hour-level recency.
  function relativeDay(value, nowMs) {
    var ts = parseTs(value);
    if (ts === null) return '';
    var today = new Date(nowMs).toISOString().slice(0, 10);
    var day = new Date(ts).toISOString().slice(0, 10);
    var days = Math.round((Date.parse(today) - Date.parse(day)) / MS_DAY);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return days + ' days ago';
    return formatMonthDay(value);
  }

  function isDayPrecision(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  // cadenceHours: how often the producer is expected to write. null = no fixed
  // cadence (closeout-only or write-on-change), so age is shown but never "stale".
  var FEEDS = [
    { id: 'intel',    label: 'Portfolio feed',  cadenceHours: 4 },
    { id: 'timeline', label: 'Studio timeline', cadenceHours: null },
    { id: 'ledger',   label: 'Forge ledger',    cadenceHours: 24 },
    { id: 'digest',   label: 'Signal digest',   cadenceHours: 4 },
    { id: 'vitals',   label: 'Field vitals',    cadenceHours: 24 },
  ];

  // generatedAt: ISO/date string · null = loaded but undated · undefined = pending · false = failed
  function feedFreshness(feed, generatedAt, nowMs) {
    if (generatedAt === undefined) return { id: feed.id, state: 'pending', text: feed.label + ' · loading' };
    if (generatedAt === false) return { id: feed.id, state: 'unavailable', text: feed.label + ' · unavailable' };
    var ts = parseTs(generatedAt);
    if (ts === null) return { id: feed.id, state: 'unknown', text: feed.label + ' · update time unknown' };
    var age = isDayPrecision(generatedAt) ? relativeDay(generatedAt, nowMs) : relativeTime(generatedAt, nowMs);
    var slackMs = isDayPrecision(generatedAt) ? MS_DAY : 0;
    var stale = feed.cadenceHours != null && (nowMs - ts - slackMs) > feed.cadenceHours * 2 * MS_HOUR;
    return { id: feed.id, state: stale ? 'stale' : 'fresh', text: feed.label + ' · updated ' + age + (stale ? ' (behind schedule)' : '') };
  }

  // This page reports studio OUTPUT (feeds, commits, Desk editions) only. It must
  // never publish who is at the desk, or when they were last there: an activity
  // pattern about a private individual is not a public signal, whether it is
  // live or a day old (CANON-028 Founder Identity Privacy).

  // ── Timeline (pure) ───────────────────────────────────────────────────────
  var KIND_LABEL = { commit: 'Commit', edition: 'Desk' };

  function itemTimeLabel(item, nowMs) {
    return item && item.precision === 'day' ? relativeDay(item.at, nowMs) : relativeTime(item && item.at, nowMs);
  }

  function dayKey(item) {
    var ts = parseTs(item.at);
    if (ts === null) return '';
    if (item.precision === 'day') return String(item.at).slice(0, 10);
    var d = new Date(ts);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  function dayLabel(key, nowMs) {
    var now = new Date(nowMs);
    var todayKey = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
    var y = new Date(nowMs - MS_DAY);
    var yesterdayKey = y.getFullYear() + '-' + ('0' + (y.getMonth() + 1)).slice(-2) + '-' + ('0' + y.getDate()).slice(-2);
    if (key === todayKey) return 'Today';
    if (key === yesterdayKey) return 'Yesterday';
    var parts = key.split('-');
    return MONTHS[Number(parts[1]) - 1] + ' ' + Number(parts[2]);
  }

  // Re-filters against the VIEWER's clock so an older feed never shows >7-day rows.
  function timelineGroups(payload, nowMs) {
    var windowDays = (payload && Number(payload.windowDays)) || 7;
    var cutoff = nowMs - windowDays * MS_DAY - MS_DAY; // day-precision slack
    // Work-session rows are dropped here as well as at the producer: this client
    // ships ahead of the 4-hourly feed rebuild, so a already-published feed can
    // still carry "Session 356 closed" rows. Never render them (CANON-028).
    var items = ((payload && payload.items) || []).filter(function (item) {
      var ts = parseTs(item && item.at);
      if (!item || item.kind === 'session') return false;
      if (/work session|session \d+ closed/i.test(String(item.title || ''))) return false;
      return ts !== null && ts >= cutoff && ts <= nowMs + MS_DAY && item.title && item.project;
    });
    var groups = [];
    var byKey = {};
    items.forEach(function (item) {
      var key = dayKey(item);
      if (!byKey[key]) { byKey[key] = { key: key, label: dayLabel(key, nowMs), items: [] }; groups.push(byKey[key]); }
      byKey[key].items.push(item);
    });
    groups.sort(function (a, b) { return a.key < b.key ? 1 : a.key > b.key ? -1 : 0; });
    return { groups: groups, count: items.length };
  }

  var REASON_COPY = {
    'rate-limited': 'rate limited', deadline: 'timed out', timeout: 'timed out', network: 'network error',
    'ledger-absent': 'not published', 'feed-absent': 'not published', 'not-public-safe': 'withheld', 'not-collected': 'not collected',
  };

  function sourceNotes(payload) {
    return ((payload && payload.sources) || []).filter(function (s) { return s && s.state !== 'ok'; }).map(function (s) {
      var reason = REASON_COPY[s.reason] || (/^http-/.test(String(s.reason)) ? 'service error' : '');
      return { state: s.state, text: (s.label || s.id) + ' ' + (s.state === 'partial' ? 'partially available' : 'unavailable') + (reason ? ' (' + reason + ')' : '') };
    });
  }

  function timelineSummary(payload, view) {
    if (!view.count) return 'No public studio activity in the last ' + ((payload && payload.windowDays) || 7) + ' days.';
    var projects = {};
    view.groups.forEach(function (g) { g.items.forEach(function (i) { projects[i.project] = true; }); });
    var p = Object.keys(projects).length;
    return view.count + (view.count === 1 ? ' move' : ' moves') + ' across ' + p + (p === 1 ? ' project' : ' projects') + ' in the last ' + ((payload && payload.windowDays) || 7) + ' days.';
  }

  function nextDelay(baseMs, failures, capMs) {
    return Math.min(baseMs * Math.pow(2, Math.max(0, failures || 0)), capMs || 15 * MS_MIN);
  }

  // ── DOM helpers ───────────────────────────────────────────────────────────
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function setText(node, text) {
    if (node && node.textContent !== text) node.textContent = text;
  }

  function renderCurrentFocus(catalog) {
    var host = document.getElementById('forge-current-focus');
    if (!host || !Array.isArray(catalog)) return;
    var copy = focusCopy(selectCurrentFocus(catalog));
    clear(host);
    host.setAttribute('data-focus-state', copy.state);
    var eyebrow = el('div', 'focus-eyebrow');
    if (copy.live) {
      var dot = el('span', 'focus-dot');
      dot.setAttribute('aria-hidden', 'true');
      eyebrow.appendChild(dot);
    }
    eyebrow.appendChild(document.createTextNode(copy.eyebrow));
    host.appendChild(eyebrow);
    host.appendChild(el('div', 'focus-name', copy.name));
    host.appendChild(el('div', 'focus-note', copy.note));
    var link = el('a', 'focus-link', copy.linkText);
    link.setAttribute('href', copy.href);
    host.appendChild(link);
  }

  function renderCatalogGrid(targetId, items) {
    var container = document.getElementById(targetId);
    if (!container) return;
    clear(container);
    if (!items || !items.length) {
      container.appendChild(el('p', 'forge-empty', 'Nothing listed here yet.'));
      return;
    }
    items.forEach(function (item) {
      var meta = STATUS_COPY[item.status] || { label: item.status, tone: 'forge' };
      var card = el('a', 'forge-world-card tone-' + meta.tone);
      card.setAttribute('href', routeFor(item));
      card.setAttribute('aria-label', item.name + ' — ' + meta.label);
      var glow = el('div', 'forge-world-glow');
      glow.setAttribute('aria-hidden', 'true');
      card.appendChild(glow);
      var head = el('div', 'forge-world-head');
      head.appendChild(el('span', 'forge-world-status', meta.label));
      card.appendChild(head);
      card.appendChild(el('div', 'forge-world-name', item.name));
      card.appendChild(el('div', 'forge-world-note', cardActivityNote(item)));
      var heat = el('div', 'forge-world-heat');
      heat.setAttribute('role', 'presentation');
      var fill = el('div', 'forge-world-heat-fill');
      fill.style.width = Math.max(6, Math.min(100, Number(item.progress) || 0)) + '%';
      heat.appendChild(fill);
      card.appendChild(heat);
      var enter = el('div', 'forge-world-enter', 'Enter →');
      enter.setAttribute('aria-hidden', 'true');
      card.appendChild(enter);
      container.appendChild(card);
    });
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
    // Feed generation time, NOT project.lastUpdated: that field is stamped at
    // closeout, so publishing it dated the founder's last working day
    // (CANON-028). The session COUNT carries no timing and stays.
    var updated = intel.generatedAt ? relativeTime(intel.generatedAt, Date.now()) : '';
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
          '<div class="signal-strip-updated">Feed updated ' + escapeHtml(updated || 'recently') + '</div>' +
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

  // ── Live state (browser) ──────────────────────────────────────────────────
  var state = {
    intel: null,
    timeline: null,
    timelineExpanded: false,
    feeds: {}, // id → generatedAt | null | false
  };

  function noteFeed(id, generatedAt) {
    state.feeds[id] = generatedAt;
    renderFreshness();
  }

  function renderFreshness() {
    var nowMs = Date.now();
    var headline = document.getElementById('forge-last-updated');
    if (headline) {
      var intelAt = state.feeds.intel;
      setText(headline, intelAt === undefined ? 'reading feeds…'
        : intelAt === false ? 'feed unavailable'
        : relativeTime(intelAt, nowMs) || 'time unknown');
    }
    var list = document.getElementById('forge-feed-freshness');
    if (!list) return;
    var rows = FEEDS.map(function (feed) { return feedFreshness(feed, state.feeds[feed.id], nowMs); });
    // Reuse nodes so a minute tick only rewrites text.
    rows.forEach(function (row, i) {
      var li = list.children[i];
      if (!li) { li = el('li', 'forge-feed-row'); list.appendChild(li); }
      li.setAttribute('data-state', row.state);
      setText(li, row.text);
    });
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
        noteFeed('ledger', data ? (data.generatedAt || null) : false);
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
      .catch(function () { noteFeed('ledger', false); });
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
        noteFeed('digest', data.generatedAt || null);
        el.innerHTML = data.tiles.map(function (tile) {
          return '<a class="forge-heartbeat-tile tone-total" role="listitem" href="' + escapeHtml(tile.href || '/status/') + '">' +
            '<strong>' + escapeHtml(tile.value || '—') + '</strong><span>' + escapeHtml(tile.label || 'Signal') + '</span></a>';
        }).join('');
      })
      .catch(function () {
        noteFeed('digest', false);
        el.innerHTML = '<a class="forge-heartbeat-tile tone-forge" role="listitem" href="/status/"><strong>Check status</strong><span>Live digest is briefly unavailable</span></a>';
      });
  }

  function partition(catalog) {
    var worlds = catalog.filter(function (c) { return c.type === 'game'; });
    var tools  = catalog.filter(function (c) { return c.type !== 'game'; });
    return { worlds: worlds, tools: tools };
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
        noteFeed('vitals', health ? (health.generatedAt || null) : false);
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
      .catch(function () { noteFeed('vitals', false); var sec = strip.closest('section'); if (sec) sec.hidden = true; });
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

      // ── Timeline section ──────────────────────────────────────────────────────
  var TIMELINE_INITIAL_ROWS = 20;

  function renderTimeline() {
    var list = document.getElementById('studio-timeline-list');
    var summary = document.getElementById('studio-timeline-summary');
    var sources = document.getElementById('studio-timeline-sources');
    if (!list || !summary) return;
    var payload = state.timeline;
    if (payload === false) {
      setText(summary, 'The studio timeline feed is not published right now. Nothing is shown rather than guessed.');
      clear(list);
      if (sources) clear(sources);
      return;
    }
    if (!payload) return;
    var nowMs = Date.now();
    var view = timelineGroups(payload, nowMs);
    setText(summary, timelineSummary(payload, view));
    if (sources) {
      clear(sources);
      sourceNotes(payload).forEach(function (note) {
        var li = el('li', 'studio-timeline-source', note.text);
        li.setAttribute('data-state', note.state);
        sources.appendChild(li);
      });
    }
    clear(list);
    var shown = 0;
    var limit = state.timelineExpanded ? Infinity : TIMELINE_INITIAL_ROWS;
    view.groups.forEach(function (group) {
      if (shown >= limit) return;
      var block = el('div', 'studio-timeline-day');
      block.appendChild(el('h3', 'studio-timeline-day-label', group.label));
      var ol = el('ol', 'studio-timeline-rows');
      group.items.forEach(function (item) {
        if (shown >= limit) return;
        shown += 1;
        var li = el('li', 'studio-timeline-row kind-' + (KIND_LABEL[item.kind] ? item.kind : 'commit'));
        li.appendChild(el('span', 'studio-timeline-kind', item.kind === 'commit' && item.move ? item.move : (KIND_LABEL[item.kind] || 'Move')));
        var body = el('span', 'studio-timeline-body');
        body.appendChild(el('span', 'studio-timeline-project', item.project));
        var title;
        if (typeof item.url === 'string' && (/^\/[a-z0-9]/i.test(item.url) || /^https:\/\//i.test(item.url))) {
          title = el('a', 'studio-timeline-title', item.title);
          title.setAttribute('href', item.url);
          if (/^https:\/\//i.test(item.url)) title.setAttribute('rel', 'noopener noreferrer');
        } else {
          title = el('span', 'studio-timeline-title', item.title);
        }
        body.appendChild(title);
        li.appendChild(body);
        var time = el('time', 'studio-timeline-when', itemTimeLabel(item, nowMs));
        time.setAttribute('datetime', item.at);
        li.appendChild(time);
        ol.appendChild(li);
      });
      block.appendChild(ol);
      list.appendChild(block);
    });
    if (view.count > TIMELINE_INITIAL_ROWS) {
      var toggle = el('button', 'button-secondary button-sm studio-timeline-toggle', state.timelineExpanded ? 'Show fewer' : 'Show all ' + view.count + ' moves');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', state.timelineExpanded ? 'true' : 'false');
      toggle.addEventListener('click', function () {
        state.timelineExpanded = !state.timelineExpanded;
        renderTimeline();
        var again = document.querySelector('.studio-timeline-toggle');
        if (again) again.focus();
      });
      list.appendChild(toggle);
    }
  }

  function loadTimeline() {
    return fetch('/api/studio-timeline.json', { cache: 'no-cache', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || data.publicSafe !== true || !Array.isArray(data.items)) {
          noteFeed('timeline', false);
          if (!state.timeline) { state.timeline = false; renderTimeline(); }
          return false;
        }
        state.timeline = data;
        noteFeed('timeline', data.generatedAt || null);
        renderTimeline();
        return true;
      }, function () {
        noteFeed('timeline', false);
        if (!state.timeline) { state.timeline = false; renderTimeline(); }
        return false;
      });
  }

  // ── Intelligence feed (focus, cards, heartbeat) ───────────────────────────
  function loadIntel() {
    if (!window.VSPublicIntel) { noteFeed('intel', false); return Promise.resolve(false); }
    return window.VSPublicIntel.get().then(function (intel) {
      if (!intel) { noteFeed('intel', false); return false; }
      var first = !state.intel;
      state.intel = intel;
      noteFeed('intel', intel.generatedAt || null);
      renderHeartbeat(intel.portfolio || {});
      renderCurrentFocus(intel.catalog || []);
      var split = partition(intel.catalog || []);
      renderCatalogGrid('forge-worlds-grid', split.worlds);
      renderCatalogGrid('forge-tools-grid', split.tools);
      renderSealedVault(intel.portfolio || {});
      if (first) { renderSignalStrip(intel); renderCiHealth(intel); }
      return true;
    });
  }

  // Visibility-aware poller: runs now, then every baseMs while the tab is visible,
  // doubling the delay after each failure (capped). Hidden tabs do no network work;
  // returning to the tab runs immediately when a tick is overdue.
  function startPoller(task, baseMs) {
    var failures = 0;
    var timer = null;
    var busy = false;
    var lastRun = 0;
    function schedule(delay) {
      if (timer) clearTimeout(timer);
      timer = document.hidden ? null : setTimeout(run, delay);
    }
    function run() {
      timer = null;
      if (busy || document.hidden) return;
      busy = true;
      lastRun = Date.now();
      Promise.resolve().then(task).then(function (ok) {
        failures = ok === false ? failures + 1 : 0;
      }, function () { failures += 1; }).then(function () {
        busy = false;
        schedule(nextDelay(baseMs, failures));
      });
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (timer) { clearTimeout(timer); timer = null; } return; }
      if (timer || busy) return;
      var due = lastRun + nextDelay(baseMs, failures);
      if (Date.now() >= due) run(); else schedule(due - Date.now());
    });
    run();
  }

  // Node self-test hook (no-op in browsers: `module` is undefined there).
  if (typeof module === 'object' && module && module.exports) {
    module.exports = {
      selectCurrentFocus: selectCurrentFocus,
      focusCopy: focusCopy,
      cardActivityNote: cardActivityNote,
      formatMonthDay: formatMonthDay,
      relativeTime: relativeTime,
      relativeDay: relativeDay,
      feedFreshness: feedFreshness,
      FEEDS: FEEDS,
      KIND_LABEL: KIND_LABEL,
      timelineGroups: timelineGroups,
      timelineSummary: timelineSummary,
      sourceNotes: sourceNotes,
      itemTimeLabel: itemTimeLabel,
      nextDelay: nextDelay,
    };
  }
  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', function () {
    renderFreshness();
    renderFieldHealth();
    renderNervousDigest();
    renderForgeLedger();
    startPoller(loadIntel, 10 * MS_MIN);
    startPoller(loadTimeline, 5 * MS_MIN);
    // Relative times ("3 min ago") are recomputed locally each minute; no network.
    startPoller(function () { renderFreshness(); renderTimeline(); return true; }, MS_MIN);
  });
})();
