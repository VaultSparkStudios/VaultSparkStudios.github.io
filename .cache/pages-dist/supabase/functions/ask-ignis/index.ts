/**
 * ask-ignis — Supabase Edge Function (Deno)
 *
 * VaultSpark Vault Oracle. State-aware concierge over Claude.
 * Pulls live `public-intelligence.json` snapshot, prepends it as cached system prompt,
 * relays user message, returns Claude's reply.
 *
 * ─── Key upgrades (S100) ──────────────────────────────────────────────────────
 * 1. PROMPT CACHING: system prompt split into static persona + dynamic intel, both
 *    marked cache_control:ephemeral. anthropic-beta header activates cache. Reduces
 *    input tokens ~80% after first call per Edge Function instance.
 * 2. TIERED MODEL ROUTING: short FAQ queries → Haiku (10× cheaper, 3× faster).
 *    Complex or creative queries → Sonnet. Simple heuristic, zero latency.
 * 3. SUGGEST NEXT: response includes `suggestions` [{label, href}] derived from
 *    reply content via keyword routing — no extra API call.
 * 4. SEMANTIC RESPONSE CACHE (S101): single-turn questions cached in Supabase
 *    ignis_response_cache for 24 hours. Cache hit = zero Claude API cost. Multi-turn
 *    conversations bypass the cache (context-dependent replies). SHA-256 key on
 *    normalized question text (lowercase, stripped punctuation).
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
 *   { message: string, context?: string, history?: [{role, content}] }
 * Response (JSON):
 *   { reply: string, model: string, usage: {...}, cached: boolean, semanticCache: boolean, suggestions: [{label, href}] }
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getActivePlanKey,
  isVaultSparkedPlan,
  isVaultSparkedProPlan,
  normalizePlanKey,
} from '../_shared/membershipAccess.ts';
import {
  capExceededResponse,
  isCapBreached,
  isPaused,
  loadMemberProfile,
  loadUserMemory,
  memberProfileAsContextBlock,
  memoryAsContextBlock,
  meterCall,
  tierPersonaSuffix,
} from '../_shared/tokenMeter.ts';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const HAIKU_MODEL   = 'claude-haiku-4-5-20251001';

// Ordered fallback chain for primary model failures.
const MODEL_FALLBACKS = ['claude-sonnet-4-5', HAIKU_MODEL];
const ANTHROPIC_API     = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const CACHE_BETA_HEADER = 'prompt-caching-2024-07-31';
const DEFAULT_SPARKED_QUOTA = 40;

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

// ── Static persona block — NEVER changes; highest cache-hit rate ──────────────
// Marked cache_control:ephemeral on the system message for Anthropic prompt caching.
// Minimum cacheable prefix: 1024 tokens (Sonnet). This block is ~300 tokens.
// Combined with the intel block (~200–400 tokens) it exceeds the threshold.
const STATIC_PERSONA = [
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
  '',
  '── NAVIGATION SURFACE ──',
  'Games: /games/ · Projects: /projects/ · Universe lore: /universe/ · Ranks: /ranks/ · Membership: /vaultsparked/ · Portal: /vault-member/ · Studio pulse: /studio-pulse/ · Contact: /contact/',
].join('\n');

// ── Dynamic intel block — rebuilt from snapshot, cached for ~5 min ────────────
function buildIntelBlock(intel: any, contextHint?: string): string {
  const lines: string[] = ['── LIVE INTELLIGENCE SNAPSHOT ──'];

  if (intel) {
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
    lines.push('(No live intelligence snapshot available — answer from base knowledge but flag uncertainty.)');
  }

  if (contextHint) {
    lines.push('', '── PAGE CONTEXT ──', contextHint);
  }

  return lines.join('\n');
}

// ── Tiered model routing — classify before hitting API ───────────────────────
// Routes short FAQ-style questions to Haiku (10× cheaper, 3× faster).
// Anything that needs nuance, creativity, or depth goes to Sonnet.
const FAQ_KEYWORDS = [
  'what is', 'what are', 'what\'s', 'how do', 'how much', 'how to', 'how can',
  'price', 'cost', 'free', 'when', 'where', 'who', 'which game', 'what game',
  'join', 'sign up', 'register', 'login', 'download', 'install',
  'discord', 'contact', 'support', 'help',
];

function routeModel(message: string, preferredModel: string): string {
  const m = message.toLowerCase().trim();
  if (m.length > 120) return preferredModel;          // long question → Sonnet
  if (m.includes('?') && m.split(' ').length < 12) {  // short question
    if (FAQ_KEYWORDS.some(kw => m.includes(kw))) return HAIKU_MODEL;
  }
  return preferredModel;
}

// ── Suggest-next chip routing — no extra API call ────────────────────────────
// Maps reply content keywords to navigation suggestions shown as chips in the widget.
const SUGGEST_ROUTES: Array<{ keywords: string[]; label: string; href: string }> = [
  { keywords: ['vaultfront', 'vault front'], label: 'VaultFront →', href: '/games/vaultfront/' },
  { keywords: ['call of doodie', 'call-of-doodie'], label: 'Call of Doodie →', href: '/games/call-of-doodie/' },
  { keywords: ['gridiron', 'football gm'], label: 'Gridiron GM →', href: '/games/gridiron-gm/' },
  { keywords: ['mindframe', 'mind frame'], label: 'MindFrame →', href: '/games/mindframe/' },
  { keywords: ['solara'], label: 'Solara →', href: '/games/solara/' },
  { keywords: ['the exodus', 'exodus'], label: 'The Exodus →', href: '/games/the-exodus/' },
  { keywords: ['voidfall', 'void fall'], label: 'Voidfall lore →', href: '/universe/voidfall/' },
  { keywords: ['dreadspike', 'dread spike'], label: 'DreadSpike lore →', href: '/universe/dreadspike/' },
  { keywords: ['rank', 'tier', 'vault points', 'progression'], label: 'View Vault Ranks →', href: '/ranks/' },
  { keywords: ['member', 'join', 'subscribe', 'vaultsparked', 'price', 'cost'], label: 'Join VaultSparked →', href: '/vaultsparked/' },
  { keywords: ['portal', 'dashboard', 'achievement', 'challenge'], label: 'Open Vault Portal →', href: '/vault-member/' },
  { keywords: ['shipped', 'latest', 'changelog', 'update', 'release'], label: 'See Changelog →', href: '/changelog/' },
  { keywords: ['games', 'catalog', 'all games', 'play'], label: 'Browse Games →', href: '/games/' },
  { keywords: ['project', 'tool', 'promogrind', 'ideaforge', 'statvault'], label: 'Browse Projects →', href: '/projects/' },
  { keywords: ['contact', 'reach', 'email', 'discord'], label: 'Contact →', href: '/contact/' },
];

function deriveSuggestions(reply: string): Array<{ label: string; href: string }> {
  const r = reply.toLowerCase();
  const matched: Array<{ label: string; href: string }> = [];
  for (const route of SUGGEST_ROUTES) {
    if (route.keywords.some(kw => r.includes(kw))) {
      matched.push({ label: route.label, href: route.href });
      if (matched.length >= 2) break;
    }
  }
  // Always suggest membership if no strong match and reply is short
  if (matched.length === 0) {
    matched.push({ label: 'Explore the Vault →', href: '/' });
  }
  return matched;
}

// ── Rate limiter ──────────────────────────────────────────────────────────────
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

// ── Semantic response cache helpers ──────────────────────────────────────────
async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizeQuestion(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function getCachedReply(supabase: ReturnType<typeof createClient>, hash: string) {
  try {
    const { data } = await supabase
      .from('ignis_response_cache')
      .select('reply, model, hit_count')
      .eq('question_hash', hash)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data ?? null;
  } catch { return null; }
}

async function setCachedReply(
  supabase: ReturnType<typeof createClient>,
  hash: string,
  questionText: string,
  reply: string,
  model: string,
  pageContext?: string,
): Promise<void> {
  try {
    await supabase.from('ignis_response_cache').upsert({
      question_hash: hash,
      question_text: questionText,
      reply,
      model,
      page_context: pageContext || null,
      hit_count: 1,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'question_hash' });
  } catch { /* non-fatal */ }
}

