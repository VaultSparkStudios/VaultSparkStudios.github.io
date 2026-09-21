# Genius Hit List — Session 363

Generated: 2026-09-21
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **yellow**
- Current SIL: **988/1000**
- CI health: **check gh run list**
- Current focus: S363: closed a live bypass of the newsletter arming decision (a manual dispatch with mode=send skipped the hold entirely and would have mailed every opted-in member), gave the scheduled-cron probe a bounded, self-expiring 'repaired-untested' verdict, stopped the public Supabase receipt reporting 'blocked' while three of its four authorities were live, and restored eight local-ahead guards that this session's own /start propagation had removed. Nothing was armed or sent.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [AI] Make build:check idempotent over ignis/output/ecosystem-state.json. A…
Final score: **97**
[SIL][S363][GATES/P2] Make build:check idempotent over ignis/output/ecosystem-state.json. A completed run leaves the next one failing at step 81 (sanitize-public-oracle-feed --check), because a later step regenerates the gitignored artifact unsanitized. The caller currently has to pre-sanitize. A non-idempotent gate trains a reader to re-run rather than read, which is how a genuine step-81 finding gets waved through. closeout-autopilot.mjs already documents the ordering it depends on; the standalone entry point does not apply it.
Why it matters: Make build:check idempotent over ignis/output/ecosystem-state.json. A  must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

#### 2. [PRODUCT] The newsletter cron still shows 6 consecutive failures until the firs…
Final score: **96**
[S362][OBS/P3] The newsletter cron still shows 6 consecutive failures until the first held run on 2026-10-02 (D-S362.8). Expected, not a regression — confirm the run concludes success with a held annotation.
Why it matters: The newsletter cron still shows 6 consecutive failures until the first is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 4. [COHESION] Refuse an inbound propagation that removes an exported symbol this re…
Final score: **95**
[SIL][S363][PROTOCOL/P1] Refuse an inbound propagation that removes an exported symbol this repo's own code imports. S363 merged back eight such symbols (D-S363.4), and S316 had already restored one of them and shipped cargo upstream so the next drain would carry it — it did not. Upstream cargo alone does not hold, so the recipient needs its own check: diff exported symbols pre/post drain and fail the drain, not the next build. Seven of the eight failed loudly as named imports; the eighth degraded silently and was caught only by a contract test, so detection is currently partly luck.
Why it matters: Refuse an inbound propagation that removes an exported symbol this rep is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

### NEXT

#### 1. [PRODUCT] Purge api/founder-presence.json from public git history. 30 revisions…
Final score: **84**
[S356][PRIVACY/P0] Purge api/founder-presence.json from public git history. 30 revisions carry live:true with project names and exact start timestamps; founder authorised the purge. Requires crons disabled, filter-repo rewrite, force-push, then regenerating SHA-pinned proof artifacts.
Why it matters: Purge api/founder-presence.json from public git history. 30 revisions  is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Staging Worker observability. Still the only way to source the S354/S…
Final score: **81**
[S356][OBS/P3] Staging Worker observability. Still the only way to source the S354/S355 staging 503s; needs a Worker deploy and a free-tier cost check.
Why it matters: Staging Worker observability. Still the only way to source the S354/S3 is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Compact the agent memory index by hand (21.3KB, target <17.1KB). An a…
Final score: **79**
[S363][SIL/P3] Compact the agent memory index by hand (21.3KB, target <17.1KB). An automated label-truncation pass was tried and reverted: shortening to a character budget inverted meanings ("Green run can deploy nothing" → "Green run can deploy"). Needs a deliberate pass that merges genuine near-duplicates (the two "receipts after final …" entries, the two skip-ci entries) and writes shorter labels that still carry the claim. A wrong recall hook is worse than a large index.
Why it matters: Compact the agent memory index by hand (21.3KB, target <17.1KB). An au shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [PRODUCT] Mount the narrative on /journal/. Deferred: a UI change needs its own…
Final score: **78**
[S355][UX/P3] Mount the narrative on /journal/. Deferred: a UI change needs its own theme-matrix receipt cycle; declare the script in page-script scope.
Why it matters: Mount the narrative on /journal/. Deferred: a UI change needs its own  is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] Enable Worker observability for staging. Deferred: needs a Worker dep…
Final score: **75**
[S355][OBS/P3] Enable Worker observability for staging. Deferred: needs a Worker deploy and a Workers Logs free-tier cost check (CANON-029); without it the S354 staging 503s cannot be sourced.
Why it matters: Enable Worker observability for staging. Deferred: needs a Worker depl is open, local, and unblocked — can ship this session.

### LATER

