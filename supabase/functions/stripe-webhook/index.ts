// VaultSpark Studios — Stripe Webhook Edge Function
// Handles subscription lifecycle events from Stripe.
// Three-tier: vault_sparked (VaultSparked), vault_sparked_pro (VaultSparked Eternal),
//             promogrind_pro (legacy)
// Phase slots: checkout.session.completed claims the grandfather slot once per
//   paid session via claim_phase_slot() (create-checkout only reads the price).
// Gifts: every grant records gift_subscriptions.expires_at (max 30 days,
//   D-S368.1); expire_gift_sparked() clears expired gift-only access.
//
// Deploy: supabase functions deploy stripe-webhook
// Set secrets:
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//
// In Stripe dashboard → Webhooks → Add endpoint:
//   URL: https://<project-ref>.supabase.co/functions/v1/stripe-webhook
//   Events: checkout.session.completed, customer.subscription.updated,
//           customer.subscription.deleted, invoice.payment_failed, invoice.paid

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { isVaultSparkedPlan, isVaultSparkedProPlan, normalizePlanKey } from '../_shared/membershipAccess.ts';
import {
  giftDurationDays,
  giftExpiresAt,
  giftMemberUpdate,
  parsePhase,
  shouldClaimPhaseSlot,
  storedSubscriptionStatus,
} from './policy.ts';

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
    return new Response('Webhook signature verification failed', { status: 400 });
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
          const durationDays = giftDurationDays(session.metadata?.duration_days);

          if (!recipientId || !gifterId) {
            console.error('gift checkout: missing recipient_id or gifter_id');
            break;
          }

          // Idempotent on Stripe retries: one grant per checkout session.
          const { data: priorGift } = await supabase
            .from('gift_subscriptions')
            .select('id')
            .eq('stripe_session_id', session.id)
            .limit(1);
          if (priorGift && priorGift.length > 0) break;

          const expiresAt = giftExpiresAt(Date.now(), durationDays);

          await supabase.from('gift_subscriptions').insert({
            gifter_id:         gifterId,
            recipient_id:      recipientId,
            stripe_session_id: session.id,
            duration_days:     durationDays,
            activated_at:      new Date().toISOString(),
            expires_at:        expiresAt,
          });

          // Never downgrade a VaultSparked Eternal recipient.
          const { data: recipientRow } = await supabase
            .from('vault_members')
            .select('plan_key')
            .eq('id', recipientId)
            .maybeSingle();
          const memberUpdate = giftMemberUpdate(recipientRow);
          if (memberUpdate) {
            await supabase.from('vault_members')
              .update(memberUpdate)
              .eq('id', recipientId);
          }

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
        const stripePriceId = session.metadata?.stripe_price_id ?? null;
        const enrolledPhase = parseInt(session.metadata?.enrolled_phase ?? '1', 10);

        await supabase.from('subscriptions').upsert({
          user_id:                userId,
          stripe_customer_id:     customerId,
          stripe_subscription_id: subscriptionId,
          plan,
          status:                 storedSubscriptionStatus(sub.status),
          current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
          stripe_price_id:        stripePriceId,
          enrolled_phase:         enrolledPhase,
          updated_at:             new Date().toISOString(),
        }, { onConflict: 'user_id' });

        // Sync is_sparked flag and plan_key
        if (sub.status === 'active' && isVaultSparkedPlan(plan)) {
          await supabase.from('vault_members')
            .update({ is_sparked: true, plan_key: plan })
            .eq('id', userId);
        }

        // Count the grandfather phase slot now that payment settled. Idempotent
        // per session id (membership_phase_claims), so Stripe retries are safe.
        if (shouldClaimPhaseSlot({ mode: session.mode, plan, paymentStatus: session.payment_status })) {
          const { data: claim, error: claimError } = await supabase.rpc('claim_phase_slot', {
            p_plan:       plan,
            p_session_id: session.id,
            p_phase:      parsePhase(session.metadata?.enrolled_phase),
            p_user_id:    userId,
          });
          if (claimError || !claim?.ok) {
            // Membership is already active; a missed count must not fail the webhook.
            console.error('claim_phase_slot error:', claimError, claim);
          }
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

        // Sync is_sparked flag and plan_key
        const { data: subRow } = await supabase
          .from('subscriptions').select('user_id').eq('stripe_subscription_id', sub.id).single();
        if (subRow?.user_id) {
          const isSparked = active && isVaultSparkedPlan(plan);
          const newPlanKey = isSparked ? plan : 'free';
          await supabase.from('vault_members')
            .update({ is_sparked: isSparked, plan_key: newPlanKey })
            .eq('id', subRow.user_id);
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

        // Remove is_sparked flag and reset plan_key
        const { data: subRow } = await supabase
          .from('subscriptions').select('user_id').eq('stripe_subscription_id', sub.id).single();
        if (subRow?.user_id && isVaultSparkedPlan(plan)) {
          await supabase.from('vault_members')
            .update({ is_sparked: false, plan_key: 'free' })
            .eq('id', subRow.user_id);
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

        // Remove is_sparked and reset plan_key on failed payment
        const { data: subRow } = await supabase
          .from('subscriptions').select('user_id').eq('stripe_subscription_id', subId).single();
        if (subRow?.user_id && isVaultSparkedPlan(plan)) {
          await supabase.from('vault_members')
            .update({ is_sparked: false, plan_key: 'free' })
            .eq('id', subRow.user_id);
        }

        break;
      }

      // ── Invoice paid → award monthly XP ─────────────────────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;

        // Only handle subscription cycle renewals
        if (invoice.billing_reason !== 'subscription_cycle') break;

        const subId = invoice.subscription as string;
        if (!subId) break;

        // Look up local subscription record
        const { data: subRow } = await supabase
          .from('subscriptions')
          .select('user_id, plan, last_monthly_xp_at')
          .eq('stripe_subscription_id', subId)
          .maybeSingle();

        if (!subRow?.user_id) break;

        const plan = normalizePlanKey(subRow.plan ?? 'vault_sparked');

        // Only award XP for Sparked plans
        if (!isVaultSparkedPlan(plan)) break;

        const now = new Date();
        const lastXpAt = subRow.last_monthly_xp_at ? new Date(subRow.last_monthly_xp_at) : null;
        const daysSinceLastXp = lastXpAt
          ? (now.getTime() - lastXpAt.getTime()) / (1000 * 60 * 60 * 24)
          : Infinity;

        // Award if never awarded or last award was > 28 days ago
        if (daysSinceLastXp > 28) {
          const monthKey = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
          const isPro    = isVaultSparkedProPlan(plan);
          const points   = isPro ? 1000 : 500;
          const reason   = isPro
            ? `monthly_xp_pro_${monthKey}`
            : `monthly_xp_sparked_${monthKey}`;

          await supabase.rpc('award_points_for_user', {
            p_user_id:  subRow.user_id,
            p_reason:   reason,
            p_points:   points,
            p_label:    isPro ? 'Monthly Eternal XP Drop' : 'Monthly Sparked XP Drop',
            p_once_per: 'month',
            p_source:   'subscription_renewal',
          }).catch((err: Error) => console.error('award_points_for_user error:', err));

          // Update last_monthly_xp_at
          await supabase.from('subscriptions')
            .update({ last_monthly_xp_at: now.toISOString() })
            .eq('stripe_subscription_id', subId);
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
    return new Response('Internal error', { status: 500 });
  }
});
