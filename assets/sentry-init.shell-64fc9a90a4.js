/* sentry-init.js — shared Sentry initialization */
(function () {
  // Sentry is a third-party processor, so it loads only after the visitor has
  // accepted analytics. A Global Privacy Control signal counts as a refusal.
  function allowed() {
    try {
      if (navigator.globalPrivacyControl === true) return false;
      return localStorage.getItem('vs_cookie_consent') === 'accepted';
    } catch (_e) { return false; }
  }
  function start() {
    if (start.started || !allowed()) return;
    start.started = true;
    // Narrow TT policy: the trust-reviewed 7.99.0 bundle is vendored because
    // the CDN varies bytes by browser engine, making cross-engine SRI invalid.
    var SENTRY_SRC = '/assets/vendor/sentry-browser-7.99.0.870e7f88.js';
    var ttPolicy = null;
    try {
      if (window.trustedTypes && window.trustedTypes.createPolicy) {
        ttPolicy = window.trustedTypes.createPolicy('vs-sentry', {
          createScriptURL: function (url) {
            return url === SENTRY_SRC ? url : null;
          }
        });
      }
    } catch (_e) { /* TT unavailable or policy exists */ }
    var script = document.createElement('script');
    script.src = ttPolicy ? ttPolicy.createScriptURL(SENTRY_SRC) : SENTRY_SRC;
    script.integrity = 'sha384-hw5/iFL7nyNO+cmz7RZZFBK+JFaj95i9g56pzp6r6NDDoSjYgy/ljaC0OroDlOAs';
    script.async = true;
    script.onload = function () {
      if (typeof Sentry !== 'undefined') {
        Sentry.init({
          dsn: 'https://77226e22e29e4528c8a980b4c6cd9c58@o4511104924909568.ingest.us.sentry.io/4511104933298176',
          tracesSampleRate: 0.1,
          environment: location.hostname === 'localhost' ? 'development' :
            (location.hostname.indexOf('staging') !== -1 ? 'staging' : 'production')
        });
      }
    };
    document.head.appendChild(script);
  }

  // Error telemetry remains immediate when needed; routine visits do not pay
  // the third-party parse/layout cost inside their interaction-ready window.
  // The listeners stay attached until Sentry actually starts, so a visitor who
  // accepts later in the visit is still covered from that point on.
  function arm(type, opts) {
    window.addEventListener(type, function handler() {
      start();
      if (start.started) window.removeEventListener(type, handler, opts);
    }, opts);
  }
  arm('error');
  arm('unhandledrejection');
  arm('pointerdown', { passive: true });
  arm('keydown');
  window.addEventListener('load', function () { setTimeout(start, 8000); }, { once: true });
  window.addEventListener('vs:consent', function (e) {
    if (e && e.detail && e.detail.analytics) setTimeout(start, 0);
  });
})();
