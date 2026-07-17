(function (window) {
  'use strict';

  // One browser-side truth bus for public JSON signals. Concurrent consumers of
  // the same URL share an in-flight promise, a memory entry, and a cross-tab
  // localStorage entry. VSPublicIntel remains the compatibility facade.
  var DEFAULT_TTL = 10 * 60 * 1000;
  var nativeFetch = window.fetch.bind(window);
  var INTERCEPTED = { '/api/public-intelligence.json': DEFAULT_TTL, '/api/founder-presence.json': 90000 };
  var memory = Object.create(null);
  var inflight = Object.create(null);
  var enrichers = [];

  function cacheKey(url) {
    return 'vs-public-signal:v2:' + String(url).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  }
  function readLocal(url, ttl) {
    try {
      var raw = window.localStorage && window.localStorage.getItem(cacheKey(url));
      var entry = raw ? JSON.parse(raw) : null;
      return entry && typeof entry.ts === 'number' && Date.now() - entry.ts < ttl ? entry : null;
    } catch (_) { return null; }
  }
  function writeLocal(url, entry) {
    try { window.localStorage.setItem(cacheKey(url), JSON.stringify(entry)); } catch (_) {}
  }
  function get(url, options) {
    options = options || {};
    var ttl = Number(options.ttlMs) > 0 ? Number(options.ttlMs) : DEFAULT_TTL;
    var mem = memory[url];
    if (mem && Date.now() - mem.ts < ttl) return Promise.resolve(mem.data);
    var local = readLocal(url, ttl);
    if (local) { memory[url] = local; return Promise.resolve(local.data); }
    if (inflight[url]) return inflight[url];
    inflight[url] = nativeFetch(url, {
      cache: options.cache || 'no-cache',
      credentials: options.credentials || 'same-origin'
    }).then(function (response) {
      if (!response.ok) throw new Error('public_signal_' + response.status);
      return response.json();
    }).then(function (data) {
      var entry = { ts: Date.now(), data: data };
      memory[url] = entry;
      writeLocal(url, entry);
      return data;
    }).catch(function () { return null; }).then(function (data) {
      delete inflight[url];
      return data;
    });
    return inflight[url];
  }
  function invalidate(url) {
    if (url) {
      delete memory[url]; delete inflight[url];
      try { window.localStorage.removeItem(cacheKey(url)); } catch (_) {}
      return;
    }
    memory = Object.create(null); inflight = Object.create(null);
  }
  function applyEnrichers(value) {
    return enrichers.reduce(function (current, enrich) {
      try { return enrich(current) || current; } catch (_) { return current; }
    }, value);
  }

  function interceptedPath(input, init) {
    var method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (method !== 'GET') return null;
    var raw = typeof input === 'string' ? input : input && input.url;
    try {
      var parsed = new URL(raw, window.location.href);
      return parsed.origin === window.location.origin && INTERCEPTED[parsed.pathname] ? parsed.pathname : null;
    } catch (_) { return null; }
  }

  // Compatibility membrane: legacy homepage consumers that still call fetch()
  // directly join the same in-flight promise instead of creating duplicate
  // network work. Only two public, same-origin, read-only JSON signals are
  // intercepted; every other request preserves the native fetch contract.
  window.fetch = function (input, init) {
    var path = interceptedPath(input, init);
    if (!path) return nativeFetch(input, init);
    return get(path, { ttlMs: INTERCEPTED[path] }).then(function (data) {
      if (data == null) return new Response(null, { status: 503, statusText: 'Public signal unavailable' });
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8', 'x-vaultspark-signal-cache': 'coalesced' }
      });
    });
  };

  window.VSPublicSignals = { get: get, invalidate: invalidate };
  window.VSPublicIntel = {
    get: function () { return get('/api/public-intelligence.json').then(applyEnrichers); },
    registerEnricher: function (fn) { if (typeof fn === 'function') enrichers.push(fn); },
    invalidate: function () { invalidate('/api/public-intelligence.json'); }
  };
})(window);