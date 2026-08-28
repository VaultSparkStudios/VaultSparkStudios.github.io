<!-- generated-by: scripts/compact-handoff.mjs v3.1 -->
<!-- source-hash: 39ed7a9fac75 -->
<!-- generated-at: 2026-08-28T04:29:35.987Z -->

# LATEST_HANDOFF (compact)

Session: S331 (2026-08-27)

Shipped this session (local only)
- All four verified audit items landed locally.
- Release ceremony now requires 15-case cross-browser attention suite.
- Fixed Solara destinations and VaultFront/Scriptorium/Seamline CTAs.
- Link court now handles edge routes/templates/NDJSON; RUM helper flow fixed two real allowlist gaps.

Evidence
- build:check 370/370 · mobile runtime 235/235 · rendered-pixel 42/42 (7 themes, desktop/mobile).
- link court 200 files/24,361 links/zero findings · RUM court 82 events/188 sites/zero warnings.
- staging attention 15/15 · canonical ceremony 10/10.

Release posture
- No production deploy or push performed or requested. Production still serves older bundle.
- Full-site promotion held on real-provider-e2e-pending gate.

Current intent
- Ensure new/returning visitors cannot be overloaded by automatic popup notifications; audit and fix all locally actionable defects.

Now bucket (top items)
1. Privacy-thresholded aggregate attention-pressure evidence by surface and visitor-depth bucket (no per-browser history).
2. Complete Obelisk RP registration + founder passkey ceremony to unblock production promotion.
3. Phase 4a IA consolidation (uncontroversial half) — top runway item.

Blockers (top)
1. real-provider-e2e-pending gate blocks production promotion of verified attention-safe candidate.
2. Missing gateway values: OBELISK_RP_ID, OBELISK_RP_NAME, OBELISK_RP_ORIGIN; obelisk-staging-registration:missing.
3. Cloudflare Web Analytics inactive — human-page-loads-30d unavailable, starves voluntary-signal floors.

Human-blocked (age from S329/S330, ~1-3 days)
- Obelisk RP setup + real-provider passkey ceremony (founder hardware key) — sole gate for production. Run: node scripts/verify-provider-journey.mjs --live.
- Activate Cloudflare Web Analytics (dashboard toggle) — verifies via check-cloudflare-web-analytics.mjs.
- Authorize/decline D-S303 GitHub Pages warm-origin migration.
- Confirm Dispatch double-opt-in in founder mailbox.

Operational notes
- Mobile-runtime receipt staleness: run test:mobile AFTER final build, before build:check.
- propagate-nav.mjs hand-arrays stale (clobbers 126 pages); sitemap EXCLUDE drops vault-member routes.

Next session: Build privacy-thresholded aggregate attention-pressure evidence; if human completes Obelisk setup, promote candidate to production and rerun 15-case suite against live (require 15/15).
