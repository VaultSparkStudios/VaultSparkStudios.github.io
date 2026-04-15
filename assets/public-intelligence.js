(function (window) {
  'use strict';

  var cache = null;

  function load() {
    if (cache) return cache;
    cache = fetch('/api/public-intelligence.json', { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('intel_fetch_failed');
        return response.json();
      })
      .catch(function () {
        return null;
      });
    return cache;
  }

  window.VSPublicIntel = {
    get: load
  };
})(window);
