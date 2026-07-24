/**
 * VaultSpark identity facade — Obelisk authority, Supabase data compatibility.
 *
 * Public callers receive one provider-neutral identity shape. The preserved
 * Supabase UUID remains `userId` because portal tables and RLS use it; the
 * authoritative Obelisk subject is separately exposed as `identityId`.
 */
(function (window) {
  'use strict';

  const subscribers = new Set();
  function emit(event) {
    subscribers.forEach((callback) => { try { callback(event); } catch (_) {} });
  }

  function normalize(identity, session) {
    if (!identity?.sub || !identity?.supabaseUserId || !session?.access_token) return null;
    return {
      provider: 'obelisk',
      userId: identity.supabaseUserId,
      identityId: identity.sub,
      email: identity.email || session.user?.email || null,
      displayName: identity.name || null,
      assurance: identity.assurance || null,
      accessToken: session.access_token,
      expiresAt: session.expires_at || null,
      _raw: session,
    };
  }

  async function getSession() {
    await (window.VSAuthReady || Promise.resolve()).catch(() => null);
    return normalize(window.VSObeliskIdentity, window.VSCompatibilitySession);
  }

  function begin(intent, args = {}) {
    const requested = args.returnTo || `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const safe = typeof requested === 'string' && requested.startsWith('/') && !requested.startsWith('//')
      ? requested : '/vault-member/';
    window.location.assign(`/login?intent=${intent}&return=${encodeURIComponent(safe)}`);
    return Promise.resolve({ ok: true, redirected: true });
  }

  const VSIdentity = {
    provider: 'obelisk',
    useProvider(name) {
      if (name !== 'obelisk') throw new Error('Obelisk is the required VaultSpark identity provider.');
      return this;
    },
    capabilities() {
      return {
        oidc: true, pkce: true, passkey: true, password: false, oauth: false,
        captcha: false, serverSession: true, signedReceipts: true,
      };
    },
    async isReady() { return !!(await getSession()); },
    getSession,
    signIn(args) { return begin('signin', args); },
    signUp(args) { return begin('signup', args); },
    signInWithOAuth(args) { return begin('signin', args); },
    resetPassword(args) { return begin('signin', args); },
    async signOut() {
      if (!window.VSSupabase?.auth) return { ok: false, error: { code: 'not_ready', message: 'Identity bridge is not ready.' } };
      const { error } = await window.VSSupabase.auth.signOut();
      emit({ type: 'SIGNED_OUT', session: null });
      return error ? { ok: false, error } : { ok: true };
    },
    async updatePassword() {
      window.location.assign('/api/auth/account');
      return { ok: true, redirected: true };
    },
    async manageAccount() {
      window.location.assign('/api/auth/account');
      return { ok: true, redirected: true };
    },
    async exchangeCode() {
      return { ok: false, error: { code: 'edge_callback_only', message: 'Obelisk callbacks terminate at the trusted edge.' } };
    },
    async setSession() {
      return { ok: false, error: { code: 'edge_session_only', message: 'Browser-authored identity sessions are forbidden.' } };
    },
    onChange(callback) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
  };

  window.addEventListener('vs-auth-ready', (event) => {
    const session = normalize(event.detail?.identity, window.VSCompatibilitySession);
    emit({ type: session ? 'SIGNED_IN' : 'SIGNED_OUT', session });
  });
  window.VSIdentity = VSIdentity;
})(window);
