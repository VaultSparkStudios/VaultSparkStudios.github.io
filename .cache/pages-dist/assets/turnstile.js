/**
 * VaultSpark Studios — Cloudflare Turnstile CAPTCHA helper
 *
 * Lifecycle: lazy first render into the currently-visible slot; reset on
 * each subsequent use within the same tab; teardown + fresh container on
 * error, timeout, or tab-switch.
 *
 * Why we do NOT move the iframe across the DOM (S126 lesson):
 *  - Moving a node that contains an iframe forces the browser to reparent
 *    (and effectively reload) the iframe. That breaks the iframe's
 *    contentWindow / origin link, which manifests as repeated
 *    "Failed to execute 'postMessage' on 'DOMWindow': target origin
 *    https://challenges.cloudflare.com does not match recipient" warnings,
 *    a hung challenge, and a 12s CAPTCHA timeout. Render directly into the
 *    slot from the start so the iframe never moves.
 *
 * Why we do NOT call turnstile.remove() (S122 lesson):
 *  - remove() orphans Turnstile's preloaded challenge resources and triggers
 *    "preloaded resource not used" warnings + NaN console spam. Instead, on
 *    teardown we detach the old container DOM node and create a fresh one
 *    for the next render. Turnstile's internal handle to the old (detached)
 *    container is harmless because it's no longer in the document tree.
 *
 * Usage:
 *   const token = await VSTurnstile.getToken();
 *   supabase.auth.signInWithPassword({ email, password, options: { captchaToken: token } });
 */
