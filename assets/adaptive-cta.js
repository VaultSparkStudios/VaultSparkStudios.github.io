(function () {
  'use strict';

  var SESSION_KEYS = ['sb-fjnpzjjyhnpmunfoycrp-auth-token', 'supabase.auth.token'];

  function getSession() {
    for (var i = 0; i < SESSION_KEYS.length; i += 1) {
      try {
        var raw = localStorage.getItem(SESSION_KEYS[i]);
        if (!raw) continue;
        var parsed = JSON.parse(raw);
        var session = parsed.currentSession || parsed.session || parsed;
        if (session && session.access_token && session.user && session.user.id) return session;
      } catch (_) {}
    }
    return null;
  }

  function detectState() {
    var session = getSession();
    var pathname = window.location.pathname;
    var referral = new URLSearchParams(window.location.search).get('ref') || sessionStorage.getItem('vs_ref');
    var membershipIntent = pathname.indexOf('/membership') === 0 || pathname.indexOf('/vaultsparked') === 0 || localStorage.getItem('vs_last_membership_intent') === '1';

    return {
      loggedIn: !!session,
      referral: !!referral,
      membershipIntent: membershipIntent,
      session: session
    };
  }

  function applyConfig(element, config) {
    if (!element || !config) return;
    if (config.href) element.setAttribute('href', config.href);
    if (config.label) element.innerHTML = config.label;
    if (config.note && element.dataset.adaptiveNoteTarget) {
      var noteTarget = document.getElementById(element.dataset.adaptiveNoteTarget);
      if (noteTarget) noteTarget.textContent = config.note;
    }
  }

  function rememberIntent() {
    document.addEventListener('click', function (event) {
      var target = event.target.closest('[data-track-plan], [data-membership-intent]');
      if (!target) return;
      try { localStorage.setItem('vs_last_membership_intent', '1'); } catch (_) {}
    });
  }

  function init() {
    var state = detectState();
    rememberIntent();

    document.querySelectorAll('[data-adaptive-cta]').forEach(function (element) {
      var mode = element.dataset.adaptiveCta;

      if (state.loggedIn) {
        if (mode === 'account') {
          applyConfig(element, {
            href: '/vault-member/',
            label: 'Open Your Vault',
            note: 'Your account is already live. Pick up where you left off.'
          });
          return;
        }
        if (mode === 'membership') {
          applyConfig(element, {
            href: '/vault-member/',
            label: 'Open Your Member Portal',
            note: 'You already have a vault identity. Continue inside your portal.'
          });
          return;
        }
      }

      if (state.referral && mode === 'account') {
        applyConfig(element, {
          href: '/vault-member/#register',
          label: 'Claim Your Invited Spot',
          note: 'Your invite is active. Create the free account first, then upgrade later if you want deeper access.'
        });
        return;
      }

      if (state.membershipIntent && mode === 'membership') {
        applyConfig(element, {
          href: '/vaultsparked/#pricing',
          label: 'See Live Pricing',
          note: 'You have already shown membership intent. The fastest next step is comparing the live tiers.'
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
