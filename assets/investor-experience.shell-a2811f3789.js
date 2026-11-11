/* Investor Relations presentation and entry journeys. Obelisk remains the
 * identity authority; existing RPCs and RLS remain the access authority. */
(function () {
  'use strict';
  var APPLICATION_RECEIPT = 'vs_investor_application_v1';
  var HOME = '/investor-portal/';

  function safeReturn(value) {
    if (typeof value !== 'string' || value.length > 1024 || /[\r\n\\]/.test(value)) return HOME;
    try {
      var target = new URL(value, location.origin);
      if (target.origin !== location.origin || target.username || target.password ||
          !/^\/investor-portal\/(?:updates\/|documents\/|message\/|profile\/|admin\/)?$/.test(target.pathname)) return HOME;
      return target.pathname + target.search + target.hash;
    } catch (_) { return HOME; }
  }
  function gateway(next, extra) {
    var qs = new URLSearchParams({ next: next });
    Object.keys(extra || {}).forEach(function (key) { qs.set(key, extra[key]); });
    return '/investor-portal/login/?' + qs;
  }
  function identityLink(intent, next) { return '/login?intent=' + intent + '&return=' + encodeURIComponent(next); }
  function setLink(id, href) { var link = document.getElementById(id); if (link) link.href = href; }
  function status(message, kind) {
    var target = document.getElementById('investor-entry-status');
    if (!target) return;
    target.hidden = false; target.dataset.state = kind || 'info'; target.textContent = message;
  }
  function submittedHere() {
    try {
      var receipt = JSON.parse(sessionStorage.getItem(APPLICATION_RECEIPT) || 'null');
      var age = Date.now() - Number(receipt && receipt.at);
      return receipt && receipt.kind === 'submitted' && Number.isFinite(age) && age >= 0 && age < 24 * 3600e3;
    } catch (_) { return false; }
  }

  function initGateway() {
    if (!document.getElementById('investorObeliskSignIn')) return;
    var params = new URLSearchParams(location.search);
    var next = safeReturn(params.get('next'));
    var signin = identityLink('signin', next);
    setLink('investorObeliskSignIn', signin);
    setLink('investorCreateIdentity', identityLink('signup', gateway(next, { identity: 'created' })));
    setLink('investorApplyLink', '/investor-portal/apply/?' + new URLSearchParams({ next: next }));
    var seal = document.querySelector('[data-obelisk-seal]');
    if (seal) seal.setAttribute('data-login-url', signin);
    var messages = {
      not_investor: 'Your identity is signed in. Investor access has not been approved for this account. You can request access below.',
      provider_denied: 'Sign-in was cancelled. Your investor access has not changed. You can try again when ready.',
      state_invalid: 'This sign-in request expired or could not be verified. Start a fresh sign-in below.',
      flow_expired: 'This sign-in request expired. Start again below to return to your investor workspace.',
      bridge_failed: 'Identity sign-in completed, but the studio data connection could not be established. Please try again.',
      rpc_error: 'We could not verify investor access. Your studio session has not been ended. Please try again.',
      missing_client: 'The studio connection did not load. Reload this page to try again.',
    };
    var error = params.get('auth_error') || params.get('error');
    if (error) status(messages[error] || 'Sign-in could not be completed. Please start again below.', 'error');
    else if (params.get('application') === 'submitted' && submittedHere()) {
      status('Your application was submitted from this browser. The studio will review it; this is not an approval or a live review-status check.');
    }
    var busy = false;
    async function checkAccess() {
      if (busy) return;
      busy = true;
      var retry = document.getElementById('investorRetryAccess');
      try {
        if (!window.VSIdentity || !window.VSSupabase) throw new Error('client_missing');
        var session = await window.VSIdentity.getSession();
        if (!session) return;
        var response = await window.VSSupabase.rpc('get_my_investor_profile');
        if (response.error || !response.data) throw new Error('profile_unavailable');
        if (!response.data.error) {
          location.replace(next);
          return;
        }
        status('You are signed in to your studio identity. Investor access is not available to this account yet. Request access below, or continue to Vault Membership.');
      } catch (_) {
        status('We could not check investor access right now. Your studio session has not been ended. Retry the check, or start a fresh secure sign-in.', 'error');
        if (retry) retry.hidden = false;
      } finally { busy = false; }
    }
    var retry = document.getElementById('investorRetryAccess');
    if (retry) retry.addEventListener('click', checkAccess);
    checkAccess();
  }

  function initApplication() {
    var form = document.getElementById('applyForm');
    if (!form) return;
    var params = new URLSearchParams(location.search);
    var next = safeReturn(params.get('next'));
    var returnTo = gateway(next, { application: 'submitted' });
    setLink('applicationSigninLink', gateway(next));
    setLink('applicationReturnLink', returnTo);
    setLink('applicationIdentityLink', identityLink('signup', returnTo));
    if (window.VSIdentity) {
      window.VSIdentity.getSession().then(function (session) {
        var email = document.getElementById('applyEmail');
        if (session && session.email && email && !email.value) email.value = session.email;
        if (session) {
          setLink('applicationIdentityLink', returnTo);
          document.getElementById('applicationIdentityLink').textContent = 'Continue with your studio identity →';
        }
      }).catch(function () { /* The public application does not require an identity. */ });
    }
    var sending = false;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (sending || !form.reportValidity()) return;
      var error = document.getElementById('applyError');
      var button = document.getElementById('applyBtn');
      var original = button.textContent;
      var get = function (id) { return document.getElementById(id).value.trim(); };
      if (!get('applyName') || !get('applyWhyApprove') || !get('applyWhyVS')) {
        error.textContent = 'Please complete the required fields with your introduction.';
        error.hidden = false; error.focus(); return;
      }
      sending = true; button.disabled = true; button.textContent = 'Submitting your introduction…'; error.hidden = true;
      try {
        if (!window.VSSupabase) throw new Error('client_missing');
        var result = await window.VSSupabase.from('investor_requests').insert({
          full_name: get('applyName'), email: get('applyEmail').toLowerCase(),
          entity_type: get('applyEntityType'), organization: get('applyOrg') || null,
          investment_range: get('applyRange'), why_approve: get('applyWhyApprove'), why_vaultspark: get('applyWhyVS'),
          investing_history: get('applyHistory') || null, value_beyond_capital: get('applyValue') || null,
          prior_gaming: document.querySelector('input[name="priorGaming"]:checked').value === 'yes',
          how_heard: get('applyHowHeard') || null,
        });
        if (!result || result.error) throw new Error('submission_failed');
        try { sessionStorage.setItem(APPLICATION_RECEIPT, JSON.stringify({ kind: 'submitted', at: Date.now() })); } catch (_) {}
        form.hidden = true;
        document.querySelector('.inv-application-heading').hidden = true;
        document.getElementById('applySuccess').hidden = false;
        document.getElementById('application-success-title').focus();
      } catch (_) {
        error.textContent = 'Your introduction could not be confirmed. Your answers are still here. Please try again or contact the studio.';
        error.hidden = false; error.focus();
      } finally {
        sending = false; button.disabled = false; button.textContent = original;
      }
    });
  }

  function initNavigation() {
    var toggle = document.getElementById('mobileToggle');
    var menu = document.getElementById('mobileMenu');
    var main = document.getElementById('investor-main');
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-controls', 'mobileMenu');
    toggle.setAttribute('aria-expanded', 'false');
    menu.setAttribute('role', 'navigation');
    menu.setAttribute('aria-label', 'Investor workspace');
    menu.setAttribute('aria-hidden', 'true');
    function setOpen(open) {
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close investor navigation' : 'Open investor navigation');
      menu.setAttribute('aria-hidden', String(!open));
      if (main) main.inert = open;
    }
    toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (event) { if (event.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); } });
    var mobile = window.matchMedia('(max-width: 768px)');
    mobile.addEventListener('change', function () { if (!mobile.matches) setOpen(false); });
  }

  function init() {
    var select = document.getElementById('investor-theme');
    if (select && window.VSTheme) {
      select.value = window.VSTheme.get();
      select.addEventListener('change', function () { window.VSTheme.set(select.value); });
    }
    initGateway(); initApplication(); initNavigation();
  }
  // Defer until all page-owned DOMContentLoaded listeners have registered.
  if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.addEventListener('investor:ready', async function () {
    var target = document.getElementById('investor-public-signal');
    if (!target) return;
    try {
      var response = await fetch('/api/changelog-narrative.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('unavailable');
      var feed = await response.json();
      var entries = (Array.isArray(feed.entries) ? feed.entries : []).filter(function (e) {
        return e && e.title && /^\d{4}-\d{2}-\d{2}$/.test(e.date || '');
      }).sort(function (a,b) { return b.date.localeCompare(a.date); });
      var entry = entries[0];
      if (!entry) throw new Error('unpublished');
      target.textContent = entry.title;
      document.getElementById('investor-public-signal-date').textContent = 'Public update · ' + entry.date;
    } catch (_) {
      target.textContent = 'Open the public changelog for the studio record.';
      document.getElementById('investor-public-signal-date').textContent = 'Publication date unavailable';
    }
  });
})();
