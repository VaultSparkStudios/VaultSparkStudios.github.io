/**
 * modelPricing — model IDs + per-model USD price table for IGNIS edge functions.
 *
 * Pure module (no remote imports) so Node tests can import it too.
 *
 * The SQL RPC increment_ignis_meter (supabase-s368-ignis-meter-model-pricing.sql)
 * holds the authoritative copy of these prices; the meter writes are priced
 * there. This table is the edge-side mirror used for logging/estimates and is
 * kept in lockstep by tests/s368-wave0-security.unit.spec.mjs.
 *
 * Prices are USD per million tokens. Verify against the current pricing page
 * (https://www.anthropic.com/pricing) whenever a model ID changes. Values below
 * are from the Claude API model catalog cached 2026-09-25.
 */

export const SONNET_MODEL = 'claude-sonnet-5-5';
export const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
export const OPUS_MODEL = 'claude-opus-5-5';

/** Ordered fallback chain when the primary model fails (retired 4-5/4-6 IDs dropped). */
export const MODEL_FALLBACKS: readonly string[] = [HAIKU_MODEL];

export type ModelPrice = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number; // 5-minute ephemeral write = 1.25x input
};

// verify against current pricing page
export const MODEL_PRICES: Record<string, ModelPrice> = {
  'claude-sonnet-5-5': { input: 2.00, output: 10.00, cacheRead: 0.20, cacheWrite: 2.50 },
  'claude-haiku-4-5': { input: 1.00, output: 5.00, cacheRead: 0.10, cacheWrite: 1.25 },
  'claude-opus-5-5': { input: 4.00, output: 20.00, cacheRead: 0.20, cacheWrite: 5.00 },
  // Legacy default for unknown/omitted models (Sonnet 4.6 rates). Deliberately
  // the most expensive non-Opus row so an unpriced model over-counts toward caps.
  default: { input: 3.00, output: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },
};

/** Map a (possibly dated / provider-prefixed) model ID onto a price row key. */
export function priceKeyFor(model: string | null | undefined): string {
  const m = String(model || '').toLowerCase();
  if (m.includes('claude-sonnet-5-5')) return 'claude-sonnet-5-5';
  if (m.includes('claude-haiku-4-5')) return 'claude-haiku-4-5';
  if (m.includes('claude-opus-5-5')) return 'claude-opus-5-5';
  return 'default';
}

export function estimateUsd(
  model: string | null | undefined,
  usage: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } | null | undefined,
): number {
  if (!usage) return 0;
  const p = MODEL_PRICES[priceKeyFor(model)];
  return (
    Number(usage.input_tokens || 0) * p.input +
    Number(usage.output_tokens || 0) * p.output +
    Number(usage.cache_read_input_tokens || 0) * p.cacheRead +
    Number(usage.cache_creation_input_tokens || 0) * p.cacheWrite
  ) / 1_000_000;
}

/**
 * Extra request fields per model. Sonnet 5.5 runs adaptive thinking when
 * `thinking` is omitted; these short-reply chat routes (max_tokens 280-512)
 * were tuned without thinking, so they send the lowest setting, between_tools.
 * Only Sonnet 5.5 accepts that value, so every other model gets nothing.
 */
export function modelRequestExtras(model: string): Record<string, unknown> {
  if (priceKeyFor(model) === 'claude-sonnet-5-5') return { thinking: { type: 'between_tools' } };
  return {};
}
