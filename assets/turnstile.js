/**
 * VaultSpark Studios — Cloudflare Turnstile CAPTCHA helper
 *
 * Renders an invisible Turnstile widget and provides a token for
 * Supabase auth calls. Supabase expects { captchaToken } in the
 * options object of signUp / signInWithPassword.
 *
 * Usage:
 *   const token = await VSTurnstile.getToken();
 *   supabase.auth.signInWithPassword({ email, password, options: { captchaToken: token } });
 *
 * Setup:
 *   1. Register site at dash.cloudflare.com → Turnstile → Add site
 *   2. Set TURNSTILE_SITE_KEY below
 *   3. In Supabase Dashboard → Auth → Bot Protection → select Turnstile,
 *      paste your Turnstile Secret Key
 */
(function (window) {
  'use strict';

  // Replace with your Turnstile site key from Cloudflare dashboard
  var SITE_KEY = 'TURNSTILE_SITE_KEY_PLACEHOLDER';

  var _widgetId = null;
  var _container = null;
  var _ready = false;
  var _readyCallbacks = [];

  // Called by Turnstile API when loaded
  window.__vsTurnstileReady = function () {
    _ready = true;
    for (var i = 0; i < _readyCallbacks.length; i++) _readyCallbacks[i]();
    _readyCallbacks = [];
  };

  function ensureLoaded() {
    return new Promise(function (resolve) {
      if (_ready) return resolve();
      if (!document.getElementById('vs-turnstile-api')) {
        var s = document.createElement('script');
        s.id = 'vs-turnstile-api';
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__vsTurnstileReady&render=explicit';
        s.async = true;
        document.head.appendChild(s);
      }
      _readyCallbacks.push(resolve);
    });
  }

  function ensureContainer() {
    if (_container) return _container;
    _container = document.createElement('div');
    _container.id = 'vs-turnstile';
    _container.style.cssText = 'position:fixed;bottom:0;right:0;z-index:-1;opacity:0;pointer-events:none;';
    document.body.appendChild(_container);
    return _container;
  }

  window.VSTurnstile = {
    /**
     * Get a fresh Turnstile token for Supabase auth.
     * Returns a Promise<string> with the token.
     */
    getToken: function () {
      // If site key not configured, return empty (Supabase will skip captcha check if disabled)
      if (SITE_KEY === 'TURNSTILE_SITE_KEY_PLACEHOLDER') {
        return Promise.resolve('');
      }

      return ensureLoaded().then(function () {
        return new Promise(function (resolve, reject) {
          var container = ensureContainer();

          // Reset existing widget if any
          if (_widgetId !== null) {
            try { window.turnstile.remove(_widgetId); } catch (e) {}
            _widgetId = null;
          }

          _widgetId = window.turnstile.render(container, {
            sitekey: SITE_KEY,
            size: 'invisible',
            callback: function (token) {
              resolve(token);
            },
            'error-callback': function () {
              reject(new Error('CAPTCHA verification failed. Please try again.'));
            },
            'expired-callback': function () {
              reject(new Error('CAPTCHA expired. Please try again.'));
            },
          });
        });
      });
    },
  };
})(window);
