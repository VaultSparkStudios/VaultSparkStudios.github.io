// create-checkout policy — pure decision logic (no network imports) so Node's
// type stripping can unit-test it (tests/s368-membership-checkout.unit.spec.mjs).
//
// D-S368.1: the studio sells VaultSparked ($4.99/mo) and VaultSparked Eternal
// ($29.99/mo), monthly only. Annual plans are "coming later" and are not
// buyable unless ANNUAL_ENABLED is explicitly switched on.

export const MONTHLY_PHASE_PLANS = ['vault_sparked', 'vault_sparked_pro'] as const;
export const ANNUAL_PLANS = ['vault_sparked_annual', 'vault_sparked_pro_annual'] as const;

// Statuses that mean a Stripe subscription still exists and can bill again.
// A second checkout while one of these is on file would double-bill the member.
export const LIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'unpaid'] as const;

export interface ExistingSubscription {
  plan?: string | null;
  status?: string | null;
  stripe_subscription_id?: string | null;
}

export interface PolicyRejection {
  status: number;
  body: Record<string, unknown>;
}

/** Strict opt-in env flag: only "true", "1", "yes" or "on" (any case) enable it. */
export function envFlagEnabled(value: string | null | undefined): boolean {
  return /^(true|1|yes|on)$/i.test(String(value ?? '').trim());
}

export function isAnnualPlan(plan: string): boolean {
  return (ANNUAL_PLANS as readonly string[]).includes(plan);
}

export function isMonthlyPhasePlan(plan: string): boolean {
  return (MONTHLY_PHASE_PLANS as readonly string[]).includes(plan);
}

/** Annual plans are refused unless the ANNUAL_ENABLED flag is explicitly on. */
export function annualGate(plan: string, annualEnabled: boolean): PolicyRejection | null {
  if (!isAnnualPlan(plan) || annualEnabled) return null;
  return {
    status: 400,
    body: {
      error: 'Annual plans are not offered yet. VaultSparked is billed monthly.',
      code: 'annual_not_offered',
    },
  };
}

export function isLiveSubscription(sub: ExistingSubscription | null | undefined): boolean {
  if (!sub) return false;
  return (LIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(String(sub.status ?? '').toLowerCase());
}

/**
 * Double-billing guard. `normalize` maps legacy aliases to canonical plan keys.
 * - no live subscription → null (checkout may proceed)
 * - same plan → 409 already_subscribed
 * - different plan → 409 plan_change_via_billing (client opens the Stripe billing portal)
 * A past_due/unpaid subscription on the same plan also routes to the portal so the
 * member can fix the card rather than start a second subscription.
 */
export function existingSubscriptionGate(
  requestedPlan: string,
  existing: ExistingSubscription | null | undefined,
  normalize: (plan: string) => string = (p) => p,
): PolicyRejection | null {
  if (!isLiveSubscription(existing)) return null;
  const status = String(existing!.status ?? '').toLowerCase();
  const currentPlan = normalize(String(existing!.plan ?? ''));
  const wanted = normalize(requestedPlan);
  if (currentPlan === wanted && (status === 'active' || status === 'trialing')) {
    return {
      status: 409,
      body: {
        error: 'You already have this membership.',
        code: 'already_subscribed',
        plan: currentPlan,
      },
    };
  }
  return {
    status: 409,
    body: {
      error: currentPlan === wanted
        ? 'Your membership has a billing issue. Update your payment method in the billing portal.'
        : 'You already have a membership. Change plans from the billing portal.',
      code: 'plan_change_via_billing',
      portal: true,
      current_plan: currentPlan,
      requested_plan: wanted,
    },
  };
}

/** Seed rows in phase54 used placeholder price IDs; never send those to Stripe. */
export function isUsablePriceId(priceId: unknown): priceId is string {
  return typeof priceId === 'string' && priceId.startsWith('price_') && !/REPLACE_ME/i.test(priceId);
}
