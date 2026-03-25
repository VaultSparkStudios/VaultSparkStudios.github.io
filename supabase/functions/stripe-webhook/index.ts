// VaultSpark Studios — Stripe Webhook Edge Function
// Handles subscription lifecycle events from Stripe.
//
// Deploy: supabase functions deploy stripe-webhook
// Set secrets:
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//
// In Stripe dashboard → Webhooks → Add endpoint:
//   URL: https://<project-ref>.supabase.co/functions/v1/stripe-webhook
//   Events: checkout.session.completed, customer.subscription.updated,
//           customer.subscription.deleted, invoice.payment_failed

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(`Webhook error: ${err}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    switch (event.type) {

      // ── New checkout completed → activate subscription ──────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const customerId     = session.customer as string;
        const subscriptionId = session.subscription as string;
        const userId         = session.metadata?.vault_user_id;

        if (!userId) {
          console.error('checkout.session.completed: missing vault_user_id in metadata');
          break;
        }

        const sub = await stripe.subscriptions.retrieve(subscriptionId);

        await supabase.from('subscriptions').upsert({
          user_id:                userId,
          stripe_customer_id:     customerId,
          stripe_subscription_id: subscriptionId,
          plan:                   'pro',
          status:                 sub.status === 'active' ? 'active' : 'inactive',
          current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
          updated_at:             new Date().toISOString(),
        }, { onConflict: 'user_id' });

        break;
      }

      // ── Subscription updated (renewal, upgrade, downgrade) ──────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;

        await supabase.from('subscriptions')
          .update({
            status:             sub.status === 'active' ? 'active' : sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at:         new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);

        break;
      }

      // ── Subscription deleted / canceled ─────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;

        await supabase.from('subscriptions')
          .update({
            status:     'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);

        break;
      }

      // ── Payment failed → mark past_due ──────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId   = invoice.subscription as string;

        await supabase.from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subId);

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Handler error:', err);
    return new Response(`Handler error: ${err}`, { status: 500 });
  }
});
