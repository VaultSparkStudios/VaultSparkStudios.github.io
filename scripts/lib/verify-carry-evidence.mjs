// Evidence-based resolution for GENERIC post-push CI-verify carries.
//
// S283-recovery. A carry that only asks "did our last push stay green in CI" is
// *satisfied* the moment the committed CI beacon (api/ci-status.json) proves the
// browser gates green on a verified head. This is the VERIFY analog of the
// evidence-over-phrasing discipline S281 applied to done-detection (D-S281.1) and
// S283 to the carry classifier (D-S283.2): a priority surface should CHECK evidence,
// not grow a hand-maintained regex allowlist pairing every resolved verify with its
// done-phrasing (which is why the same 3 post-push verifies re-ranked NOW every
// session until a human hand-flipped them).
//
// Fails SAFE by design: no positive CI-green evidence → NOT resolved, so a genuinely
// red or unknown pipeline keeps the verify ranked NOW (you DO want to look then).
// Only GENERIC post-push verifies qualify — a carry that names specific independently
// gated work (annual checkout, worker deploy, a real-device render, …) is never
// auto-satisfied by a generally-green pipeline; it needs its own proof.
//
// Beacon freshness is enforced separately by check-ci-status-freshness.mjs in
// build:check (max-age 96h), so this rule trusts browserGatesGreen without re-checking
// staleness — the two gates compose rather than duplicate.

// Generic post-push verify: names the push + green + CI, and NO specific deliverable.
const GENERIC_POST_PUSH_VERIFY = [
  /\bpost-push ci confirmation\b/i,
  /\b(confirm|verify)\b[^.]*\bpush\b[^.]*\bgreen\b/i,
  /\b(confirm|verify)\b[^.]*\bgreen\b[^.]*\bci\b/i,
  /\bconfirm\b[^.]*\bci\b[^.]*\bgreen\b/i,
];

// Phrasings that name specific, independently-gated work — these must NEVER be
// auto-resolved by a generally-green pipeline. Kept deliberately broad on the safe side:
// a false negative here just means a generic verify stays ranked (harmless); a false
// positive would suppress a genuinely-open verify (harmful).
const NAMES_SPECIFIC_WORK =
  /\b(annual|checkout|stripe|payment|billing|membership|obelisk|worker\s*deploy|token|real[-\s]?device|renders?\s+on|screenshot|founder|supabase|wishlist|turnstile|tt[-\s]?enforce|trusted[-\s]?types)\b/i;

export function isGenericPostPushVerify(task) {
  if (typeof task !== 'string' || !task) return false;
  if (NAMES_SPECIFIC_WORK.test(task)) return false;
  return GENERIC_POST_PUSH_VERIFY.some((re) => re.test(task));
}

// Positive evidence only: the browser gates are green on a verified head SHA.
export function ciBeaconProvesGreen(ciStatus) {
  if (!ciStatus || typeof ciStatus !== 'object') return false;
  if (ciStatus.browserGatesGreen !== true && ciStatus.allGreen !== true) return false;
  const head = typeof ciStatus.verifiedBrowserHeadSha === 'string' ? ciStatus.verifiedBrowserHeadSha : '';
  return head.length >= 7;
}

// The one structural rule: a generic post-push verify is resolved iff the committed CI
// beacon proves the browser gates green. Any other carry, or an absent/red/unknown
// beacon, returns false.
export function isSatisfiedPostPushVerify(task, ciStatus) {
  return isGenericPostPushVerify(task) && ciBeaconProvesGreen(ciStatus);
}
