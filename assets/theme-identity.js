/* theme-identity.js — make the chosen theme feel earned (S195 item 7, safe slice).
 *
 * The ambient theme engine already persists choice (theme-toggle.js → vs_theme).
 * This adds the *identity* layer the audit asked for WITHOUT gating access:
 *   - a one-time, gentle confirmation that your look is remembered;
 *   - an "✦ earned" sigil on the picker once a visitor is engaged (signed-in or
 *     returning), so the look reads as a small badge of belonging.
 *
 * Deliberately NOT implemented here: locking themes behind a paid/rank tier.
 * That changes membership value and is founder-escalation-gated (CLAUDE.md →
 * "Membership tier logic" / public promises). Left as a flagged follow-up.
 *
 * Purely additive + cosmetic. DOM-only, no innerHTML.
 */
(function () {
  'use strict';

  function engaged() {
    try {
      if (document.documentElement.hasAttribute('data-vs-signed-in') ||
          (document.body && document.body.hasAttribute('data-vs-signed-in'))) return true;
      return parseInt(localStorage.getItem('vs_visit_count') || '0', 10) >= 3;
    } catch (_e) { return false; }
  }

  function ensureStyles() {
    if (document.getElementById('vs-theme-identity-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-theme-identity-style';
    s.textContent =
      '.vs-theme-earned{color:var(--gold,#ffc400);font-size:.7rem;margin-left:.3rem;opacity:.85}' +
      '.vs-theme-toast{position:fixed;left:50%;bottom:1.2rem;transform:translateX(-50%) translateY(10px);z-index:9500;' +
      'background:rgba(13,16,28,.96);border:1px solid rgba(255,196,0,.3);border-radius:999px;padding:.5rem 1rem;' +
      'color:var(--text,#eef2ff);font-size:.82rem;opacity:0;transition:opacity .3s ease,transform .3s ease;pointer-events:none}' +
      '.vs-theme-toast[data-show="true"]{opacity:1;transform:translateX(-50%) translateY(0)}' +
      '@media (prefers-reduced-motion: reduce){.vs-theme-toast{transition:opacity .3s ease}}';
    document.head.appendChild(s);
  }

  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'vs-theme-toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.setAttribute('data-show', 'true');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.setAttribute('data-show', 'false'); }, 2200);
  }

  function decoratePicker() {
    if (!engaged()) return;
    var dropdown = document.querySelector('.theme-picker-dropdown');
    if (!dropdown || dropdown.querySelector('.vs-theme-earned')) return;
    // Mark the active option as an earned look — additive label only.
    var active = dropdown.querySelector('[aria-checked="true"], [data-active="true"], .is-active');
    var labelHost = active && (active.querySelector('.theme-option-label') || active);
    if (labelHost && !labelHost.querySelector('.vs-theme-earned')) {
      var sig = document.createElement('span');
      sig.className = 'vs-theme-earned';
      sig.textContent = '✦ earned';
      sig.title = 'Your vault look — kept across visits.';
      labelHost.appendChild(sig);
    }
  }

  function boot() {
    ensureStyles();
    var picker = document.querySelector('.theme-picker');
    if (!picker) return;

    // Confirm the look is remembered the first time a visitor changes it.
    picker.addEventListener('click', function (e) {
      var opt = e.target && e.target.closest ? e.target.closest('[data-theme-value],[role="menuitemradio"],.theme-option') : null;
      if (!opt) return;
      // Defer so theme-toggle applies + repaints the dropdown first.
      setTimeout(function () {
        try {
          if (!localStorage.getItem('vs_theme_identity_seen')) {
            localStorage.setItem('vs_theme_identity_seen', '1');
            toast('✦ Your vault look is saved — it follows you across visits.');
          }
        } catch (_e) {}
        decoratePicker();
      }, 60);
    });

    decoratePicker();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
