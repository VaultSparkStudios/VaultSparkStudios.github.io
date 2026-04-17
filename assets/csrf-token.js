/**
 * VaultSpark — CSRF Token client.
 *
 * Fetches `/_csrf` from the Worker (HMAC-signed, 1hr TTL), caches in sessionStorage,
 * and exposes `window.VSCsrf.getToken()` returning a Promise<string>.
 *
 * Forms protected by the Worker rate-limit layer must include header `X-CSRF-Token: <token>`
 * on POST. Worker-injected; harmless if Worker disabled (token simply absent).
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'vs_csrf_v1';
  var inflight = null;

  function getCached() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.token || !parsed.expiresAt) return null;
      if (Date.now() >= parsed.expiresAt - 30000) return null; // 30s safety margin
      return parsed.token;
    } catch (_e) {
      return null;
    }
  }

  function fetchToken() {
    if (inflight) return inflight;
    inflight = fetch('/_csrf', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('CSRF fetch failed: ' + res.status);
        return res.json();
      })
      .then(function (body) {
        var ttlMs = (body.ttlSec || 3600) * 1000;
        var record = { token: body.token, expiresAt: Date.now() + ttlMs };
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch (_e) {}
        inflight = null;
        return body.token;
      })
      .catch(function (err) {
        inflight = null;
        throw err;
      });
    return inflight;
  }

  window.VSCsrf = {
    getToken: function () {
      var cached = getCached();
      if (cached) return Promise.resolve(cached);
      return fetchToken();
    },
    invalidate: function () {
      try { sessionStorage.removeItem(STORAGE_KEY); } catch (_e) {}
    }
  };
})();
