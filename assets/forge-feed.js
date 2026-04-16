/*
 * forge-feed.js — Live activity stream on /vault-wall/ (S83).
 *
 * Reads /api/public-intelligence.json (generated each closeout) and composes
 * a public-safe Forge Feed across four stream classes:
 *   • shipped        — items from pulse.shipped + recent session focus
 *   • catalog-moves  — catalog entries with progress deltas or status flips
 *   • studio-queue   — top pulse.now items (what's being built right now)
 *   • community      — member/leaderboard signal (honest, public-safe)
 *
 * Renders into any element with [data-forge-feed]. Honest empty state if
 * the public-intelligence feed fails to resolve. Idempotent.
 */

(function () {
  'use strict';

  var FEED_URL = '/api/public-intelligence.json';
  var MAX_ITEMS = 12;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function truncate(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1).trim() + '…' : s;
  }

  function classIcon(cls) {
    switch (cls) {
      case 'shipped':       return '🔨';
      case 'catalog-moves': return '⚙';
      case 'studio-queue':  return '🔥';
      case 'community':     return '🛡';
      default:              return '✨';
    }
  }

  function classLabel(cls) {
    switch (cls) {
      case 'shipped':       return 'Shipped';
      case 'catalog-moves': return 'Catalog';
      case 'studio-queue':  return 'In Forge';
      case 'community':     return 'Community';
      default:              return 'Signal';
    }
  }

  function composeFeed(data) {
    var out = [];
    if (!data) return out;

    // studio-queue: current now items (top 3)
    var now = (data.pulse && Array.isArray(data.pulse.now)) ? data.pulse.now : [];
    now.slice(0, 3).forEach(function (item) {
      out.push({
        cls: 'studio-queue',
        title: truncate(String(item).replace(/^\[[^\]]*\]\s*/, ''), 140),
        when: 'Active'
      });
    });

    // shipped: from pulse.shipped (newest first)
    var shipped = (data.pulse && Array.isArray(data.pulse.shipped)) ? data.pulse.shipped : [];
    shipped.slice(0, 4).forEach(function (item) {
      out.push({
        cls: 'shipped',
        title: truncate(String(item).replace(/^\[[^\]]*\]\s*/, ''), 140),
        when: 'Recent'
      });
    });

    // catalog-moves: SPARKED/FORGE progress deltas
    var catalog = Array.isArray(data.catalog) ? data.catalog : [];
    catalog.slice(0, 3).forEach(function (g) {
      var status = esc(g.status || '');
      var prog = Number(g.progress);
      var title = esc(g.name || 'Untitled');
      var note = esc(g.note || '');
      var body = title + ' · ' + status + (isFinite(prog) ? ' · ' + prog + '%' : '');
      out.push({
        cls: 'catalog-moves',
        title: body,
        when: note ? truncate(note, 80) : status
      });
    });

    // community: focus / next milestone (public-safe)
    if (data.project && data.project.nextMilestone) {
      out.push({
        cls: 'community',
        title: 'Next milestone: ' + truncate(data.project.nextMilestone, 160),
        when: 'Upcoming'
      });
    }

    return out.slice(0, MAX_ITEMS);
  }

  function renderFeed(root, items, meta) {
    if (!root) return;
    if (!items || items.length === 0) {
      root.innerHTML = [
        '<div class="ff-empty">',
        '  <p>The forge feed resolves from the live public intelligence payload. If this panel stays empty, the feed is temporarily offline — nothing is fabricated.</p>',
        '</div>'
      ].join('\n');
      root.setAttribute('data-state', 'empty');
      return;
    }
    var rows = items.map(function (it) {
      return [
        '<li class="ff-row ff-row--' + esc(it.cls) + '">',
        '  <span class="ff-icon" aria-hidden="true">' + classIcon(it.cls) + '</span>',
        '  <div class="ff-body">',
        '    <span class="ff-label">' + esc(classLabel(it.cls)) + '</span>',
        '    <p class="ff-title">' + it.title + '</p>',
        '  </div>',
        '  <span class="ff-when">' + esc(it.when || '') + '</span>',
        '</li>'
      ].join('\n');
    }).join('\n');
    var session = meta && meta.session ? 'Session ' + meta.session : 'Live';
    var updated = meta && meta.updated ? meta.updated : '';
    root.innerHTML = [
      '<ul class="ff-list" role="feed" aria-label="Forge Feed activity stream">' + rows + '</ul>',
      '<p class="ff-foot">' + esc(session) + (updated ? ' · Updated ' + esc(updated) : '') + '</p>'
    ].join('\n');
    root.setAttribute('data-state', 'ready');
  }

  async function init() {
    var root = document.querySelector('[data-forge-feed]');
    if (!root) return;
    try {
      var res = await fetch(FEED_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error('feed ' + res.status);
      var data = await res.json();
      var items = composeFeed(data);
      renderFeed(root, items, {
        session: data.project && data.project.currentSession,
        updated: data.project && data.project.lastUpdated
      });
    } catch (e) {
      renderFeed(root, [], null);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
