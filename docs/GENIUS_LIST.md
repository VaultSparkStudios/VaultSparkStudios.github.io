# Genius Hit List — Session 289

Generated: 2026-07-24
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **98/100**
- Health: **yellow**
- Current SIL: **994/1000**
- CI health: **check gh run list**
- Current focus: S289 recovery completed the authorized Obelisk Phase-2 repository migration through a real Worker-backed canonical staging boundary and made source publication physically independent from production promotion. OIDC code+PKCE, strict JWT/JWKS verification, signed KV-backed sessions, UUID-preserving Supabase compatibility, memory-only browser bootstrap, member/investor ceremonies, verified private-route gates, dependency-free edge health, atomic rollback, Worker-CSP-aware parity, and a four-workflow production interlock are implemented and verified. Full build-check is 218/218 plus promotion-gate 7/7; Worker/Obelisk units 47/47; changed JSON/NDJSON 78/78 parse; focused staging browser/theme/accessibility flows are green; /ranks/ Lighthouse is 99/100/96/100; Studio Doctor is 14/15 with overallPass=true and blockingFailing=0. Production remains held because the archive migration and Eternal function are undeployed and real-provider signed-in callback/session/role/revocation E2E remains mandatory.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Confirm the S290 implementation SHA on Lighthouse, Accessibility, E2E…
Final score: **100**
[S290][VERIFY/P0][POST-PUSH] Confirm the S290 implementation SHA on Lighthouse, Accessibility, E2E compliance, secret lint, and all four skip-only production workflows. This is agent work immediately after push; do not call production promoted.
Why it matters: Confirm the S290 implementation SHA on Lighthouse, Accessibility, E2E  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`



### DEFERRED / GATED

#### 1. [VERIFY] Complete a real-provider signed-in staging E2E. Obelisk authorize → c…
Final score: **91**
[S289][AUTH/P0] Complete a real-provider signed-in staging E2E. Obelisk authorize → callback → signed edge session → compatibility session → member + investor role surfaces → sign-out/revocation; mocked edge identity is supporting evidence only.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 2. [SECURITY] Grant a Supabase management deploy path. The S290 live authority rece…
Final score: **90**
[S289→S290][SUPABASE/P0][HUMAN ACTION] Grant a Supabase management deploy path. The S290 live authority receipt proves 1/4 planes ready: service-role REST HTTP 200; management API, read-only SQL authority probe, and Edge Function listing are blocked because SUPABASE_ACCESS_TOKEN and a database credential are absent. Provide the token through the Studio secrets gateway (preferred) or an approved database/function deployment credential for project fjnpzjjyhnpmunfoycrp.
Why it matters: Requires a live account, real device, inbox receipt, payment-provider flow, or manual external confirmation.

#### 3. [PRODUCT] Run a fresh release gate and promote only on all-green evidence. Prod…
Final score: **84**
[S289][RELEASE/P0] Run a fresh release gate and promote only on all-green evidence. Production stays unchanged until the SQL/function deploys and real-provider journey pass; rollback is the prior Worker version plus the latest static snapshot.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 4. [VERIFY] Deploy supabase/functions/eternal-intelligence/index.ts. Blocked unti…
Final score: **82**
[S289][SUPABASE/P0][BLOCKED: CONTROL PLANE] Deploy supabase/functions/eternal-intelligence/index.ts. Blocked until the authority receipt proves Edge Function deploy access; then rerun the Eternal staging path from the exact canonical origin and verify no CORS failure.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 5. [PRODUCT] Apply supabase/migrations/20260723_fix_classified_archive_entitlement…
Final score: **81**
[S289][SUPABASE/P0][BLOCKED: CONTROL PLANE] Apply supabase/migrations/20260723_fix_classified_archive_entitlements.sql. Blocked until the authority receipt proves SQL migration access; then rerun the authenticated Classified Archive matrix and prove RPC error 42702 is gone.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 6. [PRODUCT] Multi-sport runway for Franchise Architect. playfranchisearchitect.co…
Final score: **81**
[S284→FOUNDER] Multi-sport runway for Franchise Architect. playfranchisearchitect.com + per-sport leaderboards; founder-gated on domain + product scope.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **78**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [SECURITY] TT-ENFORCE-REPROBE
Final score: **78**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

## Recommended Build Order

1. Confirm the S290 implementation SHA on Lighthouse, Accessibility, E2E…
2. Post-push CI confirmation

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
