/* account-chip-loader.js — intent/session-paid account dropdown loader.
 *
 * Keeps the signed-in account dropdown available sitewide without forcing the
 * full dropdown renderer into the anonymous ambient path. It uses the
 * lightweight signed-in-state event, plus Supabase's persisted localStorage
 * session, then injects account-chip.js exactly once.
 */
(function () {
  'use strict';

  var loaded = false;
  var SRC = '/assets/account-chip.js';

  function hasPersistedSession() {
    try {
      if (window.VSSignedInState && typeof window.VSSignedInState.readPersistedSession === 'function') {
        return !!window.VSSignedInState.readPersistedSession();
      }
      return Object.keys(localStorage).some(function (key) {
        if (!/^sb-.*-auth-token$/.test(key) && key !== 'supabase.auth.token') return false;
        var parsed = JSON.parse(localStorage.getItem(key) || '{}');
        var session = parsed.currentSession || parsed.session || parsed;
        return !!(session && session.user && (!session.expires_at || session.expires_at * 1000 > Date.now() - 60000));
      });
    } catch (_) {
      return false;
    }
  }

  function loadChip() {
    if (loaded || document.querySelector('script[data-vs-account-chip]')) return;
    loaded = true;
    var s = document.createElement('script');
    s.src = SRC;
    s.defer = true;
    s.setAttribute('data-vs-account-chip', '1');
    document.head.appendChild(s);
  }

  document.addEventListener('vs:session-ready', function (event) {
    if (event && event.detail && event.detail.signedIn) loadChip();
  });

  document.addEventListener('click', function (event) {
    if (event.target && event.target.closest && event.target.closest('.nav-right,.mobile-nav-footer,[href*="vault-member"]')) {
      if (hasPersistedSession()) loadChip();
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { if (hasPersistedSession()) loadChip(); });
  } else if (hasPersistedSession()) {
    loadChip();
  }
})();
