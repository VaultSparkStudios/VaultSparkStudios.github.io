# Genius Hit List — Session 360

Generated: 2026-09-19
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **78/100**
- Health: **yellow**
- Current SIL: **984/1000**
- CI health: **check gh run list**
- Current focus: S360: /status/ names a provider outage as one (derived banner + note, a new Auth row) and no longer opens on a false "All Systems Operational" before its probes return; a gateway 401 no longer counts as a working database. The leaderboard embed is readable on any host page, build-shell-assets is import-safe with unit tests, and two stale board items were closed with evidence. Supabase is still down (comments and member data) pending a founder restart.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Purge api/founder-presence.json from public git history. 30 revisions…
Final score: **96**
[S356][PRIVACY/P0] Purge api/founder-presence.json from public git history. 30 revisions carry live:true with project names and exact start timestamps; founder authorised the purge. Requires crons disabled, filter-repo rewrite, force-push, then regenerating SHA-pinned proof artifacts.
Why it matters: Purge api/founder-presence.json from public git history. 30 revisions  is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Staging Worker observability. Still the only way to source the S354/S…
Final score: **93**
[S356][OBS/P3] Staging Worker observability. Still the only way to source the S354/S355 staging 503s; needs a Worker deploy and a free-tier cost check.
Why it matters: Staging Worker observability. Still the only way to source the S354/S3 is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Mount the narrative on /journal/. Deferred: a UI change needs its own…
Final score: **90**
[S355][UX/P3] Mount the narrative on /journal/. Deferred: a UI change needs its own theme-matrix receipt cycle; declare the script in page-script scope.
Why it matters: Mount the narrative on /journal/. Deferred: a UI change needs its own  is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Enable Worker observability for staging. Deferred: needs a Worker dep…
Final score: **87**
[S355][OBS/P3] Enable Worker observability for staging. Deferred: needs a Worker deploy and a Workers Logs free-tier cost check (CANON-029); without it the S354 staging 503s cannot be sourced.
Why it matters: Enable Worker observability for staging. Deferred: needs a Worker depl is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewri…
Final score: **81**
[S349][OBS/P2] Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewriting them. They are published as unresolvedLegacyChecks because a challenge and a real edge outage leave an identical footprint once the shape is gone, so they cannot now be told apart. Once the edge sampler has produced a full 31-day window, the retained history ages them out naturally and the public number becomes fully classifier-current. Do NOT re-score them to improve the figure.
Why it matters: Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewrit is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Close field-vitals freshness only with real evidence. Surface observe…
Final score: **78**
[NEXT][SIL][OBS/P1] Close field-vitals freshness only with real evidence. Surface observed-through/stale-days, obtain a genuinely fresh post-S262 RUM cohort, and bind cohort verdicts to a release SHA so a fresh generated clock can never imply fresh field evidence.
Why it matters: Close field-vitals freshness only with real evidence. Surface observed is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Verify the first Vault Narrative run after the S353 fix publishes a d…
Final score: **74**
[S353][SIL][OBS/P2] Verify the first Vault Narrative run after the S353 fix publishes a dispatch. Expect [vault-narrative] wrote … (anchor:…) and --check-fresh green; if it rejects, the log now prints the rejected text.
Why it matters: Verify the first Vault Narrative run after the S353 fix publishes a di is a 7-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

#### 5. [VERIFY] ESCALATION: The Desk's cadence lever is still the founder's pick -- b…
Final score: **62**
[S344][DESK/P1] ESCALATION: The Desk's cadence lever is still the founder's pick -- but the S344 symptom sentence has EXPIRED. Re-probed S345: build-news-freshness --check --require-daily now reports daily - latest 2026-09-07 - age 0d, and 2 editions published on 2026-09-07. The S344 text ('nothing has published since 2026-09-04', 'degraded to periodic') was true when written and is false now; it is corrected here rather than carried, because a blocker sentence is a claim with an expiry. What is NOT resolved, and is not claimed to be: the queue-width constraint that caused the 3-day gap is UNMEASURED locally -- the radar cache is CI-only and absent from a local tree, so this session could not confirm whether the queue widened or the day was simply lucky. 2 editions against a 4-slot/day promise is a partial recovery, not a met promise. The founder's pick (widen radar yield, shorten novelty, or reduce slots) stands, and the cadence gate's reds remain HONEST (D-S344.5).
Why it matters: ESCALATION: The Desk's cadence lever is still the founder's pick -- bu is a 16-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [PRODUCT] Authorize or decline immutable warm-origin migration. D-S303 reserves…
Final score: **60**
Authorize or decline immutable warm-origin migration. D-S303 reserves the GitHub Pages rollback-origin architecture decision for the founder; the current warm origin still follows mutable main.
Why it matters: Authorize or decline immutable warm-origin migration. D-S303 reserves  is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_UR…
Final score: **57**
[S344][INFRA/P1] Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_URL is vaulted. CANON-038 makes self-hosted Postgres first choice and cloud-managed the justified exception; D-S344.2 records the justification. The shared cluster's admin DSN is ABSENT, which CANON-038 itself names as its remaining founder-aware step, so there is currently nothing to migrate to. When it exists: this is an escalation, not a task — it moves live member accounts and the sign-in path onto a single box, AGENTS.md requires escalation before changing auth flows, and the cost saving is ~zero because the Supabase free tier is already cost-neutral (CANON-029). The static site is deliberately excluded: a free global CDN is not beaten by one box.
Why it matters: Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_URL is open, local, and unblocked — can ship this session.

