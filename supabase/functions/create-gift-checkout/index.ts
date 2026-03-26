// VaultSpark Studios — Gift VaultSparked Checkout
// Creates a one-time Stripe payment for gifting a 30-day VaultSparked subscription.
//
// Deploy: supabase functions deploy create-gift-checkout
// Secrets needed:
//   STRIPE_SECRET_KEY
//   STRIPE_GIFT_PRICE_ID   (one-time price for $4.99 gift — create in Stripe dashboard)
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

    // Authenticate gifter
    const { data: { user: gifter }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authErr || !gifter) return json({ error: 'Invalid token' }, 401);

    // Parse recipient username from body
    const body = await req.json().catch(() => ({}));
    const recipientUsername = (body?.recipient_username ?? '').trim().toLowerCase();
    if (!recipientUsername) return json({ error: 'recipient_username is required' }, 400);

    // Look up recipient
    const { data: recipient, error: rErr } = await supabase
      .from('vault_members')
      .select('id, username, is_sparked')
      .ilike('username', recipientUsername)
      .maybeSingle();

    if (rErr || !recipient) return json({ error: 'Member not found' }, 404);
    if (recipient.id === gifter.id) return json({ error: 'You cannot gift to yourself' }, 400);

    if (!GIFT_PRICE_ID) return json({ error: 'Gift subscriptions not yet configured' }, 503);

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

    return json({ url: session.url, recipient: recipient.username });

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
