/**
 * ignisCache — pure helpers for the Ask IGNIS / semantic-search response caches.
 *
 * No remote imports and no Deno globals, so the same file runs under Deno (edge
 * functions) and under Node's built-in type stripping (tests/s368-*.unit.spec.mjs).
 *
 * S368 ignis-cache-privacy: the shared reply cache used to be keyed on the
 * normalized question alone, while single-turn replies were generated with the
 * asking member's memory + profile hints. One member's personalised answer was
 * therefore served to every later asker of the same question, anonymous visitors
 * included. The rules here are the fix:
 *   1. The key binds mode, plan tier, page context and question together.
 *   2. Any request whose prompt carries member memory or profile hints neither
 *      reads nor writes the shared cache.
 */

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function normalizeQuestion(q: string): string {
  return String(q || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export type ReplyCacheKeyInput = {
  mode: string;            // 'oracle' | 'interview'
  planTier: string;        // plan key + pro flag — the tier persona suffix depends on both
  context: unknown;        // body.context exactly as the client sent it
  question: string;        // raw question; normalized here
};

/** sha256(mode | planTier | sha256(JSON(context ?? null)) | normalizedQuestion) */
export async function buildReplyCacheKey(input: ReplyCacheKeyInput): Promise<string> {
  const contextHash = await sha256Hex(JSON.stringify(input.context ?? null));
  const parts = [
    String(input.mode || 'oracle'),
    String(input.planTier || 'free'),
    contextHash,
    normalizeQuestion(input.question),
  ];
  return sha256Hex(parts.join('|'));
}

export type ReplyCacheEligibility = {
  isMultiTurn: boolean;
  /** true when the prompt for THIS request includes member memory or profile hints */
  personalized: boolean;
};

/** Cache read AND write are both gated on this. */
export function replyCacheAllowed(e: ReplyCacheEligibility): boolean {
  return !e.isMultiTurn && !e.personalized;
}

/** Whether the prompt carries per-member data. Interview mode never injects memory/profile. */
export function promptIsPersonalized(interviewMode: boolean, memoryBlock: string, profileBlock: string): boolean {
  if (interviewMode) return false;
  return Boolean((memoryBlock || '').trim() || (profileBlock || '').trim());
}

// ── Interview turn accounting (server-side; the client turn counter is advisory) ──

export const INTERVIEW_MAX_USER_TURNS = 6;
export const INTERVIEW_STAGES = 3;

export function countUserTurns(history: unknown): number {
  if (!Array.isArray(history)) return 0;
  let n = 0;
  for (const t of history) {
    if (t && typeof t === 'object' && (t as { role?: unknown }).role === 'user') n++;
  }
  return n;
}

/**
 * Stage (0-based) derived from the history the server will actually send.
 * The widget's opening call has no user turns (stage 0); each answer adds one,
 * so stage = userTurns - 1, clamped to the final recommendation stage.
 */
export function interviewStageFromHistory(history: unknown): number {
  const users = countUserTurns(history);
  return Math.max(0, Math.min(INTERVIEW_STAGES - 1, users - 1));
}

export function interviewTurnCapExceeded(history: unknown): boolean {
  return countUserTurns(history) > INTERVIEW_MAX_USER_TURNS;
}

// ── semantic-search response cache key ──

export function intelVersionOf(intel: unknown): string {
  const i = (intel && typeof intel === 'object') ? intel as Record<string, unknown> : {};
  return `${i.schemaVersion ?? 'na'}:${i.generatedAt ?? 'na'}`;
}

/** sha256(normalized query | sorted sources | intel version) */
export async function buildSearchCacheKey(query: string, sources: Iterable<string>, intelVersion: string): Promise<string> {
  const src = [...new Set([...sources].map(String))].sort().join(',');
  return sha256Hex([normalizeQuestion(query), src, intelVersion].join('|'));
}
