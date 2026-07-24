/* account-chip-loader.js — intent/session-paid account dropdown loader.
 *
 * Keeps the signed-in account dropdown available sitewide without forcing the
 * full dropdown renderer into the anonymous ambient path. It uses the
 * lightweight signed-in-state event backed by the Obelisk edge session, then
 * injects account-chip.js exactly once.
 */
(function () {
  'use strict';

  var loaded = false;
  var SRC = '/assets/account-chip.js';

  function hasAuthoritativeSession() {
    return !!(window.VSSignedInState && typeof window.VSSignedInState.getSession === 'function' && window.VSSignedInState.getSession());
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
      if (hasAuthoritativeSession()) loadChip();
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { if (hasAuthoritativeSession()) loadChip(); });
  } else if (hasAuthoritativeSession()) {
    loadChip();
  }
})();
