/**
 * send-push — Supabase Edge Function (Deno)
 *
 * Triggered by a Supabase Database Webhook on classified_files INSERT.
 * Fetches all push subscriptions and sends a Web Push notification to each.
 *
 * ─── Setup ────────────────────────────────────────────────────────────────────
 *
 * 1. Generate VAPID keys (run once, save both values):
 *      npx web-push generate-vapid-keys
 *
 * 2. Supabase Edge Function Environment Variables
 *    Dashboard → Edge Functions → send-push → Secrets:
 *      VAPID_PUBLIC_KEY      — your VAPID public key (also paste into vault-member/index.html)
 *      VAPID_PRIVATE_KEY     — your VAPID private key (keep server-side only)
 *      VAPID_SUBJECT         — mailto:hello@vaultsparkstudios.com
 *      SUPABASE_URL          — auto-injected by Supabase
 *      SUPABASE_SERVICE_ROLE_KEY — your service role key (to bypass RLS for bulk read)
 *
 * 3. Database Webhook
 *    Dashboard → Database → Webhooks → Create:
 *      Table:  classified_files
 *      Events: INSERT
 *      URL:    <Edge Function URL>
 *
 * 4. Deploy:
 *      supabase functions deploy send-push
 * ──────────────────────────────────────────────────────────────────────────────
 */

import webpush from 'npm:web-push@3';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT')     ?? 'mailto:hello@vaultsparkstudios.com';
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function notificationFor(payload: any) {
  const record = payload.record ?? {};
  const metadata = record.metadata ?? payload.metadata ?? {};
  const table = payload.table ?? payload.table_name ?? '';
  const category = payload.category ?? record.category ?? record.event_type ?? record.type;

  if (category === 'drop_shipped' || category === 'public_ship' || category === 'sparked_drop') {
    const title = metadata.title ?? record.title ?? payload.title ?? 'A new VaultSpark drop';
    return {
      title: 'New SPARKED Drop',
      body: `${title} is live in the vault.`,
      url: metadata.url ?? record.url ?? payload.url ?? '/changelog/',
    };
  }

  if (category === 'leaderboard_overtake') {
    const username = metadata.username ?? record.username ?? payload.username ?? 'Someone';
    const position = metadata.position ?? record.position ?? payload.position;
    const game = metadata.game_title ?? metadata.gameSlug ?? record.game_slug ?? 'the leaderboard';
    return {
      title: 'Leaderboard Overtake',
      body: `${username} took ${position ? `#${position}` : 'a top spot'} on ${game}.`,
      url: metadata.url ?? record.url ?? payload.url ?? '/leaderboards/',
    };
  }

  if (category === 'challenge_live' || category === 'challenge_done') {
    const title = metadata.title ?? record.title ?? 'A vault challenge moved';
    return {
      title: category === 'challenge_live' ? 'Challenge Live' : 'Challenge Cleared',
      body: title,
      url: metadata.url ?? record.url ?? '/vault-member/#challenges',
    };
  }

  if (table === 'classified_files' || record.title) {
    return {
      title: 'New Classified File — Vault Archive',
      body: record.title
        ? `"${record.title}" has been declassified. Check the Vault Archive.`
        : 'A new classified file has been added to the Vault Archive.',
      url: '/vault-member/#archive',
    };
  }

  return null;
}

async function serve(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const payload = await req.json();

    // Only handle INSERT events on classified_files
    if (payload.type !== 'INSERT') {
      return new Response(JSON.stringify({ skipped: 'not_insert' }), { status: 200 });
    }

    const notification = notificationFor(payload);
    if (!notification) {
      return new Response(JSON.stringify({ skipped: 'unsupported_category' }), { status: 200 });
    }
    const notifPayload = JSON.stringify(notification);

    // Fetch all push subscriptions (service role bypasses RLS)
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys, user_id');

    if (error || !subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 });
    }

    // Send push to all subscriptions; remove stale ones (410 Gone)
    const stale: string[] = [];
    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            notifPayload
          );
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            stale.push(sub.endpoint);
          }
        }
      })
    );

    // Clean up expired subscriptions
    if (stale.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', stale);
    }

    return new Response(
      JSON.stringify({ ok: true, sent: subs.length - stale.length, removed: stale.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-push error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Deno.serve is available in newer Supabase Edge Function runtimes
// @ts-ignore
Deno.serve(serve);
