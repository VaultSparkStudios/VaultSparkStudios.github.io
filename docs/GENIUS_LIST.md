# Genius Hit List — Session 372

Generated: 2026-10-10
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **78/100**
- Health: **yellow**
- Current SIL: **904/1000**
- CI health: **check gh run list**
- Current focus: S372 restored the daily public-surface assurance and deployed single-hop legacy redirects to production (Worker 9c7c29f1).

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

#### 2. [VERIFY] Before pushing receipt-bearing changes, verify in a clean worktree of…
Final score: **86**
[SIL/P2 · S372] Before pushing receipt-bearing changes, verify in a clean worktree of the exact commit (git worktree add --detach + junctioned node_modules + CI=true run-build-check). That run found what four CI cycles otherwise surfaced one at a time; consider a script.
Why it matters: Before pushing receipt-bearing changes, verify in a clean worktree of  is a 372-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [PRODUCT] On mobile, "More from The Desk" thumbnails cover-crop the banner's bu…
Final score: **84**
[DESK/P3 · S372] On mobile, "More from The Desk" thumbnails cover-crop the banner's burned-in caption on every card (pre-existing; seen in the S372 visual review).
Why it matters: On mobile, "More from The Desk" thumbnails cover-crop the banner's bur is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] The art autopilot edits article HTML bound by the tracked visual rece…
Final score: **83**
[SIL/P2 · S372] The art autopilot edits article HTML bound by the tracked visual receipt without running E2E, so the next CI-bearing push fails step 158 (8db1f1bf0 → E2E 37996463632). Either the art lane re-reviews affected bound articles, or the receipt stops binding routine-art regions.
Why it matters: The art autopilot edits article HTML bound by the tracked visual recei is a 372-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [PRODUCT] Exercise the art receipt path on the next real scheduled publish; con…
Final score: **81**
[SIL/P2 · next scope] Exercise the art receipt path on the next real scheduled publish; confirm consumer accepts the exact SHA/path ledger.
Why it matters: Exercise the art receipt path on the next real scheduled publish; conf is open, local, and unblocked — can ship this session.

#### 2. [COHESION] Preserve project-local capability contracts during incoming propagati…
Final score: **80**
[SIL/P2 · next scope] Preserve project-local capability contracts during incoming propagation; source copies that remove known exports must fail before being applied.
Why it matters: Preserve project-local capability contracts during incoming propagatio is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 3. [PRODUCT] Keep shell regeneration and SRI stamping in a single documented seque…
Final score: **78**
[SIL/P2 · next scope] Keep shell regeneration and SRI stamping in a single documented sequence when running partial generators.
Why it matters: Keep shell regeneration and SRI stamping in a single documented sequen is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Hetzner staging does not apply _redirects: retired routes return 200/…
Final score: **77**
[STAGING/P3 · S372] Hetzner staging does not apply _redirects: retired routes return 200/404 there and 301 in production, so staging cannot verify a route consolidation.
Why it matters: Hetzner staging does not apply _redirects: retired routes return 200/4 is a 372-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

#### 5. [PRODUCT] Push helper as a repo script (scripts/push-main.mjs): autostash merge…
Final score: **72**
[SIL/P2] Push helper as a repo script (scripts/push-main.mjs): autostash merge, regenerate conflicted generated outputs, repair-evidence-graph, push — replacing the session-local PowerShell helper that four separate failure modes tripped this session.
Why it matters: Push helper as a repo script (scripts/push-main.mjs): autostash merge, is open, local, and unblocked — can ship this session.

### LATER

#### 1. [VERIFY] Receipt source bindings hash working-tree bytes; a Windows CRLF copy …
Final score: **68**
[SIL/P2 · S372] Receipt source bindings hash working-tree bytes; a Windows CRLF copy of an LF file produces a receipt CI can never match (E2E 37998007384). Hash the committed blob, or normalize line endings, in the shared binding.
Why it matters: Receipt source bindings hash working-tree bytes; a Windows CRLF copy o is a 372-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [PRODUCT] Approve Desk digest test → autoSend; apply caller-trust-column-revoke…
Final score: **66**
[P1] Approve Desk digest test → autoSend; apply caller-trust-column-revokes; Ark 01K3SJ87… reply.
Why it matters: Approve Desk digest test is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Add a generated-fixture check for month rollover so a future edition …
Final score: **63**
[DESK/QA/P2] Add a generated-fixture check for month rollover so a future edition automatically creates its month archive and retains all older story links.
Why it matters: Add a generated-fixture check for month rollover so a future edition a is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [INTELLIGENCE] Local scripts/lib/audit-sidecar.mjs misses AUDIT_<date>-S<n>.json sid…
Final score: **99**
[TOOL/P3 · S372] Local scripts/lib/audit-sidecar.mjs misses AUDIT_<date>-S<n>.json sidecars; studio-ops' copy handles them since S312.
Why it matters: Owned by another repo or already moved through Ark cargo.

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

1. Post-push CI confirmation
2. Before pushing receipt-bearing changes, verify in a clean worktree of…
3. On mobile, "More from The Desk" thumbnails cover-crop the banner's bu…
4. The art autopilot edits article HTML bound by the tracked visual rece…
5. Exercise the art receipt path on the next real scheduled publish; con…
6. Preserve project-local capability contracts during incoming propagati…
7. Keep shell regeneration and SRI stamping in a single documented seque…
8. Hetzner staging does not apply _redirects: retired routes return 200/…
9. Push helper as a repo script (scripts/push-main.mjs): autostash merge…
10. Receipt source bindings hash working-tree bytes; a Windows CRLF copy …
11. Approve Desk digest test → autoSend; apply caller-trust-column-revoke…
12. Add a generated-fixture check for month rollover so a future edition …

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
