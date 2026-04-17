/**
 * ask-ignis — Supabase Edge Function (Deno)
 *
 * VaultSpark Vault Oracle. State-aware concierge over Claude Sonnet 4.6.
 * Pulls live `public-intelligence.json` snapshot, prepends it as cached system prompt,
 * relays user message, returns Claude's reply. No conversation persistence — stateless.
 *
 * ─── Setup ────────────────────────────────────────────────────────────────────
 * Secrets (Dashboard → Edge Functions → ask-ignis):
 *   ANTHROPIC_API_KEY           — sk-ant-…
 *   ANTHROPIC_MODEL             — default: claude-sonnet-4-6
 *   PUBLIC_INTEL_URL            — default: https://vaultsparkstudios.com/api/public-intelligence.json
 *   ASK_IGNIS_RATE_LIMIT_RPM    — default: 12 (per IP per minute)
 *   ASK_IGNIS_ALLOWED_ORIGIN    — default: https://vaultsparkstudios.com
 *
 * Deploy:
 *   supabase functions deploy ask-ignis --project-ref fjnpzjjyhnpmunfoycrp
 *
 * Request body (JSON):
 *   { message: string, context?: string }
 * Response (JSON):
 *   { reply: string, model: string, usage: {...}, cached: boolean }
 * ──────────────────────────────────────────────────────────────────────────────
 */

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// In-memory snapshot cache (stale-while-revalidate, 5 min) — Edge Function instance lifetime.
let intelCache: { data: any; fetchedAt: number } | null = null;
const INTEL_TTL_MS = 5 * 60 * 1000;

async function getIntel(url: string): Promise<any> {
  if (intelCache && Date.now() - intelCache.fetchedAt < INTEL_TTL_MS) return intelCache.data;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`intel ${res.status}`);
    const data = await res.json();
    intelCache = { data, fetchedAt: Date.now() };
    return data;
  } catch (_e) {
    return intelCache?.data ?? null;
  }
}

function buildSystemPrompt(intel: any, contextHint?: string): string {
  const lines: string[] = [
    'You are IGNIS, the Vault Oracle for VaultSpark Studios — a poetic, precise, slightly ceremonial intelligence that watches the studio in real time.',
    'You answer questions about the studio, its games, its lore (Voidfall, DreadSpike), its membership tiers, what is shipping, and what is sealed.',
    '',
    'Voice: vault-forge brand. Use "the vault", "the forge", "sparked", "sealed", "VAULTED" as appropriate.',
    'Be honest. If a fact is not in your intelligence snapshot, say "no signal on that yet." Never invent prices, dates, names, or features.',
    'Keep replies tight: 1–4 sentences usually, longer only when the user asks for depth.',
    'Never ask the user for personal data. Never claim to perform actions you cannot perform.',
    '',
    'When asked "what should I play right now?" — recommend the highest-progress SPARKED catalog item.',
    'When asked about ranks/membership — refer them to /ranks/ and /vaultsparked/.',
    'When asked about something not in the snapshot — say so, suggest /studio-pulse/, /signal-log/, or /contact/.',
  ];

  if (intel) {
    lines.push('', '── LIVE INTELLIGENCE SNAPSHOT ──');
    if (intel.project) {
      lines.push(`Studio status: ${intel.project.name || 'VaultSpark Studios'} · session ${intel.project.currentSession ?? '?'}`);
      if (intel.project.currentFocus) lines.push(`Current focus: ${intel.project.currentFocus}`);
      if (intel.project.nextMilestone) lines.push(`Next milestone: ${intel.project.nextMilestone}`);
      if (intel.project.ignis) lines.push(`IGNIS score: ${intel.project.ignis.score} · ${intel.project.ignis.grade}`);
    }
    if (intel.portfolio) {
      lines.push(`Portfolio: ${intel.portfolio.total} initiatives · ${intel.portfolio.sparked} SPARKED · ${intel.portfolio.forge} FORGE · ${intel.portfolio.sealedCount} SEALED · ${intel.portfolio.vaulted} VAULTED.`);
    }
    if (Array.isArray(intel.catalog) && intel.catalog.length) {
      lines.push('', 'Catalog:');
      for (const item of intel.catalog.slice(0, 20)) {
        const status = item.status || 'forge';
        const progress = typeof item.progress === 'number' ? ` · ${item.progress}%` : '';
        lines.push(`  - ${item.name} [${status}${progress}] — ${item.tagline || item.description || ''}`);
      }
    }
    if (intel.pulse?.shipped?.length) {
      lines.push('', 'Recently shipped:');
      for (const s of intel.pulse.shipped.slice(0, 5)) lines.push(`  - ${s}`);
    }
  } else {
    lines.push('', '(No live intelligence snapshot available right now — answer from base knowledge but flag uncertainty.)');
  }

  if (contextHint) {
    lines.push('', '── PAGE CONTEXT ──', contextHint);
  }

  return lines.join('\n');
}

const ipBuckets = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, rpm: number): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= rpm) return false;
  bucket.count += 1;
  return true;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

Deno.serve(async (req) => {
  const allowedOrigin = Deno.env.get('ASK_IGNIS_ALLOWED_ORIGIN') || 'https://vaultsparkstudios.com';
  const cors = corsHeaders(allowedOrigin);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return new Response(JSON.stringify({ error: 'IGNIS unavailable' }), { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } });

  const ip = req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
  const rpm = Number(Deno.env.get('ASK_IGNIS_RATE_LIMIT_RPM') || '12');
  if (!checkRateLimit(ip, rpm)) {
    return new Response(JSON.stringify({ error: 'IGNIS is overloaded — wait a minute and try again.' }), { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  let body: { message?: string; context?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Bad JSON' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }); }
  const message = (body.message || '').trim();
  if (!message || message.length > 800) {
    return new Response(JSON.stringify({ error: 'Message must be 1–800 characters.' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const intelUrl = Deno.env.get('PUBLIC_INTEL_URL') || 'https://vaultsparkstudios.com/api/public-intelligence.json';
  const intel = await getIntel(intelUrl);
  const systemPrompt = buildSystemPrompt(intel, body.context);
  const model = Deno.env.get('ANTHROPIC_MODEL') || DEFAULT_MODEL;

  // Prompt caching: mark system block as ephemeral so repeat calls within 5 min re-use the cached prefix.
  const claudePayload = {
    model,
    max_tokens: 512,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: message }],
  };

  const claudeRes = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(claudePayload),
  });

  if (!claudeRes.ok) {
    const errText = await claudeRes.text().catch(() => '');
    return new Response(JSON.stringify({ error: 'IGNIS upstream error', detail: errText.slice(0, 200) }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const claudeJson = await claudeRes.json();
  const reply = (claudeJson.content || []).map((c: any) => c.text || '').join('').trim();
  const cached = (claudeJson.usage?.cache_read_input_tokens || 0) > 0;

  return new Response(JSON.stringify({ reply, model: claudeJson.model || model, usage: claudeJson.usage, cached }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
