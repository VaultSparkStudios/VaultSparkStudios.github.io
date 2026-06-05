/* rank-orb.js — Ambient member-rank-progress orb in the site header.
 *
 * 24×24 conic-gradient orb in `.nav-right` showing fill = (xp / xp_to_next_rank).
 * Anon users see a hollow ring with "Join the Vault" tooltip linking to /membership/.
 * Authed members see a filled orb that links to /vault-member/.
 *
 * Composes with: page-sigil (top-right of page) + vault-atlas (in Resources dropdown).
 * Cost: ~1.5 KB; idle-mounted; one Supabase select on member load (cached on window.VaultMember).
 *
 * Data contract (when authed via VSSupabase):
 *   vault_members row → { rank_name, points, season_xp, username }
 * Rank number is parsed from rank_name (e.g. "Sparked III" → 3, "Vaulted I" → 1).
 * Progress arc is points / next-rank-threshold via simple ladder. Falls back to a
 * solid filled orb if the schema is unavailable.
 */
(function () {
  'use strict';

  var STYLE_ID = 'vs-rank-orb-styles';
  var CSS = [
    '.vs-rank-orb{position:relative;display:inline-flex;align-items:center;justify-content:center;',
    'width:26px;height:26px;border-radius:50%;margin:0 0.45rem 0 0.25rem;',
    'background:conic-gradient(#FFC400 calc(var(--p,0) * 1%), rgba(255,255,255,0.08) 0);',
    'cursor:pointer;text-decoration:none;color:inherit;',
    'transition:transform 160ms ease, box-shadow 160ms ease;}',
    '.vs-rank-orb::after{content:"";position:absolute;inset:3px;border-radius:50%;',
    'background:var(--bg, #0b0f1a);}',
    '.vs-rank-orb-num{position:relative;z-index:1;font-size:0.66rem;font-weight:800;',
    'color:var(--text, #fff);letter-spacing:0.02em;font-variant-numeric:tabular-nums;}',
    '.vs-rank-orb:hover{transform:scale(1.08);box-shadow:0 0 0 2px rgba(255,196,0,0.18);}',
    '.vs-rank-orb-anon{background:none;border:1.5px dashed rgba(255,255,255,0.22);}',
    '.vs-rank-orb-anon::after{background:transparent;}',
    '.vs-rank-orb-anon .vs-rank-orb-num{color:rgba(255,255,255,0.45);font-size:0.7rem;}',
    '.vs-rank-orb:hover .vs-rank-orb-tip{opacity:1;transform:translate(-50%,2px);}',
    '.vs-rank-orb-tip{position:absolute;top:100%;left:50%;transform:translate(-50%,-4px);',
    'background:rgba(10,12,20,0.96);border:1px solid rgba(255,255,255,0.1);',
    'border-radius:8px;padding:0.35rem 0.6rem;font-size:0.74rem;font-weight:600;',
    'color:var(--text,#fff);white-space:nowrap;pointer-events:none;opacity:0;',
    'transition:opacity 140ms ease,transform 140ms ease;z-index:50;margin-top:6px;}',
    '@media (max-width: 640px){.vs-rank-orb{width:22px;height:22px;margin:0 0.3rem;}}',
    '@media (prefers-reduced-motion: reduce){.vs-rank-orb{transition:none;}}',
  ].join('');

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function mountPoint() {
    var nr = document.querySelector('.nav-right');
    if (!nr) return null;
    // Insert before the first <a class="nav-icon-link"> if present, else prepend.
    return nr;
  }

  function renderAnon(host) {
    if (document.body && document.body.getAttribute('data-vs-signed-in') === 'true') return;
    var a = document.createElement('a');
    a.className = 'vs-rank-orb vs-rank-orb-anon';
    a.href = '/membership/';
    a.setAttribute('aria-label', 'Join the Vault to start earning rank');
    a.innerHTML = '<span class="vs-rank-orb-num">+</span>' +
      '<span class="vs-rank-orb-tip">Join the Vault</span>';
    host.insertBefore(a, host.firstChild);
  }

  // Rough 9-tier ladder used to compute progress when only `points` is available.
  // Thresholds match the long-standing public rank ladder; not load-bearing — only
  // drives the arc fill on the ambient orb. Membership truth lives in /vault-member/.
  var THRESHOLDS = [0, 50, 150, 350, 700, 1200, 2000, 3500, 6000, 10000];
  function rankFromName(name) {
    if (!name) return 0;
    var m = String(name).match(/\b(I{1,3}|IV|V|VI{0,3}|IX|X)\b/);
    var romans = { I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10 };
    if (m && romans[m[1]]) return romans[m[1]];
    var n = String(name).match(/\d+/);
    return n ? parseInt(n[0], 10) : 0;
  }

  function renderMember(host, data) {
    var rank = rankFromName(data.rank_name);
    var points = Number(data.points || 0);
    var floor = THRESHOLDS[Math.max(0, Math.min(rank, THRESHOLDS.length - 1))] || 0;
    var ceiling = THRESHOLDS[Math.min(rank + 1, THRESHOLDS.length - 1)] || (floor + 100);
    var span = Math.max(1, ceiling - floor);
    var pct = Math.max(0, Math.min(100, Math.round(((points - floor) / span) * 100)));

    var a = document.createElement('a');
    a.className = 'vs-rank-orb';
    a.href = '/vault-member/';
    a.style.setProperty('--p', pct);
    a.setAttribute('aria-label', 'Rank ' + rank + ' · ' + pct + '% to next tier');
    a.innerHTML = '<span class="vs-rank-orb-num">' + (rank || '·') + '</span>' +
      '<span class="vs-rank-orb-tip">Rank ' + rank + ' · ' + pct + '% to next</span>';
    host.insertBefore(a, host.firstChild);
  }

  function getMemberData() {
    if (window.VSSignedInState && window.VSSignedInState.getSession && window.VSSignedInState.getSession()) {
      var session = window.VSSignedInState.getSession();
      return Promise.resolve({ rank_name: 'Member', points: 0, username: session.displayName || session.email || 'Member' });
    }
    // Fast path: window.VaultMember already populated (account-chip warms it).
    if (window.VaultMember && typeof window.VaultMember === 'object') {
      return Promise.resolve(window.VaultMember);
    }
    if (!window.VSSupabase || !window.VSSupabase.then) {
      // Lightweight client without member schema — return null and let anon render.
      return Promise.resolve(null);
    }
    return window.VSSupabase.then(function (sb) {
      if (!sb || !sb.auth) return null;
      return sb.auth.getUser().then(function (res) {
        var user = res && res.data && res.data.user;
        if (!user) return null;
        return sb.from('vault_members')
          .select('rank_name,points,season_xp,username')
          .eq('id', user.id).maybeSingle()
          .then(function (r) { return r && r.data; })
          .catch(function () { return null; });
      }).catch(function () { return null; });
    }).catch(function () { return null; });
  }

  function init() {
    var host = mountPoint();
    if (!host) return;
    // Don't double-mount (in case of partial nav re-renders).
    if (host.querySelector('.vs-rank-orb')) return;
    injectStyles();

    getMemberData().then(function (data) {
      if (data && (data.rank_name != null || data.points != null)) {
        renderMember(host, data);
      } else {
        renderAnon(host);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if ('requestIdleCallback' in window) requestIdleCallback(init, { timeout: 1500 });
      else setTimeout(init, 300);
    });
  } else if ('requestIdleCallback' in window) {
    requestIdleCallback(init, { timeout: 1500 });
  } else {
    setTimeout(init, 300);
  }
})();
