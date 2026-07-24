# Genius Hit List — Session 289

Generated: 2026-07-24
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **91/100**
- Health: **yellow**
- Current SIL: **994/1000**
- CI health: **check gh run list**
- Current focus: S289 recovery completed the authorized Obelisk Phase-2 repository migration through a real Worker-backed canonical staging boundary and made source publication physically independent from production promotion. OIDC code+PKCE, strict JWT/JWKS verification, signed KV-backed sessions, UUID-preserving Supabase compatibility, memory-only browser bootstrap, member/investor ceremonies, verified private-route gates, dependency-free edge health, atomic rollback, Worker-CSP-aware parity, and a four-workflow production interlock are implemented and verified. Full build-check is 218/218 plus promotion-gate 7/7; Worker/Obelisk units 47/47; changed JSON/NDJSON 78/78 parse; focused staging browser/theme/accessibility flows are green; /ranks/ Lighthouse is 99/100/96/100; Studio Doctor is 14/15 with overallPass=true and blockingFailing=0. Production remains held because the archive migration and Eternal function are undeployed and real-provider signed-in callback/session/role/revocation E2E remains mandatory.

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

#### 2. [VERIFY] Deploy supabase/functions/eternal-intelligence/index.ts. Then rerun t…
Final score: **94**
[S289][SUPABASE/P0] Deploy supabase/functions/eternal-intelligence/index.ts. Then rerun the Eternal staging path from the exact canonical origin and verify no CORS failure.
Why it matters: Deploy supabase/functions/eternal-intelligence/index.ts. Then rerun th shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 3. [PRODUCT] Apply supabase/migrations/20260723_fix_classified_archive_entitlement…
Final score: **93**
[S289][SUPABASE/P0] Apply supabase/migrations/20260723_fix_classified_archive_entitlements.sql. Then rerun the authenticated Classified Archive matrix and prove RPC error 42702 is gone.
Why it matters: Apply supabase/migrations/20260723_fix_classified_archive_entitlements is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Add a management-capability preflight for Supabase DDL + Function dep…
Final score: **87**
[S289][SIL][SEC/P1] Add a management-capability preflight for Supabase DDL + Function deploys. Extend capability discovery so supabase.admin cannot be mistaken for full control-plane authority when only URL/service-role REST is present.
Why it matters: Add a management-capability preflight for Supabase DDL + Function depl is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Supabase control-plane capability split. Model service-role REST, SQL…
Final score: **84**
[S289][SIL][SEC/P1] Supabase control-plane capability split. Model service-role REST, SQL migration, and Edge Function deployment separately; add harmless live probes so a partial supabase.admin capability cannot present as full deploy authority.
Why it matters: Supabase control-plane capability split. Model service-role REST, SQL  is open, local, and unblocked — can ship this session.


### DEFERRED / GATED

#### 1. [VERIFY] Durable identity migration receipt. Build an honest-dark renderer now…
Final score: **100**
[S289][SIL][RELEASE/P1] Durable identity migration receipt. Build an honest-dark renderer now; after real-provider E2E it must bind issuer/callback host, Worker version, migration/function versions, role matrix, revocation result, and rollback anchor without user identifiers or tokens.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 2. [SECURITY] Grant a Supabase management deploy path. Provide SUPABASE_ACCESS_TOKE…
Final score: **99**
[S289][SUPABASE/P0][HUMAN ACTION] Grant a Supabase management deploy path. Provide SUPABASE_ACCESS_TOKEN through the Studio secrets gateway (preferred) or an approved database/function deployment credential for project fjnpzjjyhnpmunfoycrp. Service-role REST is READY but cannot run DDL or deploy Edge Functions; CLI failed explicitly with “Access token not provided,” blocker preflight found no alternate agent path, and the in-app signed dashboard runtime failed to start.
Why it matters: Requires a live account, real device, inbox receipt, payment-provider flow, or manual external confirmation.

#### 3. [VERIFY] Complete a real-provider signed-in staging E2E. Obelisk authorize → c…
Final score: **94**
[S289][AUTH/P0] Complete a real-provider signed-in staging E2E. Obelisk authorize → callback → signed edge session → compatibility session → member + investor role surfaces → sign-out/revocation; mocked edge identity is supporting evidence only.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 4. [VERIFY] Persist an identity migration receipt. After real-provider E2E, emit …
Final score: **88**
[S289][SIL][RELEASE/P1] Persist an identity migration receipt. After real-provider E2E, emit an agent-readable receipt binding issuer, callback host, edge Worker version, schema migration, function version, role matrix, revocation proof, and rollback anchor without exposing tokens or subject data.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 5. [PRODUCT] Run a fresh release gate and promote only on all-green evidence. Prod…
Final score: **87**
[S289][RELEASE/P0] Run a fresh release gate and promote only on all-green evidence. Production stays unchanged until the SQL/function deploys and real-provider journey pass; rollback is the prior Worker version plus the latest static snapshot.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 6. [PRODUCT] Authorize Obelisk Phase-2 identity-provider migration. Active provide…
Final score: **81**
[S286→S288][AUTH/P0][FOUNDER DECISION] Authorize Obelisk Phase-2 identity-provider migration. Active provider remains Supabase; missing RP credentials and incompatible callback/session shapes are unchanged. Do not call the scaffold integrated.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [PRODUCT] Multi-sport runway for Franchise Architect. playfranchisearchitect.co…
Final score: **78**
[S284→FOUNDER] Multi-sport runway for Franchise Architect. playfranchisearchitect.com + per-sport leaderboards; founder-gated on domain + product scope.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [PRODUCT] Authorize Obelisk Phase-2 identity-provider migration. Unchanged gate
Final score: **75**
[S286→S287][AUTH/P0][FOUNDER DECISION] Authorize Obelisk Phase-2 identity-provider migration. Unchanged gate — founder decision + missing RP credentials.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Post-push CI confirmation
2. Deploy supabase/functions/eternal-intelligence/index.ts. Then rerun t…
3. Apply supabase/migrations/20260723_fix_classified_archive_entitlement…
4. Add a management-capability preflight for Supabase DDL + Function dep…
5. Supabase control-plane capability split. Model service-role REST, SQL…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
