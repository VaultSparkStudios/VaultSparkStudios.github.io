/**
 * vantage-challenge.mjs — canonical classification of edge-challenged observations.
 *
 * D-S300.1: a challenged vantage must not render as a measurement. A Cloudflare
 * interstitial served to the observer is evidence about the OBSERVER, not the
 * route — it must classify as `challenged → unverified`, never as `mismatch`.
 *
 * Single source of truth for every prober in this repo (route provenance,
 * route history, Obelisk edge verification).
 */

/** Statuses a Cloudflare interstitial answers with. */
export const CHALLENGE_STATUSES = Object.freeze([401, 403, 429]);

/** A Cloudflare interstitial: a 403/503 HTML body where JSON or a redirect was due. */
export function isChallenged({ status, contentType }) {
  return (status === 403 || status === 503) && /text\/html/i.test(String(contentType || ''));
}

/**
 * A CLEAR CONTROL: an observation that answered its contract exactly. An
 * interstitial cannot selectively let one route through while blocking its
 * neighbours, so a single exact match is positive proof the observer is not
 * behind a challenge. Observations opt in by carrying `contractMatched: true`.
 */
export function hasClearControl(observations) {
  return (observations || []).some((o) => o && o.contractMatched === true);
}

/**
 * A challenged VANTAGE: every reachable observation answers with one uniform
 * challenge status (the interstitial swallows all routes identically), or any
 * observation is an unmistakable HTML interstitial where JSON/204 was due.
 * Observations: [{ status, contentType, contractMatched? }].
 *
 * S317 — a clear control DISPROVES a challenge, and is checked first. The old
 * `reachable.some(isChallenged)` let ONE challenge-shaped route condemn the
 * whole vantage: when the desk routes went missing from the deployed Worker,
 * the static origin answered them 403/HTML, and this function reported
 * `vantage-challenged` while /_health was returning 200 JSON from the very
 * same probe. That laundered a real missing-route regression into "evidence
 * about the observer" — the receipt stayed amber for days and never named the
 * absent routes. D-S300.1 still holds in the other direction: with NO clear
 * control, a challenge-shaped response is still evidence about the observer.
 */
export function isVantageChallenged(observations) {
  const reachable = (observations || []).filter((o) => Number.isInteger(o.status) && o.status > 0);
  if (!reachable.length) return false;
  if (hasClearControl(observations)) return false;
  if (reachable.some(isChallenged)) return true;
  const first = reachable[0].status;
  return CHALLENGE_STATUSES.includes(first) && reachable.every((o) => o.status === first) && reachable.length === (observations || []).length;
}

/**
 * A MISSING route: the vantage is provably clear, the route was reached, and it
 * answered 404 or a challenge-shaped 403/HTML anyway. That is the deployed
 * Worker not carrying the route — a first-class bad state, never "unverified".
 */
export function isMissingRoute({ status, contentType }, { vantageClear }) {
  if (!vantageClear || !Number.isInteger(status) || status <= 0) return false;
  return status === 404 || isChallenged({ status, contentType });
}
