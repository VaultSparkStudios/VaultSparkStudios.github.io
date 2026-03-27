/* sentry-init.js — shared Sentry initialization */
(function () {
  var script = document.createElement('script');
  script.src = 'https://browser.sentry-cdn.com/7.99.0/bundle.tracing.min.js';
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
