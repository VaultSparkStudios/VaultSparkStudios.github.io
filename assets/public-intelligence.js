(function (window) {
  'use strict';

  // Shared fetcher for /api/public-intelligence.json.
  //
  // Layered cache:
  //   1. In-flight promise — concurrent .get() calls on the same page dedupe to one fetch
  //   2. In-memory TTL cache (10 min) — avoids refetching on SPA-style repeat navigation
  //   3. localStorage TTL cache (10 min) — shares across tabs + survives reloads
  //
  // Expose: window.VSPublicIntel.get() → Promise<object|null>
  //         window.VSPublicIntel.registerEnricher(fn) — mutate/decorate the returned value
  //         window.VSPublicIntel.invalidate() — drop caches (test-only / debugging)

  var URL_ = '/api/public-intelligence.json';
  var CACHE_KEY = 'vs-public-intel-cache:v1';
  var TTL_MS = 10 * 60 * 1000;

  var inflight = null;      // in-flight fetch promise
  var memEntry = null;      // { ts, data }
  var enrichers = [];

  function applyEnrichers(value) {
    return enrichers.reduce(function (current, enrich) {
      try { return enrich(current) || current; } catch (_) { return current; }
    }, value);
  }

  function readLocal() {
    try {
      var raw = window.localStorage && window.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (!entry || typeof entry.ts !== 'number') return null;
      if ((Date.now() - entry.ts) >= TTL_MS) return null;
      return entry;
    } catch (_) { return null; }
  }

  function writeLocal(entry) {
    try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry)); } catch (_) {}
  }

  function freshMem() {
    return memEntry && (Date.now() - memEntry.ts) < TTL_MS ? memEntry : null;
  }

  function load() {
    var m = freshMem();
    if (m) return Promise.resolve(applyEnrichers(m.data));

    var l = readLocal();
    if (l) { memEntry = l; return Promise.resolve(applyEnrichers(l.data)); }

    if (inflight) return inflight.then(applyEnrichers);

    inflight = fetch(URL_, { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('intel_fetch_failed');
        return response.json();
      })
      .then(function (data) {
        memEntry = { ts: Date.now(), data: data };
        writeLocal(memEntry);
        inflight = null;
        return data;
      })
      .catch(function () {
        inflight = null;
        return null;
      });

    return inflight.then(applyEnrichers);
  }

  window.VSPublicIntel = {
    get: load,
    registerEnricher: function (enricher) {
      if (typeof enricher === 'function') enrichers.push(enricher);
    },
    invalidate: function () {
      memEntry = null;
      try { window.localStorage.removeItem(CACHE_KEY); } catch (_) {}
    }
  };
})(window);
