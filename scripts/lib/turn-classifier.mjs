/**
 * turn-classifier.mjs
 *
 * S120 #3 — lightweight per-turn model router (SIL #612).
 *
 * Heuristic classifier consumed by `model-router.mjs` → `callClaude()`.
 * Given the last user prompt (and optional system text), it returns a model
 * recommendation so cheap transactional turns can be routed DOWN to Haiku and
 * clearly strategic turns routed UP to Opus, regardless of the model the caller
 * requested. It is intentionally CONSERVATIVE — it only deviates from the
 * caller's choice when a signal is unambiguous; otherwise it returns the
 * neutral 'sonnet' verdict, which the consumer treats as "no change".
 *
 * Contract (relied on by model-router.mjs:452):
 *   classifyTurn({ prompt, system? }) -> { model: 'haiku'|'sonnet'|'opus', reason: string }
 *
 * The consumer only acts on:
 *   - model === 'haiku'  → downshift when caller asked for opus/sonnet
 *   - model === 'opus'   → upshift   when caller asked for haiku/sonnet
 * Any other verdict (e.g. 'sonnet') is a no-op for the caller.
 *
 * Disable globally with TURN_CLASSIFY_DISABLED=1 (handled in the consumer).
 */

const HAIKU_MAX_CHARS = 600;   // pure-transform turns are short
const OPUS_MIN_CHARS = 1400;   // strategic turns tend to be long + multi-part

// Cheap, transactional, single-shot work → Haiku is sufficient.
const HAIKU_SIGNALS = [
  /\b(validate|verify|check|lint|format|count|list|lookup|extract|parse|classify|tag|rename|slugify|normali[sz]e)\b/i,
  /\b(is (this|it|there)|does (this|it)|how many|what is the (value|count|status))\b/i,
  /\b(yes\/no|true\/false|one[- ]line|single line|short answer)\b/i,
];

// Deep, multi-constraint, cross-cutting work → Opus earns its cost.
const OPUS_SIGNALS = [
  /\b(architect|architecture|strateg(y|ic)|deep (analysis|dive)|refactor|redesign|trade-?offs?)\b/i,
  /\b(cross-project|portfolio|multi-step|root[- ]cause|reconcile|synthesi[sz]e|forecast|predict)\b/i,
  /\b(plan the|design the|evaluate (options|approaches)|weigh|compare (approaches|designs))\b/i,
];

function countMatches(text, patterns) {
  let n = 0;
  for (const re of patterns) if (re.test(text)) n++;
  return n;
}

/**
 * @param {object} args
 * @param {string} args.prompt  - the last user message (string or stringified)
 * @param {string} [args.system] - optional system text for extra signal
 * @returns {{model: 'haiku'|'sonnet'|'opus', reason: string}}
 */
export function classifyTurn({ prompt = '', system = '' } = {}) {
  const text = String(prompt || '');
  const all = `${text}\n${String(system || '')}`;
  const len = text.length;

  const opusHits = countMatches(all, OPUS_SIGNALS);
  const haikuHits = countMatches(all, HAIKU_SIGNALS);

  // Strong, unambiguous strategic signal → upshift to Opus.
  if (opusHits >= 2 || (opusHits >= 1 && len >= OPUS_MIN_CHARS)) {
    return { model: 'opus', reason: `opus-signals:${opusHits}/len:${len}` };
  }

  // Short + transactional, with no strategic signal → downshift to Haiku.
  if (haikuHits >= 1 && len <= HAIKU_MAX_CHARS && opusHits === 0) {
    return { model: 'haiku', reason: `haiku-signals:${haikuHits}/len:${len}` };
  }

  // Very short turns with no strategic signal are also Haiku-able.
  if (len > 0 && len <= 160 && opusHits === 0) {
    return { model: 'haiku', reason: `short-turn/len:${len}` };
  }

  // Default: leave the caller's choice untouched.
  return { model: 'sonnet', reason: 'neutral' };
}

export default { classifyTurn };
