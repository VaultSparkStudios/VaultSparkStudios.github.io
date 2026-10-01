# Genius Hit List — Session 367

Generated: 2026-10-01
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **81/100**
- Health: **yellow**
- Current SIL: **948/1000**
- CI health: **check gh run list**
- Current focus: S367 whole-site audit (docs/AUDIT_2026-10-01): public statuses now follow studio-ops canon, HMAC CSP nonce, edge-side session renewal, price guard and copy sweep; deploy pending.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Obelisk Ark 01K3SH847CF5020D9D7209EB07: reopen signup + staging test …
Final score: **100**
[S367][AUTH/P0] Obelisk Ark 01K3SH847CF5020D9D7209EB07: reopen signup + staging test identity → restore copy, build passkey login E2E.
Why it matters: Obelisk Ark 01K3SH847CF5020D9D7209EB07: reopen signup + staging test i shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Ark 01K3SJ87V2E1476FF1FE837A06 lifecycle reply; deploy Worker (HMAC n…
Final score: **93**
[S367][P1] Ark 01K3SJ87V2E1476FF1FE837A06 lifecycle reply; deploy Worker (HMAC nonce); diagnose Sparked-as-free test member.
Why it matters: Ark 01K3SJ87V2E1476FF1FE837A06 lifecycle reply; deploy Worker (HMAC no is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Rest of AUDIT_2026-10-01.
Final score: **90**
[S367][P2] Rest of AUDIT_2026-10-01.
Why it matters: Rest of AUDIT_2026-10-01. is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Observe the next scheduled publisher-to-release trigger after the Oct…
Final score: **87**
[DESK/RELEASE/P2] Observe the next scheduled publisher-to-release trigger after the October 1 repair; the manual recovery path is proven.
Why it matters: Observe the next scheduled publisher-to-release trigger after the Octo is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Add a generated-fixture check for month rollover so a future edition …
Final score: **84**
[DESK/QA/P2] Add a generated-fixture check for month rollover so a future edition automatically creates its month archive and retains all older story links.
Why it matters: Add a generated-fixture check for month rollover so a future edition a is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Review measured Linux screenshots before refreshing visual-regression…
Final score: **78**
[QA/P2] Review measured Linux screenshots before refreshing visual-regression references.
Why it matters: Review measured Linux screenshots before refreshing visual-regression  is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Track growth of the Desk overlay from the production baseline; arrang…
Final score: **75**
[S366][RELEASE/P2] Track growth of the Desk overlay from the production baseline; arrange a reviewed baseline reset before accumulated story paths or artwork hit the staging archive or Pages limits.
Why it matters: Track growth of the Desk overlay from the production baseline; arrange is open, local, and unblocked — can ship this session.

#### 5. [VERIFY] Verify prior-overlay path preservation automatically before scoped Pa…
Final score: **71**
[DESK/RELEASE/P2] Verify prior-overlay path preservation automatically before scoped Pages deploys.
Why it matters: Verify prior-overlay path preservation automatically before scoped Pag is a 367-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

### LATER

#### 1. [VERIFY] Make staging deployment regenerate its continuity summary before a re…
Final score: **69**
[S365][CI/P2] Make staging deployment regenerate its continuity summary before a release ceremony can read it. The first S365 ceremony ran before that summary and rejected only lineage; the settled rerun passed 11/11.
Why it matters: Make staging deployment regenerate its continuity summary before a rel was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Watch the next three article Lighthouse runs for stability at the unc…
Final score: **66**
[S365][PERF/P3] Watch the next three article Lighthouse runs for stability at the unchanged 0.90 floor. Investigate if the median falls below the threshold again; preserve the reader-first order and theme evidence.
Why it matters: Watch the next three article Lighthouse runs for stability at the unch was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [PRODUCT] Teach the closeout wipe guard to recognize a byte-preserving work-log…
Final score: **66**
[S365][OPS/P2] Teach the closeout wipe guard to recognize a byte-preserving work-log archive move, so routine cap rotation no longer needs --allow-wipe; keep unarchived deletion blocking.
Why it matters: Teach the closeout wipe guard to recognize a byte-preserving work-log  is open, local, and unblocked — can ship this session.

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

1. Obelisk Ark 01K3SH847CF5020D9D7209EB07: reopen signup + staging test …
2. Post-push CI confirmation
3. Ark 01K3SJ87V2E1476FF1FE837A06 lifecycle reply; deploy Worker (HMAC n…
4. Rest of AUDIT_2026-10-01.
5. Observe the next scheduled publisher-to-release trigger after the Oct…
6. Add a generated-fixture check for month rollover so a future edition …
7. Review measured Linux screenshots before refreshing visual-regression…
8. Track growth of the Desk overlay from the production baseline; arrang…
9. Verify prior-overlay path preservation automatically before scoped Pa…
10. Make staging deployment regenerate its continuity summary before a re…
11. Watch the next three article Lighthouse runs for stability at the unc…
12. Teach the closeout wipe guard to recognize a byte-preserving work-log…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
