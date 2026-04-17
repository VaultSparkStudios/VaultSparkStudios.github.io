(function () {
  'use strict';

  var PLATFORM_COLOURS = {
    GitHub: '#f2f6fb',
    YouTube: '#ff4444',
    Reddit: '#ff6314',
    Bluesky: '#0085ff',
    Gumroad: '#ff90e8',
    'X (Twitter)': '#d0d5df',
    TikTok: '#fe2c55',
    Instagram: '#e1306c',
    Facebook: '#1877f2',
    Threads: '#c4c9d1',
    Discord: '#5865f2',
    Pinterest: '#e60023',
    Suno: '#8b5cf6',
    Sora: '#7dd3fc'
  };

  var PLATFORM_GLYPHS = {
    GitHub: 'GH', YouTube: 'YT', Reddit: 'RD', Bluesky: 'BS',
    Gumroad: 'GR', 'X (Twitter)': 'X', TikTok: 'TK',
    Instagram: 'IG', Facebook: 'FB', Threads: 'TH',
    Discord: 'DC', Pinterest: 'PT', Suno: 'SN', Sora: 'SR'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function supportLabel(level) {
    if (level === 'full') return { label: 'Live presence', tone: 'ok' };
    if (level === 'limited') return { label: 'Limited presence', tone: 'warn' };
    return { label: 'Channel reserved', tone: 'off' };
  }

  function tile(account, featured) {
    var color = PLATFORM_COLOURS[account.platform] || 'rgba(255,255,255,0.6)';
    var glyph = PLATFORM_GLYPHS[account.platform] || account.platform.slice(0, 2).toUpperCase();
    var support = supportLabel(account.apiSupport);
    return '<a class="social-tile' + (featured ? ' social-tile-featured' : '') + '" ' +
      'href="' + esc(account.url) + '" target="_blank" rel="noreferrer me">' +
      '<span class="social-tile-glyph" aria-hidden="true" style="color:' + color + ';border-color:' + color + '33;">' + esc(glyph) + '</span>' +
      '<span class="social-tile-body">' +
        '<span class="social-tile-platform">' + esc(account.platform) + '</span>' +
        '<span class="social-tile-handle">' + esc(account.handle) + '</span>' +
        '<span class="social-tile-desc">' + esc(account.description || '') + '</span>' +
        '<span class="social-tile-support social-tile-support-' + support.tone + '">' + support.label + '</span>' +
      '</span>' +
    '</a>';
  }

  function renderSummary(root, summary) {
    if (!root || !summary) return;
    root.innerHTML = [
      ['Tracked accounts', summary.trackedAccounts],
      ['Live presence', summary.liveApiAccounts],
      ['Limited presence', summary.limitedApiAccounts],
      ['Channels reserved', summary.stubAccounts]
    ].map(function (pair) {
      return '<div class="social-stat"><span class="social-stat-num">' + esc(pair[1]) + '</span><span class="social-stat-label">' + esc(pair[0]) + '</span></div>';
    }).join('');
  }

  function renderList(root, accounts, featured) {
    if (!root) return;
    if (!accounts || !accounts.length) {
      root.innerHTML = '<p class="social-empty">No accounts in this group yet.</p>';
      return;
    }
    root.innerHTML = accounts.map(function (a) { return tile(a, !!featured); }).join('');
  }

  function renderGenerated(el, iso) {
    if (!el) return;
    try {
      var d = new Date(iso);
      el.textContent = 'Last synced: ' + d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch (_) {
      el.textContent = 'Last synced: ' + (iso || 'unknown');
    }
  }

  function renderOffline(pageRoot) {
    if (!pageRoot) return;
    pageRoot.innerHTML = '<div class="social-offline" role="status" aria-live="polite">' +
      '<h2>Live feed temporarily offline</h2>' +
      '<p>We couldn\'t reach the Studio intelligence bridge. Nothing has been fabricated. Reach us directly at <a href="/contact/">/contact/</a>, on <a href="https://github.com/VaultSparkStudios" target="_blank" rel="noreferrer">GitHub</a>, or on the community <a href="https://www.reddit.com/r/VaultSparkStudios/" target="_blank" rel="noreferrer">subreddit</a>.</p>' +
    '</div>';
  }

  function groupAccounts(all) {
    var groups = { live: [], limited: [], reserved: [] };
    (all || []).forEach(function (a) {
      if (a.apiSupport === 'full') groups.live.push(a);
      else if (a.apiSupport === 'limited') groups.limited.push(a);
      else groups.reserved.push(a);
    });
    return groups;
  }

  function boot() {
    var summaryEl = document.getElementById('social-summary');
    var featuredEl = document.getElementById('social-featured');
    var liveEl = document.getElementById('social-live');
    var limitedEl = document.getElementById('social-limited');
    var reservedEl = document.getElementById('social-reserved');
    var generatedEl = document.getElementById('social-generated');
    var pageRoot = document.getElementById('social-content');

    fetch('/api/public-intelligence.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('fetch failed'); return r.json(); })
      .then(function (data) {
        var social = (data && data.social) || {};
        renderSummary(summaryEl, social.summary);
        renderList(featuredEl, social.featuredAccounts, true);
        var grouped = groupAccounts(social.accounts);
        renderList(liveEl, grouped.live, false);
        renderList(limitedEl, grouped.limited, false);
        renderList(reservedEl, grouped.reserved, false);
        renderGenerated(generatedEl, data && data.generatedAt);
      })
      .catch(function () { renderOffline(pageRoot); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
