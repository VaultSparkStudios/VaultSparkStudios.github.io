# Genius Hit List — Session 359

Generated: 2026-09-18
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **81/100**
- Health: **yellow**
- Current SIL: **983/1000**
- CI health: **check gh run list**
- Current focus: S359 closed every open S358 item: "You asked" counts k-anonymous reader choices instead of commits, the changelog narrative and subscriber push read founder-approved entries, /games/ light-theme labels pass AA, and two hand-synced lists are gate-bound. Supabase is down (comments and sign-in) pending a founder restart.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Make build-shell-assets import-safe so its pure helpers can carry a s…
Final score: **96**
[SIL][S359][GATES/P3] Make build-shell-assets import-safe so its pure helpers can carry a self-test.
Why it matters: Make build-shell-assets import-safe so its pure helpers can carry a se is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [AI] Oracle/IGNIS prompt chips fail contrast in light theme. .ignis-chip (…
Final score: **94**
[S356][SITE/P1] Oracle/IGNIS prompt chips fail contrast in light theme. .ignis-chip (from assets/ignis-answer-engine.js, styled at oracle/index.html:35 / ignis/index.html:34) is solid orange with near-black text in light theme on /oracle/ and /ignis/ — seen in the S356 matrix, pre-existing. Fix with theme tokens.
Why it matters: Oracle/IGNIS prompt chips fail contrast in light theme. .ignis-chip (f must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

#### 4. [PRODUCT] Purge api/founder-presence.json from public git history. 30 revisions…
Final score: **93**
[S356][PRIVACY/P0] Purge api/founder-presence.json from public git history. 30 revisions carry live:true with project names and exact start timestamps; founder authorised the purge. Requires crons disabled, filter-repo rewrite, force-push, then regenerating SHA-pinned proof artifacts.
Why it matters: Purge api/founder-presence.json from public git history. 30 revisions  is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Drift preflight scope is narrower than the gate set. check-generated-…
Final score: **87**
[S356][GATES/P2] Drift preflight scope is narrower than the gate set. check-generated-drift-preflight declares ~7 nodes and reported "current" while build-news-desk and generate-pathways were stale (both out of scope). Widen it toward the 92-subject sweep, or rename it so green cannot read as whole-tree freshness.
Why it matters: Drift preflight scope is narrower than the gate set. check-generated-d is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Staging Worker observability. Still the only way to source the S354/S…
Final score: **81**
[S356][OBS/P3] Staging Worker observability. Still the only way to source the S354/S355 staging 503s; needs a Worker deploy and a free-tier cost check.
Why it matters: Staging Worker observability. Still the only way to source the S354/S3 is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Mount the narrative on /journal/. Deferred: a UI change needs its own…
Final score: **78**
[S355][UX/P3] Mount the narrative on /journal/. Deferred: a UI change needs its own theme-matrix receipt cycle; declare the script in page-script scope.
Why it matters: Mount the narrative on /journal/. Deferred: a UI change needs its own  is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Enable Worker observability for staging. Deferred: needs a Worker dep…
Final score: **75**
[S355][OBS/P3] Enable Worker observability for staging. Deferred: needs a Worker deploy and a Workers Logs free-tier cost check (CANON-029); without it the S354 staging 503s cannot be sourced.
Why it matters: Enable Worker observability for staging. Deferred: needs a Worker depl is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] Leaderboard embed hard-codes low-contrast greys. api/leaderboard/v1/w…
Final score: **72**
[S356][SITE/P2] Leaderboard embed hard-codes low-contrast greys. api/leaderboard/v1/widget.js:22,33 (#555/#666 on #0a0a0a) fails AA in both themes; owned by the embed, not the stylesheet.
Why it matters: Leaderboard embed hard-codes low-contrast greys. api/leaderboard/v1/wi is open, local, and unblocked — can ship this session.

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
Why it matters: Verify the first Vault Narrative run after the S353 fix publishes a di is a 6-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

### DEFERRED / GATED

#### 1. [PRODUCT] Provider-health line on /status/ from the Supabase health API, so an …
Final score: **93**
[SIL][S359][OBS/P2] Provider-health line on /status/ from the Supabase health API, so an outage reads as an outage, not "Checking…".
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 2. [PRODUCT] "Coming soon" / "TBD" copy on six live game pages. Founder copy decis…
Final score: **90**
[S356][PRODUCT/P2] "Coming soon" / "TBD" copy on six live game pages. Founder copy decision: call-of-doodie, franchise-architect, gridiron-gm (trailer + screenshots), vaultfront (backend), mindframe, project-unknown (platform, title).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [PRODUCT] Founder-owned items deferred. Passkey sign-in, signup walkthrough, pu…
Final score: **87**
[S354][FOUNDER DIRECTIVE] Founder-owned items deferred. Passkey sign-in, signup walkthrough, public member data, newsletter arming, Desk cadence, warm-origin, Workers Paid and the small confirmations wait until the founder picks them up; agent-owned items continue.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [PRODUCT] Supabase fjnpzjjyhnpmunfoycrp is DOWN (db/rest/auth UNHEALTHY, REST t…
Final score: **84**
[S357→S359][ENG/P0 · PROVIDER] Supabase fjnpzjjyhnpmunfoycrp is DOWN (db/rest/auth UNHEALTHY, REST times out, control plane cannot reach the DB; status still ACTIVE_HEALTHY). Breaks Desk comments AND Vault Member sign-in. The fix is a project restart via the Management API; the agent restart was refused by the session permission policy, so it is a founder action. Command in LATEST_HANDOFF.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 5. [PRODUCT] Ship the sampler RPC entrypoint on Ark acceptance. Ark 01K2EQ77M9F29A…
Final score: **81**
[S352][SIL][OBS/P1] Ship the sampler RPC entrypoint on Ark acceptance. Ark 01K2EQ77M9F29A0EC9619EA4BC asks studio-ops to reuse studio-ops-cron */30 via a service binding. The website half needs a node-side cloudflare:workers shim for the unit tests.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 6. [PRODUCT] Free a cron slot, or move the account to Workers Paid. S352: an agent…
Final score: **78**
[S351][OBS/P0 · FOUNDER DECISION] Free a cron slot, or move the account to Workers Paid. S352: an agent-side third option went to studio-ops via Ark (row above); this row closes if studio-ops accepts. This is the single thing standing between the studio and ever observing its own edge, and it is now a one-sentence decision rather than an investigation. Five of five free-plan cron triggers are in use by other projects. Retiring one is a live change to that project (founder call); Workers Paid raises the cap to 1,000 and is a billing action reserved to a human under CANON-019. Everything downstream is already built, deployed and verified — namespace, binding, handler, drain, 12/12 drain self-tests.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [VERIFY] Model the proof-surface generators, highest-risk first
Final score: **74**
[S353][SIL:1][CI/P2] Model the proof-surface generators, highest-risk first — 19 left. S354 modeled build-release-dependencies (and its missing release-proof edge, which exposed a real weekly-maintenance strand, now closed). Start with build-release-dependencies (weekly-maintenance stages its output). Read each generator for REAL sources, add the node, --update to lower the baseline.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 8. [PRODUCT] Scoped website credential owner reconciliation. Fresh S347 preflight …
Final score: **69**
[S344→S347][SEC/P0] Scoped website credential owner reconciliation. Fresh S347 preflight still reports credential-project mismatch while management/SQL/function inspection is available. Ark 01K22H17HM5F6D2952E9B84165 requests the studio-ops owner fix without exposing credentials. Owner-pending, not a claim that credentials are absent or that only the founder can act; provider truth reads remain unproven.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

## Recommended Build Order

1. Make build-shell-assets import-safe so its pure helpers can carry a s…
2. Post-push CI confirmation
3. Oracle/IGNIS prompt chips fail contrast in light theme. .ignis-chip (…
4. Purge api/founder-presence.json from public git history. 30 revisions…
5. Drift preflight scope is narrower than the gate set. check-generated-…
6. Staging Worker observability. Still the only way to source the S354/S…
7. Mount the narrative on /journal/. Deferred: a UI change needs its own…
8. Enable Worker observability for staging. Deferred: needs a Worker dep…
9. Leaderboard embed hard-codes low-contrast greys. api/leaderboard/v1/w…
10. Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewri…
11. Close field-vitals freshness only with real evidence. Surface observe…
12. Verify the first Vault Narrative run after the S353 fix publishes a d…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
