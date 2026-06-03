/**
 * tokenMeter — shared token-governance + memory wrapper for IGNIS edge functions.
 *
 * Every IGNIS-tier function calls `meterCall()` once per Anthropic round-trip:
 *   const decision = await meterCall(supabase, 'ask-ignis', anthropicResponse.usage);
 *   if (decision.would_breach) return capExceededResponse();
 *
 * Three guarantees:
 *   1. Hard cap — if usd_estimate exceeds cap_usd_daily, this function returns
 *      `{ would_breach: true }` and the caller MUST refuse the next call.
 *   2. Kill switch — env var IGNIS_GLOBAL_PAUSE=1 short-circuits before any DB
 *      hit so we still degrade gracefully when Supabase is down.
 *   3. Alert audit — first cross of 70% (per cap) and first cross of 100% emit
 *      ignis_alerts rows that the brief renderer reads.
 *
 * Pricing is centralized in the SQL RPC `increment_ignis_meter`. Update there
 * when models change — the edge function code never embeds prices.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type AnthropicUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
};

export type MeterDecision = {
  total_usd: number;
  cap_usd: number;
  pct_of_cap: number;
  would_breach: boolean;
  was_first_70: boolean;
};

export function isPaused(): boolean {
  return Deno.env.get('IGNIS_GLOBAL_PAUSE') === '1';
}

/**
 * Pre-flight check: returns true if today's spend already breached the cap for this fn.
 * Use this BEFORE calling Anthropic so we serve a cached/static fallback instead of
 * making a paid call we'll have to refuse anyway.
 */
export async function isCapBreached(
  supabase: ReturnType<typeof createClient>,
  functionName: string,
): Promise<boolean> {
  if (isPaused()) return true;
  try {
    const { data } = await supabase
      .from('ignis_spend_today')
      .select('usd_today,cap_usd_daily,enabled,status')
      .eq('function_name', functionName)
      .maybeSingle();
    if (!data) return false;
    if (data.enabled === false) return true;
    if (data.status === 'capped') return true;
    return false;
  } catch {
    // Fail-open: if the meter table is unreachable, allow the call. The post-call
    // meterCall will still record + cap once the DB recovers.
    return false;
  }
}

/**
 * Post-call: record token usage and return decision. Always called after a
 * successful Anthropic response so the caller can decide whether to allow
 * follow-up calls in the same request (e.g., onboarding-interview multi-turn).
 */
export async function meterCall(
  supabase: ReturnType<typeof createClient>,
  functionName: string,
  usage: AnthropicUsage | null | undefined,
): Promise<MeterDecision | null> {
  if (!usage) return null;
  const input  = Number(usage.input_tokens || 0);
  const output = Number(usage.output_tokens || 0);
  const cacheRead   = Number(usage.cache_read_input_tokens || 0);
  const cacheCreate = Number(usage.cache_creation_input_tokens || 0);
  try {
    const { data, error } = await supabase.rpc('increment_ignis_meter', {
      p_function_name: functionName,
      p_input_tokens: input,
      p_output_tokens: output,
      p_cache_read: cacheRead,
      p_cache_create: cacheCreate,
    });
    if (error || !data || !data[0]) return null;
    return data[0] as MeterDecision;
  } catch (err) {
    console.error('[tokenMeter] increment failed', err);
    return null;
  }
}

/** Standardized 503 response when the kill switch is on or cap is breached. */
export function capExceededResponse(
  cors: Record<string, string>,
  reason: 'paused' | 'capped',
  fallbackText?: string,
): Response {
  return new Response(JSON.stringify({
    error: reason === 'paused'
      ? 'IGNIS resting. Live answers return tomorrow.'
      : 'IGNIS budget for today is spent. Returning to base knowledge.',
    code: reason === 'paused' ? 'global_pause' : 'cap_exceeded',
    reply: fallbackText || null,
  }), {
    status: 503,
    headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': '3600' },
  });
}

