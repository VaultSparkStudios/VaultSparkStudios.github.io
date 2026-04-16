(function (window) {
  'use strict';

  var cache = null;
  var enrichers = [];

  function applyEnrichers(value) {
    return enrichers.reduce(function (current, enrich) {
      try {
        return enrich(current) || current;
      } catch (_) {
        return current;
      }
    }, value);
  }

  function load() {
    if (!cache) {
      cache = fetch('/api/public-intelligence.json', { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('intel_fetch_failed');
        return response.json();
      })
      .catch(function () {
        return null;
      });
    }
    return cache.then(applyEnrichers);
  }

  window.VSPublicIntel = {
    get: load,
    registerEnricher: function (enricher) {
      if (typeof enricher === 'function') enrichers.push(enricher);
    }
  };
})(window);
