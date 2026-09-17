# Genius Hit List — Session 357

Generated: 2026-09-17
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **yellow**
- Current SIL: **979/1000**
- CI health: **check gh run list**
- Current focus: S357 recovered the cut-off S356 closeout and RELEASED it to production: Worker 8a856192 plus content-lane run 35256380631, production contentLaneHead = origin/main. The Desk flagship, reader-first articles, reactions, the site-wide strip and the first public changelog entry since July are live. Comments ship but are degraded by a pre-existing Supabase credential mismatch, and now say which of the two possible causes it is.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Fingerprint the remaining 25 unhashed client scripts; the content lan…
Final score: **96**
[S357][ASSETS/P1] Fingerprint the remaining 25 unhashed client scripts; the content lane can never update them (D-S357.2). Batch with a receipt pass each.
Why it matters: Fingerprint the remaining 25 unhashed client scripts; the content lane is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Served-vs-repo drift gate for lane-held paths
Final score: **93**
[S357][GATES/P1] Served-vs-repo drift gate for lane-held paths — run the measurement that found the 404 every release.
Why it matters: Served-vs-repo drift gate for lane-held paths is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Source the "You asked" lines from data/consumer-changelog.json, not g…
Final score: **90**
[S357][CONTENT/P2] Source the "You asked" lines from data/consumer-changelog.json, not git subjects (D-S357.3).
Why it matters: Source the "You asked" lines from data/consumer-changelog.json, not gi is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] vault_feedback 404s on production /changelog/ every visit. Pre-existi…
Final score: **87**
[S357][OBS/P2] vault_feedback 404s on production /changelog/ every visit. Pre-existing; absent on staging.
Why it matters: vault_feedback 404s on production /changelog/ every visit. Pre-existin is open, local, and unblocked — can ship this session.

#### 2. [AI] Oracle/IGNIS prompt chips fail contrast in light theme. .ignis-chip (…
Final score: **85**
[S356][SITE/P1] Oracle/IGNIS prompt chips fail contrast in light theme. .ignis-chip (from assets/ignis-answer-engine.js, styled at oracle/index.html:35 / ignis/index.html:34) is solid orange with near-black text in light theme on /oracle/ and /ignis/ — seen in the S356 matrix, pre-existing. Fix with theme tokens.
Why it matters: Oracle/IGNIS prompt chips fail contrast in light theme. .ignis-chip (f must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

#### 3. [PRODUCT] Purge api/founder-presence.json from public git history. 30 revisions…
Final score: **84**
[S356][PRIVACY/P0] Purge api/founder-presence.json from public git history. 30 revisions carry live:true with project names and exact start timestamps; founder authorised the purge. Requires crons disabled, filter-repo rewrite, force-push, then regenerating SHA-pinned proof artifacts.
Why it matters: Purge api/founder-presence.json from public git history. 30 revisions  is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Drift preflight scope is narrower than the gate set. check-generated-…
Final score: **78**
[S356][GATES/P2] Drift preflight scope is narrower than the gate set. check-generated-drift-preflight declares ~7 nodes and reported "current" while build-news-desk and generate-pathways were stale (both out of scope). Widen it toward the 92-subject sweep, or rename it so green cannot read as whole-tree freshness.
Why it matters: Drift preflight scope is narrower than the gate set. check-generated-d is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] Staging Worker observability. Still the only way to source the S354/S…
Final score: **72**
[S356][OBS/P3] Staging Worker observability. Still the only way to source the S354/S355 staging 503s; needs a Worker deploy and a free-tier cost check.
Why it matters: Staging Worker observability. Still the only way to source the S354/S3 is open, local, and unblocked — can ship this session.

### LATER

