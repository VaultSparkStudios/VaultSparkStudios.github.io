/**
 * VaultSpark Studios — Investor Portal Auth Gate
 *
 * Loaded on every /investor/ page (except /investor/login/).
 * - Checks for an active Supabase session
 * - Validates the user has an active investor record
 * - Stores profile in window.VSInvestorProfile
 * - Dispatches 'investor:ready' on success
 * - Redirects to /investor/login/ on any failure
 *
 * Requires: supabase-client.js (window.VSSupabase)
 */
(function (window) {
  'use strict';

  const LOGIN_URL = '/investor/login/';

  function getRedirectUrl(errorCode) {
    const base = window.location.origin + LOGIN_URL;
    const next = encodeURIComponent(window.location.href);
    return errorCode
      ? `${base}?error=${errorCode}&next=${next}`
      : `${base}?next=${next}`;
  }

  function redirect(errorCode) {
    window.location.replace(getRedirectUrl(errorCode));
  }

  async function initInvestorAuth() {
    // Supabase client must be available
    if (!window.VSSupabase) {
      console.error('[investor-auth] VSSupabase not found — check script load order');
      return;
    }

    // 1. Check session
    const { data: { session }, error: sessionError } = await VSSupabase.auth.getSession();

    if (sessionError || !session) {
      redirect();
      return;
    }

    // 2. Check if vaultspark admin — always allowed, bypasses investor table check
    const { data: adminCheck } = await VSSupabase
      .from('vault_members')
      .select('username_lower, points')
      .eq('id', session.user.id)
      .maybeSingle();

    if (adminCheck?.username_lower === 'vaultspark') {
      window.VSInvestorProfile = {
        display_name:       'VaultSpark Studios',
        entity_type:        'firm',
        tier:               'strategic',
        status:             'active',
        investment_amount:  null,
        equity_percentage:  null,
        investment_date:    null,
        onboarded_at:       new Date().toISOString(),
        update_count:       0,
        document_count:     0,
        is_admin:           true,
      };
      window.dispatchEvent(new CustomEvent('investor:ready', {
        detail: window.VSInvestorProfile
      }));
      return;
    }

    // 3. Fetch investor profile via RPC
    const { data: profile, error: rpcError } = await VSSupabase
      .rpc('get_my_investor_profile');

    if (rpcError || !profile) {
      await VSSupabase.auth.signOut();
      redirect('rpc_error');
      return;
    }

    if (profile.error) {
      // Not an investor or inactive
      await VSSupabase.auth.signOut();
      redirect('not_investor');
      return;
    }

    // 3. Store profile globally
    window.VSInvestorProfile = profile;

    // 4. Log the login action (best-effort, non-blocking)
    VSSupabase.rpc('log_investor_action', {
      p_action: 'login',
      p_target_label: 'portal_access'
    }).catch(() => {});

    // 5. Set up session refresh on tab refocus
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        VSSupabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) redirect();
        });
      }
    });

    // 6. Signal ready
    window.dispatchEvent(new CustomEvent('investor:ready', { detail: profile }));
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  const VSInvestorAuth = {
    /** Returns the current investor profile (available after investor:ready fires) */
    getProfile() {
      return window.VSInvestorProfile || null;
    },

    /** Logs an action to investor_activity via the RPC */
    async logAction(action, targetId, targetLabel, metadata) {
      try {
        await VSSupabase.rpc('log_investor_action', {
          p_action:       action,
          p_target_id:    targetId    || null,
          p_target_label: targetLabel || null,
          p_metadata:     metadata    || {}
        });
      } catch (e) {
        // non-blocking
      }
    },

    /** Signs the investor out and redirects to login */
    async signOut() {
      await VSSupabase.auth.signOut();
      window.location.href = LOGIN_URL;
    },

    /** Returns true if the current investor tier meets the required tier */
    hasTierAccess(requiredTier) {
      const tiers = { standard: 0, lead: 1, strategic: 2 };
      const profile = this.getProfile();
      if (!profile) return false;
      return (tiers[profile.tier] || 0) >= (tiers[requiredTier] || 0);
    }
  };

  window.VSInvestorAuth = VSInvestorAuth;

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInvestorAuth);
  } else {
    initInvestorAuth();
  }

})(window);
