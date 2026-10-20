/**
 * VaultSpark — Membership Live Tier.
 *
 * Rank strip live highlight — signed-in members see their tier (from their own
 * vault_members points) lit up and centered in the strip, with a "Your rank" line.
 * World-vault access labels stay static until the paid-tier source is decided
 * (S390: plan_key alone ignores subscription status).
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
      if (!session || !session.access_token || !session.user || !session.user.id) return null;
      var SB_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
      var SB_KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
      // vault_members is the member table; the id filter selects the caller's own row.
      return fetch(SB_URL + '/rest/v1/vault_members?select=points&id=eq.' + encodeURIComponent(session.user.id) + '&limit=1', {
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
        // Center the tier inside the horizontal strip only. scrollIntoView would also
        // move the page, and vs:rank_up is reserved for an actual rank change.
        var scroller = el.closest('.rank-strip-scroll');
        if (scroller) {
          setTimeout(function () {
            var box = scroller.getBoundingClientRect();
            var item = el.getBoundingClientRect();
            var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            scroller.scrollTo({ left: scroller.scrollLeft + item.left - box.left - (box.width - item.width) / 2, behavior: reduce ? 'auto' : 'smooth' });
          }, 400);
        }
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
      var name = document.createElement('strong');
      name.textContent = (document.querySelectorAll('.rank-strip-name')[rankIndex] || {}).textContent || '';
      badge.append('Your rank: ', name);
      heading.insertAdjacentElement('afterend', badge);
    }
  }

  function init() {
    getMemberProfile().then(function (profile) {
      if (!profile) return; // not signed in — static display is correct
      activateRankStrip(rankIndexFromPoints(profile.points || 0));
    }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
