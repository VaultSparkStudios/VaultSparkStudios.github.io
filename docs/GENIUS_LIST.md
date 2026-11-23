# Genius Hit List — Session 417

Generated: 2026-11-23
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **yellow**
- Current SIL: **835/1000**
- CI health: **check gh run list**
- Current focus: S417 partial record recovered; fresh arc and release acceptance pending

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Verify cumulative content deployments retain the approved executable …
Final score: **100**
[SIL][S417] Verify cumulative content deployments retain the approved executable baseline.
Why it matters: Verify cumulative content deployments retain the approved executable b shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Complete affected account acceptance and full release evidence; exist…
Final score: **93**
[SIL][S417] Complete affected account acceptance and full release evidence; existing holds remain enforced.
Why it matters: Complete affected account acceptance and full release evidence; existi is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Full source check, push, staging and production readback for this tra…
Final score: **90**
Full source check, push, staging and production readback for this tranche.
Why it matters: Full source check, push, staging and production readback for this tran is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Remaining public-beta waves: docs/S417_REMAINING_PLAN.md.
Final score: **87**
Remaining public-beta waves: docs/S417_REMAINING_PLAN.md.
Why it matters: Remaining public-beta waves: docs/S417_REMAINING_PLAN.md. is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Complete affected successful sign-in/sign-up and real member/approved…
Final score: **84**
Complete affected successful sign-in/sign-up and real member/approved-investor positive application journeys.
Why it matters: Complete affected successful sign-in/sign-up and real member/approved- is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Integrate current main safely; pass full current source and exact req…
Final score: **81**
Integrate current main safely; pass full current source and exact required workflows, applicable staging parity, authorized main/production promotion and readback.
Why it matters: Integrate current main safely; pass full current source and exact requ is open, local, and unblocked — can ship this session.

#### 4. [INTELLIGENCE] Complete recovered S415 writeback, all S416 closeout surfaces and nat…
Final score: **81**
Complete recovered S415 writeback, all S416 closeout surfaces and native completion audit.
Why it matters: Complete recovered S415 writeback, all S416 closeout surfaces and nati keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 5. [PRODUCT] Affected deployed authentication, current isolated staging parity, au…
Final score: **72**
Affected deployed authentication, current isolated staging parity, authorized production promotion/readback and full closeout.
Why it matters: Affected deployed authentication, current isolated staging parity, aut is open, local, and unblocked — can ship this session.

### LATER

#### 1. [PRODUCT] Integrate current main safely and complete exact candidate required c…
Final score: **66**
Integrate current main safely and complete exact candidate required checks.
Why it matters: Integrate current main safely and complete exact candidate required ch is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Finish merged candidate full source verification and exact required E…
Final score: **65**
Finish merged candidate full source verification and exact required E2E, Lighthouse and accessibility checks.
Why it matters: Finish merged candidate full source verification and exact required E2 is a 417-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [SECURITY] Complete isolated access/security acceptance and affected member/inve…
Final score: **63**
Complete isolated access/security acceptance and affected member/investor journeys before data-route exposure.
Why it matters: Complete isolated access/security acceptance and affected member/inves lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

### DEFERRED / GATED

#### 1. [SECURITY] Reuse the canonical Pages broker in deploy-currency provider observat…
Final score: **99**
[SIL][S397] Reuse the canonical Pages broker in deploy-currency provider observations; the current Worker-token Pages probe returns403. Future selection only.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 2. [PRODUCT] Review discussion intent coverage after a reproduced missing state.
Final score: **96**
[S411][SIL] Review discussion intent coverage after a reproduced missing state.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [PRODUCT] vault-sdk member fetch fails on vault_rank; fixing changes consumer g…
Final score: **90**
[S390][FOUNDER REVIEW] vault-sdk member fetch fails on vault_rank; fixing changes consumer gating.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [AI] The doctor names rescore-ignis --stale as the IGNIS remedy, but the p…
Final score: **88**
[SIL][S362][OBS/P3] The doctor names rescore-ignis --stale as the IGNIS remedy, but the propagated copy reads portfolio/PROJECT_REGISTRY.json from this repo root and finds nothing, so the remedy is a structural no-op here (D-S362.6). Awaiting the studio-ops answer to Ark repo-question 01K2TR2MCB649E1AD036E22BAD; until then the stale score stands honestly reported.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 5. [PRODUCT] Surface the Supabase health API per-service verdict (db/rest/auth) on…
Final score: **87**
[SIL][S360][OBS/P2] Surface the Supabase health API per-service verdict (db/rest/auth) on /status/ through a scheduled, credential-side probe that writes a public JSON. The browser probes can say "not responding" but not "the database is up and the gateway is not".
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 6. [PRODUCT] desk-model-servability dropped to 1/2 during this session: Qwen3.8-27…
Final score: **81**
[S362][OBS/P3] desk-model-servability dropped to 1/2 during this session: Qwen3.8-27B is unmeasured at the provider. Advisory and external; re-probe next session before treating it as a defect.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 7. [PRODUCT] Reconcile the four propagated checkers that encode studio-ops' own la…
Final score: **78**
[SIL][S363][PROTOCOL/P2] Reconcile the four propagated checkers that encode studio-ops' own layout (D-S363.5, D-S363.7, D-S363.8, D-S363.9): check-windows-hide scan roots, the wipe guard's status-row format and archive naming, and arc-profile.mjs resolving PROJECT_REGISTRY to a path that exists only inside studio-ops. Each produced a false failure or a false inference that no local change could fix. Ark cargo 01K30UDB1264A040FE519B8D8B carries the upstream ask; this item tracks whether the next drain actually lands it.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 8. [PRODUCT] "Coming soon" / "TBD" copy on six live game pages. Founder copy decis…
Final score: **75**
[S356][PRODUCT/P2] "Coming soon" / "TBD" copy on six live game pages. Founder copy decision: call-of-doodie, franchise-architect, gridiron-gm (trailer + screenshots), vaultfront (backend), mindframe, project-unknown (platform, title).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Verify cumulative content deployments retain the approved executable …
2. Post-push CI confirmation
3. Complete affected account acceptance and full release evidence; exist…
4. Full source check, push, staging and production readback for this tra…
5. Remaining public-beta waves: docs/S417_REMAINING_PLAN.md.
6. Complete affected successful sign-in/sign-up and real member/approved…
7. Integrate current main safely; pass full current source and exact req…
8. Complete recovered S415 writeback, all S416 closeout surfaces and nat…
9. Affected deployed authentication, current isolated staging parity, au…
10. Integrate current main safely and complete exact candidate required c…
11. Finish merged candidate full source verification and exact required E…
12. Complete isolated access/security acceptance and affected member/inve…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
