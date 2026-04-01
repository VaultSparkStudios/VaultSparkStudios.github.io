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
import { isVaultSparkedPlan, normalizePlanKey } from '../_shared/membershipAccess.ts';

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

        // ── Gift subscription (one-time payment mode) ────────────
        if (session.metadata?.gift === 'true') {
          const recipientId  = session.metadata?.recipient_id;
          const gifterId     = session.metadata?.gifter_id;
          const durationDays = parseInt(session.metadata?.duration_days ?? '30', 10);

          if (!recipientId || !gifterId) {
            console.error('gift checkout: missing recipient_id or gifter_id');
            break;
          }

          const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

          await supabase.from('gift_subscriptions').insert({
            gifter_id:         gifterId,
            recipient_id:      recipientId,
            stripe_session_id: session.id,
            duration_days:     durationDays,
            activated_at:      new Date().toISOString(),
            expires_at:        expiresAt,
          });

          await supabase.from('vault_members')
            .update({ is_sparked: true })
            .eq('id', recipientId);

          // Award gifter 50 bonus points
          await supabase.from('point_events').insert({
            member_id:   gifterId,
            points:      50,
            reason:      'gift_sub_sent',
            description: `Gifted VaultSparked to ${session.metadata?.recipient_name ?? 'a member'}`,
          }).catch(() => {});

          break;
        }

        // ── Regular subscription checkout ────────────────────────
        if (session.mode !== 'subscription') break;

        const customerId     = session.customer as string;
        const subscriptionId = session.subscription as string;
        const userId         = session.metadata?.vault_user_id;

        if (!userId) {
          console.error('checkout.session.completed: missing vault_user_id in metadata');
          break;
        }

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const plan = normalizePlanKey((session.metadata?.plan ?? sub.metadata?.plan ?? 'vault_sparked') as string);

        await supabase.from('subscriptions').upsert({
          user_id:                userId,
          stripe_customer_id:     customerId,
          stripe_subscription_id: subscriptionId,
          plan,
          status:                 sub.status === 'active' ? 'active' : 'inactive',
          current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
          updated_at:             new Date().toISOString(),
        }, { onConflict: 'user_id' });

        // Sync is_sparked flag → triggers assign-discord-role webhook
        if (sub.status === 'active' && isVaultSparkedPlan(plan)) {
          await supabase.from('vault_members').update({ is_sparked: true }).eq('id', userId);
        }

        break;
      }

      // ── Subscription updated (renewal, upgrade, downgrade) ──────
      case 'customer.subscription.updated': {
        const sub    = event.data.object as Stripe.Subscription;
        const active = sub.status === 'active';
        const plan = normalizePlanKey((sub.metadata?.plan ?? 'vault_sparked') as string);

        await supabase.from('subscriptions')
          .update({
            plan,
            status:             active ? 'active' : sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at:         new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);

        // Sync is_sparked flag → triggers assign-discord-role webhook
        const { data: subRow } = await supabase
          .from('subscriptions').select('user_id').eq('stripe_subscription_id', sub.id).single();
        if (subRow?.user_id) {
          await supabase.from('vault_members').update({ is_sparked: active && isVaultSparkedPlan(plan) }).eq('id', subRow.user_id);
        }

        break;
      }

      // ── Subscription deleted / canceled ─────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const plan = normalizePlanKey((sub.metadata?.plan ?? 'vault_sparked') as string);

        await supabase.from('subscriptions')
          .update({ plan, status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);

        // Remove is_sparked flag → triggers assign-discord-role webhook
        const { data: subRow } = await supabase
          .from('subscriptions').select('user_id').eq('stripe_subscription_id', sub.id).single();
        if (subRow?.user_id && isVaultSparkedPlan(plan)) {
          await supabase.from('vault_members').update({ is_sparked: false }).eq('id', subRow.user_id);
        }

        break;
      }

      // ── Payment failed → mark past_due ──────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId   = invoice.subscription as string;
        const subRes = await stripe.subscriptions.retrieve(subId);
        const plan = normalizePlanKey((subRes.metadata?.plan ?? 'vault_sparked') as string);

        await supabase.from('subscriptions')
          .update({ plan, status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subId);

        // Remove is_sparked on failed payment
        const { data: subRow } = await supabase
          .from('subscriptions').select('user_id').eq('stripe_subscription_id', subId).single();
        if (subRow?.user_id && isVaultSparkedPlan(plan)) {
          await supabase.from('vault_members').update({ is_sparked: false }).eq('id', subRow.user_id);
        }

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
