<!-- generated-by: scripts/compact-handoff.mjs v3.1 -->
<!-- source-hash: c66caad6411a -->
<!-- generated-at: 2026-08-12T00:05:48.065Z -->

# LATEST_HANDOFF (compact)

SESSION 312 HANDOFF SUMMARY

Session
- S312, 2026-08-11

What shipped
- Two live 2026-08-11 stories using light formats: Roast (cloudflare browser/chaperone) and Signature Bit (agent-budget blindfold).
- Both use primary sources, render through normal generator, feed News JSON, claims ledger, stats artifacts. No forced predictions.

Verification
- Full build:check passed 295/295, receipt cf774febfdc668dae34a51bf.
- Focused News checks passed: desk rebuild, generated pages, stats coherence, AI disclosure, image formats, base href, visual-proof across 42 captures.
- CANON-053: Windows sandbox view_image failed (CryptUnprotectData); receipt records programmatic pixel inspection (HTTP 200, visible text, no overflow, dimensions, pixel variance), not eyeball pass.

Deployment truth
- Staging updated via identity-isolated content lane; baseline 9527f22714e75667a766e331b59cdd29400fe07e; 208 overlays, 5 safe removals; identity untouched.
- Production must use content-lane dispatch over served baseline 4a72961d85791d56629f1acdea797dbe04e50bed.
- Full-site promotion held by real-provider-e2e-pending; do not reuse this hold to ship unrelated Worker/auth code.

Now (top 3)
1. Confirm production content-lane run; live-probe both new story URLs plus /api/news-desk-feed.json.
2. Keep Roast/Signature Bit cadence alive.
3. Gate that a rendered stat equals its derived source (panel/feed agree by construction, one refactor from silent drift).

Blockers (top 3)
1. Production promotion held: production-promotion-gate allowed=false, reason real-provider-e2e-pending.
2. Reaction counts not live; endpoint ships in Worker, Worker deploy held by same gate.
3. Staging Obelisk callback: live probe returns state=rejected exact=redirect-not-registered despite Obelisk claiming registered; repo-question outstanding.

Human-blocked (with age)
- Obelisk Passport v2 migration: on v1 hand-rolled auth, 0/43 relying parties live; no "Sign in with Obelisk" control exists, so 5 journey legs unobservable. Founder-deferred to its own session (open since S310, ~2 sessions).
- Dispatch double-opt-in confirmation: list still 0 confirmed; founder must click email in founder@vaultsparkstudios.com (open since S308, ~4 sessions).

Next session: confirm production content-lane run and live-probe both new story URLs plus the news-desk feed.
