# Genius Hit List — Session 376

Generated: 2026-10-12
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **77/100**
- Health: **yellow**
- Current SIL: **927/1000**
- CI health: **check gh run list**
- Current focus: S376 fixed reader feedback on Desk articles: comment threads no longer show stray Cancel reply and Try again controls, reaction taps are no longer lost in WebKit, and the reader-signal feed lists illustration and cartoon reactions.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] At 390px the Spark companion overlaps the Post comment button and the…
Final score: **93**
[SIL/P3 · S376] At 390px the Spark companion overlaps the Post comment button and the display-name field on Desk articles.
Why it matters: At 390px the Spark companion overlaps the Post comment button and the  is open, local, and unblocked — can ship this session.

#### 2. [INTELLIGENCE] task-slice, check-audit-premises and the start maintenance lane have …
Final score: **93**
[OPS/P3 · S376] task-slice, check-audit-premises and the start maintenance lane have no local copy here.
Why it matters: task-slice, check-audit-premises and the start maintenance lane have n keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 3. [VERIFY] Firefox loses a reaction tap issued straight after a jump about 2 in …
Final score: **86**
[SIL/P2 · S376] Firefox loses a reaction tap issued straight after a jump about 2 in 14 (late sections resize while anchoring settles; passes on retry). Decide between exact section size hints and no deferral, with Lighthouse evidence.
Why it matters: Firefox loses a reaction tap issued straight after a jump about 2 in 1 is a 376-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [PRODUCT] home-intelligence.js and recent-ships.js initialise only on DOMConten…
Final score: **84**
[HOME/P2 · S374] home-intelligence.js and recent-ships.js initialise only on DOMContentLoaded, but the idle loader injects them after it, so neither runs on the homepage (found in review; predates S374).
Why it matters: home-intelligence.js and recent-ships.js initialise only on DOMContent is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Exercise the art receipt path on the next real scheduled publish; con…
Final score: **78**
[SIL/P2 · next scope] Exercise the art receipt path on the next real scheduled publish; confirm consumer accepts the exact SHA/path ledger.
Why it matters: Exercise the art receipt path on the next real scheduled publish; conf is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Four browser specs fail on this machine against both production and t…
Final score: **77**
[SIL/P2 · S374] Four browser specs fail on this machine against both production and the local build, before and after this session's change: ambient-engagement (milestones, first-scroll order, IGNIS tier) and stats-theme-accessibility (expects 19 projects, feed has 22). The CI e2e job reported success at 4e2f42773 but its log shows no Playwright totals. Establish whether CI runs them, then fix or retire each.
Why it matters: Four browser specs fail on this machine against both production and th is a 376-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [COHESION] Preserve project-local capability contracts during incoming propagati…
Final score: **77**
[SIL/P2 · next scope] Preserve project-local capability contracts during incoming propagation; source copies that remove known exports must fail before being applied.
Why it matters: Preserve project-local capability contracts during incoming propagatio is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 4. [PRODUCT] Keep shell regeneration and SRI stamping in a single documented seque…
Final score: **75**
[SIL/P2 · next scope] Keep shell regeneration and SRI stamping in a single documented sequence when running partial generators.
Why it matters: Keep shell regeneration and SRI stamping in a single documented sequen is open, local, and unblocked — can ship this session.

#### 5. [VERIFY] Lighthouse is sitting on its floors: homepage 0.75–0.78 vs 0.76 and /…
Final score: **71**
[PERF/P2 · S372] Lighthouse is sitting on its floors: homepage 0.75–0.78 vs 0.76 and /news/2026-08-11/cloudflare-gave…/ bimodal 0.88 or 0.92 vs 0.90 (text LCP, render delay 2.2s vs 3.4s, TBT 0). Three of the last five runs needed a re-run. Find the render-delay cause or mark the tier lab-volatile with corroboration; do not lower floors. S373 evidence: observed FCP equals observed LCP (160–230ms) and ten scripts finish before it in every run; simulated FCP is steady at 1.3s while simulated LCP swings 2.3–3.9s. The gap is the script graph. Next: load below-the-fold Desk scripts after paint (CSP-safe) and compare in CI. The homepage tier now reads recurring sub-floor. — S374: script loading changed on both page types (D-S374.1); S374: improved, not stable. be218812c8 passed first time (article 0.98/0.99/0.99); 1f29cc7bf9 failed once on the article (0.88/0.88/0.96) and passed on re-run. Failing runs had the load event before first paint with 24 to 25 requests done, including fetches from eager desk-presence and ambient scripts. Next: delay those first fetches until after paint.
Why it matters: Lighthouse is sitting on its floors: homepage 0.75–0.78 vs 0.76 and /n is a 376-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [PRODUCT] Push helper as a repo script (scripts/push-main.mjs): autostash merge…
Final score: **69**
[SIL/P2] Push helper as a repo script (scripts/push-main.mjs): autostash merge, regenerate conflicted generated outputs, repair-evidence-graph, push — replacing the session-local PowerShell helper that four separate failure modes tripped this session.
Why it matters: Push helper as a repo script (scripts/push-main.mjs): autostash merge, is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Approve Desk digest test → autoSend; apply caller-trust-column-revoke…
Final score: **63**
[P1] Approve Desk digest test → autoSend; apply caller-trust-column-revokes; Ark 01K3SJ87… reply.
Why it matters: Approve Desk digest test is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Add a generated-fixture check for month rollover so a future edition …
Final score: **60**
[DESK/QA/P2] Add a generated-fixture check for month rollover so a future edition automatically creates its month archive and retains all older story links.
Why it matters: Add a generated-fixture check for month rollover so a future edition a is open, local, and unblocked — can ship this session.

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

1. At 390px the Spark companion overlaps the Post comment button and the…
2. task-slice, check-audit-premises and the start maintenance lane have …
3. Firefox loses a reaction tap issued straight after a jump about 2 in …
4. home-intelligence.js and recent-ships.js initialise only on DOMConten…
5. Exercise the art receipt path on the next real scheduled publish; con…
6. Four browser specs fail on this machine against both production and t…
7. Preserve project-local capability contracts during incoming propagati…
8. Keep shell regeneration and SRI stamping in a single documented seque…
9. Lighthouse is sitting on its floors: homepage 0.75–0.78 vs 0.76 and /…
10. Push helper as a repo script (scripts/push-main.mjs): autostash merge…
11. Approve Desk digest test → autoSend; apply caller-trust-column-revoke…
12. Add a generated-fixture check for month rollover so a future edition …

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
