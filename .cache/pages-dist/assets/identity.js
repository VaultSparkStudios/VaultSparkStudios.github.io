/* VaultSpark Studios — Identity Abstraction Layer (Obelisk-ready)
 *
 * Single canonical interface for ALL auth operations across the website + portals.
 * Today: delegates to window.VSSupabase.auth (zero behavior change).
 * Tomorrow: swappable to Obelisk passkey/WebAuthn provider via VSIdentity.useProvider().
 *
 * Why this exists:
 *   CANON-021 declares Obelisk as the Studio-wide trust layer; Phase-2 milestone
 *   replaces Supabase password+Turnstile login with Obelisk passkey+TOTP. ~70
 *   VSSupabase.auth.* call sites across vault-member/portal*.js + investor-portal
 *   would otherwise require synchronized rewrite at swap-time. This wrapper
 *   localizes the swap to ONE file. New code MUST use VSIdentity; existing code
 *   migrates in waves as portals are touched.
 *
 * Return-shape contract (provider-agnostic, no Supabase leak):
 *   getSession()      → { userId, email, displayName, accessToken, expiresAt } | null
 *   signIn / signUp   → { ok: true, session } | { ok: false, error: { code, message } }
 *   onChange(cb)      → cb({ type: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED', session })
 *
 * Provider semantics:
 *   'supabase'  — today; delegates to VSSupabase.auth.* and normalizes shape
 *   'obelisk'   — future; delegates to /obelisk/v1/* endpoints (not yet implemented)
 *
 * Migration: when Obelisk goes live, call VSIdentity.useProvider('obelisk') from
 *   supabase-client.js. Portal code unchanged.
 */
