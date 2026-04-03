// VaultSpark Studios — Stripe Checkout Session Creator
// Three-tier membership: vault_sparked, vault_sparked_pro, promogrind_pro (legacy)
// Phase-aware pricing via reserve_phase_slot RPC.
//
// Deploy: supabase functions deploy create-checkout
// Set secrets:
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//   supabase secrets set APP_URL=https://vaultsparkstudios.com

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { normalizePlanKey } from '../_shared/membershipAccess.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const APP_URL = Deno.env.get('APP_URL') ?? 'https://vaultsparkstudios.com';

const SUCCESS_URLS: Record<string, string> = {
  vault_sparked:     `${APP_URL}/vault-member/?checkout=success&plan=sparked`,
  vault_sparked_pro: `${APP_URL}/vault-member/?checkout=success&plan=pro`,
  promogrind_pro:    `${APP_URL}/promogrind/?checkout=success`,
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

    // For phase-based plans, reserve a slot to get the correct price ID
    let priceId: string;
    let enrolledPhase = 1;

    if (plan === 'vault_sparked' || plan === 'vault_sparked_pro') {
      const { data: slotData, error: slotError } = await supabase
        .rpc('reserve_phase_slot', { p_plan_key: plan });

      if (slotError || !slotData?.ok) {
        console.error('reserve_phase_slot error:', slotError, slotData);
        return json({ error: 'Plan unavailable' }, cors, 400);
      }

      priceId = slotData.stripe_price_id as string;
      enrolledPhase = (slotData.phase as number) ?? 1;

      if (!priceId) {
        return json({ error: 'No price ID configured for this phase' }, cors, 400);
      }
    } else if (plan === 'promogrind_pro') {
      // Legacy plan — still use env var
      priceId = Deno.env.get('STRIPE_PRICE_ID') ?? '';
      if (!priceId) return json({ error: `No price configured for plan: ${plan}` }, cors, 400);
    } else {
      return json({ error: `Unknown plan: ${plan}` }, cors, 400);
    }

    // Look up or create Stripe customer
    let customerId: string | undefined;
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

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
    return json({ error: String(err) }, cors, 500);
  }
});

function json(body: unknown, cors: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
