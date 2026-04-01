// VaultSpark Studios — Gift VaultSparked Checkout
// Creates a one-time Stripe payment for gifting a 30-day VaultSparked subscription.
//
// Deploy: supabase functions deploy create-gift-checkout
// Secrets needed:
//   STRIPE_SECRET_KEY
//   STRIPE_GIFT_PRICE_ID   (one-time price for a $24.99 VaultSparked gift — create in Stripe dashboard)
//   APP_URL

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});
const APP_URL = Deno.env.get('APP_URL') ?? 'https://vaultsparkstudios.com';
const GIFT_PRICE_ID = Deno.env.get('STRIPE_GIFT_PRICE_ID') ?? '';

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

    // Authenticate gifter
    const { data: { user: gifter }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authErr || !gifter) return json({ error: 'Invalid token' }, cors, 401);

    // Parse recipient username from body
    const body = await req.json().catch(() => ({}));
    const recipientUsername = (body?.recipient_username ?? '').trim().toLowerCase();
    if (!recipientUsername) return json({ error: 'recipient_username is required' }, cors, 400);

    // Look up recipient
    const { data: recipient, error: rErr } = await supabase
      .from('vault_members')
      .select('id, username, is_sparked')
      .ilike('username', recipientUsername)
      .maybeSingle();

    if (rErr || !recipient) return json({ error: 'Member not found' }, cors, 404);
    if (recipient.id === gifter.id) return json({ error: 'You cannot gift to yourself' }, cors, 400);

    if (!GIFT_PRICE_ID) return json({ error: 'Gift subscriptions not yet configured' }, cors, 503);

    // Check recipient isn't already VaultSparked (optional — allow gifting anyway as extension)
    // We allow it; the webhook will refresh their expiry.

    const session = await stripe.checkout.sessions.create({
      mode:                 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price:    GIFT_PRICE_ID,
        quantity: 1,
      }],
      success_url: `${APP_URL}/vault-member/?gift=success&to=${encodeURIComponent(recipient.username)}`,
      cancel_url:  `${APP_URL}/vault-member/?gift=canceled`,
      metadata: {
        gift:           'true',
        gifter_id:      gifter.id,
        recipient_id:   recipient.id,
        recipient_name: recipient.username,
        duration_days:  '30',
      },
    });

    return json({ url: session.url, recipient: recipient.username }, cors);

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
