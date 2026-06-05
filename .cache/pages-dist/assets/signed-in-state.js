/* signed-in-state.js — single auth query, shared session state.
 *
 * Calls VSIdentity.getSession() once on DOMContentLoaded, writes
 * body[data-vs-signed-in] + body[data-vs-tier], dispatches
 * CustomEvent('vs:session-ready') so other surfaces react without
 * each making their own Supabase getSession() call.
 *
 * Consumers: account-chip.js, exit-intent.js, adaptive-cta.js,
 *            membership-journey.js (planned), oracle queries, rank bar.
 *
 * Requires: VSIdentity (identity.js loaded first in ambient bundle).
 */
(function () {
  'use strict';

  var resolved = false;
  var cachedSession = null;
  var SUPABASE_REF = 'fjnpzjjyhnpmunfoycrp';
  var AUTH_STORAGE_KEYS = [
    'sb-' + SUPABASE_REF + '-auth-token',
    'supabase.auth.token'
  ];

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

  function readPersistedSession() {
    try {
      for (var i = 0; i < AUTH_STORAGE_KEYS.length; i += 1) {
        var raw = localStorage.getItem(AUTH_STORAGE_KEYS[i]);
        if (!raw) continue;
        var parsed = JSON.parse(raw);
        var session = parsed && (parsed.currentSession || parsed.session || parsed);
        var normalized = normalizeRawSession(session);
        if (normalized && (!normalized.expiresAt || normalized.expiresAt * 1000 > Date.now() - 60000)) {
          return normalized;
        }
      }
    } catch (_) {}
    return null;
  }

  function resolve(session) {
    if (resolved) return;
    resolved = true;
    cachedSession = session || null;

    if (session && session._raw && !session.raw) session.raw = session._raw;
    if (session && session.raw && !session._raw) session._raw = session.raw;
    var signedIn = !!(session && session.userId);
    applySignedInAttrs(signedIn, session && session.tier);
    setTimeout(function () { applySignedInAttrs(signedIn, session && session.tier); }, 0);
    setTimeout(function () { applySignedInAttrs(signedIn, session && session.tier); }, 250);
    dispatchReady(signedIn);
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
      var persisted = readPersistedSession();
      if (persisted) {
        resolve(persisted);
        // Keep going in the background if the full client is present so token
        // refresh/auth-change listeners can update the page after first paint.
      }
      if (window.VSIdentity && typeof window.VSIdentity.getSession === 'function') {
        var session = await window.VSIdentity.getSession();
        if (session && session._raw && !session.raw) session.raw = session._raw;
        resolve(session || persisted);
      } else if (window.VSSupabase && window.VSSupabase.auth) {
        // Fallback: direct Supabase query if VSIdentity not loaded yet.
        var auth = await window.VSSupabase.auth.getSession();
        var sb = auth && auth.data && auth.data.session;
        if (sb && sb.user) {
          resolve(normalizeRawSession(sb));
        } else {
          resolve(persisted || null);
        }
      } else {
        resolve(persisted || null);
      }
    } catch (_) {
      resolve(readPersistedSession());
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
    readPersistedSession: readPersistedSession,
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
