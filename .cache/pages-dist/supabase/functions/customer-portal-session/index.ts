// VaultSpark Studios — Customer Portal Session Creator
// Creates a Stripe Billing Portal session for subscription management.
//
// Deploy: supabase functions deploy customer-portal-session
// Set secrets:
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//   supabase secrets set APP_URL=https://vaultsparkstudios.com

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const APP_URL = Deno.env.get('APP_URL') ?? 'https://vaultsparkstudios.com';

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
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: cors });
  }

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

    // Look up Stripe customer ID
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return json({ error: 'No subscription found' }, cors, 404);
    }

    // Create Stripe Billing Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   sub.stripe_customer_id,
      return_url: `${APP_URL}/vault-member/?tab=settings`,
    });

    return json({ url: portalSession.url }, cors);

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
