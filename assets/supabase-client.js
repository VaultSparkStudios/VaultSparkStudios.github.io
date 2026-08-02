/**
 * VaultSpark business-data client.
 *
 * Obelisk is the sole authentication authority. Supabase is retained behind
 * the edge bridge only so existing auth.uid()-based member/investor RLS keeps
 * working with preserved UUIDs. Password, recovery, and social-auth entry
 * points are intentionally unavailable here.
 */
(function (window) {
  'use strict';

  const SUPABASE_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
  const VAULT_MEMBER_LOGIN = 'https://vaultsparkstudios.com/vault-member/';

  const VAULT_GATED_APPS = {
    promogrind: { name: 'PromoGrind', url: 'https://vaultsparkstudios.com/promogrind', desc: 'Sportsbook promo conversion calculators — Vault Members only' },
    promogrind_local: { name: 'PromoGrind', url: 'http://localhost:5173', desc: 'PromoGrind local dev' },
    promogrind_local2: { name: 'PromoGrind', url: 'http://localhost:5174', desc: 'PromoGrind local dev' },
    investor: { name: 'Investor Portal', url: 'https://vaultsparkstudios.com/investor-portal/', desc: 'VaultSpark Studios investor area — authorised access only' },
  };

  if (!window.supabase) {
    window.VSAuthReady = Promise.reject(new Error('Supabase data client did not load.'));
    return;
  }

  function clearLegacyAuthStorage() {
    try {
      Object.keys(window.localStorage || {}).forEach((key) => {
        if (/^sb-.*-auth-token$/.test(key) || key === 'supabase.auth.token') {
          window.localStorage.removeItem(key);
        }
      });
    } catch (_) {}
  }

  // Compatibility credentials live in memory only. Persisting or refreshing a
  // Supabase session independently would let it outlive the authoritative
  // Obelisk edge session and recreate a second identity authority.
  clearLegacyAuthStorage();
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { detectSessionInUrl: false, persistSession: false, autoRefreshToken: false },
  });
  const rawGetSession = sb.auth.getSession.bind(sb.auth);
  const rawSetSession = sb.auth.setSession.bind(sb.auth);
  const rawSignOut = sb.auth.signOut.bind(sb.auth);

  function obeliskReturn(intent) {
    const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.assign(`/login?intent=${intent}&return=${encodeURIComponent(target)}`);
    return Promise.resolve({ data: { session: null, user: null }, error: null, redirected: true });
  }

  async function clearCompatibilitySession(error = null) {
    await rawSignOut({ scope: 'local' }).catch(() => {});
    clearLegacyAuthStorage();
    window.VSObeliskIdentity = null;
    window.VSCompatibilitySession = null;
    window.dispatchEvent(new CustomEvent('vs-auth-ready', {
      detail: { authenticated: false, error: error ? error.message : null },
    }));
    return { authenticated: false, session: null, identity: null, error };
  }

  async function bootstrapAuthoritativeSession() {
    // Ask the public identity projection first. Anonymous visitors receive a
    // clean 200/null contract, so portal pages do not create a noisy expected
    // 401 in browser consoles. Compatibility credentials are requested only
    // after the edge has proven an Obelisk subject.
    let identityResponse;
    try {
      identityResponse = await window.fetch('/api/auth/me', {
        method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store',
      });
    } catch (error) {
      return clearCompatibilitySession(new Error(`Obelisk session bridge is unreachable: ${error.message}`));
    }
    if (!identityResponse.ok) {
      return clearCompatibilitySession(new Error(`Obelisk identity bridge returned ${identityResponse.status}.`));
    }
    let identityPayload;
    try {
      identityPayload = await identityResponse.json();
    } catch (_) {
      return clearCompatibilitySession(new Error('Obelisk identity bridge returned invalid JSON.'));
    }
    if (!identityPayload?.ok) {
      return clearCompatibilitySession(new Error('Obelisk identity bridge returned an invalid contract.'));
    }
    if (!identityPayload.identity) return clearCompatibilitySession();
    if (!identityPayload.identity.sub || !identityPayload.identity.supabaseUserId) {
      return clearCompatibilitySession(new Error('Obelisk identity bridge returned an incomplete identity.'));
    }

    let response;
    try {
      response = await window.fetch('/api/auth/session', {
        method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store',
      });
    } catch (error) {
      return clearCompatibilitySession(new Error(`Obelisk session bridge is unreachable: ${error.message}`));
    }

    if (response.status === 401) {
      return clearCompatibilitySession();
    }
    if (!response.ok) return clearCompatibilitySession(new Error(`Obelisk session bridge returned ${response.status}.`));
    let payload;
    try {
      payload = await response.json();
    } catch (_) {
      return clearCompatibilitySession(new Error('Obelisk session bridge returned invalid JSON.'));
    }
    if (!payload?.ok || !payload?.supabase?.access_token || !payload?.supabase?.refresh_token || !payload?.identity?.sub ||
        payload.identity.sub !== identityPayload.identity.sub ||
        payload.identity.supabaseUserId !== identityPayload.identity.supabaseUserId) {
      return clearCompatibilitySession(new Error('Obelisk session bridge returned an invalid contract.'));
    }
    const current = await rawGetSession();
    if (current.data?.session?.access_token !== payload.supabase.access_token) {
      let established = await rawSetSession({
        access_token: payload.supabase.access_token,
        refresh_token: payload.supabase.refresh_token,
      });
      if (established.error) {
        // setSession fails when the pair it was handed is already spent —
        // supabase-js tries to refresh it itself and GoTrue answers 400. That is
        // recoverable: the edge session is still valid, so ask it once more for
        // a freshly minted pair rather than declaring the member signed out.
        // Retried exactly once; a second failure is a real fault, not a race.
        const retry = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null);
        if (retry?.supabase?.access_token && retry?.supabase?.refresh_token) {
          established = await rawSetSession({
            access_token: retry.supabase.access_token,
            refresh_token: retry.supabase.refresh_token,
          });
        }
      }
      if (established.error) {
        // Still failing. Say so — the old behaviour dispatched a bare
        // authenticated:false and the portal rendered a signed-out screen with
        // no explanation, which is indistinguishable from having logged out.
        return clearCompatibilitySession(new Error(
          `Signed in, but this browser could not open a data session (${established.error.message || 'unknown'}). Reload to retry.`,
        ));
      }
      window.VSCompatibilitySession = established.data.session;
    } else {
      window.VSCompatibilitySession = current.data.session;
    }
    window.VSObeliskIdentity = payload.identity;
    window.dispatchEvent(new CustomEvent('vs-auth-ready', {
      detail: { authenticated: true, identity: payload.identity },
    }));
    return { authenticated: true, identity: payload.identity, session: window.VSCompatibilitySession, error: null };
  }

  const authReady = bootstrapAuthoritativeSession();
  window.VSAuthReady = authReady;

  sb.auth.getSession = async function getAuthoritativeSession() {
    const authority = await authReady;
    if (!authority.authenticated || authority.error || !window.VSCompatibilitySession) {
      return { data: { session: null }, error: authority.error || null };
    }
    const current = await rawGetSession();
    if (current.error || current.data?.session?.access_token !== window.VSCompatibilitySession.access_token) {
      return { data: { session: null }, error: current.error || new Error('Compatibility session authority mismatch.') };
    }
    return current;
  };
  sb.auth.signOut = async function signOutObelisk() {
    let bridgeError = null;
    try {
      const response = await window.fetch('/api/auth/logout', {
        method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' },
      });
      if (!response.ok) bridgeError = new Error(`Obelisk logout returned ${response.status}.`);
    } catch (error) {
      bridgeError = error;
    }
    const local = await rawSignOut({ scope: 'local' });
    clearLegacyAuthStorage();
    window.VSObeliskIdentity = null;
    window.VSCompatibilitySession = null;
    return { ...local, error: bridgeError || local.error };
  };
  sb.auth.signInWithPassword = () => obeliskReturn('signin');
  sb.auth.signUp = () => obeliskReturn('signup');
  sb.auth.signInWithOAuth = () => obeliskReturn('signin');
  sb.auth.resetPasswordForEmail = () => obeliskReturn('signin');

  const VSGate = {
    getNextUrl() {
      const raw = new URLSearchParams(window.location.search).get('next');
      if (!raw) return null;
      try {
        const decoded = decodeURIComponent(raw);
        const allowed = new Set(Object.values(VAULT_GATED_APPS).map((app) => new URL(app.url).origin));
        allowed.add(window.location.origin);
        return allowed.has(new URL(decoded).origin) ? decoded : null;
      } catch (_) { return null; }
    },
    redirect() {
      const next = this.getNextUrl();
      if (!next) return false;
      // Never place either provider's bearer tokens in a URL. Same-origin
      // sessions use the HttpOnly cookie; sibling apps begin their own Obelisk
      // OIDC flow and benefit from Obelisk single sign-on.
      window.location.assign(next);
      return true;
    },
    getNextAppName() {
      const next = this.getNextUrl();
      if (!next) return null;
      const app = Object.values(VAULT_GATED_APPS).find((entry) => new URL(entry.url).origin === new URL(next).origin);
      return app?.name || null;
    },
  };

  window.VSSupabase = sb;
  window.VSGate = VSGate;
  window.VAULT_GATED_APPS = VAULT_GATED_APPS;
  window.VAULT_MEMBER_LOGIN = VAULT_MEMBER_LOGIN;
})(window);