(function (window) {
  'use strict';

  // ── Provider state ────────────────────────────────────────────────────────
  let activeProvider = 'supabase';
  const subscribers = new Set();

  function emit(evt) {
    subscribers.forEach((cb) => {
      try { cb(evt); } catch (_) { /* swallow subscriber errors */ }
    });
  }

  // ── Shape normalization ───────────────────────────────────────────────────
  function normalizeSession(raw) {
    if (!raw) return null;
    // Supabase shape: { access_token, refresh_token, expires_at, user: { id, email, user_metadata } }
    if (raw.user && raw.access_token) {
      return {
        userId: raw.user.id,
        email: raw.user.email || null,
        displayName: (raw.user.user_metadata && (raw.user.user_metadata.display_name || raw.user.user_metadata.username)) || null,
        accessToken: raw.access_token,
        expiresAt: raw.expires_at || null,
        _raw: raw, // escape hatch — legacy code that still needs raw Supabase shape
      };
    }
    // Obelisk shape (future): { sub, email, name, token, exp }
    if (raw.sub && raw.token) {
      return {
        userId: raw.sub,
        email: raw.email || null,
        displayName: raw.name || null,
        accessToken: raw.token,
        expiresAt: raw.exp || null,
        _raw: raw,
      };
    }
    return null;
  }

  function normalizeError(err) {
    if (!err) return null;
    return {
      code: err.code || err.name || 'unknown',
      message: err.message || String(err),
      _raw: err,
    };
  }

  // ── Supabase provider (today) ─────────────────────────────────────────────
  const SupabaseProvider = {
    name: 'supabase',
    isReady() {
      return !!(window.VSSupabase && window.VSSupabase.auth);
    },
    async getSession() {
      if (!this.isReady()) return null;
      const { data: { session } } = await window.VSSupabase.auth.getSession();
      return normalizeSession(session);
    },
    async signIn({ email, password, captchaToken }) {
      if (!this.isReady()) return { ok: false, error: { code: 'not_ready', message: 'auth client not loaded' } };
      const { data, error } = await window.VSSupabase.auth.signInWithPassword({
        email, password, options: { captchaToken },
      });
      if (error) return { ok: false, error: normalizeError(error) };
      return { ok: true, session: normalizeSession(data.session) };
    },
    async signUp({ email, password, captchaToken, metadata }) {
      if (!this.isReady()) return { ok: false, error: { code: 'not_ready', message: 'auth client not loaded' } };
      const { data, error } = await window.VSSupabase.auth.signUp({
        email, password, options: { captchaToken, data: metadata || undefined },
      });
      if (error) return { ok: false, error: normalizeError(error) };
      return { ok: true, session: normalizeSession(data.session), user: data.user || null };
    },
    async signInWithOAuth({ provider, redirectTo }) {
      if (!this.isReady()) return { ok: false, error: { code: 'not_ready', message: 'auth client not loaded' } };
      const { error } = await window.VSSupabase.auth.signInWithOAuth({
        provider, options: { redirectTo },
      });
      if (error) return { ok: false, error: normalizeError(error) };
      return { ok: true };
    },
    async signOut() {
      if (!this.isReady()) return { ok: false, error: { code: 'not_ready', message: 'auth client not loaded' } };
      const { error } = await window.VSSupabase.auth.signOut();
      if (error) return { ok: false, error: normalizeError(error) };
      return { ok: true };
    },
    async resetPassword({ email, captchaToken, redirectTo }) {
      if (!this.isReady()) return { ok: false, error: { code: 'not_ready', message: 'auth client not loaded' } };
      const { error } = await window.VSSupabase.auth.resetPasswordForEmail(email, { redirectTo, captchaToken });
      if (error) return { ok: false, error: normalizeError(error) };
      return { ok: true };
    },
    async updatePassword({ password }) {
      if (!this.isReady()) return { ok: false, error: { code: 'not_ready', message: 'auth client not loaded' } };
      const { error } = await window.VSSupabase.auth.updateUser({ password });
      if (error) return { ok: false, error: normalizeError(error) };
      return { ok: true };
    },
    async exchangeCode(code) {
      if (!this.isReady()) return { ok: false, error: { code: 'not_ready', message: 'auth client not loaded' } };
      try {
        await window.VSSupabase.auth.exchangeCodeForSession(code);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: normalizeError(e) };
      }
    },
    async setSession({ accessToken, refreshToken }) {
      if (!this.isReady()) return { ok: false, error: { code: 'not_ready', message: 'auth client not loaded' } };
      const { error } = await window.VSSupabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) return { ok: false, error: normalizeError(error) };
      return { ok: true };
    },
    _attachStateBridge() {
      if (!this.isReady() || this._bridged) return;
      this._bridged = true;
      window.VSSupabase.auth.onAuthStateChange((event, session) => {
        emit({ type: event, session: normalizeSession(session) });
      });
    },
  };

  // ── Obelisk provider (placeholder — Obelisk still building itself out) ────
  // This stub exists so VSIdentity.useProvider('obelisk') doesn't error at
  // call-time. When Obelisk hardens, replace each method with the real call.
  // Critical migration concern: Supabase RLS depends on auth.uid(). Obelisk
  // sessions MUST mint a matching Supabase JWT via a bridge RPC, otherwise
  // every vault_members / investor_messages / vault_feedback policy breaks.
  // See context/OBELISK_ADOPTION.md → "Migration risks" for the full plan.
  const ObeliskProvider = {
    name: 'obelisk',
    isReady() { return false; }, // flip to true when /obelisk/v1/* is live
    async getSession() { return null; },
    async signIn() { return { ok: false, error: { code: 'obelisk_not_ready', message: 'Obelisk provider not yet implemented' } }; },
    async signUp() { return { ok: false, error: { code: 'obelisk_not_ready', message: 'Obelisk provider not yet implemented' } }; },
    async signInWithOAuth() { return { ok: false, error: { code: 'obelisk_not_ready', message: 'Obelisk provider not yet implemented' } }; },
    async signOut() { return { ok: false, error: { code: 'obelisk_not_ready', message: 'Obelisk provider not yet implemented' } }; },
    async resetPassword() { return { ok: false, error: { code: 'obelisk_not_ready', message: 'Obelisk provider not yet implemented' } }; },
    async updatePassword() { return { ok: false, error: { code: 'obelisk_not_ready', message: 'Obelisk provider not yet implemented' } }; },
    async exchangeCode() { return { ok: false, error: { code: 'obelisk_not_ready', message: 'Obelisk provider not yet implemented' } }; },
    async setSession() { return { ok: false, error: { code: 'obelisk_not_ready', message: 'Obelisk provider not yet implemented' } }; },
    _attachStateBridge() { /* no-op until provider ships */ },
  };

  const providers = { supabase: SupabaseProvider, obelisk: ObeliskProvider };

  function provider() { return providers[activeProvider]; }

  // ── Public API ────────────────────────────────────────────────────────────
  const VSIdentity = {
    get provider() { return activeProvider; },

    /** Swap providers at runtime. Called by supabase-client.js / future obelisk-client.js. */
    useProvider(name) {
      if (!providers[name]) throw new Error(`Unknown identity provider: ${name}`);
      activeProvider = name;
      providers[name]._attachStateBridge();
      return this;
    },

    /** Returns capability hints for feature-flagging UI (passkey badges, etc). */
    capabilities() {
      return {
        passkey: activeProvider === 'obelisk',
        password: activeProvider === 'supabase',
        oauth: activeProvider === 'supabase',
        captcha: activeProvider === 'supabase',
      };
    },

    isReady()        { return provider().isReady(); },
    getSession()     { return provider().getSession(); },
    signIn(args)     { return provider().signIn(args); },
    signUp(args)     { return provider().signUp(args); },
    signInWithOAuth(args) { return provider().signInWithOAuth(args); },
    signOut()        { return provider().signOut(); },
    resetPassword(args) { return provider().resetPassword(args); },
    updatePassword(args) { return provider().updatePassword(args); },
    exchangeCode(code)  { return provider().exchangeCode(code); },
    setSession(args) { return provider().setSession(args); },

    /** Subscribe to auth state changes. Returns unsubscribe fn. */
    onChange(cb) {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
  };

  // Attach state bridge for the default provider as soon as VSSupabase is up.
  // VSSupabase may load after this file when the bundle order is off; tolerate that.
  function tryAttach() {
    if (SupabaseProvider.isReady()) {
      SupabaseProvider._attachStateBridge();
      return true;
    }
    return false;
  }
  if (!tryAttach()) {
    // Poll briefly; VSSupabase initializes synchronously after the CDN script loads.
    let tries = 0;
    const iv = setInterval(() => {
      if (tryAttach() || ++tries > 50) clearInterval(iv);
    }, 100);
  }

  window.VSIdentity = VSIdentity;
})(window);