// ─── User memory (P10) ───────────────────────────────────────────────────────
//
// Stores up to 3 conversation summaries per user, 30-day TTL, RLS-gated to user.
// Summaries are built client-side or by the edge fn at end-of-conversation; we
// never store full transcripts.

export type UserMemorySlot = {
  memory_slot: number;
  summary: string;
  context_tags: string[] | null;
  last_referenced: string;
};

export async function loadUserMemory(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<UserMemorySlot[]> {
  try {
    const { data } = await supabase
      .from('ignis_user_memory')
      .select('memory_slot, summary, context_tags, last_referenced')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('last_referenced', { ascending: false })
      .limit(3);
    return (data || []) as UserMemorySlot[];
  } catch {
    return [];
  }
}

export function memoryAsContextBlock(slots: UserMemorySlot[]): string {
  if (!slots.length) return '';
  const lines = ['── PRIOR CONVERSATION MEMORY (last 30 days) ──'];
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const tags = slot.context_tags?.length ? ` [${slot.context_tags.join(', ')}]` : '';
    lines.push(`  ${i + 1}.${tags} ${slot.summary}`);
  }
  lines.push('Reference these naturally if relevant; do not regurgitate them verbatim.');
  return lines.join('\n');
}

/**
 * Save a one-line summary at end-of-conversation. Rotates oldest slot.
 * Tags are short topic markers ("membership", "voidfall-lore", "gridiron-strategy").
 */
export async function saveUserMemorySummary(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  summary: string,
  tags: string[] = [],
): Promise<void> {
  try {
    const existing = await loadUserMemory(supabase, userId);
    const slot = existing.length < 3
      ? (existing.length + 1)
      : (existing.sort((a, b) => a.last_referenced.localeCompare(b.last_referenced))[0].memory_slot);
    await supabase.from('ignis_user_memory').upsert({
      user_id: userId,
      memory_slot: slot,
      summary: summary.slice(0, 280),
      context_tags: tags.slice(0, 5),
      last_referenced: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    }, { onConflict: 'user_id,memory_slot' });
  } catch (err) {
    console.error('[tokenMeter] memory save failed', err);
  }
}

// ─── Tier persona (P10) ──────────────────────────────────────────────────────
//
// Per-tier voice tweak appended to the static persona. Eternal members get
// deeper-lore latitude; free-tier callers (rare — Ask IGNIS is gated) get the
// public voice.

export function tierPersonaSuffix(planKey: string, isPro: boolean): string {
  if (isPro || planKey === 'vault_sparked_pro' || planKey === 'eternal') {
    return [
      '',
      '── TIER VOICE: ETERNAL ──',
      'This caller is an Eternal member. Permission to go deeper into Voidfall + DreadSpike lore,',
      'discuss roadmap nuance, and surface sealed-vault hints by sigil only (never codename).',
      'They have already paid in. You can be more confiding, less promotional.',
    ].join('\n');
  }
  if (planKey === 'vault_sparked' || planKey === 'sparked') {
    return [
      '',
      '── TIER VOICE: SPARKED ──',
      'This caller is a Sparked member. Treat as in-the-vault — explain mechanics in depth,',
      'reference rank progression, suggest the portal for personalized stats.',
    ].join('\n');
  }
  return [
    '',
    '── TIER VOICE: PUBLIC ──',
    'Answer warmly but never assume insider knowledge. Mention membership only when the user asks.',
  ].join('\n');
}

// ─── Member profile (S135 — personalized AI) ────────────────────────────────
//
// Loads structured profile traits the AI can use to tailor depth, voice, and
// recommendations to the specific member — beyond conversation memory. Read-only,
// non-destructive, RLS-safe (uses the caller's authenticated supabase client).
//
// VOICE-LEAK GUARD (per memory feedback_voice_leak_patrol.md):
// Internal enums (rank_id, journey_stage, etc.) are NEVER passed through to the
// model verbatim. We translate them to natural-language hints the model can act
// on without echoing back ("returning member who has unlocked Voidfall lore"
// instead of "trust_level=5, lore_unlocked=voidfall").

