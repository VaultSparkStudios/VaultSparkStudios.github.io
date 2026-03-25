// VaultSpark Studios — Stripe Checkout Session Creator
// Creates a hosted Stripe Checkout session.
// Supports two plans:
//   vault_sparked — $24.99/month studio-wide membership (STRIPE_VAULT_SPARKED_PRICE_ID)
//   pro           — legacy PromoGrind-only Pro plan    (STRIPE_PRICE_ID)
//
// Deploy: supabase functions deploy create-checkout
// Set secrets:
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//   supabase secrets set STRIPE_VAULT_SPARKED_PRICE_ID=price_...  (VaultSparked $24.99/mo)
//   supabase secrets set STRIPE_PRICE_ID=price_...                (legacy PromoGrind Pro, optional)
//   supabase secrets set APP_URL=https://vaultsparkstudios.com

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});
const PRICE_IDS: Record<string, string> = {
  vault_sparked: Deno.env.get('STRIPE_VAULT_SPARKED_PRICE_ID') ?? '',
  pro:           Deno.env.get('STRIPE_PRICE_ID') ?? '',
};
const APP_URL = Deno.env.get('APP_URL') ?? 'https://vaultsparkstudios.com';
const SUCCESS_URLS: Record<string, string> = {
  vault_sparked: `${APP_URL}/vault-member/?checkout=success`,
  pro:           `${APP_URL}/promogrind/?checkout=success`,
};

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (error || !user) return json({ error: 'Invalid token' }, 401);

    // Determine plan from request body (default: vault_sparked)
    let plan = 'vault_sparked';
    try {
      const body = await req.json();
      if (body?.plan && PRICE_IDS[body.plan]) plan = body.plan;
    } catch { /* no body or invalid JSON — use default */ }

    const priceId = PRICE_IDS[plan];
    if (!priceId) return json({ error: `No price configured for plan: ${plan}` }, 400);

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

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items:           [{ price: priceId, quantity: 1 }],
      success_url:          successUrl,
      cancel_url:           `${APP_URL}/vault-member/?checkout=canceled`,
      metadata:             { vault_user_id: user.id, plan },
      subscription_data:    { metadata: { vault_user_id: user.id, plan } },
    });

    return json({ url: session.url });

  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