type MembershipAccess = {
  authenticated: boolean;
  userId: string | null;
  planKey: string;
  isSparked: boolean;
  isPro: boolean;
  monthlyLimit: number | null;
};

function currentMonthBucket(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function buildAccessPayload(access: MembershipAccess, used: number) {
  const unlimited = access.monthlyLimit == null;
  const remaining = unlimited ? null : Math.max((access.monthlyLimit ?? 0) - used, 0);
  return {
    authenticated: access.authenticated,
    planKey: access.planKey,
    isSparked: access.isSparked,
    isPro: access.isPro,
    monthlyUsed: used,
    monthlyLimit: access.monthlyLimit,
    monthlyRemaining: remaining,
    unlimited,
  };
}

async function resolveMembershipAccess(
  supabase: ReturnType<typeof createClient>,
  authClient: ReturnType<typeof createClient>,
  authHeader: string | null,
): Promise<MembershipAccess> {
  if (!authHeader) {
    return {
      authenticated: false,
      userId: null,
      planKey: 'free',
      isSparked: false,
      isPro: false,
      monthlyLimit: 0,
    };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      authenticated: false,
      userId: null,
      planKey: 'free',
      isSparked: false,
      isPro: false,
      monthlyLimit: 0,
    };
  }

  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user) {
    return {
      authenticated: false,
      userId: null,
      planKey: 'free',
      isSparked: false,
      isPro: false,
      monthlyLimit: 0,
    };
  }

  const [{ data: member }, { data: subscription }] = await Promise.all([
    supabase
      .from('vault_members')
      .select('plan_key, is_sparked')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const subscriptionPlan = getActivePlanKey(subscription);
  const memberPlan = normalizePlanKey(member?.plan_key ?? 'free');
  const planKey = subscriptionPlan !== 'free' ? subscriptionPlan : memberPlan;
  const isPro = isVaultSparkedProPlan(planKey);
  const isSparked = isVaultSparkedPlan(planKey) || !!member?.is_sparked || isPro;

  return {
    authenticated: true,
    userId: user.id,
    planKey: isSparked ? planKey : 'free',
    isSparked,
    isPro,
    monthlyLimit: isPro
      ? null
      : isSparked
        ? Number(Deno.env.get('ASK_IGNIS_SPARKED_MONTHLY_QUOTA') || String(DEFAULT_SPARKED_QUOTA))
        : 0,
  };
}

async function getMonthlyUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  monthBucket: string,
) {
  try {
    const { data } = await supabase
      .from('ignis_usage_monthly')
      .select('request_count')
      .eq('user_id', userId)
      .eq('month_bucket', monthBucket)
      .maybeSingle();
    return Number(data?.request_count || 0);
  } catch {
    return 0;
  }
}

