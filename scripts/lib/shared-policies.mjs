/**
 * shared-policies.mjs
 *
 * Single source of truth for small policy constants shared across brief/board
 * renderers and validators, so the same vocabulary isn't re-declared (and
 * silently drifted) in multiple scripts.
 */

/**
 * TASK_BOARD item statuses that count as "blocked" (not actionable right now).
 * Keep lowercase; renderers compare against `item.status` verbatim.
 */
export const BLOCKED_STATUSES_CORE = [
  'blocked',
  'human-blocked',
  'founder-blocked',
  'evidence-gated',
  'gated',
  'deferred',
];

/** Statuses that count as actionable/open. */
export const OPEN_STATUSES_CORE = ['unblocked', 'open', 'ready'];

/** Statuses that count as done. */
export const DONE_STATUSES_CORE = ['done', 'completed', 'shipped'];

export default { BLOCKED_STATUSES_CORE, OPEN_STATUSES_CORE, DONE_STATUSES_CORE };
