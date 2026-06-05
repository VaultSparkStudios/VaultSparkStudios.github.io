/**
 * VaultSpark Studios — Investor Portal Auth Gate
 *
 * Loaded on every /investor-portal/ page (except /investor-portal/login/).
 * - Checks for an active Supabase session
 * - Validates the user has an active investor record
 * - Stores profile in window.VSInvestorProfile
 * - Dispatches 'investor:ready' on success
 * - Redirects to /investor-portal/login/ on any failure
 *
 * Requires: supabase-client.js (window.VSSupabase)
 */
(function (window) {
  'use strict';

  const LOGIN_URL = '/investor-portal/login/';
  const CONSENT_KEY = 'vs_inv_activity_consent';
  const CONSENT_GRANTED = 'granted';
  const CONSENT_DENIED = 'denied';

  function readConsent() {
    try { return window.localStorage.getItem(CONSENT_KEY); } catch (_) { return null; }
  }
  function writeConsent(value) {
    try { window.localStorage.setItem(CONSENT_KEY, value); } catch (_) {}
    document.dispatchEvent(new CustomEvent('investor:consent-change', { detail: { consent: value } }));
  }
  function hasLoggingConsent() {
    return readConsent() === CONSENT_GRANTED;
  }

  function renderConsentBanner() {
    if (document.getElementById('inv-consent-banner')) return;
    var banner = document.createElement('aside');
    banner.id = 'inv-consent-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Activity logging consent');
    banner.style.cssText = [
      'position:fixed','left:50%','bottom:1.25rem','transform:translateX(-50%)',
      'z-index:9999','max-width:560px','width:calc(100% - 2rem)',
      'background:rgba(10,13,22,0.96)','border:1px solid rgba(255,196,0,0.28)',
      'border-radius:14px','padding:1rem 1.1rem','box-shadow:0 18px 48px rgba(0,0,0,0.45)',
      'color:#f3f4f6','font-size:0.9rem','line-height:1.55','font-family:inherit'
    ].join(';');
    banner.innerHTML = '\n      <div style="font-weight:700;color:#FFC400;margin-bottom:0.35rem;font-size:0.78rem;letter-spacing:0.1em;text-transform:uppercase;">Activity logging consent</div>\n      <p style="margin:0 0 0.8rem 0;color:#d6dbe6;">We log portal activity (updates you read, questions you send, documents you open) to keep the investor audit trail accurate and to let the studio owner respond to you personally. Logging is off until you choose.</p>\n      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:flex-end;">\n        <button type="button" data-inv-consent="deny" style="padding:0.55rem 1rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.14);border-radius:999px;color:#d6dbe6;font-weight:600;font-size:0.86rem;cursor:pointer;font-family:inherit;">Not now</button>\n        <button type="button" data-inv-consent="grant" style="padding:0.55rem 1.1rem;background:linear-gradient(135deg,#FFC400,#FF7A00);border:0;border-radius:999px;color:#000;font-weight:800;font-size:0.86rem;cursor:pointer;font-family:inherit;">Allow activity logging</button>\n      </div>\n      <p style="margin:0.7rem 0 0 0;font-size:0.78rem;color:#8892a6;">Change this anytime from your <a href="/investor-portal/profile/" style="color:#FFC400;text-decoration:underline;">profile</a>.</p>\n    ';
    banner.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-inv-consent]') : null;
      if (!btn) return;
      var action = btn.getAttribute('data-inv-consent');
      writeConsent(action === 'grant' ? CONSENT_GRANTED : CONSENT_DENIED);
      if (action === 'grant') {
        VSSupabase.rpc('log_investor_action', {
          p_action: 'login',
          p_target_label: 'portal_access'
        }).catch(function () {});
        VSSupabase.rpc('log_investor_action', {
          p_action: 'consent_granted',
          p_target_label: 'activity_logging'
        }).catch(function () {});
      }
      banner.remove();
    });
    document.body.appendChild(banner);
  }

  // ── Page gate: hide page until auth resolves ────────────────────
  function showGate() {
    // Already hidden via body.inv-loading — inject spinner overlay
    const gate = document.createElement('div');
    gate.id = 'invPageGate';
    gate.className = 'inv-page-gate';
    gate.innerHTML = '<img class="inv-gate-logo" src="/assets/logo.png" alt="" /><div class="inv-gate-spinner"></div>';
    document.body.appendChild(gate);
    document.body.classList.add('inv-loading');
  }

  function hideGate() {
    document.body.classList.remove('inv-loading');
    const gate = document.getElementById('invPageGate');
    if (gate) {
      gate.classList.add('hidden');
      setTimeout(() => gate.remove(), 350);
    }
  }

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
    showGate();

    // Supabase client must be available
    if (!window.VSSupabase) {
      redirect('missing_client');
      return;
    }

    // 1. Check session
    const { data: { session }, error: sessionError } = await VSSupabase.auth.getSession();

    if (sessionError || !session) {
      redirect();
      return;
    }

    // 2. Check if vaultspark admin — try RPC first, fall back to direct query
    let isAdmin = false;
    try {
      const { data: adminRpc } = await VSSupabase.rpc('is_vault_admin');
      isAdmin = !!adminRpc;
    } catch (_) {}

    if (!isAdmin) {
      const { data: vm } = await VSSupabase
        .from('vault_members')
        .select('username_lower')
        .eq('id', session.user.id)
        .maybeSingle();
      isAdmin = vm?.username_lower === 'vaultspark';
    }

    if (isAdmin) {
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
      hideGate();
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

    // 4. Log the login action (only if consent granted — GDPR opt-in)
    if (hasLoggingConsent()) {
      VSSupabase.rpc('log_investor_action', {
        p_action: 'login',
        p_target_label: 'portal_access'
      }).catch(() => {});
    } else if (readConsent() === null) {
      // First-time investor — surface consent banner once auth UI settles
      setTimeout(renderConsentBanner, 600);
    }

    // 5. Set up session refresh on tab refocus
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        VSSupabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) redirect();
        });
      }
    });

    // 6. Signal ready
    hideGate();
    window.dispatchEvent(new CustomEvent('investor:ready', { detail: profile }));
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  const VSInvestorAuth = {
    /** Returns the current investor profile (available after investor:ready fires) */
    getProfile() {
      return window.VSInvestorProfile || null;
    },

    /** Logs an action to investor_activity via the RPC. GDPR: no-op unless the
     *  investor has explicitly opted in via the consent banner / profile toggle. */
    async logAction(action, targetId, targetLabel, metadata) {
      if (!hasLoggingConsent()) return;
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

    /** Returns 'granted' | 'denied' | null. */
    getConsent() { return readConsent(); },

    /** Sets consent programmatically (from the profile toggle). */
    setConsent(value) {
      if (value !== CONSENT_GRANTED && value !== CONSENT_DENIED) return;
      writeConsent(value);
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
