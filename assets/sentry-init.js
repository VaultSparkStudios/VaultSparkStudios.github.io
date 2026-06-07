/* sentry-init.js — shared Sentry initialization */
(function () {
  // Narrow TT policy (S176, S174 convention): pinned to the Sentry CDN —
  // anything else returns null and stays a visible violation.
  var SENTRY_SRC = 'https://browser.sentry-cdn.com/7.99.0/bundle.tracing.min.js';
  var ttPolicy = null;
  try {
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      ttPolicy = window.trustedTypes.createPolicy('vs-sentry', {
        createScriptURL: function (url) {
          return url.indexOf('https://browser.sentry-cdn.com/') === 0 ? url : null;
        }
      });
    }
  } catch (_e) { /* TT unavailable or policy exists */ }
  var script = document.createElement('script');
  script.src = ttPolicy ? ttPolicy.createScriptURL(SENTRY_SRC) : SENTRY_SRC;
  script.crossOrigin = 'anonymous';
  script.integrity = 'sha384-99tnmieVgWXT2BprlMVVbNCeKOFoMo/QxtacuHrPmcGNvTkcUylAofrsDfCFOsxB';
  script.async = true;
  script.onload = function () {
    if (typeof Sentry !== 'undefined') {
      Sentry.init({
        dsn: 'https://77226e22e29e4528c8a980b4c6cd9c58@o4511104924909568.ingest.us.sentry.io/4511104933298176',
        tracesSampleRate: 0.1,
        environment: location.hostname === 'localhost' ? 'development' : 'production'
      });
    }
  };
  document.head.appendChild(script);
})();
