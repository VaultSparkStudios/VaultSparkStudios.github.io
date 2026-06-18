/**
 * doctor-predicates.mjs
 *
 * Canonical pass/warn/fail predicates for a doctor check object, shared by
 * run-doctor.mjs (tally) and render-startup-brief.mjs (ownership split) so the
 * displayed counts can never silently diverge from the doctor's own tally.
 *
 * Doctor check shape (from context/PROJECT_STATUS.json → doctorScore.checks):
 *   { id: string, pass: boolean, warn: boolean, driftClass?: string, blocking?: boolean }
 */

/** A check is a hard failure when it does not pass and is not merely a warning. */
export function isFailing(c) {
  return !!(c && c.pass === false && c.warn !== true);
}

/** A check is a warning (advisory drift) when flagged warn — regardless of pass. */
export function isWarning(c) {
  return !!(c && c.warn === true);
}

/** A check is green when it passes and is not a warning. */
export function isPassing(c) {
  return !!(c && c.pass === true && c.warn !== true);
}

/** Anything not green — failing OR warning. Used by the provenance classifier. */
export function isNonGreen(c) {
  return isFailing(c) || isWarning(c);
}

export default { isFailing, isWarning, isPassing, isNonGreen };
