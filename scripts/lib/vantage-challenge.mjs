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
 * A challenged VANTAGE: every reachable observation answers with one uniform
 * challenge status (the interstitial swallows all routes identically), or any
 * observation is an unmistakable HTML interstitial where JSON/204 was due.
 * Observations: [{ status, contentType }].
 */
export function isVantageChallenged(observations) {
  const reachable = (observations || []).filter((o) => Number.isInteger(o.status) && o.status > 0);
  if (!reachable.length) return false;
  if (reachable.some(isChallenged)) return true;
  const first = reachable[0].status;
  return CHALLENGE_STATUSES.includes(first) && reachable.every((o) => o.status === first) && reachable.length === (observations || []).length;
}
