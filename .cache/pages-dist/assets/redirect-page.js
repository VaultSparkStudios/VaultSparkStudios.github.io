(function () {
  'use strict';

  function getTarget() {
    var meta = document.querySelector('meta[name="vs-redirect"]');
    if (meta && meta.content) return meta.content;

    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && canonical.href) return canonical.href;

    return '';
  }

  var target = getTarget();
  if (!target) return;

  try {
    var url = new URL(target, window.location.origin);
    if (!url.search && window.location.search) url.search = window.location.search;
    if (!url.hash && window.location.hash) url.hash = window.location.hash;

    var current = window.location.pathname + window.location.search + window.location.hash;
    var next = url.pathname + url.search + url.hash;
    if (current === next) return;

    window.location.replace(url.toString());
  } catch (error) {
    // Meta refresh remains as the non-JS fallback.
  }
})();
