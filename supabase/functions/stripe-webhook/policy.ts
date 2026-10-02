// stripe-webhook policy — pure decision logic (no network imports) so Node's
// type stripping can unit-test it (tests/s368-membership-checkout.unit.spec.mjs).

export const PHASE_PLANS = ['vault_sparked', 'vault_sparked_pro'] as const;

// D-S368.1: a gift lasts 30 days. Older sessions may carry another duration in
// metadata; clamp so no gift grant can outlive the ruling.
export const GIFT_MAX_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A phase slot (grandfather price seat) is counted only once the member has
 * actually paid: a completed subscription Checkout whose payment settled
 * ('paid', or 'no_payment_required' for a fully discounted first invoice).
 */
export function shouldClaimPhaseSlot(input: {
  mode?: string | null;
  plan: string;
  paymentStatus?: string | null;
}): boolean {
  if (input.mode !== 'subscription') return false;
  if (!(PHASE_PLANS as readonly string[]).includes(input.plan)) return false;
  return input.paymentStatus === 'paid' || input.paymentStatus === 'no_payment_required';
}

/** Parse the enrolled phase from session metadata; null when absent or invalid. */
export function parsePhase(value: unknown): number | null {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(n) && n > 0 && n < 100 ? n : null;
}

export function giftDurationDays(raw: unknown): number {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isInteger(n) || n <= 0) return GIFT_MAX_DAYS;
  return Math.min(n, GIFT_MAX_DAYS);
}

export function giftExpiresAt(nowMs: number, durationDays: number): string {
  return new Date(nowMs + giftDurationDays(durationDays) * DAY_MS).toISOString();
}

/**
 * Which vault_members update a gift grant should make. A gift never downgrades
 * a VaultSparked Eternal member to VaultSparked.
 */
export function giftMemberUpdate(
  recipient: { plan_key?: string | null } | null | undefined,
): { is_sparked: true; plan_key: string } | null {
  if (recipient?.plan_key === 'vault_sparked_pro') return null;
  return { is_sparked: true, plan_key: 'vault_sparked' };
}

/** Stripe status → the status stored on subscriptions (keeps 'trialing' visible to the double-billing guard). */
export function storedSubscriptionStatus(stripeStatus: string | null | undefined): string {
  return stripeStatus === 'active' || stripeStatus === 'trialing' ? stripeStatus : 'inactive';
}
