// VaultSpark Studios — Monthly Member Newsletter
// Sends a personalised digest to all active, opted-in vault members.
//
// Deploy: supabase functions deploy send-member-newsletter
// Secrets needed:
//   RESEND_API_KEY       — from resend.com
//   NEWSLETTER_FROM      — e.g. studio@vaultsparkstudios.com
//   APP_URL              — https://vaultsparkstudios.com
//   NEWSLETTER_SECRET    — Bearer token used by the GitHub Action
//
// Trigger: .github/workflows/member-newsletter.yml (1st of each month)
// Can also be triggered manually from the Supabase dashboard.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY')       ?? '';
const FROM_EMAIL        = Deno.env.get('NEWSLETTER_FROM')      ?? 'studio@vaultsparkstudios.com';
const APP_URL           = Deno.env.get('APP_URL')              ?? 'https://vaultsparkstudios.com';
const NEWSLETTER_SECRET = Deno.env.get('NEWSLETTER_SECRET')    ?? '';
const RANKS = [
  { min: 100000, name: 'The Sparked' },
  { min: 60000,  name: 'Forge Master' },
  { min: 30000,  name: 'Vault Keeper' },
  { min: 15000,  name: 'Void Operative' },
  { min: 7500,   name: 'Vault Breacher' },
  { min: 3000,   name: 'Vault Guard' },
  { min: 1000,   name: 'Rift Scout' },
  { min: 250,    name: 'Vault Runner' },
  { min: 0,      name: 'Spark Initiate' },
] as const;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function getRankTitle(points: number): string {
  return RANKS.find((rank) => points >= rank.min)?.name ?? 'Spark Initiate';
}