#### 3. [REVENUE] Annual Stripe activation once keys exist
Final score: **56**
[OPS] Annual Stripe activation once keys exist — replace the annual placeholder path only after the real Stripe annual plan keys are created.
Why it matters: Annual Stripe activation once keys exist is on the direct checkout path; unblocking it can activate income without building new features.

### DEFERRED / GATED

#### 1. [PRODUCT] Surface the Supabase health API's per-service verdict (db/rest/auth) …
Final score: **93**
[SIL][S360][OBS/P2] Surface the Supabase health API's per-service verdict (db/rest/auth) on /status/ through a scheduled, credential-side probe that writes a public JSON. The browser probes can say "not responding" but not "the database is up and the gateway is not".
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 2. [PRODUCT] A missing Service Worker (private window, unsupported browser) marks …
Final score: **90**
[SIL][S360][UX/P3] A missing Service Worker (private window, unsupported browser) marks the overall banner "Partial Outage". It is a client capability, not a service; count it as informational.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [PRODUCT] "Coming soon" / "TBD" copy on six live game pages. Founder copy decis…
Final score: **87**
[S356][PRODUCT/P2] "Coming soon" / "TBD" copy on six live game pages. Founder copy decision: call-of-doodie, franchise-architect, gridiron-gm (trailer + screenshots), vaultfront (backend), mindframe, project-unknown (platform, title).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [PRODUCT] Supabase fjnpzjjyhnpmunfoycrp is DOWN (db/rest/auth UNHEALTHY, REST t…
Final score: **84**
[S357→S360][ENG/P0 · PROVIDER] Supabase fjnpzjjyhnpmunfoycrp is DOWN (db/rest/auth UNHEALTHY, REST times out, control plane cannot reach the DB; status still ACTIVE_HEALTHY). Breaks Desk comments AND Vault Member sign-in. The fix is a project restart via the Management API; the agent restart was refused by the session permission policy (S359, and again S360), so it is a founder action. Command in LATEST_HANDOFF.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 5. [PRODUCT] Founder-owned items deferred. Passkey sign-in, signup walkthrough, pu…
Final score: **84**
[S354][FOUNDER DIRECTIVE] Founder-owned items deferred. Passkey sign-in, signup walkthrough, public member data, newsletter arming, Desk cadence, warm-origin, Workers Paid and the small confirmations wait until the founder picks them up; agent-owned items continue.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 6. [PRODUCT] Ship the sampler RPC entrypoint on Ark acceptance. Ark 01K2EQ77M9F29A…
Final score: **78**
[S352][SIL][OBS/P1] Ship the sampler RPC entrypoint on Ark acceptance. Ark 01K2EQ77M9F29A0EC9619EA4BC asks studio-ops to reuse studio-ops-cron */30 via a service binding. The website half needs a node-side cloudflare:workers shim for the unit tests.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 7. [PRODUCT] Free a cron slot, or move the account to Workers Paid. S352: an agent…
Final score: **75**
[S351][OBS/P0 · FOUNDER DECISION] Free a cron slot, or move the account to Workers Paid. S352: an agent-side third option went to studio-ops via Ark (row above); this row closes if studio-ops accepts. This is the single thing standing between the studio and ever observing its own edge, and it is now a one-sentence decision rather than an investigation. Five of five free-plan cron triggers are in use by other projects. Retiring one is a live change to that project (founder call); Workers Paid raises the cap to 1,000 and is a billing action reserved to a human under CANON-019. Everything downstream is already built, deployed and verified — namespace, binding, handler, drain, 12/12 drain self-tests.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [VERIFY] Model the proof-surface generators, highest-risk first
Final score: **71**
[S353][SIL:1][CI/P2] Model the proof-surface generators, highest-risk first — 19 left. S354 modeled build-release-dependencies (and its missing release-proof edge, which exposed a real weekly-maintenance strand, now closed). Start with build-release-dependencies (weekly-maintenance stages its output). Read each generator for REAL sources, add the node, --update to lower the baseline.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

## Recommended Build Order

1. Purge api/founder-presence.json from public git history. 30 revisions…
2. Post-push CI confirmation
3. Staging Worker observability. Still the only way to source the S354/S…
4. Mount the narrative on /journal/. Deferred: a UI change needs its own…
5. Enable Worker observability for staging. Deferred: needs a Worker dep…
6. Retire the 604 unresolved pre-S349 uptime rows on merit, not by rewri…
7. Close field-vitals freshness only with real evidence. Surface observe…
8. Verify the first Vault Narrative run after the S353 fix publishes a d…
9. ESCALATION: The Desk's cadence lever is still the founder's pick -- b…
10. Authorize or decline immutable warm-origin migration. D-S303 reserves…
11. Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_UR…
12. Annual Stripe activation once keys exist

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
