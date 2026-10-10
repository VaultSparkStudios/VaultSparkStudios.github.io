# Genius Hit List — Session 373

Generated: 2026-10-10
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **80/100**
- Health: **yellow**
- Current SIL: **923/1000**
- CI health: **check gh run list**
- Current focus: S373 closed nine S372 follow-ups with guards and tests. Promotion was approved and is staged at 2b001af82, but Lighthouse failed twice at that SHA, so production is unchanged.

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

#### 2. [PRODUCT] Exercise the art receipt path on the next real scheduled publish; con…
Final score: **93**
[SIL/P2 · next scope] Exercise the art receipt path on the next real scheduled publish; confirm consumer accepts the exact SHA/path ledger.
Why it matters: Exercise the art receipt path on the next real scheduled publish; conf is open, local, and unblocked — can ship this session.

#### 3. [COHESION] Preserve project-local capability contracts during incoming propagati…
Final score: **92**
[SIL/P2 · next scope] Preserve project-local capability contracts during incoming propagation; source copies that remove known exports must fail before being applied.
Why it matters: Preserve project-local capability contracts during incoming propagatio is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 4. [PRODUCT] Keep shell regeneration and SRI stamping in a single documented seque…
Final score: **90**
[SIL/P2 · next scope] Keep shell regeneration and SRI stamping in a single documented sequence when running partial generators.
Why it matters: Keep shell regeneration and SRI stamping in a single documented sequen is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [VERIFY] Lighthouse is sitting on its floors: homepage 0.75–0.78 vs 0.76 and /…
Final score: **86**
[PERF/P2 · S372] Lighthouse is sitting on its floors: homepage 0.75–0.78 vs 0.76 and /news/2026-08-11/cloudflare-gave…/ bimodal 0.88 or 0.92 vs 0.90 (text LCP, render delay 2.2s vs 3.4s, TBT 0). Three of the last five runs needed a re-run. Find the render-delay cause or mark the tier lab-volatile with corroboration; do not lower floors. S373 evidence: observed FCP equals observed LCP (160–230ms) and ten scripts finish before it in every run; simulated FCP is steady at 1.3s while simulated LCP swings 2.3–3.9s. The gap is the script graph. Next: load below-the-fold Desk scripts after paint (CSP-safe) and compare in CI. The homepage tier now reads recurring sub-floor.
Why it matters: Lighthouse is sitting on its floors: homepage 0.75–0.78 vs 0.76 and /n is a 373-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [PRODUCT] Push helper as a repo script (scripts/push-main.mjs): autostash merge…
Final score: **84**
[SIL/P2] Push helper as a repo script (scripts/push-main.mjs): autostash merge, regenerate conflicted generated outputs, repair-evidence-graph, push — replacing the session-local PowerShell helper that four separate failure modes tripped this session.
Why it matters: Push helper as a repo script (scripts/push-main.mjs): autostash merge, is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Approve Desk digest test → autoSend; apply caller-trust-column-revoke…
Final score: **78**
[P1] Approve Desk digest test → autoSend; apply caller-trust-column-revokes; Ark 01K3SJ87… reply.
Why it matters: Approve Desk digest test is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Add a generated-fixture check for month rollover so a future edition …
Final score: **75**
[DESK/QA/P2] Add a generated-fixture check for month rollover so a future edition automatically creates its month archive and retains all older story links.
Why it matters: Add a generated-fixture check for month rollover so a future edition a is open, local, and unblocked — can ship this session.

#### 5. [VERIFY] Obelisk Ark 01K3SH847CF5020D9D7209EB07: reopen signup + test identity…
Final score: **71**
[AUTH/P0] Obelisk Ark 01K3SH847CF5020D9D7209EB07: reopen signup + test identity → login E2E; Sparked-as-free.
Why it matters: Obelisk Ark 01K3SH847CF5020D9D7209EB07: reopen signup + test identity is a 373-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [PRODUCT] Review measured Linux screenshots before refreshing visual-regression…
Final score: **69**
[QA/P2] Review measured Linux screenshots before refreshing visual-regression references.
Why it matters: Review measured Linux screenshots before refreshing visual-regression  is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Track growth of the Desk overlay from the production baseline; arrang…
Final score: **66**
[S366][RELEASE/P2] Track growth of the Desk overlay from the production baseline; arrange a reviewed baseline reset before accumulated story paths or artwork hit the staging archive or Pages limits.
Why it matters: Track growth of the Desk overlay from the production baseline; arrange is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Verify prior-overlay path preservation automatically before scoped Pa…
Final score: **62**
[DESK/RELEASE/P2] Verify prior-overlay path preservation automatically before scoped Pages deploys.
Why it matters: Verify prior-overlay path preservation automatically before scoped Pag is a 373-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

