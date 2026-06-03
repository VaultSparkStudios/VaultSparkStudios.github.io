/**
 * VaultSpark — Membership Live Tier.
 *
 * Two upgrades in one script:
 *  1. Rank strip live highlight — logged-in members see their active tier lit up,
 *     animated into view, and haptic-fired on load (PWA/Android).
 *  2. World Vault live gates — world cards show "You have access" vs
 *     "Upgrade to unlock" labels based on the member's actual tier.
 *
 * Requires: supabase-client.js OR the VS auth session from localStorage.
 * Falls back silently when the member is not signed in.
 */
(function () {
  'use strict';

  var RANK_THRESHOLDS = [0, 250, 1000, 3000, 7500, 15000, 30000, 60000, 100000];
  var RANK_KEYS = [
    'spark_initiate', 'vault_runner', 'rift_scout', 'vault_guard',
    'vault_breacher', 'void_operative', 'vault_keeper', 'forge_master', 'the_sparked'
  ];

  // Tier order: free < vault_sparked < vault_sparked_pro
  var TIER_ORDER = { free: 0, vault_sparked: 1, vault_sparked_pro: 2 };

  function tierRank(plan) {
    return TIER_ORDER[plan] != null ? TIER_ORDER[plan] : 0;
  }

  function getMemberSession() {
    // Try VSMembershipAccess.getSession() if available (loaded by membership-access.js)
    if (window.VSMembershipAccess && typeof window.VSMembershipAccess.getSession === 'function') {
      return window.VSMembershipAccess.getSession();
    }
    // Fallback: read Supabase JWT from localStorage directly
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.includes('supabase') && k.includes('auth-token')) {
          var raw = JSON.parse(localStorage.getItem(k) || 'null');
          if (raw && raw.access_token) return Promise.resolve(raw);
        }
      }
    } catch (_) {}
    return Promise.resolve(null);
  }

  function getMemberProfile() {
    return getMemberSession().then(function (session) {
      if (!session || !session.access_token) return null;
      var SB_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
      var SB_KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
      return fetch(SB_URL + '/rest/v1/members?select=plan,vault_points&limit=1', {
        headers: {
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + session.access_token,
          'Prefer': 'return=representation'
        }
      }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (rows) { return rows && rows[0] ? rows[0] : null; })
        .catch(function () { return null; });
    });
  }

  function rankIndexFromPoints(pts) {
    var n = Number(pts) || 0;
    for (var i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
      if (n >= RANK_THRESHOLDS[i]) return i;
    }
    return 0;
  }

  /* ── 1. Rank Strip Live Highlight ─────────────────── */
  function activateRankStrip(rankIndex) {
    var items = document.querySelectorAll('.rank-strip-item');
    if (!items.length) return;
    items.forEach(function (el, i) {
      if (i === rankIndex) {
        el.classList.add('rank-strip-item--active');
        el.setAttribute('aria-current', 'true');
        el.setAttribute('aria-label', (el.querySelector('.rank-strip-name') || {}).textContent + ' — your current rank');
        // Scroll into view (centered, smooth)
        setTimeout(function () {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 400);
        // Haptic + rank-up event for PWA
        document.dispatchEvent(new CustomEvent('vs:rank_up', { bubbles: true, detail: { rankIndex: rankIndex } }));
      } else {
        el.classList.remove('rank-strip-item--active');
        el.removeAttribute('aria-current');
      }
    });

    // Inject live rank badge below the strip heading
    var heading = document.getElementById('rank-strip-heading');
    if (heading && !document.getElementById('rank-strip-live-badge')) {
      var badge = document.createElement('p');
      badge.id = 'rank-strip-live-badge';
      badge.className = 'rank-strip-live-badge';
      badge.setAttribute('aria-live', 'polite');
      badge.innerHTML = 'Your rank: <strong>' +
        (document.querySelectorAll('.rank-strip-name')[rankIndex] || {}).textContent +
        '</strong>';
      heading.insertAdjacentElement('afterend', badge);
    }
  }

  /* ── 2. World Vault Live Gates ─────────────────────── */
  function activateWorldGates(plan) {
    var tier = tierRank(plan);
    // Cards: free=0, sparked=1, eternal=2 → map to unlock row classes
    var UNLOCK_TIER = { 'mem-world-unlock--free': 0, 'mem-world-unlock--sparked': 1, 'mem-world-unlock--eternal': 2 };
    document.querySelectorAll('.mem-world-card').forEach(function (card) {
      card.querySelectorAll('.mem-world-unlock').forEach(function (row) {
        var rowTier = 0;
        Object.keys(UNLOCK_TIER).forEach(function (cls) {
          if (row.classList.contains(cls)) rowTier = UNLOCK_TIER[cls];
        });
        var hasAccess = tier >= rowTier;
        // Add or update the access badge
        var badge = row.querySelector('.mem-world-access-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'mem-world-access-badge';
          row.appendChild(badge);
        }
        badge.textContent = hasAccess ? '✓ You have access' : '→ Upgrade to unlock';
        badge.classList.toggle('mem-world-access-badge--yes', hasAccess);
        badge.classList.toggle('mem-world-access-badge--no', !hasAccess);
        badge.setAttribute('aria-label', hasAccess ? 'You have access to this benefit' : 'Upgrade to unlock this benefit');
      });
    });
  }

  function init() {
    getMemberProfile().then(function (profile) {
      if (!profile) return; // not signed in — static display is correct
      var plan = profile.plan || 'free';
      var pts = profile.vault_points || 0;
      var rankIdx = rankIndexFromPoints(pts);
      activateRankStrip(rankIdx);
      activateWorldGates(plan);
    }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