(function (window) {
  'use strict';

  var SITE_KEY = '0x4AAAAAACwZy-GkGqvHhc-u';
  var TOKEN_TIMEOUT_MS = 12000;
  var TOKEN_TTL_MS = 4 * 60 * 1000; // tokens are valid ~5 min; cache for 4

  var _widgetId       = null;
  var _container      = null;
  var _ready          = false;
  var _readyCallbacks = [];
  var _cachedToken    = null;
  var _tokenExpiry    = 0;
  var _pendingResolvers = [];
  var _pendingRejecters = [];
  var _pendingTimer     = null;

  var HIDDEN_STYLE  = 'position:absolute;left:-99999px;top:-99999px;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
  var VISIBLE_STYLE = 'display:flex;justify-content:center;margin:0.85rem 0;min-height:65px;';

  // Called by Turnstile API script on load
  window.__vsTurnstileReady = function () {
    _ready = true;
    var cbs = _readyCallbacks.slice();
    _readyCallbacks = [];
    for (var i = 0; i < cbs.length; i++) cbs[i]();
    // Intentionally do NOT eager-render. The slot we want to render into may
    // not be the visible one yet, and pre-rendering into body forces a later
    // reparent (which breaks the iframe — see header). Lazy render on first
    // getToken() places the widget in the right slot from the start.
  };

  function ensureLoaded() {
    return new Promise(function (resolve) {
      if (_ready) return resolve();
      if (!document.getElementById('vs-turnstile-api')) {
        var s = document.createElement('script');
        s.id  = 'vs-turnstile-api';
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__vsTurnstileReady&render=explicit';
        s.async = true;
        document.head.appendChild(s);
      }
      _readyCallbacks.push(resolve);
    });
  }

  function _findVisibleSlot() {
    var slots = document.querySelectorAll('[data-vs-turnstile-slot]');
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].offsetParent !== null) return slots[i];
    }
    return null;
  }

  // Always create a fresh container element. Old containers (post-teardown)
  // are detached but never reused — that's how we avoid calling
  // turnstile.remove() (see header).
  function _placeFreshContainer() {
    _container = document.createElement('div');
    _container.id = 'vs-turnstile';
    _container.setAttribute('data-vs-turnstile-host', '');
    _container.style.cssText = HIDDEN_STYLE;
    var slot = _findVisibleSlot();
    if (slot) {
      slot.appendChild(_container);
    } else {
      // No visible slot yet (Turnstile loaded before the auth form) —
      // fall back to body. getToken() should still work; surface will be
      // a centered fixed overlay via the CSS toggle below.
      document.body.appendChild(_container);
    }
    return _container;
  }

  // Detach the current container without calling turnstile.remove().
  function _teardownWidget() {
    if (_container && _container.parentNode) {
      _container.parentNode.removeChild(_container);
    }
    _container = null;
    _widgetId  = null;
  }

  // Widget is still usable if its container is in the DOM and its parent
  // is currently laid out (i.e., the tab hosting the slot is active).
  function _containerStillUsable() {
    if (_widgetId === null || !_container || !_container.isConnected) return false;
    var p = _container.parentNode;
    if (!p) return false;
    if (p === document.body) return true;
    return p.offsetParent !== null;
  }

  // Pure style toggle — never move the DOM node.
  function _surfaceWidget() {
    if (_container) _container.style.cssText = VISIBLE_STYLE;
  }

  function _hideWidget() {
    if (_container) _container.style.cssText = HIDDEN_STYLE;
  }

  function _clearTimer() {
    if (_pendingTimer) {
      clearTimeout(_pendingTimer);
      _pendingTimer = null;
    }
  }

  function _onToken(token) {
    _clearTimer();
    _cachedToken = token;
    _tokenExpiry = Date.now() + TOKEN_TTL_MS;
    var resolvers = _pendingResolvers.slice();
    _pendingResolvers = [];
    _pendingRejecters = [];
    for (var i = 0; i < resolvers.length; i++) resolvers[i](token);
    _hideWidget();
  }

  function _onError() {
    _clearTimer();
    _cachedToken = null;
    _tokenExpiry = 0;
    var rejecters = _pendingRejecters.slice();
    _pendingResolvers = [];
    _pendingRejecters = [];
    for (var i = 0; i < rejecters.length; i++) {
      rejecters[i](new Error('CAPTCHA verification failed. Please try again.'));
    }
    _hideWidget();
    // Widget may be in a bad state — force a fresh container on next call.
    _teardownWidget();
  }

  function _onTimeout() {
    _pendingTimer = null;
    var rejecters = _pendingRejecters.slice();
    _pendingResolvers = [];
    _pendingRejecters = [];
    _cachedToken = null;
    _tokenExpiry = 0;
    for (var i = 0; i < rejecters.length; i++) {
      rejecters[i](new Error('CAPTCHA timed out. Check your connection or disable strict tracking protection, then try again.'));
    }
    _hideWidget();
    _teardownWidget();
  }

  function _onExpired() {
    _cachedToken = null;
    _tokenExpiry = 0;
    if (_widgetId !== null) {
      try { window.turnstile.reset(_widgetId); } catch (_) {}
    }
  }

  function _ensureWidget() {
    // If a widget exists but its slot is no longer visible (tab switched),
    // tear it down and re-render fresh in the new visible slot.
    if (_widgetId !== null && !_containerStillUsable()) {
      _teardownWidget();
    }
    if (_widgetId !== null) return;
    var container = _placeFreshContainer();
    _widgetId = window.turnstile.render(container, {
      sitekey:           SITE_KEY,
      // appearance:'interaction-only' keeps the widget invisible until
      // Turnstile decides an interactive challenge is required. Do NOT pass
      // size:'invisible' — that value is invalid and causes Error 300030.
      appearance:        'interaction-only',
      callback:          _onToken,
      'error-callback':  _onError,
      'expired-callback': _onExpired,
      'before-interactive-callback': _surfaceWidget,
      'after-interactive-callback':  _hideWidget,
    });
  }

  window.VSTurnstile = {
    /**
     * Returns a Promise<string> with a fresh Turnstile token.
     * Serves a cached token when fresh; otherwise resets (or rebuilds) the
     * widget into the currently-visible slot.
     */
    getToken: function () {
      if (SITE_KEY === 'TURNSTILE_SITE_KEY_PLACEHOLDER') {
        return Promise.resolve('');
      }

      if (_cachedToken && Date.now() < _tokenExpiry) {
        var tok = _cachedToken;
        _cachedToken = null;
        _tokenExpiry = 0;
        if (_containerStillUsable()) {
          try { window.turnstile.reset(_widgetId); } catch (_) {}
        }
        return Promise.resolve(tok);
      }

      return ensureLoaded().then(function () {
        return new Promise(function (resolve, reject) {
          _pendingResolvers.push(resolve);
          _pendingRejecters.push(reject);

          if (!_pendingTimer) {
            _pendingTimer = setTimeout(_onTimeout, TOKEN_TIMEOUT_MS);
          }

          if (_containerStillUsable()) {
            try {
              window.turnstile.reset(_widgetId);
            } catch (_) {
              _teardownWidget();
              _ensureWidget();
            }
          } else {
            _ensureWidget();
          }
        });
      });
    },
  };

  // Pre-load Turnstile API as early as possible so the first form submit is instant
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { ensureLoaded(); });
  } else {
    ensureLoaded();
  }
})(window);
