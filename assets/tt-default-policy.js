/* tt-default-policy.js — Trusted Types default-policy migration bridge (S176)
 *
 * The site has ~167 legacy innerHTML render sites across ~50 modules. Per-sink
 * named policies (the S174 pattern: vs-ambient-loader, vs-idle-loader, …) are
 * right for NEW code, but patching every legacy sink before flipping
 * `require-trusted-types-for 'script'` to enforce would stall the ladder for
 * months. The standard migration bridge is a DEFAULT policy: the browser
 * consults it automatically for every string→sink assignment, giving one
 * audited chokepoint today and a safe enforce-flip later (legacy keeps
 * working; new code migrates to named policies over time).
 *
 * createScriptURL is allowlist-pinned — unexpected script origins still
 * violate (observability preserved). createHTML/createScript pass through;
 * all rendered HTML on this site is build-generated or escapeHtml()-wrapped
 * first-party data (no user-generated HTML reaches these sinks).
 *
 * MUST load before any sink usage — first source in ambient-core.
 */
(function () {
  'use strict';
  if (!window.trustedTypes || !window.trustedTypes.createPolicy) return;
  if (window.__vsTTDefaultInstalled) return;

  var SCRIPT_URL_ALLOW = [
    // same-origin (absolute or relative)
    function (url) {
      try { return new URL(url, location.origin).origin === location.origin; }
      catch (_e) { return false; }
    },
    function (url) { return url.indexOf('https://browser.sentry-cdn.com/') === 0; },
    function (url) { return url.indexOf('https://challenges.cloudflare.com/') === 0; }
  ];

  try {
    window.trustedTypes.createPolicy('default', {
      createHTML: function (s) { return s; },
      createScript: function (s) { return s; },
      createScriptURL: function (url) {
        for (var i = 0; i < SCRIPT_URL_ALLOW.length; i += 1) {
          if (SCRIPT_URL_ALLOW[i](url)) return url;
        }
        // Returning null keeps the violation visible in TT reports.
        return null;
      }
    });
    window.__vsTTDefaultInstalled = true;
  } catch (_e) {
    /* default policy already exists — never double-install */
  }
})();