### DEFERRED / GATED

#### 1. [AI] The doctor names rescore-ignis --stale as the IGNIS remedy, but the p…
Final score: **94**
[SIL][S362][OBS/P3] The doctor names rescore-ignis --stale as the IGNIS remedy, but the propagated copy reads portfolio/PROJECT_REGISTRY.json from this repo root and finds nothing, so the remedy is a structural no-op here (D-S362.6). Awaiting the studio-ops answer to Ark repo-question 01K2TR2MCB649E1AD036E22BAD; until then the stale score stands honestly reported.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 2. [PRODUCT] Surface the Supabase health API per-service verdict (db/rest/auth) on…
Final score: **93**
[SIL][S360][OBS/P2] Surface the Supabase health API per-service verdict (db/rest/auth) on /status/ through a scheduled, credential-side probe that writes a public JSON. The browser probes can say "not responding" but not "the database is up and the gateway is not".
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [PRODUCT] desk-model-servability dropped to 1/2 during this session: Qwen3.8-27…
Final score: **87**
[S362][OBS/P3] desk-model-servability dropped to 1/2 during this session: Qwen3.8-27B is unmeasured at the provider. Advisory and external; re-probe next session before treating it as a defect.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 4. [VERIFY] Production: founder approved promotion (2026-10-10). Candidate 2b001a…
Final score: **86**
Production: founder approved promotion (2026-10-10). Candidate 2b001af82 is on main and staging (ceremony 11/11, E2E and accessibility green) but Lighthouse failed twice at that SHA, so it was NOT promoted. No JS or CSS changed since the last green run. Needs the Lighthouse fix or the founder's call.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 5. [PRODUCT] Reconcile the four propagated checkers that encode studio-ops' own la…
Final score: **84**
[SIL][S363][PROTOCOL/P2] Reconcile the four propagated checkers that encode studio-ops' own layout (D-S363.5, D-S363.7, D-S363.8, D-S363.9): check-windows-hide scan roots, the wipe guard's status-row format and archive naming, and arc-profile.mjs resolving PROJECT_REGISTRY to a path that exists only inside studio-ops. Each produced a false failure or a false inference that no local change could fix. Ark cargo 01K30UDB1264A040FE519B8D8B carries the upstream ask; this item tracks whether the next drain actually lands it.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 6. [PRODUCT] "Coming soon" / "TBD" copy on six live game pages. Founder copy decis…
Final score: **81**
[S356][PRODUCT/P2] "Coming soon" / "TBD" copy on six live game pages. Founder copy decision: call-of-doodie, franchise-architect, gridiron-gm (trailer + screenshots), vaultfront (backend), mindframe, project-unknown (platform, title).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [PRODUCT] Founder-owned items deferred. Passkey sign-in, signup walkthrough, pu…
Final score: **78**
[S354][FOUNDER DIRECTIVE] Founder-owned items deferred. Passkey sign-in, signup walkthrough, public member data, newsletter arming, Desk cadence, warm-origin, Workers Paid and the small confirmations wait until the founder picks them up; agent-owned items continue.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [PRODUCT] Ship the sampler RPC entrypoint on Ark acceptance. Ark 01K2EQ77M9F29A…
Final score: **72**
[S352][SIL][OBS/P1] Ship the sampler RPC entrypoint on Ark acceptance. Ark 01K2EQ77M9F29A0EC9619EA4BC asks studio-ops to reuse studio-ops-cron */30 via a service binding. The website half needs a node-side cloudflare:workers shim for the unit tests.
Why it matters: Owned by another repo or already moved through Ark cargo.

## Recommended Build Order

1. Post-push CI confirmation
2. Exercise the art receipt path on the next real scheduled publish; con…
3. Preserve project-local capability contracts during incoming propagati…
4. Keep shell regeneration and SRI stamping in a single documented seque…
5. Lighthouse is sitting on its floors: homepage 0.75–0.78 vs 0.76 and /…
6. Push helper as a repo script (scripts/push-main.mjs): autostash merge…
7. Approve Desk digest test → autoSend; apply caller-trust-column-revoke…
8. Add a generated-fixture check for month rollover so a future edition …
9. Obelisk Ark 01K3SH847CF5020D9D7209EB07: reopen signup + test identity…
10. Review measured Linux screenshots before refreshing visual-regression…
11. Track growth of the Desk overlay from the production baseline; arrang…
12. Verify prior-overlay path preservation automatically before scoped Pa…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