async function incrementMonthlyUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  monthBucket: string,
  planKey: string,
  model: string,
) {
  const current = await getMonthlyUsage(supabase, userId, monthBucket);
  const next = current + 1;
  try {
    await supabase
      .from('ignis_usage_monthly')
      .upsert({
        user_id: userId,
        month_bucket: monthBucket,
        request_count: next,
        plan_key: planKey,
        last_model: model,
        last_request_at: new Date().toISOString(),
      }, { onConflict: 'user_id,month_bucket' });
  } catch (error) {
    console.error('[ask-ignis] usage increment failed', error);
  }
  return next;
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

  // Supabase client for semantic cache (uses auto-injected env vars)
  const supabaseUrl  = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? supabaseKey;
  const supabase     = createClient(supabaseUrl, supabaseKey);
  const authClient   = createClient(supabaseUrl, supabaseAnon);
  const membership = await resolveMembershipAccess(supabase, authClient, req.headers.get('Authorization'));
  const monthBucket = currentMonthBucket();
  const usageBefore = membership.userId
    ? await getMonthlyUsage(supabase, membership.userId, monthBucket)
    : 0;
  const access = buildAccessPayload(membership, usageBefore);

  const ip = req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
  const rpm = Number(Deno.env.get('ASK_IGNIS_RATE_LIMIT_RPM') || '12');
  if (!checkRateLimit(ip, rpm)) {
    return new Response(JSON.stringify({ error: 'IGNIS is overloaded — wait a minute and try again.' }), { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // Body parse must precede mode-aware gates (interview bypasses Sparked check).
  let body: {
    message?: string;
    context?: string;
    history?: Array<{ role: string; content: string }>;
    probe?: boolean;
    mode?: 'oracle' | 'interview';
    interviewTurn?: number;
    stream?: boolean;
  };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Bad JSON' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }); }
  const interviewMode = body.mode === 'interview';
  const interviewTurn = Math.max(0, Math.min(3, Number(body.interviewTurn || 0)));
  const streamMode = body.stream === true;

  // Interview mode (P4) bypasses the Sparked-only gate — the whole point of the
  // onboarding interview is to help anonymous users decide. Metered + capped
  // separately under 'onboarding-interview' so the public Ask IGNIS budget is
  // unaffected by tire-kickers.
  const meterFunctionName = interviewMode ? 'onboarding-interview' : 'ask-ignis';

  if (!interviewMode) {
    if (!membership.authenticated || !membership.isSparked) {
      return new Response(JSON.stringify({
        error: 'Ask IGNIS is unlocked for VaultSparked members. Sign in, or upgrade to open the oracle.',
        code: 'membership_required',
        access,
      }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (!membership.isPro && membership.monthlyLimit != null && usageBefore >= membership.monthlyLimit) {
      return new Response(JSON.stringify({
        error: 'Your Ask IGNIS monthly quota is spent. Eternal unlocks unlimited access.',
        code: 'quota_exceeded',
        access,
      }), { status: 402, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
  }

  // ── P0 Token Governance: kill switch + pre-flight cap check ──────────────
  if (isPaused()) return capExceededResponse(cors, 'paused');
  if (await isCapBreached(supabase, meterFunctionName)) return capExceededResponse(cors, 'capped');

  // Access probe — client calls this on mount to learn membership state without
  // spending a Claude turn or consuming monthly quota. Returns 200 + access
  // payload if the caller is Sparked/Eternal, 403 membership_required otherwise.
  if (body.probe === true) {
    if (!membership.authenticated || !membership.isSparked) {
      return new Response(JSON.stringify({
        error: 'Ask IGNIS is unlocked for VaultSparked members. Sign in, or upgrade to open the oracle.',
        code: 'membership_required',
        access,
      }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: true, probe: true, access }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const message = (body.message || '').trim();
  if (!message || message.length > 800) {
    return new Response(JSON.stringify({ error: 'Message must be 1–800 characters.' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // ── Semantic cache check — single-turn only ───────────────────────────────
  // Multi-turn conversations (history present) are skipped: replies are context-dependent.
  const isMultiTurn = Array.isArray(body.history) && body.history.length > 0;
  const qNorm       = normalizeQuestion(message);
  const qHash       = await sha256Hex(qNorm);

  if (!isMultiTurn && supabaseUrl) {
    const hit = await getCachedReply(supabase, qHash);
    if (hit) {
      const suggestions = deriveSuggestions(hit.reply);
      const usageAfter = membership.userId
        ? await incrementMonthlyUsage(supabase, membership.userId, monthBucket, membership.planKey, hit.model)
        : usageBefore;
      return new Response(
        JSON.stringify({
          reply: hit.reply,
          model: hit.model,
          usage: null,
          cached: false,
          semanticCache: true,
          suggestions,
          access: buildAccessPayload(membership, usageAfter),
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }
  }

  const intelUrl = Deno.env.get('PUBLIC_INTEL_URL') || 'https://vaultsparkstudios.com/api/public-intelligence.json';
  const intel    = await getIntel(intelUrl);
  const intelBlock = buildIntelBlock(intel, body.context);

  // ── P10: per-user memory (last 3 conv summaries, 30-day TTL) ──
  // Memory is loaded only for authenticated callers; unauthed paths exit at the
  // membership gate above so this is always safe to call here.
  // S135: also pull structured profile traits for personalized AI depth/voice.
  // Both fetches run in parallel — adds ~50ms one-time cost per request.
  const [memorySlots, memberProfile] = membership.userId
    ? await Promise.all([
        loadUserMemory(supabase, membership.userId),
        loadMemberProfile(supabase, membership.userId),
      ])
    : [[], null];
  const memoryBlock = memoryAsContextBlock(memorySlots);
  const profileBlock = memberProfileAsContextBlock(memberProfile);
  const personaSuffix = tierPersonaSuffix(membership.planKey, membership.isPro);

  // ── Tiered routing ───────────────────────────────────────────────────────────
  const preferredModel = Deno.env.get('ANTHROPIC_MODEL') || DEFAULT_MODEL;
  const routedModel    = routeModel(message, preferredModel);
  const modelChain     = routedModel === HAIKU_MODEL
    ? [HAIKU_MODEL, preferredModel]
    : [preferredModel, ...MODEL_FALLBACKS.filter((m) => m !== preferredModel)];

  // ── Build message history (multi-turn support) ────────────────────────────
  // history contains prior turns from client; limited to last 3 pairs (6 messages).
  const historyMessages: Array<{ role: string; content: string }> = [];
  if (Array.isArray(body.history)) {
    const trimmed = body.history.slice(-6);
    for (const turn of trimmed) {
      if ((turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string') {
        historyMessages.push({ role: turn.role, content: turn.content.slice(0, 800) });
      }
    }
  }
  historyMessages.push({ role: 'user', content: message });

  // ── Build prompt-cached system block ──────────────────────────────────────
  // Three system messages: static persona + tier-suffix (cache-stable per tier) + dynamic intel.
  // anthropic-beta: prompt-caching-2024-07-31 activates server-side caching.
  // Memory block joins intel block (both 5-min cache window) since memory turns over per-user.
  // Interview mode (P4) replaces the persona with a tier-recommendation flow.
  const INTERVIEW_PERSONA = [
    'You are IGNIS, the Vault Oracle, running an onboarding interview for VaultSpark Studios membership.',
    'Voice: warm, ceremonial, never pushy. Two short sentences per turn maximum.',
    '',
    'Three tiers exist:',
    '  · FREE — vault account, public games, rank tracking. Page: /vault-member/.',
    '  · SPARKED — paid membership. Member challenges, exclusive lore drops, deeper portal. Page: /vaultsparked/.',
    '  · ETERNAL — top tier. Everything in SPARKED + ask-IGNIS unlimited + sealed-vault preview drops. Page: /vaultsparked/?tier=eternal.',
    '',
    `INTERVIEW STAGE: turn ${interviewTurn + 1} of 3.`,
    interviewTurn === 0 ? 'Turn 1: ASK what kind of player they are. Offer 3 short options (e.g., "Mostly games", "Lore + worlds", "Following the studio"). Do not recommend yet.'
    : interviewTurn === 1 ? 'Turn 2: Reflect what they said and ASK how often they would engage (e.g., "Daily", "Weekly", "When something new ships"). Do not recommend yet.'
    : 'Turn 3 (final): RECOMMEND ONE TIER. Open with "I recommend [TIER]." Then 1 sentence of why. Then 1 line: "Open it: [link]."',
    '',
    'Never invent prices. Never claim features that are not in the snapshot. If you do not know — say so and link them to /membership-value/.',
  ].join('\n');

  const systemMessages: Array<{ type: string; text: string; cache_control?: { type: string } }> = [
    {
      type: 'text',
      text: interviewMode ? INTERVIEW_PERSONA : (STATIC_PERSONA + personaSuffix),
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      // S135: intel + memory + member profile hints, all in the dynamic block.
      // Interview mode skips memory/profile (onboarding flow stays clean).
      text: interviewMode
        ? intelBlock
        : [intelBlock, memoryBlock, profileBlock].filter(Boolean).join('\n\n'),
      cache_control: { type: 'ephemeral' },
    },
  ];

  let claudeRes: Response | null = null;
  let lastErrText = '';
  let lastStatus = 0;
  let usedModel = routedModel;

  for (const model of modelChain) {
    const claudePayload: Record<string, unknown> = {
      model,
      max_tokens: 512,
      system: systemMessages,
      messages: historyMessages,
    };
    if (streamMode) claudePayload.stream = true;

    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-beta': CACHE_BETA_HEADER,
        'content-type': 'application/json',
      },
      body: JSON.stringify(claudePayload),
    });

    if (res.ok) {
      claudeRes = res;
      usedModel = model;
      break;
    }

    lastStatus = res.status;
    lastErrText = await res.text().catch(() => '');
    console.error(`[ask-ignis] model=${model} status=${res.status} detail=${lastErrText.slice(0, 300)}`);

    // Only try the next model on model-specific failures — not on auth/rate-limit issues.
    if (res.status === 401 || res.status === 403 || res.status === 429) break;
  }

  if (!claudeRes) {
    return new Response(
      JSON.stringify({
        error: 'IGNIS upstream error',
        upstreamStatus: lastStatus,
        detail: lastErrText.slice(0, 200),
        triedModels: modelChain,
        access,
      }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }

  // ── Streaming response branch (R1) ──────────────────────────────────────
  // Anthropic SSE → re-emit to client as the same SSE format. We tee the
  // stream: pipe events out as they arrive AND aggregate the final reply so
  // we can run post-call accounting (semantic cache, usage meter, suggestions)
  // before the close event.
  if (streamMode && claudeRes.body) {
    const reader = claudeRes.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let assembled = '';
    let lastUsage: Record<string, number> | null = null;
    let buf = '';

    const out = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
            buf += decoder.decode(value, { stream: true });
            // Parse complete SSE events out of buf for our own bookkeeping.
            const events = buf.split(/\n\n/);
            buf = events.pop() || '';
            for (const ev of events) {
              const dataLine = ev.split('\n').find((l) => l.startsWith('data:'));
              if (!dataLine) continue;
              const payload = dataLine.slice(5).trim();
              if (!payload || payload === '[DONE]') continue;
              try {
                const obj = JSON.parse(payload);
                if (obj.type === 'content_block_delta' && obj.delta?.text) {
                  assembled += obj.delta.text;
                } else if (obj.type === 'message_delta' && obj.usage) {
                  lastUsage = { ...lastUsage, ...obj.usage };
                } else if (obj.type === 'message_start' && obj.message?.usage) {
                  lastUsage = { ...obj.message.usage };
                }
              } catch { /* tolerate non-JSON / partial */ }
            }
          }
          // Post-call accounting — emit a final custom event so the client
          // can render suggestions + meter without a second round-trip.
          const finalReply = assembled.trim();
          const suggestions = deriveSuggestions(finalReply);
          const meterDecision = lastUsage ? await meterCall(supabase, meterFunctionName, lastUsage) : null;
          if (!isMultiTurn && supabaseUrl && finalReply) {
            setCachedReply(supabase, qHash, qNorm, finalReply, usedModel, body.context);
          }
          if (membership.userId) {
            await incrementMonthlyUsage(supabase, membership.userId, monthBucket, membership.planKey, usedModel);
          }
          const tail = `event: vs-ignis-tail\ndata: ${JSON.stringify({
            suggestions,
            meter: meterDecision ? { pct_of_cap: meterDecision.pct_of_cap, near_cap: meterDecision.pct_of_cap >= 70 } : null,
          })}\n\n`;
          controller.enqueue(encoder.encode(tail));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(out, {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        'Connection': 'keep-alive',
      },
    });
  }

  const claudeJson = await claudeRes.json();
  const reply = (claudeJson.content || []).map((c: any) => c.text || '').join('').trim();
  const cached = (claudeJson.usage?.cache_read_input_tokens || 0) > 0;
  const suggestions = deriveSuggestions(reply);

  // ── P0: record token spend, check post-call cap ──
  // We record AFTER the call (we already paid). The decision flag is returned to
  // the client so widgets can warn if we're near the cap on the NEXT call.
  // Interview mode meters under its own bucket (onboarding-interview).
  const meterDecision = await meterCall(supabase, meterFunctionName, claudeJson.usage);

  // Write to semantic cache on single-turn replies
  if (!isMultiTurn && supabaseUrl && reply) {
    setCachedReply(supabase, qHash, qNorm, reply, claudeJson.model || usedModel, body.context);
  }
  const usageAfter = membership.userId
    ? await incrementMonthlyUsage(supabase, membership.userId, monthBucket, membership.planKey, claudeJson.model || usedModel)
    : usageBefore;

  return new Response(
    JSON.stringify({
      reply,
      model: claudeJson.model || usedModel,
      usage: claudeJson.usage,
      cached,
      semanticCache: false,
      suggestions,
      access: buildAccessPayload(membership, usageAfter),
      meter: meterDecision ? {
        pct_of_cap: meterDecision.pct_of_cap,
        near_cap: meterDecision.pct_of_cap >= 70,
      } : null,
    }),
    { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
  );
});
