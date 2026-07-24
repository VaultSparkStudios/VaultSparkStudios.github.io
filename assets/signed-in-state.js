/* signed-in-state.js — single authoritative auth query, shared session state.
 *
 * Calls the Obelisk edge session once on DOMContentLoaded, writes
 * body[data-vs-signed-in] + body[data-vs-tier], dispatches
 * CustomEvent('vs:session-ready') so other surfaces react without
 * each making their own Supabase getSession() call.
 *
 * Consumers: account-chip.js, exit-intent.js, adaptive-cta.js,
 *            membership-journey.js (planned), oracle queries, rank bar.
 *
 * No browser-persisted credential is accepted as identity evidence. Portal
 * pages may use VSIdentity; ambient public pages use the edge /api/auth/me
 * projection backed by the signed HttpOnly session cookie.
 */
(function () {
  'use strict';

  var resolved = false;
  var cachedSession = null;
  var dataSession = null;
  var dataSessionPromise = null;
  function normalizeRawSession(raw) {
    if (!raw || !raw.user) return null;
    return {
      userId: raw.user.id,
      email: raw.user.email || null,
      displayName: raw.user.user_metadata && (raw.user.user_metadata.display_name || raw.user.user_metadata.username) || null,
      accessToken: raw.access_token || null,
      expiresAt: raw.expires_at || null,
      raw: raw,
      _raw: raw
    };
  }

  function normalizePublicIdentity(identity) {
    if (!identity || !identity.sub || !identity.supabaseUserId) return null;
    return {
      provider: 'obelisk',
      userId: identity.supabaseUserId,
      identityId: identity.sub,
      email: identity.email || null,
      displayName: identity.name || null,
      assurance: identity.assurance || null
    };
  }

  function resolve(session) {
    if (resolved) return;
    resolved = true;
    cachedSession = session || null;
    if (!cachedSession) {
      dataSession = null;
      dataSessionPromise = null;
    }

    if (session && session._raw && !session.raw) session.raw = session._raw;
    if (session && session.raw && !session._raw) session._raw = session.raw;
    var signedIn = !!(session && session.userId);
    applySignedInAttrs(signedIn, session && session.tier);
    setTimeout(function () { applySignedInAttrs(signedIn, session && session.tier); }, 0);
    setTimeout(function () { applySignedInAttrs(signedIn, session && session.tier); }, 250);
    dispatchReady(signedIn);
  }

  function whenReady() {
    if (resolved) return Promise.resolve(cachedSession);
    return new Promise(function (done) {
      document.addEventListener('vs:session-ready', function onReady() {
        document.removeEventListener('vs:session-ready', onReady);
        done(cachedSession);
      });
    });
  }

  function dataSessionFresh(session) {
    return !!(session && session.access_token && session.user && session.user.id &&
      (!session.expires_at || session.expires_at * 1000 > Date.now() + 60000));
  }

  async function getDataSession() {
    var identity = await whenReady();
    if (!identity || !identity.userId) return null;
    if (dataSessionFresh(window.VSCompatibilitySession)) {
      dataSession = window.VSCompatibilitySession;
      return dataSession;
    }
    if (dataSessionFresh(dataSession)) return dataSession;
    if (dataSessionPromise) return dataSessionPromise;

    dataSessionPromise = window.fetch('/api/auth/session', {
      method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store'
    }).then(function (response) {
      if (!response.ok) return null;
      return response.json();
    }).then(function (payload) {
      if (!payload || !payload.ok || !payload.identity || !payload.supabase) return null;
      if (payload.identity.sub !== identity.identityId ||
          payload.identity.supabaseUserId !== identity.userId ||
          !dataSessionFresh(payload.supabase)) return null;
      dataSession = payload.supabase;
      return dataSession;
    }).catch(function () {
      return null;
    }).finally(function () {
      dataSessionPromise = null;
    });
    return dataSessionPromise;
  }

  function applySignedInAttrs(signedIn, tier) {
    if (document.body) document.body.setAttribute('data-vs-signed-in', signedIn ? 'true' : 'false');
    document.documentElement.setAttribute('data-vs-signed-in', signedIn ? 'true' : 'false');
    if (signedIn && tier) {
      if (document.body) document.body.setAttribute('data-vs-tier', tier);
      document.documentElement.setAttribute('data-vs-tier', tier);
    }
  }

  function dispatchReady(signedIn) {
    document.dispatchEvent(new CustomEvent('vs:session-ready', {
      bubbles: true,
      detail: { session: cachedSession, signedIn: signedIn }
    }));
  }

  async function query() {
    try {
      if (window.VSIdentity && typeof window.VSIdentity.getSession === 'function') {
        var session = await window.VSIdentity.getSession();
        if (session && session._raw && !session.raw) session.raw = session._raw;
        resolve(session || null);
      } else if (window.VSSupabase && window.VSSupabase.auth) {
        // Portal fallback remains authoritative because VSSupabase.getSession
        // itself waits for and validates the Obelisk edge bridge.
        var auth = await window.VSSupabase.auth.getSession();
        var sb = auth && auth.data && auth.data.session;
        resolve(sb && sb.user ? normalizeRawSession(sb) : null);
      } else {
        var response = await window.fetch('/api/auth/me', {
          method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store'
        });
        if (!response.ok) return resolve(null);
        var payload = await response.json();
        resolve(payload && payload.ok ? normalizePublicIdentity(payload.identity) : null);
      }
    } catch (_) {
      // Network, parse, or bridge failures are anonymous—not permission to
      // resurrect a stale browser credential.
      resolve(null);
    }
  }

  if (document.readyState !== 'loading') {
    query();
  } else {
    document.addEventListener('DOMContentLoaded', query);
  }

  // Expose for consumers that need to read session after event fires.
  window.VSSignedInState = {
    getSession: function () { return cachedSession; },
    isResolved: function () { return resolved; },
    whenReady: whenReady,
    getDataSession: getDataSession,
    getDataSessionCached: function () { return dataSessionFresh(dataSession) ? dataSession : null; }
  };

  if (window.VSIdentity && typeof window.VSIdentity.onChange === 'function') {
    window.VSIdentity.onChange(function (evt) {
      if (!evt) return;
      if (evt.type === 'SIGNED_OUT') {
        resolved = false;
        resolve(null);
      } else if (evt.session) {
        resolved = false;
        resolve(evt.session);
      }
    });
  }
})();