#### 1. [PRODUCT] Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewri…
Final score: **69**
[S349][OBS/P2] Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewriting them. They are published as unresolvedLegacyChecks because a challenge and a real edge outage leave an identical footprint once the shape is gone, so they cannot now be told apart. Once the edge sampler has produced a full 31-day window, the retained history ages them out naturally and the public number becomes fully classifier-current. Do NOT re-score them to improve the figure.
Why it matters: Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewrit is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Close field-vitals freshness only with real evidence. Surface observe…
Final score: **66**
[NEXT][SIL][OBS/P1] Close field-vitals freshness only with real evidence. Surface observed-through/stale-days, obtain a genuinely fresh post-S262 RUM cohort, and bind cohort verdicts to a release SHA so a fresh generated clock can never imply fresh field evidence.
Why it matters: Close field-vitals freshness only with real evidence. Surface observed is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Verify the first Vault Narrative run after the S353 fix publishes a d…
Final score: **62**
[S353][SIL][OBS/P2] Verify the first Vault Narrative run after the S353 fix publishes a dispatch. Expect [vault-narrative] wrote … (anchor:…) and --check-fresh green; if it rejects, the log now prints the rejected text.
Why it matters: Verify the first Vault Narrative run after the S353 fix publishes a di is a 10-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

### DEFERRED / GATED

#### 1. [AI] The doctor names rescore-ignis --stale as the IGNIS remedy, but the p…
Final score: **97**
[SIL][S362][OBS/P3] The doctor names rescore-ignis --stale as the IGNIS remedy, but the propagated copy reads portfolio/PROJECT_REGISTRY.json from this repo root and finds nothing, so the remedy is a structural no-op here (D-S362.6). Awaiting the studio-ops answer to Ark repo-question 01K2TR2MCB649E1AD036E22BAD; until then the stale score stands honestly reported.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 2. [PRODUCT] Surface the Supabase health API per-service verdict (db/rest/auth) on…
Final score: **96**
[SIL][S360][OBS/P2] Surface the Supabase health API per-service verdict (db/rest/auth) on /status/ through a scheduled, credential-side probe that writes a public JSON. The browser probes can say "not responding" but not "the database is up and the gateway is not".
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [PRODUCT] desk-model-servability dropped to 1/2 during this session: Qwen3.8-27…
Final score: **90**
[S362][OBS/P3] desk-model-servability dropped to 1/2 during this session: Qwen3.8-27B is unmeasured at the provider. Advisory and external; re-probe next session before treating it as a defect.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 4. [PRODUCT] Reconcile the four propagated checkers that encode studio-ops' own la…
Final score: **87**
[SIL][S363][PROTOCOL/P2] Reconcile the four propagated checkers that encode studio-ops' own layout (D-S363.5, D-S363.7, D-S363.8, D-S363.9): check-windows-hide scan roots, the wipe guard's status-row format and archive naming, and arc-profile.mjs resolving PROJECT_REGISTRY to a path that exists only inside studio-ops. Each produced a false failure or a false inference that no local change could fix. Ark cargo 01K30UDB1264A040FE519B8D8B carries the upstream ask; this item tracks whether the next drain actually lands it.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 5. [PRODUCT] "Coming soon" / "TBD" copy on six live game pages. Founder copy decis…
Final score: **84**
[S356][PRODUCT/P2] "Coming soon" / "TBD" copy on six live game pages. Founder copy decision: call-of-doodie, franchise-architect, gridiron-gm (trailer + screenshots), vaultfront (backend), mindframe, project-unknown (platform, title).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 6. [PRODUCT] Founder-owned items deferred. Passkey sign-in, signup walkthrough, pu…
Final score: **81**
[S354][FOUNDER DIRECTIVE] Founder-owned items deferred. Passkey sign-in, signup walkthrough, public member data, newsletter arming, Desk cadence, warm-origin, Workers Paid and the small confirmations wait until the founder picks them up; agent-owned items continue.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [PRODUCT] Ship the sampler RPC entrypoint on Ark acceptance. Ark 01K2EQ77M9F29A…
Final score: **75**
[S352][SIL][OBS/P1] Ship the sampler RPC entrypoint on Ark acceptance. Ark 01K2EQ77M9F29A0EC9619EA4BC asks studio-ops to reuse studio-ops-cron */30 via a service binding. The website half needs a node-side cloudflare:workers shim for the unit tests.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 8. [PRODUCT] Free a cron slot, or move the account to Workers Paid. S352: an agent…
Final score: **72**
[S351][OBS/P0 · FOUNDER DECISION] Free a cron slot, or move the account to Workers Paid. S352: an agent-side third option went to studio-ops via Ark (row above); this row closes if studio-ops accepts. This is the single thing standing between the studio and ever observing its own edge, and it is now a one-sentence decision rather than an investigation. Five of five free-plan cron triggers are in use by other projects. Retiring one is a live change to that project (founder call); Workers Paid raises the cap to 1,000 and is a billing action reserved to a human under CANON-019. Everything downstream is already built, deployed and verified — namespace, binding, handler, drain, 12/12 drain self-tests.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Make build:check idempotent over ignis/output/ecosystem-state.json. A…
2. The newsletter cron still shows 6 consecutive failures until the firs…
3. Post-push CI confirmation
4. Refuse an inbound propagation that removes an exported symbol this re…
5. Purge api/founder-presence.json from public git history. 30 revisions…
6. Staging Worker observability. Still the only way to source the S354/S…
7. Compact the agent memory index by hand (21.3KB, target <17.1KB). An a…
8. Mount the narrative on /journal/. Deferred: a UI change needs its own…
9. Enable Worker observability for staging. Deferred: needs a Worker dep…
10. Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewri…
11. Close field-vitals freshness only with real evidence. Surface observe…
12. Verify the first Vault Narrative run after the S353 fix publishes a d…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