async function loadAuthEmailMap(supabase: ReturnType<typeof createClient>) {
  const emails = new Map<string, string>();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const users = data?.users ?? [];
    for (const user of users) {
      if (user.id && user.email) emails.set(user.id, user.email);
    }
    if (users.length < 1000) break;
    page += 1;
  }

  return emails;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const auth = req.headers.get('Authorization') ?? '';
  if (!NEWSLETTER_SECRET || auth !== `Bearer ${NEWSLETTER_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now      = new Date();
  const period   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthStr = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  // ── Get all opted-in members ─────────────────────────────────────────────
  const { data: members } = await supabase
    .from('vault_members')
    .select('id, username, points, created_at, newsletter_preferences(opted_out, unsubscribe_token)')
    .order('points', { ascending: false });

  if (!members || members.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'no_members' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authEmailMap = await loadAuthEmailMap(supabase);

  // ── Studio stats for everyone ─────────────────────────────────────────────
  const [totalMembersRes, activeMembersRes, topMembersRes] = await Promise.all([
    supabase.from('vault_members').select('id', { count: 'exact', head: true }),
    supabase.from('point_events')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo),
    supabase.from('vault_members')
      .select('username, points')
      .order('points', { ascending: false })
      .limit(3),
  ]);

  const totalMembers  = totalMembersRes.count ?? 0;
  const activeMembers = activeMembersRes.count ?? 0;
  const topMembers    = topMembersRes.data ?? [];

  let sent = 0;
  let errors = 0;

  for (const member of members) {
    // Skip opted-out
    const prefs = Array.isArray(member.newsletter_preferences)
      ? member.newsletter_preferences[0]
      : member.newsletter_preferences;
    if (prefs?.opted_out) continue;

    const email = authEmailMap.get(member.id);
    if (!email) continue;

    // Skip if already sent this period
    const { data: alreadySent } = await supabase
      .from('member_newsletter_log')
      .select('id')
      .eq('user_id', member.id)
      .eq('period', period)
      .maybeSingle();
    if (alreadySent) continue;

    // ── Personalise ──────────────────────────────────────────────────────
    const unsubToken  = prefs?.unsubscribe_token;
    const unsubUrl    = unsubToken ? `${APP_URL}/api/unsubscribe?token=${unsubToken}` : `${APP_URL}/vault-member/`;
    const memberSince = new Date(member.created_at);
    const isNew       = (now.getTime() - memberSince.getTime()) < 30 * 86400000;

    // Fetch member's recent activity
    const [recentXpRes, recentGamesRes] = await Promise.all([
      supabase.from('point_events')
        .select('points, label')
        .eq('user_id', member.id)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('game_sessions')
        .select('game_slug')
        .eq('user_id', member.id)
        .gte('played_at', thirtyDaysAgo),
    ]);

    const recentXp    = (recentXpRes.data ?? []).reduce((s: number, e: { points: number }) => s + e.points, 0);
    const gamesPlayed = new Set((recentGamesRes.data ?? []).map((g: { game_slug: string }) => g.game_slug));
    const isActive    = recentXp > 0 || gamesPlayed.size > 0;

    // Personalised greeting
    const greeting = isNew
      ? `Welcome to the vault, ${member.username}. You joined recently and we want to make sure you know what's here.`
      : isActive
        ? `You've been active in the vault lately — ${recentXp} XP earned this month. Here's what's new.`
        : `The forge has been busy. Here's what's happened in the vault this month.`;

    const personalSection = isActive
      ? `
        <tr><td style="padding:0 0 28px;">
          <div style="background:#0d1220;border:1px solid rgba(255,196,0,0.2);border-radius:12px;padding:20px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#FFC400;margin-bottom:8px;">Your Activity This Month</div>
            <div style="font-size:22px;font-weight:800;color:#ffffff;margin-bottom:4px;">${recentXp.toLocaleString()} XP</div>
            <div style="font-size:13px;color:#8b9bb4;">Current rank: <strong style="color:#e2e8f0;">${getRankTitle(member.points || 0)}</strong></div>
            ${gamesPlayed.size > 0 ? `<div style="font-size:13px;color:#8b9bb4;margin-top:4px;">Games played: ${Array.from(gamesPlayed).join(', ')}</div>` : ''}
          </div>
        </td></tr>`
      : '';

    // Top 3 members section
    const topMembersHtml = topMembers.length > 0 ? `
      <tr><td style="padding:0 0 28px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8b9bb4;margin-bottom:12px;">Top Members This Month</div>
        ${topMembers.map((m: { username: string; points: number }, i: number) => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:15px;font-weight:800;color:#FFC400;width:20px;">#${i + 1}</span>
          <div>
            <div style="font-size:14px;font-weight:700;color:#e2e8f0;">${m.username}</div>
            <div style="font-size:12px;color:#8b9bb4;">${getRankTitle(m.points || 0)} · ${(m.points || 0).toLocaleString()} pts</div>
          </div>
        </div>`).join('')}
      </td></tr>` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>VaultSpark Studios — ${monthStr} Dispatch</title>
</head>
<body style="margin:0;padding:0;background:#080c18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080c18;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr><td style="padding:0 0 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#FFC400;">VaultSpark Studios</td>
            <td align="right" style="font-size:12px;color:#4a5568;">${monthStr} Dispatch</td>
          </tr>
        </table>
        <div style="height:1px;background:rgba(255,196,0,0.2);margin-top:16px;"></div>
      </td></tr>

      <!-- Greeting -->
      <tr><td style="padding:0 0 28px;">
        <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;color:#ffffff;margin:0 0 12px;line-height:1.2;">Signal from the Forge</h1>
        <p style="font-size:15px;color:#8b9bb4;line-height:1.7;margin:0;">${greeting}</p>
      </td></tr>

      <!-- Personal activity -->
      ${personalSection}

      <!-- Studio stats -->
      <tr><td style="padding:0 0 28px;">
        <div style="background:#0d1220;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8b9bb4;margin-bottom:16px;">Vault Stats</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:0 8px 0 0;">
                <div style="font-size:24px;font-weight:800;color:#ffffff;">${totalMembers.toLocaleString()}</div>
                <div style="font-size:11px;color:#4a5568;margin-top:2px;">Total Members</div>
              </td>
              <td align="center" style="padding:0 8px;">
                <div style="font-size:24px;font-weight:800;color:#FFC400;">${activeMembers.toLocaleString()}</div>
                <div style="font-size:11px;color:#4a5568;margin-top:2px;">Active This Month</div>
              </td>
            </tr>
          </table>
        </div>
      </td></tr>

      <!-- Top members -->
      ${topMembersHtml}

      <!-- CTAs -->
      <tr><td style="padding:0 0 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:8px;width:50%;">
              <a href="${APP_URL}/vault-member/" style="display:block;text-align:center;padding:12px;background:#FFC400;color:#000000;font-size:13px;font-weight:800;text-decoration:none;border-radius:10px;">Open Vault Dashboard</a>
            </td>
            <td style="padding-left:8px;width:50%;">
              <a href="${APP_URL}/journal/" style="display:block;text-align:center;padding:12px;background:rgba(255,255,255,0.06);color:#e2e8f0;font-size:13px;font-weight:800;text-decoration:none;border-radius:10px;border:1px solid rgba(255,255,255,0.1);">Read Signal Log</a>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:24px;">
        <p style="font-size:12px;color:#4a5568;margin:0;line-height:1.6;">
          You're receiving this because you're a vault member at vaultsparkstudios.com.<br>
          <a href="${unsubUrl}" style="color:#4a5568;">Unsubscribe</a> &nbsp;·&nbsp;
          <a href="${APP_URL}/privacy/" style="color:#4a5568;">Privacy Policy</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;

    // Send email
    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      email,
        subject: `VaultSpark Studios — ${monthStr} Dispatch`,
        html,
      }),
    });

    if (sendRes.ok) {
      await supabase.from('member_newsletter_log').insert({ user_id: member.id, period, status: 'sent' });
      sent++;
    } else {
      errors++;
    }

    // Throttle: 2 emails/second to stay within Resend free tier
    await new Promise((r) => setTimeout(r, 500));
  }

  return new Response(JSON.stringify({ ok: true, sent, errors, period }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
});
