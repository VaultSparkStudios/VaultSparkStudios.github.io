// VaultSpark Studios — Stripe Checkout Session Creator
// Plans: vault_sparked (VaultSparked), vault_sparked_pro (VaultSparked Eternal),
//        phase-aware monthly; promogrind_pro (legacy env-var).
// D-S368.1: monthly only. vault_sparked_annual / vault_sparked_pro_annual are
//        refused with 400 annual_not_offered unless ANNUAL_ENABLED=true.
// Double billing: a caller with a live subscription gets 409 already_subscribed
//        (same plan) or 409 plan_change_via_billing + portal:true (other plan).
// Phase slots: the session is priced with current_phase_price(); the slot is
//        only counted on payment, by stripe-webhook via claim_phase_slot().
//
// Deploy: supabase functions deploy create-checkout
// Set secrets:
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//   supabase secrets set APP_URL=https://vaultsparkstudios.com
// Optional (default off): ANNUAL_ENABLED=true re-opens annual checkout.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { normalizePlanKey } from '../_shared/membershipAccess.ts';
import {
  annualGate,
  envFlagEnabled,
  existingSubscriptionGate,
  isAnnualPlan,
  isMonthlyPhasePlan,
  isUsablePriceId,
} from './policy.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const APP_URL = Deno.env.get('APP_URL') ?? 'https://vaultsparkstudios.com';
const ANNUAL_ENABLED = envFlagEnabled(Deno.env.get('ANNUAL_ENABLED'));

const SUCCESS_URLS: Record<string, string> = {
  vault_sparked:          `${APP_URL}/vault-member/?checkout=success&plan=sparked`,
  vault_sparked_annual:   `${APP_URL}/vault-member/?checkout=success&plan=sparked&billing=annual`,
  vault_sparked_pro:      `${APP_URL}/vault-member/?checkout=success&plan=pro`,
  vault_sparked_pro_annual: `${APP_URL}/vault-member/?checkout=success&plan=pro&billing=annual`,
  promogrind_pro:         `${APP_URL}/promogrind/?checkout=success`,
};

// Fixed annual Stripe price IDs — not phase-gated (annual is a flat rate).
// Only reachable when ANNUAL_ENABLED is on; annual is not offered (D-S368.1).
const ANNUAL_PRICE_IDS: Record<string, string> = {
  vault_sparked_annual:     'price_1TNJPfGMN60PfJYsHKVkjL12',
  vault_sparked_pro_annual: 'price_1TNJPtGMN60PfJYsAXZYQNVj',
};

function buildCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && origin === APP_URL ? origin : APP_URL;
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

serve(async (req: Request) => {
  const cors = buildCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, cors, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (error || !user) return json({ error: 'Invalid token' }, cors, 401);

    // Parse request body
    let requestedPlan = 'vault_sparked';
    let promoCode: string | null = null;
    try {
      const body = await req.json();
      if (body?.plan) requestedPlan = String(body.plan);
      if (body?.promo_code) promoCode = String(body.promo_code).trim() || null;
    } catch { /* no body or invalid JSON — use defaults */ }
    const plan = normalizePlanKey(requestedPlan);

    // Annual is not offered (D-S368.1) unless explicitly re-enabled.
    const annualRejection = annualGate(plan, ANNUAL_ENABLED);
    if (annualRejection) return json(annualRejection.body, cors, annualRejection.status);

    // Existing subscription row (one per user — stripe-webhook upserts on user_id).
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, plan, status')
      .eq('user_id', user.id)
      .maybeSingle();

    // Double-billing guard for VaultSparked / VaultSparked Eternal.
    if (isMonthlyPhasePlan(plan) || isAnnualPlan(plan)) {
      const rejection = existingSubscriptionGate(plan, sub, normalizePlanKey);
      if (rejection) return json(rejection.body, cors, rejection.status);
    }

    // Phase-based plans: read the current phase price. The slot itself is only
    // claimed when payment completes (stripe-webhook → claim_phase_slot).
    let priceId: string;
    let enrolledPhase = 1;

    if (ANNUAL_PRICE_IDS[plan]) {
      // Annual plans — fixed price, no phase slot needed (ANNUAL_ENABLED only).
      priceId = ANNUAL_PRICE_IDS[plan];
    } else if (isMonthlyPhasePlan(plan)) {
      const { data: phaseData, error: phaseError } = await supabase
        .rpc('current_phase_price', { p_plan: plan });

      if (phaseError || !phaseData?.ok) {
        console.error('current_phase_price error:', phaseError, phaseData);
        return json({ error: 'Plan unavailable' }, cors, 400);
      }

      if (!isUsablePriceId(phaseData.stripe_price_id)) {
        return json({ error: 'No price ID configured for this phase' }, cors, 400);
      }
      priceId = phaseData.stripe_price_id;
      enrolledPhase = Number(phaseData.phase) || 1;
    } else if (plan === 'promogrind_pro') {
      // Legacy plan — still use env var
      priceId = Deno.env.get('STRIPE_PRICE_ID') ?? '';
      if (!priceId) return json({ error: `No price configured for plan: ${plan}` }, cors, 400);
    } else {
      return json({ error: `Unknown plan: ${plan}` }, cors, 400);
    }

    // Look up or create Stripe customer
    let customerId: string | undefined;
    if (sub?.stripe_customer_id) {
      customerId = sub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { vault_user_id: user.id },
      });
      customerId = customer.id;
    }

    const successUrl = SUCCESS_URLS[plan] ?? `${APP_URL}/vault-member/?checkout=success`;

    // Build session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer:             customerId,
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items:           [{ price: priceId, quantity: 1 }],
      success_url:          successUrl,
      cancel_url:           `${APP_URL}/vault-member/?checkout=canceled`,
      metadata: {
        vault_user_id:  user.id,
        plan,
        stripe_price_id: priceId,
        enrolled_phase:  String(enrolledPhase),
      },
      subscription_data: {
        metadata: {
          vault_user_id:  user.id,
          plan,
          stripe_price_id: priceId,
          enrolled_phase:  String(enrolledPhase),
        },
      },
    };

    // Promo code support
    if (promoCode) {
      const promoCodes = await stripe.promotionCodes.list({
        code:   promoCode,
        active: true,
        limit:  1,
      });
      if (promoCodes.data.length === 0) {
        return json({ error: 'invalid_promo_code' }, cors, 400);
      }
      sessionParams.discounts = [{ promotion_code: promoCodes.data[0].id }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return json({ url: session.url }, cors);

  } catch (err) {
    console.error('create-checkout error:', err);
    return json({ error: 'Internal error' }, cors, 500);
  }
});

function json(body: unknown, cors: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
