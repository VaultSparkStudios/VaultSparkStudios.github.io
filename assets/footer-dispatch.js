/* footer-dispatch.js — S187 sitewide footer email capture.
   The #1 competitive gap was framed as "no studio-wide email list", but the
   studio already runs a live ConvertKit/Kit integration (assets/kit.js) wired
   to the journal dispatch form. The real hole: home-intelligence.js calls
   VaultKit.wireForm('footer-email-form', …) but that form existed on NO page —
   dead wiring. This activates it through the EXISTING ESP (no new vendor, no
   capture fragmentation), independent of home-intelligence's load order.

   Honest-dark: if the form isn't present, does nothing. CSP-safe (external,
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

  function wire(form) {
    var success = document.getElementById('footer-success');
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

      // Prefer the live Kit integration; kit-fallback returns {ok:false} when
      // VaultKit is unavailable so we degrade honestly instead of faking success.
      var p = (window.VaultKit && window.VaultKit.subscribe)
        ? window.VaultKit.subscribe(email)
        : Promise.resolve({ ok: false, error: 'kit_unavailable' });

      p.then(function (res) {
        if (res && res.ok) {
          form.hidden = true;
          if (success) success.hidden = false;
          emitUx('studio-dispatch:subscribe');
        } else {
          if (btn) { btn.disabled = false; btn.textContent = orig; }
          if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
        }
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = orig; }
      });
    });
  }

  function styles() {
    if (document.getElementById('vs-footer-dispatch-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-footer-dispatch-style';
    s.textContent = '.vs-visually-hidden{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.footer-col--dispatch{max-width:280px}.footer-dispatch-sub{font-size:.8rem;color:var(--muted,#9aa3b2);line-height:1.5;margin:.2rem 0 .8rem}.footer-dispatch-form{display:flex;gap:.4rem;flex-wrap:wrap}.footer-dispatch-form input[type=email]{flex:1 1 150px;min-width:0;font-size:16px;padding:.55rem .7rem;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(13,17,28,.6);color:var(--text,#f4f6fb)}.footer-dispatch-form button{flex:0 0 auto}.footer-dispatch-bot{position:absolute;left:-9999px;opacity:0;height:0;width:0}.footer-dispatch-success{font-size:.82rem;color:#6ee7a0;margin-top:.6rem}';
    document.head.appendChild(s);
  }

  function boot() {
    var form = document.getElementById('footer-email-form');
    if (form) { styles(); wire(form); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else { boot(); }
})();
