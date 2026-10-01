# Genius Hit List — Session 366

Generated: 2026-09-30
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **79/100**
- Health: **yellow**
- Current SIL: **965/1000**
- CI health: **check gh run list**
- Current focus: Post-S366 Desk persona candidate: eight correspondent profiles, sourced contribution feeds, portraits and marks are built and locally verified. Production release remains pending staging and the standing promotion gate.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Track growth of the Desk overlay from the production baseline; arrang…
Final score: **96**
[S366][RELEASE/P2] Track growth of the Desk overlay from the production baseline; arrange a reviewed baseline reset before accumulated story paths or artwork hit the staging archive or Pages limits.
Why it matters: Track growth of the Desk overlay from the production baseline; arrange is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Make staging deployment regenerate its continuity summary before a re…
Final score: **95**
[S365][CI/P2] Make staging deployment regenerate its continuity summary before a release ceremony can read it. The first S365 ceremony ran before that summary and rejected only lineage; the settled rerun passed 11/11.
Why it matters: Make staging deployment regenerate its continuity summary before a rel shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [VERIFY] Watch the next three article Lighthouse runs for stability at the unc…
Final score: **92**
[S365][PERF/P3] Watch the next three article Lighthouse runs for stability at the unchanged 0.90 floor. Investigate if the median falls below the threshold again; preserve the reader-first order and theme evidence.
Why it matters: Watch the next three article Lighthouse runs for stability at the unch shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [PRODUCT] Teach the closeout wipe guard to recognize a byte-preserving work-log…
Final score: **87**
[S365][OPS/P2] Teach the closeout wipe guard to recognize a byte-preserving work-log archive move, so routine cap rotation no longer needs --allow-wipe; keep unarchived deletion blocking.
Why it matters: Teach the closeout wipe guard to recognize a byte-preserving work-log  is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [VERIFY] Decode literal HTML entities in a few older Desk source-receipt excer…
Final score: **86**
[S365][DESK/P3] Decode literal HTML entities in a few older Desk source-receipt excerpts (&#x27;, &#8217;), then regenerate and visually verify those pages. The S365 post-edition visual matrix exposed the artifacts in mobile source cards.
Why it matters: Decode literal HTML entities in a few older Desk source-receipt excerp shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 2. [COHESION] Refuse an inbound propagation that removes an exported symbol this re…
Final score: **80**
[SIL][S363][PROTOCOL/P1] Refuse an inbound propagation that removes an exported symbol this repo's own code imports. S363 merged back eight such symbols (D-S363.4), and S316 had already restored one of them and shipped cargo upstream so the next drain would carry it — it did not. Upstream cargo alone does not hold, so the recipient needs its own check: diff exported symbols pre/post drain and fail the drain, not the next build. Seven of the eight failed loudly as named imports; the eighth degraded silently and was caught only by a contract test, so detection is currently partly luck.
Why it matters: Refuse an inbound propagation that removes an exported symbol this rep is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 3. [PRODUCT] The newsletter cron still shows 6 consecutive failures until the firs…
Final score: **78**
[S362][OBS/P3] The newsletter cron still shows 6 consecutive failures until the first held run on 2026-10-02 (D-S362.8). Expected, not a regression — confirm the run concludes success with a held annotation.
Why it matters: The newsletter cron still shows 6 consecutive failures until the first is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Verify one real confirmation only after explicit email-send authoriza…
Final score: **71**
Verify one real confirmation only after explicit email-send authorization; no email sent yet.
Why it matters: Verify one real confirmation only after explicit email-send authorizat is a 366-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 5. [PRODUCT] Purge api/founder-presence.json from public git history. 30 revisions…
Final score: **69**
[S356][PRIVACY/P0] Purge api/founder-presence.json from public git history. 30 revisions carry live:true with project names and exact start timestamps; founder authorised the purge. Requires crons disabled, filter-repo rewrite, force-push, then regenerating SHA-pinned proof artifacts.
Why it matters: Purge api/founder-presence.json from public git history. 30 revisions  is open, local, and unblocked — can ship this session.

### LATER

#### 1. [PRODUCT] Staging Worker observability. Still the only way to source the S354/S…
Final score: **66**
[S356][OBS/P3] Staging Worker observability. Still the only way to source the S354/S355 staging 503s; needs a Worker deploy and a free-tier cost check.
Why it matters: Staging Worker observability. Still the only way to source the S354/S3 is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Mount the narrative on /journal/. Deferred: a UI change needs its own…
Final score: **63**
[S355][UX/P3] Mount the narrative on /journal/. Deferred: a UI change needs its own theme-matrix receipt cycle; declare the script in page-script scope.
Why it matters: Mount the narrative on /journal/. Deferred: a UI change needs its own  is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Enable Worker observability for staging. Deferred: needs a Worker dep…
Final score: **60**
[S355][OBS/P3] Enable Worker observability for staging. Deferred: needs a Worker deploy and a Workers Logs free-tier cost check (CANON-029); without it the S354 staging 503s cannot be sourced.
Why it matters: Enable Worker observability for staging. Deferred: needs a Worker depl is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [PRODUCT] Rebase the profile candidate onto the moving main branch, run the ful…
Final score: **96**
[DESK/RELEASE] Rebase the profile candidate onto the moving main branch, run the full release checks, publish through staging, and promote only through an authorized content or full-site lane. The existing identity/provider full-site hold still applies.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 2. [AI] The doctor names rescore-ignis --stale as the IGNIS remedy, but the p…
Final score: **94**
[SIL][S362][OBS/P3] The doctor names rescore-ignis --stale as the IGNIS remedy, but the propagated copy reads portfolio/PROJECT_REGISTRY.json from this repo root and finds nothing, so the remedy is a structural no-op here (D-S362.6). Awaiting the studio-ops answer to Ark repo-question 01K2TR2MCB649E1AD036E22BAD; until then the stale score stands honestly reported.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 3. [PRODUCT] Surface the Supabase health API per-service verdict (db/rest/auth) on…
Final score: **93**
[SIL][S360][OBS/P2] Surface the Supabase health API per-service verdict (db/rest/auth) on /status/ through a scheduled, credential-side probe that writes a public JSON. The browser probes can say "not responding" but not "the database is up and the gateway is not".
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 4. [PRODUCT] desk-model-servability dropped to 1/2 during this session: Qwen3.8-27…
Final score: **87**
[S362][OBS/P3] desk-model-servability dropped to 1/2 during this session: Qwen3.8-27B is unmeasured at the provider. Advisory and external; re-probe next session before treating it as a defect.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

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

1. Track growth of the Desk overlay from the production baseline; arrang…
2. Make staging deployment regenerate its continuity summary before a re…
3. Watch the next three article Lighthouse runs for stability at the unc…
4. Teach the closeout wipe guard to recognize a byte-preserving work-log…
5. Decode literal HTML entities in a few older Desk source-receipt excer…
6. Refuse an inbound propagation that removes an exported symbol this re…
7. The newsletter cron still shows 6 consecutive failures until the firs…
8. Verify one real confirmation only after explicit email-send authoriza…
9. Purge api/founder-presence.json from public git history. 30 revisions…
10. Staging Worker observability. Still the only way to source the S354/S…
11. Mount the narrative on /journal/. Deferred: a UI change needs its own…
12. Enable Worker observability for staging. Deferred: needs a Worker dep…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
