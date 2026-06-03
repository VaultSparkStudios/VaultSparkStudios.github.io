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

  var PLATFORM_ICONS = {
    GitHub: 'i-github', YouTube: 'i-youtube', Reddit: 'i-reddit', Bluesky: 'i-bluesky',
    Gumroad: 'i-gumroad', 'X (Twitter)': 'i-x', TikTok: 'i-tiktok',
    Instagram: 'i-instagram', Facebook: 'i-facebook', Threads: 'i-threads',
    Discord: 'i-discord', Pinterest: 'i-pinterest', Suno: 'i-suno', Sora: 'i-sora'
  };
  var SPRITE_PATH = '/assets/social-icons.svg';

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
    var icon = PLATFORM_ICONS[account.platform] || 'i-github';
    var support = supportLabel(account.apiSupport);
    return '<a class="social-tile' + (featured ? ' social-tile-featured' : '') + '" ' +
      'href="' + esc(account.url) + '" target="_blank" rel="noreferrer me">' +
      '<span class="social-tile-glyph" aria-hidden="true" style="color:' + color + ';border-color:' + color + '33;">' +
        '<svg class="social-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="' + SPRITE_PATH + '#' + icon + '"/></svg>' +
      '</span>' +
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

  // Sort non-featured accounts by recency of last post if available,
  // falling back to API-support tier (a rough proxy for "how active").
  // Never renders interpretive activity-level labels — just a flat list.
  function sortByRecency(accounts, featuredIds) {
    var SUPPORT_RANK = { full: 0, limited: 1, stub: 2 };
    return (accounts || [])
      .filter(function (a) { return !featuredIds[a.id]; })
      .slice()
      .sort(function (a, b) {
        var ta = a.lastPostedAt ? Date.parse(a.lastPostedAt) : null;
        var tb = b.lastPostedAt ? Date.parse(b.lastPostedAt) : null;
        if (ta && tb) return tb - ta;
        if (ta) return -1;
        if (tb) return 1;
        var sa = SUPPORT_RANK[a.apiSupport] || 9;
        var sb = SUPPORT_RANK[b.apiSupport] || 9;
        if (sa !== sb) return sa - sb;
        return String(a.platform).localeCompare(String(b.platform));
      });
  }

  function boot() {
    var summaryEl = document.getElementById('social-summary');
    var featuredEl = document.getElementById('social-featured');
    var allEl = document.getElementById('social-all');
    var generatedEl = document.getElementById('social-generated');
    var pageRoot = document.getElementById('social-content');

    var source = (window.VSPublicIntel && typeof window.VSPublicIntel.get === 'function')
      ? window.VSPublicIntel.get()
      : fetch('/api/public-intelligence.json', { cache: 'no-cache' })
          .then(function (r) { if (!r.ok) throw new Error('fetch failed'); return r.json(); });
    Promise.resolve(source)
      .then(function (data) {
        if (!data) { renderOffline(pageRoot); return; }
        var social = data.social || {};
        renderSummary(summaryEl, social.summary);
        renderList(featuredEl, social.featuredAccounts, true);
        var featuredIds = {};
        (social.featuredAccounts || []).forEach(function (a) { featuredIds[a.id] = true; });
        renderList(allEl, sortByRecency(social.accounts, featuredIds), false);
        renderGenerated(generatedEl, data.generatedAt);
      })
      .catch(function () { renderOffline(pageRoot); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
