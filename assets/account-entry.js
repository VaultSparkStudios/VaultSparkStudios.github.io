/* Account entrance and member handoff context; no credentials or private data. */
(function () {
  'use strict';
  function safeMemberReturn(raw) {
    if (typeof raw !== 'string' || raw.length > 1024 || !raw.startsWith('/') || raw.startsWith('//') || /[\r\n\\]/.test(raw)) return '/vault-member/';
    try {
      var target = new URL(raw, window.location.origin);
      if (target.origin !== window.location.origin || !/^\/vault-member(?:\/|$)/.test(target.pathname)) return '/vault-member/';
      // A handoff resumes a member surface, never another handoff or auth tab.
      if (target.pathname === '/vault-member' || target.pathname === '/vault-member/' ||
          target.searchParams.has('return') || target.searchParams.has('next')) return '/vault-member/';
      return target.pathname + target.search + target.hash;
    } catch (_) { return '/vault-member/'; }
  }
  // Call only after the data plane confirms this identity has a member profile.
  // Keeping the destination in the query also works when sessionStorage is denied.
  window.VSMemberEntry = {
    resumeAfterProfile: function () {
      var params = new URLSearchParams(window.location.search);
      var next = safeMemberReturn(params.get('return') || params.get('next'));
      if (next === '/vault-member/') return false;
      var target = new URL(next, window.location.origin);
      var ref = params.get('ref');
      if (ref && /^[a-zA-Z0-9_]{1,32}$/.test(ref)) target.searchParams.set('ref', ref);
      window.location.replace(target.pathname + target.search + target.hash);
      return true;
    }
  };
  function init() {
    var theme = document.getElementById('account-theme');
    if (theme && window.VSTheme) {
      theme.value = window.VSTheme.get();
      theme.addEventListener('change', function () { window.VSTheme.set(theme.value); });
    }
    var params = new URLSearchParams(window.location.search);
    var returnTo = safeMemberReturn(params.get('return') || params.get('next'));
    var ref = params.get('ref');
    if (ref && !/^[a-zA-Z0-9_]{1,32}$/.test(ref)) ref = '';
    function memberEntry(mode) {
      var u = new URL('/vault-member/', window.location.origin);
      if (returnTo !== '/vault-member/') u.searchParams.set('return', returnTo);
      if (ref) u.searchParams.set('ref', ref);
      u.hash = mode === 'signup' ? 'register' : 'login';
      return u.pathname + u.search + u.hash;
    }
    document.querySelectorAll('[data-member-signin]').forEach(function (a) { a.href = memberEntry('signin'); });
    document.querySelectorAll('[data-member-create]').forEach(function (a) { a.href = memberEntry('signup'); });
    var errors = { state_invalid: 'That sign-in response could not be verified. Choose your workspace to start a fresh, secure sign-in.', flow_expired: 'Your sign-in request expired. Choose your workspace to try again.' };
    var notice = document.getElementById('account-recovery-notice');
    if (notice && errors[params.get('auth_error')]) { notice.textContent = errors[params.get('auth_error')]; notice.hidden = false; }
    [['obelisk-sign-in','signin'],['obelisk-create-account','signup']].forEach(function (entry) {
      var link = document.getElementById(entry[0]); if (!link) return;
      var target = new URL('/vault-member/', window.location.origin);
      if (returnTo !== '/vault-member/') target.searchParams.set('return', returnTo);
      if (ref) target.searchParams.set('ref', ref);
      target.hash = entry[1] === 'signup' ? 'register' : 'login';
      // The edge bounds the whole callback return to 1024 characters, including
      // query escaping. Oversized handoffs safely finish at the member root.
      if ((target.pathname + target.search + target.hash).length > 1024) target.searchParams.delete('return');
      var login = new URL('/login', window.location.origin);
      login.searchParams.set('intent', entry[1]);login.searchParams.set('return', target.pathname + target.search + target.hash);
      link.href = login.pathname + login.search;
      var panel = link.closest('.auth-panel');
      var seal = panel && panel.querySelector('[data-obelisk-seal]');if (seal) seal.setAttribute('data-login-url', link.getAttribute('href'));
      link.addEventListener('click', function () { try { sessionStorage.setItem('vs_member_auth_intent', entry[1]); } catch (_) {} });
    });
    // Complete keyboard tab semantics without replacing the portal's panel logic.
    var tabs = Array.from(document.querySelectorAll('#auth-view [role="tab"]'));
    function syncTabs() { tabs.forEach(function (tab) { tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1; }); }
    tabs.forEach(function (tab, index) {
      tab.addEventListener('keydown', function (event) {
        var next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
        if (next < 0) return;event.preventDefault();tabs[next].click();tabs[next].focus();syncTabs();
      });
      new MutationObserver(syncTabs).observe(tab, {attributes:true,attributeFilter:['aria-selected']});
    });
    syncTabs();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);else init();
})();
