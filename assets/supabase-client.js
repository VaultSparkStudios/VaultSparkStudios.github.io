/**
 * VaultSpark Studios — Supabase Shared Client
 *
 * Loaded on every page that needs auth. Exposes:
 *   window.VSSupabase  — the Supabase client instance
 *   window.VSGate      — cross-domain redirect helpers
 *   window.VAULT_GATED_APPS — registry of all Vault-gated tools
 *
 * ─── SETUP ────────────────────────────────────────────────────
 * Replace the two placeholder strings below with your project values.
 * Find them in: supabase.com → project → Settings → API
 * ─────────────────────────────────────────────────────────────
 */
(function (window) {
  'use strict';

  const SUPABASE_URL      = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
  const VAULT_MEMBER_LOGIN = 'https://vaultsparkstudios.com/vault-member/';

  // ── Gated App Registry ──────────────────────────────────────────────────────
  // Add an entry here whenever a new tool/app/platform should require
  // Vault Member login. The `key` becomes the ?next= param value.
  // ────────────────────────────────────────────────────────────────────────────
  const VAULT_GATED_APPS = {
    promogrind: {
      name: 'PromoGrind',
      url:  'https://promogrind.com',
      desc: 'Sportsbook promo conversion calculators — Vault Members only',
    },
    // ── Future entries (uncomment and fill in when ready) ──
    // vaultfront: {
    //   name: 'VaultFront',
    //   url:  'https://play-vaultfront.vaultsparkstudios.com',
    //   desc: 'Convoy strategy warfront — Vault Members get early access',
    // },
    // mindframe: {
    //   name: 'MindFrame',
    //   url:  'https://mindframe.vaultsparkstudios.com',
    //   desc: 'Cognitive puzzle platform — Vault Members only',
    // },
  };

  // ── Create Supabase client ──────────────────────────────────────────────────
  // Requires the Supabase CDN script to be loaded before this file.
  // <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ── VSGate: redirect helper for vault-member page ──────────────────────────
  // After a successful login/signup, vault-member calls VSGate.redirect(session)
  // which sends the access token to the originating app via URL hash.
  const VSGate = {
    /**
     * Returns the ?next= URL param if present and it matches a gated app.
     * Returns null if no valid next param exists.
     */
    getNextUrl() {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('next');
      if (!raw) return null;
      try {
        const decoded = decodeURIComponent(raw);
        // Only redirect to known gated app origins for security
        const known = Object.values(VAULT_GATED_APPS).map(a => new URL(a.url).origin);
        // Also allow same-origin (studio site itself)
        known.push(window.location.origin);
        const origin = new URL(decoded).origin;
        return known.includes(origin) ? decoded : null;
      } catch {
        return null;
      }
    },

    /**
     * After login, redirect to the ?next= app with auth tokens in the URL hash.
     * The receiving app calls supabase.auth.setSession() to establish its session.
     */
    redirect(session) {
      const next = this.getNextUrl();
      if (!next) return false;
      const base = next.replace(/\/$/, '');
      const hash = `access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}&type=vault_access`;
      window.location.href = `${base}/#${hash}`;
      return true;
    },

    /** Returns the gated app name for the current ?next= param, or null. */
    getNextAppName() {
      const next = this.getNextUrl();
      if (!next) return null;
      try {
        const origin = new URL(next).origin;
        const app = Object.values(VAULT_GATED_APPS).find(a => new URL(a.url).origin === origin);
        return app ? app.name : null;
      } catch {
        return null;
      }
    },
  };

  // ── Expose globals ──────────────────────────────────────────────────────────
  window.VSSupabase       = sb;
  window.VSGate           = VSGate;
  window.VAULT_GATED_APPS = VAULT_GATED_APPS;
  window.VAULT_MEMBER_LOGIN = VAULT_MEMBER_LOGIN;

})(window);
