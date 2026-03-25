// VaultSpark Studios — Odds API Proxy Edge Function
// Keeps the Odds API key server-side. Only active Pro subscribers can call this.
//
// Deploy: supabase functions deploy odds
// Set secret: supabase secrets set ODDS_API_KEY=your_key_here
//
// Env vars required (set via Supabase dashboard → Edge Functions → Secrets):
//   ODDS_API_KEY          — from theodds-api.com
//   SUPABASE_URL          — auto-injected by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ODDS_API_KEY = Deno.env.get('ODDS_API_KEY') ?? '';
const ODDS_BASE    = 'https://api.the-odds-api.com/v4';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    // ── Auth check ────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization header' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify the JWT and get the user
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authErr || !user) {
      return json({ error: 'Invalid token' }, 401);
    }

    // ── Subscription check ────────────────────────────────────────
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .single();

    const isActive = sub?.status === 'active' &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

    if (!isActive) {
      return json({ error: 'Pro subscription required', code: 'SUBSCRIPTION_REQUIRED' }, 403);
    }

    // ── Proxy to The Odds API ─────────────────────────────────────
    const params  = new URL(req.url).searchParams;
    const sport   = params.get('sport')   ?? 'americanfootball_nfl';
    const markets = params.get('markets') ?? 'h2h';
    const regions = params.get('regions') ?? 'us';

    const oddsUrl = `${ODDS_BASE}/sports/${sport}/odds` +
      `?apiKey=${ODDS_API_KEY}&regions=${regions}&markets=${markets}&oddsFormat=american`;

    const oddsResp = await fetch(oddsUrl);

    if (!oddsResp.ok) {
      const errText = await oddsResp.text();
      return json({ error: 'Odds API error', detail: errText }, 502);
    }

    const oddsData = await oddsResp.json();

    // Pass through remaining quota headers for client info
    const quotaHeaders: Record<string, string> = {};
    ['x-requests-remaining', 'x-requests-used', 'x-requests-last'].forEach(h => {
      const v = oddsResp.headers.get(h);
      if (v) quotaHeaders[h] = v;
    });

    return new Response(JSON.stringify(oddsData), {
      headers: { ...CORS, 'Content-Type': 'application/json', ...quotaHeaders },
    });

  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

// ── Active sports list helper endpoint ───────────────────────────
// GET /functions/v1/odds/sports — returns available sports (no sub required for list)

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