export type MemberProfile = {
  username: string | null;
  points: number;
  achievementCount: number;
  recentAchievements: string[];   // last 3 unlock names
  milestoneCount: number;
  weeklyGames: number;            // distinct games played this week
  hasReferred: boolean;
};

export async function loadMemberProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<MemberProfile | null> {
  if (!userId) return null;
  try {
    const [memberRes, achRes, milestoneRes, weeklyRes] = await Promise.all([
      supabase.from('vault_members')
        .select('username, points, achievements, prefs')
        .eq('id', userId).maybeSingle(),
      supabase.from('member_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })
        .limit(3),
      supabase.from('vault_member_milestones')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase.from('weekly_game_scores')
        .select('game_slug')
        .eq('user_id', userId)
        .gte('week_start', new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10)),
    ]);

    const member: any = memberRes.data || {};
    const achievements: any[] = (achRes.data || []) as any[];
    const milestoneCount = milestoneRes.count ?? 0;
    const weeklyGames = new Set((weeklyRes.data || []).map((r: any) => r.game_slug)).size;
    const achArr = Array.isArray(member.achievements) ? member.achievements : [];

    return {
      username: member.username || null,
      points: typeof member.points === 'number' ? member.points : 0,
      achievementCount: achArr.length,
      recentAchievements: achievements.map((a) => String(a.achievement_id)).slice(0, 3),
      milestoneCount,
      weeklyGames,
      hasReferred: milestoneCount > 0,
    };
  } catch (err) {
    console.error('[tokenMeter] loadMemberProfile failed', err);
    return null;
  }
}

/**
 * Translate raw profile traits into natural-language hints the model can
 * reference without echoing internal enum values back to the user. This is the
 * voice-leak guard — the model gets *behavior hints*, not raw data.
 */
export function memberProfileAsContextBlock(profile: MemberProfile | null): string {
  if (!profile) return '';
  const hints: string[] = [];

  // Engagement depth — translate points into a depth band.
  if (profile.points >= 500) hints.push('Deep member — has invested significant time in the vault. Match their depth; assume familiarity with the catalog and lore.');
  else if (profile.points >= 100) hints.push('Active member — comfortable with vault mechanics. Skip basic onboarding language.');
  else if (profile.points >= 25) hints.push('Returning member — knows the studio. Brief context is fine.');
  else hints.push('Newer member — explain rank/membership mechanics if relevant, but don\'t over-explain.');

  // Achievement velocity — recent activity signal.
  if (profile.recentAchievements.length >= 3) {
    hints.push('Recently unlocked multiple achievements — they\'re on a streak. Reference this energy if it fits the question.');
  } else if (profile.achievementCount === 0) {
    hints.push('No achievements yet. Suggest the first challenge if they ask "what do I do next?".');
  }

  // Weekly game engagement.
  if (profile.weeklyGames >= 2) {
    hints.push('Played multiple games this week — broad-catalog player. Don\'t funnel them to one title.');
  } else if (profile.weeklyGames === 1) {
    hints.push('Focused on one game this week. If they ask for recommendations, lateral cross-game suggestions land well.');
  }

  // Referral signal.
  if (profile.hasReferred) {
    hints.push('Has referred friends — community advocate. Treat as a trusted insider; they sell the vault to others.');
  }

  if (!hints.length) return '';

  return [
    '── MEMBER PROFILE HINTS (do NOT echo these traits back verbatim) ──',
    ...hints.map((h) => `  · ${h}`),
    'Use these to tune depth and tone. If asked "what do you know about me?", say only what they would naturally see (username + tier), never these internal observations.',
  ].join('\n');
}
