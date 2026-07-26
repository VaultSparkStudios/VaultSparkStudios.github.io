# Genius Hit List — Session 291

Generated: 2026-07-26
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **96/100**
- Health: **yellow**
- Current SIL: **998/1000**
- CI health: **check gh run list**
- Current focus: S291 ran the full arc: the primary genius list was entirely gated (Supabase/provider/founder — all verified genuine via the secrets gateway, honest deferrals). Root-caused a recurring cascade-drift class where [skip ci] publisher crons commit a base feed but strand its byte-checked derived artifacts — build:check was RED on a clean pull. Root-fixed four instances (uptime-probe strands release-proof + citation; refresh-live-data strands the you-asked-shipped changelog SSR; vault-narrative strands citation) plus the churn root (build-ship-receipts wrote an unconditional generatedAt), and shipped a permanent structural gate (check-publish-cascade-coverage.mjs, self-test 14/14, wired into build:check) so the class cannot silently return. build:check is now 220/220 green on every commit, not just at closeout. Also diagnosed a real 23-day production incident: the security Worker was clobbered out-of-band on 2026-07-03 with a build missing /v/rum, so RUM telemetry ingest has been dead since 2026-07-02 (the honest 47.6% uptime is the S275 forcing-function, correctly not massaged). The Worker redeploy is founder-gated behind the fail-closed production promotion hold; surfaced with evidence rather than overridden. Shipped Ark cargo fixing a portfolio-wide sitemap-checker false-negative for static <page>/index.html legal/contact/ip pages.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`



### DEFERRED / GATED

#### 1. [SECURITY] Restore the production Worker /v/rum route. The security Worker was c…
Final score: **100**
[S291→FOUNDER][INCIDENT/P0][HUMAN ACTION] Restore the production Worker /v/rum route. The security Worker was clobbered out-of-band on 2026-07-03 with a build missing /v/rum; RUM telemetry ingest has been dark since 2026-07-02 (live 405 vs repo 204; honest 47.6% uptime is the S275 forcing-function, correctly not massaged). Restore: gh workflow run cloudflare-worker-deploy.yml -f confirm_production=true. Gated by the fail-closed production promotion hold (Supabase/identity reasons) — clearing or explicitly accepting that hold is a founder decision (auth/security production deploy, CANON-019). cloudflare deploy capability is READY in the secrets gateway; the only gate is the hold.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [PRODUCT] Candidate artifact Merkle manifest. Activate after Supabase/provider …
Final score: **81**
[S290→NEXT][SIL][RELEASE/P1][BLOCKED: NEXT RUNTIME CANDIDATE] Candidate artifact Merkle manifest. Activate after Supabase/provider reconciliation creates the next candidate; bind critical route/content hashes to its staging receipt so exact commit identity also proves deployment completeness. The current candidate has no observed partial-deploy drift.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [SECURITY] Grant a Supabase management deploy path. The S290 live authority rece…
Final score: **81**
[S289→S290][SUPABASE/P0][HUMAN ACTION] Grant a Supabase management deploy path. The S290 live authority receipt proves 1/4 planes ready: service-role REST HTTP 200; management API, read-only SQL authority probe, and Edge Function listing are blocked because SUPABASE_ACCESS_TOKEN and a database credential are absent. Provide the token through the Studio secrets gateway (preferred) or an approved database/function deployment credential for project fjnpzjjyhnpmunfoycrp.
Why it matters: Requires a live account, real device, inbox receipt, payment-provider flow, or manual external confirmation.

#### 4. [PRODUCT] Privacy-safe provider ceremony trace compiler. Once provider access e…
Final score: **78**
[S290→NEXT][SIL][AUTH/P1][BLOCKED: REAL PROVIDER] Privacy-safe provider ceremony trace compiler. Once provider access exists, compile callback/session/member/investor/revocation step receipts without identifiers and feed identity eligibility.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 5. [VERIFY] Complete a real-provider signed-in staging E2E. Obelisk authorize → c…
Final score: **75**
[S289][AUTH/P0] Complete a real-provider signed-in staging E2E. Obelisk authorize → callback → signed edge session → compatibility session → member + investor role surfaces → sign-out/revocation; mocked edge identity is supporting evidence only.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 6. [PRODUCT] Run a fresh release gate and promote only on all-green evidence. Prod…
Final score: **75**
[S289][RELEASE/P0] Run a fresh release gate and promote only on all-green evidence. Production stays unchanged until the SQL/function deploys and real-provider journey pass; rollback is the prior Worker version plus the latest static snapshot.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 7. [PRODUCT] Apply supabase/migrations/20260723_fix_classified_archive_entitlement…
Final score: **72**
[S289][SUPABASE/P0][BLOCKED: CONTROL PLANE] Apply supabase/migrations/20260723_fix_classified_archive_entitlements.sql. Blocked until the authority receipt proves SQL migration access; then rerun the authenticated Classified Archive matrix and prove RPC error 42702 is gone.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 8. [PRODUCT] Multi-sport runway for Franchise Architect. playfranchisearchitect.co…
Final score: **72**
[S284→FOUNDER] Multi-sport runway for Franchise Architect. playfranchisearchitect.com + per-sport leaderboards; founder-gated on domain + product scope.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Post-push CI confirmation

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