#### 1. [PRODUCT] Mount the narrative on /journal/. Deferred: a UI change needs its own…
Final score: **69**
[S355][UX/P3] Mount the narrative on /journal/. Deferred: a UI change needs its own theme-matrix receipt cycle; declare the script in page-script scope.
Why it matters: Mount the narrative on /journal/. Deferred: a UI change needs its own  is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Enable Worker observability for staging. Deferred: needs a Worker dep…
Final score: **66**
[S355][OBS/P3] Enable Worker observability for staging. Deferred: needs a Worker deploy and a Workers Logs free-tier cost check (CANON-029); without it the S354 staging 503s cannot be sourced.
Why it matters: Enable Worker observability for staging. Deferred: needs a Worker depl is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Leaderboard embed hard-codes low-contrast greys. api/leaderboard/v1/w…
Final score: **63**
[S356][SITE/P2] Leaderboard embed hard-codes low-contrast greys. api/leaderboard/v1/widget.js:22,33 (#555/#666 on #0a0a0a) fails AA in both themes; owned by the embed, not the stylesheet.
Why it matters: Leaderboard embed hard-codes low-contrast greys. api/leaderboard/v1/wi is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [PRODUCT] Desk comments are live but every read 503s comments_upstream_failed
Final score: **96**
[S357][ENG/P0 · FOUNDER] Desk comments are live but every read 503s comments_upstream_failed — the Supabase service-role key is rejected ("Invalid API key"). Pre-existing credential-project mismatch (S344), not the release. Reconcile the credential for project fjnpzjjyhnpmunfoycrp.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [PRODUCT] "Coming soon" / "TBD" copy on six live game pages. Founder copy decis…
Final score: **93**
[S356][PRODUCT/P2] "Coming soon" / "TBD" copy on six live game pages. Founder copy decision: call-of-doodie, franchise-architect, gridiron-gm (trailer + screenshots), vaultfront (backend), mindframe, project-unknown (platform, title).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [PRODUCT] Founder-owned items deferred. Passkey sign-in, signup walkthrough, pu…
Final score: **90**
[S354][FOUNDER DIRECTIVE] Founder-owned items deferred. Passkey sign-in, signup walkthrough, public member data, newsletter arming, Desk cadence, warm-origin, Workers Paid and the small confirmations wait until the founder picks them up; agent-owned items continue.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [PRODUCT] Ship the sampler RPC entrypoint on Ark acceptance. Ark 01K2EQ77M9F29A…
Final score: **84**
[S352][SIL][OBS/P1] Ship the sampler RPC entrypoint on Ark acceptance. Ark 01K2EQ77M9F29A0EC9619EA4BC asks studio-ops to reuse studio-ops-cron */30 via a service binding. The website half needs a node-side cloudflare:workers shim for the unit tests.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 5. [PRODUCT] Free a cron slot, or move the account to Workers Paid. S352: an agent…
Final score: **81**
[S351][OBS/P0 · FOUNDER DECISION] Free a cron slot, or move the account to Workers Paid. S352: an agent-side third option went to studio-ops via Ark (row above); this row closes if studio-ops accepts. This is the single thing standing between the studio and ever observing its own edge, and it is now a one-sentence decision rather than an investigation. Five of five free-plan cron triggers are in use by other projects. Retiring one is a live change to that project (founder call); Workers Paid raises the cap to 1,000 and is a billing action reserved to a human under CANON-019. Everything downstream is already built, deployed and verified — namespace, binding, handler, drain, 12/12 drain self-tests.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 6. [VERIFY] Model the proof-surface generators, highest-risk first
Final score: **77**
[S353][SIL:1][CI/P2] Model the proof-surface generators, highest-risk first — 19 left. S354 modeled build-release-dependencies (and its missing release-proof edge, which exposed a real weekly-maintenance strand, now closed). Start with build-release-dependencies (weekly-maintenance stages its output). Read each generator for REAL sources, add the node, --update to lower the baseline.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 7. [PRODUCT] Scoped website credential owner reconciliation. Fresh S347 preflight …
Final score: **72**
[S344→S347][SEC/P0] Scoped website credential owner reconciliation. Fresh S347 preflight still reports credential-project mismatch while management/SQL/function inspection is available. Ark 01K22H17HM5F6D2952E9B84165 requests the studio-ops owner fix without exposing credentials. Owner-pending, not a claim that credentials are absent or that only the founder can act; provider truth reads remain unproven.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 8. [PRODUCT] The Phase 0 gate is a HUMAN walkthrough and has not been run. The pla…
Final score: **69**
[S343][QA/P0] The Phase 0 gate is a HUMAN walkthrough and has not been run. The plan's own gate is a real signup in a clean browser profile with the subscribe box left checked, landing on the dashboard. The fix is verified by build:check 388/388, mobile 215/215, worker 57/57, and by reading the SERVED bundle — but not by a person actually creating an account. ~3 minutes; do it before any onboarding push.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

## Recommended Build Order

1. Fingerprint the remaining 25 unhashed client scripts; the content lan…
2. Post-push CI confirmation
3. Served-vs-repo drift gate for lane-held paths
4. Source the "You asked" lines from data/consumer-changelog.json, not g…
5. vault_feedback 404s on production /changelog/ every visit. Pre-existi…
6. Oracle/IGNIS prompt chips fail contrast in light theme. .ignis-chip (…
7. Purge api/founder-presence.json from public git history. 30 revisions…
8. Drift preflight scope is narrower than the gate set. check-generated-…
9. Staging Worker observability. Still the only way to source the S354/S…
10. Mount the narrative on /journal/. Deferred: a UI change needs its own…
11. Enable Worker observability for staging. Deferred: needs a Worker dep…
12. Leaderboard embed hard-codes low-contrast greys. api/leaderboard/v1/w…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
