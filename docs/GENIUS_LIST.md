# Genius Hit List — Session 406

Generated: 2026-10-29
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **83/100**
- Health: **yellow**
- Current SIL: **939/1000**
- CI health: **check gh run list**
- Current focus: Current investor and member workspaces, useful public feeds, and dated studio updates.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Reproduce the34 optional E2E failures before changing implementation,…
Final score: **100**
[S406][FOLLOW-UP] Reproduce the34 optional E2E failures before changing implementation, baselines or CI policy; same failure names exist on the accepted baseline. Unselected; docs/S406_explicit-closeout-optional-e2e.json.
Why it matters: Reproduce the34 optional E2E failures before changing implementation,  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [SECURITY] Measure help startup separately from probe execution before attemptin…
Final score: **96**
[S406][SIL] Measure help startup separately from probe execution before attempting runtime optimization. No performance or token saving is currently claimed.
Why it matters: Measure help startup separately from probe execution before attempting lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 3. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 4. [PRODUCT] Consider extending help-only process fixtures to another operator CLI…
Final score: **93**
[S406][SIL] Consider extending help-only process fixtures to another operator CLI only after reproducing its side effects.
Why it matters: Consider extending help-only process fixtures to another operator CLI  is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Consider migration of scheduled text probes only after measuring cove…
Final score: **87**
[SIL][S405] Consider migration of scheduled text probes only after measuring coverage and compatibility for each caller; future, unselected.
Why it matters: Consider migration of scheduled text probes only after measuring cover is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Consider redirect-target body verification only if a real redirected …
Final score: **84**
[SIL][S405] Consider redirect-target body verification only if a real redirected destination failure is reproduced; future, unselected.
Why it matters: Consider redirect-target body verification only if a real redirected d is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Consider response-body streaming only if measured remote readback mem…
Final score: **81**
[SIL][S404] Consider response-body streaming only if measured remote readback memory pressure justifies it; future, unselected.
Why it matters: Consider response-body streaming only if measured remote readback memo is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Consider native positive-manifest text parity as a separately reviewe…
Final score: **78**
[SIL][S404] Consider native positive-manifest text parity as a separately reviewed default migration; preserve legacy default in this session. Future, unselected.
Why it matters: Consider native positive-manifest text parity as a separately reviewed is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] Extend method-specific corroboration coverage if additional signals a…
Final score: **75**
[SIL][S402] Extend method-specific corroboration coverage if additional signals are introduced; future, unselected.
Why it matters: Extend method-specific corroboration coverage if additional signals ar is open, local, and unblocked — can ship this session.

### LATER

#### 1. [PRODUCT] Consider per-member byte verification only if source mutation during …
Final score: **72**
[SIL][S401] Consider per-member byte verification only if source mutation during packaging is observed; not selected in this arc.
Why it matters: Consider per-member byte verification only if source mutation during p is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Coordinate an evidence-backed distinction between formatting-only sou…
Final score: **69**
[SIL][S400] Coordinate an evidence-backed distinction between formatting-only source writes and actual pixel changes in visual freshness; existing mandatory gate remains enforced. Future selection only.
Why it matters: Coordinate an evidence-backed distinction between formatting-only sour is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Staging lineage tolerant of publisher data drift.
Final score: **63**
[SIL][S398] Staging lineage tolerant of publisher data drift.
Why it matters: Staging lineage tolerant of publisher data drift. is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [SECURITY] Reuse the canonical Pages broker in deploy-currency provider observat…
Final score: **100**
[SIL][S397] Reuse the canonical Pages broker in deploy-currency provider observations; the current Worker-token Pages probe returns403. Future selection only.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 2. [PRODUCT] vault-sdk member fetch fails on vault_rank; fixing changes consumer g…
Final score: **93**
[S390][FOUNDER REVIEW] vault-sdk member fetch fails on vault_rank; fixing changes consumer gating.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [AI] The doctor names rescore-ignis --stale as the IGNIS remedy, but the p…
Final score: **91**
[SIL][S362][OBS/P3] The doctor names rescore-ignis --stale as the IGNIS remedy, but the propagated copy reads portfolio/PROJECT_REGISTRY.json from this repo root and finds nothing, so the remedy is a structural no-op here (D-S362.6). Awaiting the studio-ops answer to Ark repo-question 01K2TR2MCB649E1AD036E22BAD; until then the stale score stands honestly reported.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 4. [PRODUCT] Surface the Supabase health API per-service verdict (db/rest/auth) on…
Final score: **90**
[SIL][S360][OBS/P2] Surface the Supabase health API per-service verdict (db/rest/auth) on /status/ through a scheduled, credential-side probe that writes a public JSON. The browser probes can say "not responding" but not "the database is up and the gateway is not".
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 5. [PRODUCT] desk-model-servability dropped to 1/2 during this session: Qwen3.8-27…
Final score: **84**
[S362][OBS/P3] desk-model-servability dropped to 1/2 during this session: Qwen3.8-27B is unmeasured at the provider. Advisory and external; re-probe next session before treating it as a defect.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 6. [PRODUCT] Reconcile the four propagated checkers that encode studio-ops' own la…
Final score: **81**
[SIL][S363][PROTOCOL/P2] Reconcile the four propagated checkers that encode studio-ops' own layout (D-S363.5, D-S363.7, D-S363.8, D-S363.9): check-windows-hide scan roots, the wipe guard's status-row format and archive naming, and arc-profile.mjs resolving PROJECT_REGISTRY to a path that exists only inside studio-ops. Each produced a false failure or a false inference that no local change could fix. Ark cargo 01K30UDB1264A040FE519B8D8B carries the upstream ask; this item tracks whether the next drain actually lands it.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 7. [PRODUCT] "Coming soon" / "TBD" copy on six live game pages. Founder copy decis…
Final score: **78**
[S356][PRODUCT/P2] "Coming soon" / "TBD" copy on six live game pages. Founder copy decision: call-of-doodie, franchise-architect, gridiron-gm (trailer + screenshots), vaultfront (backend), mindframe, project-unknown (platform, title).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [PRODUCT] Founder-owned items deferred. Passkey sign-in, signup walkthrough, pu…
Final score: **75**
[S354][FOUNDER DIRECTIVE] Founder-owned items deferred. Passkey sign-in, signup walkthrough, public member data, newsletter arming, Desk cadence, warm-origin, Workers Paid and the small confirmations wait until the founder picks them up; agent-owned items continue.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Reproduce the34 optional E2E failures before changing implementation,…
2. Measure help startup separately from probe execution before attemptin…
3. Post-push CI confirmation
4. Consider extending help-only process fixtures to another operator CLI…
5. Consider migration of scheduled text probes only after measuring cove…
6. Consider redirect-target body verification only if a real redirected …
7. Consider response-body streaming only if measured remote readback mem…
8. Consider native positive-manifest text parity as a separately reviewe…
9. Extend method-specific corroboration coverage if additional signals a…
10. Consider per-member byte verification only if source mutation during …
11. Coordinate an evidence-backed distinction between formatting-only sou…
12. Staging lineage tolerant of publisher data drift.

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
