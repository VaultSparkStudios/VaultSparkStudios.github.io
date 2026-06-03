/**
 * Opt-in push prompt. Renders a subtle banner on content pages when the visitor
 * is eligible: signed in, push supported, not already subscribed, hasn't dismissed.
 * Links to the canonical toggle on /vault-member/#push so the portal remains
 * the single source of truth for the subscription state.
 */
(function () {
  'use strict';

  var DISMISS_KEY = 'vs_push_prompt_dismissed';

  function hasDismissed() {
    try { return window.localStorage.getItem(DISMISS_KEY) === '1'; } catch (_) { return false; }
  }
  function dismiss() {
    try { window.localStorage.setItem(DISMISS_KEY, '1'); } catch (_) {}
  }

  var SESSION_KEYS = ['sb-fjnpzjjyhnpmunfoycrp-auth-token', 'supabase.auth.token'];
  function loggedIn() {
    if (window.VSIntentState && typeof window.VSIntentState.getState === 'function') {
      try { if (window.VSIntentState.getState().logged_in) return true; } catch (_) {}
    }
    for (var i = 0; i < SESSION_KEYS.length; i += 1) {
      try {
        var raw = window.localStorage.getItem(SESSION_KEYS[i]);
        if (!raw) continue;
        var parsed = JSON.parse(raw);
        var session = parsed.currentSession || parsed.session || parsed;
        if (session && session.access_token && session.user && session.user.id) return true;
      } catch (_) {}
    }
    return false;
  }

  function pushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  function alreadySubscribed() {
    if (!pushSupported()) return Promise.resolve(true);
    if (Notification.permission === 'denied') return Promise.resolve(true); // treat denied as "stop asking"
    return navigator.serviceWorker.getRegistration('/sw.js').then(function (reg) {
      if (!reg) return false;
      return reg.pushManager.getSubscription().then(function (sub) { return !!sub; });
    }).catch(function () { return true; });
  }

  var STYLES_INJECTED = false;
  function injectStyles() {
    if (STYLES_INJECTED) return;
    STYLES_INJECTED = true;
    var css =
      '.vs-push-prompt{display:flex;align-items:center;gap:0.9rem;flex-wrap:wrap;' +
      'padding:0.85rem 1.1rem;margin:1.2rem auto;max-width:960px;' +
      'border-radius:14px;background:rgba(31,162,255,0.05);' +
      'border:1px solid rgba(31,162,255,0.22);color:var(--text);font-size:0.88rem;line-height:1.55;}' +
      '.vs-push-prompt-eyebrow{font-size:0.72rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#7fc3ff;white-space:nowrap;}' +
      '.vs-push-prompt-body{flex:1;min-width:220px;color:var(--muted);}' +
      '.vs-push-prompt-actions{display:flex;gap:0.5rem;align-items:center;}' +
      '.vs-push-prompt-cta{padding:0.5rem 1rem;border-radius:999px;background:linear-gradient(135deg,#1FA2FF,#3b82f6);color:#fff;font-weight:800;font-size:0.82rem;text-decoration:none;transition:transform 0.18s,box-shadow 0.18s;box-shadow:0 4px 14px rgba(31,162,255,0.25);}' +
      '.vs-push-prompt-cta:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(31,162,255,0.35);}' +
      '.vs-push-prompt-dismiss{background:transparent;border:1px solid rgba(255,255,255,0.14);color:var(--muted);font-size:0.78rem;font-weight:600;padding:0.42rem 0.9rem;border-radius:999px;cursor:pointer;font-family:inherit;}' +
      '.vs-push-prompt-dismiss:hover{color:var(--text);border-color:rgba(255,255,255,0.28);}' +
      'body.light-mode .vs-push-prompt-dismiss{border-color:rgba(10,13,22,0.16);color:rgba(10,13,22,0.7);}' +
      '@media(max-width:620px){.vs-push-prompt{flex-direction:column;align-items:flex-start;}}';
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function render(root) {
    injectStyles();
    var bar = document.createElement('aside');
    bar.className = 'vs-push-prompt';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Push notifications invitation');
    bar.innerHTML =
      '<span class="vs-push-prompt-eyebrow">🔔 Push opt-in</span>' +
      '<span class="vs-push-prompt-body">Want a browser ping when a SPARKED drop lands, or when someone takes your rank? The Vault portal has a one-switch toggle. Vault members only — no marketing.</span>' +
      '<span class="vs-push-prompt-actions">' +
        '<a class="vs-push-prompt-cta" href="/vault-member/#push" data-track-event="push_prompt_open">Open toggle →</a>' +
        '<button type="button" class="vs-push-prompt-dismiss" aria-label="Dismiss push prompt">Dismiss</button>' +
      '</span>';
    bar.querySelector('.vs-push-prompt-dismiss').addEventListener('click', function () {
      dismiss();
      bar.remove();
    });
    root.appendChild(bar);

    try {
      if (window.gtag) window.gtag('event', 'push_prompt_shown', { path: window.location.pathname });
    } catch (_) {}
  }

  function boot() {
    var root = document.getElementById('vs-push-prompt-root');
    if (!root) return;
    if (hasDismissed()) return;
    if (!pushSupported()) return;
    if (!loggedIn()) return;

    alreadySubscribed().then(function (subbed) {
      if (subbed) return;
      render(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
