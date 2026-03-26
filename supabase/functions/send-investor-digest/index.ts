// VaultSpark Studios — Monthly Investor Digest
// Generates and emails a studio KPI digest to all active investors.
//
// Deploy: supabase functions deploy send-investor-digest
// Secrets needed:
//   RESEND_API_KEY     — from resend.com (free tier: 3k emails/month)
//   DIGEST_FROM_EMAIL  — e.g. studio@vaultsparkstudios.com
//   APP_URL            — https://vaultsparkstudios.com
//   DIGEST_SECRET      — any random string; passed as Bearer token by the GitHub Action
//
// Trigger: GitHub Action (.github/workflows/investor-digest.yml) calls this on the 1st of each month.
// Can also be called manually from Supabase dashboard for testing.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY')  ?? '';
const FROM_EMAIL      = Deno.env.get('DIGEST_FROM_EMAIL') ?? 'studio@vaultsparkstudios.com';
const APP_URL         = Deno.env.get('APP_URL')          ?? 'https://vaultsparkstudios.com';
const DIGEST_SECRET   = Deno.env.get('DIGEST_SECRET')    ?? '';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Verify caller is the GitHub Action (or a manual admin trigger)
  const auth = req.headers.get('Authorization') ?? '';
  if (!DIGEST_SECRET || auth !== `Bearer ${DIGEST_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now      = new Date();
  const period   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthStr = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Dedup: don't send twice in the same period
  const { data: alreadySent } = await supabase
    .from('investor_digest_log')
    .select('id')
    .eq('period', period)
    .maybeSingle();

  if (alreadySent) {
    return new Response(JSON.stringify({ skipped: true, reason: 'already_sent', period }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Gather KPIs ─────────────────────────────────────────────────────────
  const [membersRes, newMembersRes, sparkedRes, topMembersRes] = await Promise.all([
    supabase.from('vault_members').select('id', { count: 'exact', head: true }),
    supabase.from('vault_members')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString())
      .lt('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString()),
    supabase.from('vault_members')
      .select('id', { count: 'exact', head: true })
      .eq('is_sparked', true),
    supabase.from('vault_members')
      .select('username, points')
      .order('points', { ascending: false })
      .limit(5),
  ]);

  const totalMembers = membersRes.count  ?? 0;
  const newMembers   = newMembersRes.count ?? 0;
  const sparkedCount = sparkedRes.count   ?? 0;
  const topMembers   = (topMembersRes.data ?? []) as { username: string; points: number }[];

  // ── Get investors ────────────────────────────────────────────────────────
  const { data: investors } = await supabase
    .from('investors')
    .select('email, full_name')
    .eq('status', 'approved');

  const recipients = (investors ?? []) as { email: string; full_name: string }[];
  if (!recipients.length) {
    await logDigest(supabase, period, 0, 'no_recipients');
    return new Response(JSON.stringify({ sent: 0, reason: 'no_recipients' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Build HTML email ─────────────────────────────────────────────────────
  const topMembersRows = topMembers.map((m, i) =>
    `<tr>
      <td style="padding:6px 12px;color:#94a3b8;">#${i + 1}</td>
      <td style="padding:6px 12px;font-weight:600;color:#f1f5f9;">${esc(m.username)}</td>
      <td style="padding:6px 12px;color:#ffc400;">${m.points.toLocaleString()} pts</td>
    </tr>`
  ).join('');

  function buildHtml(recipientName: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0d16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0d16;padding:40px 20px;">
    <tr><td>
      <table width="600" align="center" cellpadding="0" cellspacing="0" style="max-width:600px;background:#12151f;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0d1526,#1a1030);padding:36px 40px 28px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#ffc400;">VaultSpark Studios</p>
          <h1 style="margin:0;font-size:26px;font-weight:700;color:#f1f5f9;">Monthly Studio Update</h1>
          <p style="margin:8px 0 0;font-size:15px;color:#94a3b8;">${monthStr}</p>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0;font-size:15px;line-height:1.7;color:#94a3b8;">Hi ${esc(recipientName)},</p>
          <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#94a3b8;">Here's your monthly look at what's happening inside the Vault. Thank you for your continued support.</p>
        </td></tr>

        <!-- KPI row -->
        <tr><td style="padding:28px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="text-align:center;padding:20px 10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;">
                <p style="margin:0;font-size:28px;font-weight:800;color:#f1f5f9;">${totalMembers.toLocaleString()}</p>
                <p style="margin:6px 0 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Total Members</p>
              </td>
              <td width="4%"></td>
              <td width="29%" style="text-align:center;padding:20px 10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;">
                <p style="margin:0;font-size:28px;font-weight:800;color:#10b981;">+${newMembers.toLocaleString()}</p>
                <p style="margin:6px 0 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">New Last Month</p>
              </td>
              <td width="4%"></td>
              <td width="30%" style="text-align:center;padding:20px 10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,196,0,0.1);border-radius:12px;border-color:rgba(255,196,0,0.15);">
                <p style="margin:0;font-size:28px;font-weight:800;color:#ffc400;">${sparkedCount.toLocaleString()}</p>
                <p style="margin:6px 0 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">VaultSparked</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Top Members -->
        ${topMembers.length ? `
        <tr><td style="padding:0 40px 28px;">
          <p style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Top Members This Month</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;overflow:hidden;">
            ${topMembersRows}
          </table>
        </td></tr>` : ''}

        <!-- CTA -->
        <tr><td style="padding:0 40px 36px;">
          <a href="${APP_URL}/investor-portal/" style="display:inline-block;padding:13px 28px;background:linear-gradient(135deg,#ffc400,#ff9500);color:#0a0d16;font-weight:700;font-size:14px;text-decoration:none;border-radius:10px;">View Investor Portal →</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:12px;color:#475569;line-height:1.7;">You're receiving this because you are a registered investor with VaultSpark Studios. Questions? Reply to this email or visit <a href="${APP_URL}/investor-portal/" style="color:#ffc400;">the portal</a>.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  // ── Send via Resend ──────────────────────────────────────────────────────
  let successCount = 0;
  let lastError    = '';

  for (const investor of recipients) {
    const html = buildHtml(investor.full_name || 'Investor');
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    `VaultSpark Studios <${FROM_EMAIL}>`,
          to:      [investor.email],
          subject: `VaultSpark Studios — ${monthStr} Studio Update`,
          html,
        }),
      });
      if (res.ok) {
        successCount++;
      } else {
        const body = await res.text();
        lastError = `Resend error ${res.status}: ${body}`;
        console.error(lastError);
      }
    } catch (err) {
      lastError = String(err);
      console.error('Email send error:', err);
    }
  }

  await logDigest(supabase, period, successCount, lastError || undefined);

  return new Response(JSON.stringify({ sent: successCount, total: recipients.length, period }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function logDigest(
  supabase: ReturnType<typeof createClient>,
  period: string,
  recipients: number,
  error?: string,
) {
  await supabase.from('investor_digest_log').insert({ period, recipients, error: error ?? null });
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
