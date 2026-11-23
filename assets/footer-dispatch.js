/* footer-dispatch.js — S187 sitewide footer email capture · S305 hero forms + self-sufficient Kit.
   The #1 competitive gap was framed as "no studio-wide email list", but the
   studio already runs a live ConvertKit/Kit integration (assets/kit.js) wired
   to the journal dispatch form. The real hole: home-intelligence.js calls
   VaultKit.wireForm('footer-email-form', …) but that form existed on NO page —
   dead wiring. This activates it through the EXISTING ESP (no new vendor, no
   capture fragmentation), independent of home-intelligence's load order.

   S305: two more dead paths closed at the same owner.
   (1) kit.js was only loaded by the homepage, so every OTHER page's footer form
       degraded to {ok:false,kit_unavailable} on submit — a silent sitewide
       capture outage. The ESP client now lazy-loads on first submit (CSP is
       nonce + strict-dynamic, so a same-origin inject from this nonced script
       is allowed) and the honest-fail path remains for a failed load.
   (2) The journal hero dispatch form (#dispatch-form) had NO handler off-home.
       Both hero + footer forms now wire through one generalized path, with a
       data-vs-wired marker so home-intelligence's VaultKit.wireForm and this
       script can never double-subscribe the same form.

   Honest-dark: if a form isn't present, does nothing. CSP-safe (external,
   no inline). Loaded by the ambient loader on the form's hook. */
(function () {
  'use strict';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function emitUx(event) {
    try {
      var body = JSON.stringify({ route: location.pathname || '/', ux: event });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_e) {}
  }

  // The real client exports TAG_IDS; kit-fallback.js does not. Only the real
  // client is worth waiting for — the fallback exists to fail honestly.
  function kitReady() {
    return !!(window.VaultKit && window.VaultKit.subscribe && window.VaultKit.TAG_IDS);
  }

  var kitLoad = null;
  function ensureKit() {
    if (kitReady()) return Promise.resolve(true);
    if (!kitLoad) {
      kitLoad = new Promise(function (resolve) {
        var s = document.createElement('script');
        s.src = '/assets/kit.js';
        s.async = true;
        s.onload = function () { resolve(kitReady()); };
        s.onerror = function () { resolve(false); };
        document.head.appendChild(s);
      });
    }
    return kitLoad;
  }

  function wire(form, success, uxEvent) {
    if (!form || form.dataset.vsWired) return;
    form.dataset.vsWired = '1';
    var input = form.querySelector('input[type="email"]');
    var btn = form.querySelector('button[type="submit"]');
    var bot = form.querySelector('.footer-dispatch-bot');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (bot && bot.checked) return;                       // honeypot
      var email = input ? (input.value || '').trim() : '';
      if (!EMAIL_RE.test(email)) { input && input.focus(); return; }
      var orig = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Joining…'; }

      // Load the live Kit integration on demand; a failed load degrades
      // honestly instead of faking success.
      ensureKit().then(function (ready) {
        return ready
          ? window.VaultKit.subscribe(email)
          : { ok: false, error: 'kit_unavailable' };
      }).then(function (res) {
        if (res && res.ok) {
          form.hidden = true;
          if (success) { success.hidden = false; success.style.display = 'flex'; }
          emitUx(uxEvent);
          try { window.localStorage.setItem('vs_dispatch_sub', '1'); } catch (_) {}
        } else {
          if (btn) { btn.disabled = false; btn.textContent = orig; }
          if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
        }
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = orig; }
      });
    });
  }

  // Essential presentation lives in the shared stylesheet before enhancement.
  function boot() {
    var footer = document.getElementById('footer-email-form');
    if (footer) { wire(footer, document.getElementById('footer-success'), 'studio-dispatch:subscribe'); }
    var hero = document.getElementById('dispatch-form');
    if (hero) { wire(hero, document.getElementById('dispatch-success'), 'journal-dispatch:subscribe'); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else { boot(); }
})();
