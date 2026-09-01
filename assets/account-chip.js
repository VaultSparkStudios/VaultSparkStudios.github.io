/**
 * account-chip — signed-in nav-right account button + dropdown menu.
 *
 * When a Supabase session is active, renders an avatar pill (initials +
 * tier badge) into `.nav-right` AND hides the anonymous "Sign In" /
 * "Join The Vault" CTAs. Clicking the pill opens a dropdown with the
 * member-area links (portal, settings, leaderboards, sign out).
 *
 * When no session: the script exits silently — the existing CTAs stay.
 *
 * Tier source: `vault_members.is_sparked` + `subscriptions.plan`. Free
 * members get a generic "MEMBER" badge so signed-in always renders SOMETHING
 * (S160 F17 — the "still showing Create account / Join the Vault while
 * signed in" bug was the chip-only-for-paid-tier filter that S113 shipped).
 *
 * Requires: VSSupabase (loaded by supabase-client.js or supplied via
 * VSIdentity wrapper). Exits silently if absent.
 */
(function () {
  'use strict';

  function tierLabel(member, subscription) {
    var plan = (subscription && subscription.plan) || (member && member.plan_key) || null;
    if (plan) {
      var p = String(plan).toLowerCase();
      if (p.indexOf('pro') !== -1 || p.indexOf('eternal') !== -1) return 'ETERNAL';
      if (p.indexOf('sparked') !== -1) return 'SPARKED';
    }
    if (member && member.is_sparked) return 'SPARKED';
    // Signed-in but no paid tier → still surface presence. Founder S160 ask:
    // the chip must show whenever a session exists, not only for paid users.
    return 'MEMBER';
  }

  function findMountPoint() {
    return document.querySelector('.nav-right') || document.querySelector('.site-header .nav-end') || null;
  }

  function escape(text) {
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function ensureStyles() {
    if (document.getElementById('vs-account-chip-styles')) return;
    var st = document.createElement('style');
    st.id = 'vs-account-chip-styles';
    st.textContent =
      '.vs-account-chip{position:relative;display:inline-flex;align-items:center;gap:.5rem;padding:.32rem .68rem .32rem .38rem;border-radius:999px;border:1px solid var(--header-border,rgba(255,255,255,0.07));background:rgba(255,255,255,0.03);color:var(--text);font:600 .82rem/1 Inter,system-ui,sans-serif;min-height:36px;cursor:pointer}' +
      '.vs-account-chip:hover{border-color:rgba(255,196,0,0.35);background:rgba(255,196,0,0.05)}' +
      '.vs-account-chip__avatar{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#1FA2FF 0%,#FFC400 100%);color:#07080f;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:.78rem}' +
      '.vs-account-chip__tier{font-size:.66rem;letter-spacing:.08em;padding:.15rem .42rem;border-radius:999px;background:rgba(255,196,0,0.12);color:#FFC400;border:1px solid rgba(255,196,0,0.25)}' +
      '.vs-account-chip__tier.tier-ETERNAL{background:rgba(139,92,246,0.12);color:#8B5CF6;border-color:rgba(139,92,246,0.3)}' +
      '.vs-account-chip__tier.tier-MEMBER{background:rgba(168,180,208,0.1);color:var(--muted);border-color:rgba(168,180,208,0.2)}' +
      '.vs-account-chip__caret{font-size:.55rem;opacity:.65;margin-left:.1rem}' +
      '.vs-account-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:220px;background:var(--nav-dropdown-bg,rgba(8,9,19,0.99));border:1px solid var(--nav-dropdown-border,rgba(255,255,255,0.07));border-radius:12px;padding:.5rem;box-shadow:0 18px 60px rgba(0,0,0,0.55);opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-4px);transition:opacity 160ms ease,transform 160ms ease;z-index:2147483640}' +
      '.vs-account-chip[aria-expanded="true"] .vs-account-menu{opacity:1;visibility:visible;pointer-events:auto;transform:translateY(0)}' +
      '.vs-account-menu__head{padding:.55rem .7rem .6rem;border-bottom:1px solid var(--nav-divider,rgba(255,255,255,0.06));margin-bottom:.4rem}' +
      '.vs-account-menu__name{font-weight:700;font-size:.9rem;color:var(--text)}' +
      '.vs-account-menu__email{font-size:.74rem;color:var(--muted);margin-top:.15rem;word-break:break-all}' +
      '.vs-account-menu a,.vs-account-menu button{display:flex;align-items:center;gap:.55rem;padding:.55rem .7rem;border-radius:8px;color:var(--text);font-size:.86rem;font-weight:500;text-decoration:none;background:transparent;border:0;width:100%;text-align:left;cursor:pointer;font-family:inherit}' +
      '.vs-account-menu a:hover,.vs-account-menu button:hover{background:var(--nav-hover-bg,rgba(124,92,252,0.08))}' +
      '.vs-account-menu__sep{height:1px;background:var(--nav-divider,rgba(255,255,255,0.05));margin:.35rem 0}' +
      '.vs-account-menu__danger{color:#fca5a5}' +
      '/* hide anonymous CTAs when chip is mounted */' +
      '.nav-right:has(.vs-account-chip) .nav-signin,' +
      '.nav-right:has(.vs-account-chip) .button.button-sm[href*="register"]{display:none !important}' +
      // Older browsers without :has() fall back to a body data-attr the script sets.
      'body[data-vs-signed-in="true"] .nav-right .nav-signin,' +
      'body[data-vs-signed-in="true"] .nav-right .button.button-sm[href*="register"],' +
      'body[data-vs-signed-in="true"] .mobile-nav-footer .mobile-nav-signin,' +
      'body[data-vs-signed-in="true"] .mobile-nav-footer .mobile-nav-join[href*="register"]{display:none !important}' +
      '';
    document.head.appendChild(st);
  }

  function render(profile) {
    var host = findMountPoint();
    if (!host || host.querySelector('.vs-account-chip')) return;

    var name = profile.name || (profile.email ? profile.email.split('@')[0] : 'Member');
    var initials = (name.trim().charAt(0) || 'V').toUpperCase();
    var tier = profile.tier || 'MEMBER';
    var email = profile.email || '';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vs-account-chip';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Account menu — signed in as ' + name);
    btn.innerHTML =
      '<span class="vs-account-chip__avatar" aria-hidden="true">' + escape(initials) + '</span>' +
      '<span class="vs-account-chip__tier tier-' + escape(tier) + '">' + escape(tier) + '</span>' +
      '<span class="vs-account-chip__caret" aria-hidden="true">▾</span>' +
      '<div class="vs-account-menu" role="menu">' +
        '<div class="vs-account-menu__head">' +
          '<div class="vs-account-menu__name">' + escape(name) + '</div>' +
          (email ? '<div class="vs-account-menu__email">' + escape(email) + '</div>' : '') +
        '</div>' +
        '<a role="menuitem" href="/vault-member/">Vault Member portal</a>' +
        '<a role="menuitem" href="/community/#wall">Vault Wall</a>' +
        '<a role="menuitem" href="/ranks/">Ranks &amp; points</a>' +
        '<a role="menuitem" href="/leaderboards/">Leaderboards</a>' +
        '<a role="menuitem" href="/vault-member/settings/">Settings</a>' +
        '<div class="vs-account-menu__sep" role="separator" aria-hidden="true"></div>' +
        '<a role="menuitem" href="/membership/">Upgrade membership</a>' +
        '<a role="menuitem" href="/changelog/#requests">Feedback loop</a>' +
        '<div class="vs-account-menu__sep" role="separator" aria-hidden="true"></div>' +
        '<button type="button" role="menuitem" class="vs-account-menu__danger" data-vs-signout>Sign out</button>' +
      '</div>';

    // Insert before the hamburger so it sits in the natural CTA slot.
    var hamburger = host.querySelector('.hamburger');
    if (hamburger) host.insertBefore(btn, hamburger);
    else host.appendChild(btn);

    // body[data-vs-signed-in] is now owned by signed-in-state.js (set earlier,
    // before member queries complete). Only set here as a safety fallback.
    if (!document.body.hasAttribute('data-vs-signed-in')) {
      document.body.setAttribute('data-vs-signed-in', 'true');
    }
    document.documentElement.setAttribute('data-vs-signed-in', 'true');

    btn.addEventListener('click', function (e) {
      // Allow link clicks inside the menu to pass through.
      if (e.target.tagName === 'A') return;
      e.preventDefault();
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    });

    document.addEventListener('click', function (e) {
      if (!btn.contains(e.target)) btn.setAttribute('aria-expanded', 'false');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') btn.setAttribute('aria-expanded', 'false');
    });

    var signoutBtn = btn.querySelector('[data-vs-signout]');
    if (signoutBtn) signoutBtn.addEventListener('click', async function () {
      try {
        if (window.VSIdentity && window.VSIdentity.signOut) await window.VSIdentity.signOut();
        else if (window.VSSupabase && window.VSSupabase.auth) await window.VSSupabase.auth.signOut();
        else await window.fetch('/api/auth/logout', {
          method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' }
        });
      } catch (_) {}
      try {
        Object.keys(localStorage).forEach(function (key) {
          if (/^sb-.*-auth-token$/.test(key) || key === 'supabase.auth.token') localStorage.removeItem(key);
        });
      } catch (_) {}
      window.location.href = '/';
    });
  }

  async function load(rawSession) {
    var sb = window.VSSupabase;
    try {
      // Prefer session from vs:session-ready event; fall back to direct query.
      var session = rawSession || null;
      if (!session && sb) {
        var auth = await sb.auth.getSession();
        session = auth && auth.data && auth.data.session;
      }
      if (!session && window.VSSignedInState) session = window.VSSignedInState.getSession();
      if (!session) return;
      var user = session.user || {};
      var userId = user.id || session.userId;
      if (!userId) return;
      var email = user.email || session.email || '';
      var meta = user.user_metadata || {};

      ensureStyles();

      // The edge /me projection is enough to render an honest member chip on
      // every public page; portal pages with the in-memory compatibility client
      // can enrich it with username and tier data below.
      if (!sb) {
        return render({ email: email, name: session.displayName || email.split('@')[0] || 'Member', tier: session.tier || 'MEMBER' });
      }

      // Best-effort tier lookup. Free members still get rendered — see tierLabel.
      var member = null, subscription = null;
      try {
        var memberRes = await sb.from('vault_members').select('plan_key, is_sparked, username').eq('id', userId).maybeSingle();
        member = memberRes && memberRes.data;
      } catch (_) {}
      try {
        var subRes = await sb.from('subscriptions').select('plan, status').eq('user_id', userId).maybeSingle();
        subscription = subRes && subRes.data;
      } catch (_) {}

      var tier = tierLabel(member, subscription);
      var name = (member && member.username) || meta.display_name || meta.username || (email.split('@')[0]) || 'Member';

      render({ email: email, name: name, tier: tier });
    } catch (err) {
      // Silent — nav stays anonymous.
      console.debug('[account-chip] no session', err && err.message);
    }
  }

  // Listen for centralized session event from signed-in-state.js.
  // Falls back to DOMContentLoaded + direct query if event fires before listener attaches.
  var sessionEventFired = false;
  document.addEventListener('vs:session-ready', function (e) {
    sessionEventFired = true;
    var detail = (e && e.detail) || {};
    if (detail.signedIn && detail.session && (detail.session.raw || detail.session._raw)) {
      load(detail.session.raw || detail.session._raw);
    } else if (detail.signedIn) {
      load(null);
    }
  });
  // Fallback: if vs:session-ready already fired or signed-in-state.js not present.
  if (document.readyState !== 'loading') {
    setTimeout(function () { if (!sessionEventFired) load(null); }, 50);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () { if (!sessionEventFired) load(null); }, 50);
    });
  }
})();
