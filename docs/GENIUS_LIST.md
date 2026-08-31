# Genius Hit List — Session 333

Generated: 2026-08-31
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **80/100**
- Health: **yellow**
- Current SIL: **996/1000**
- CI health: **check gh run list**
- Current focus: Session 333 root-caused and fixed a five-day public editorial outage: The Desk had failed eight consecutive scheduled publish runs because topic selection gave up after one topic whose only direct source answered 401, while six readable topics sat untried in the same queue. Selection now walks the ranked queue and spends its attempt budget per host rather than per story. The session also found that S332 regression lock for the previous scheduled-CI bug had never been wired into any runner, made it a build:check step, and replaced its single-script assertion with a structural invocation-mode detector. Canonical destination unknowns now carry a consecutive-unknown streak and a last-known-good age that can never promote a verdict.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] The full derived-build profile is not full: it omits build-public-sta…
Final score: **96**
[S333][INFRA/P2] The full derived-build profile is not full: it omits build-public-status.mjs, so a closeout cascade leaves the public status surface stale. DERIVED_BUILD_PROFILES.full is the profile closeout-autopilot runs after context write-back, but build-public-status.mjs appears only in refresh-live-data. Observed live in S333: after regenerating public-intelligence and running the full profile to green preflight, build-public-status --check still failed at build:check step 140 because nothing in full re-derived it. A profile named full that is a strict subset of another profile is a naming trap, and the cascade is only ever as wide as its declared graph. Either make full a genuine superset, or derive both profiles from one dependency graph so a consumer cannot be reachable in one profile and orphaned in the other. Pairs with the S333 invocation-mode work: same file, same class of gap.
Why it matters: The full derived-build profile is not full: it omits build-public-stat is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] The Desk freshness banner disagrees with its own API by one day, and …
Final score: **93**
[S333][OBS/P3] The Desk freshness banner disagrees with its own API by one day, and its --check gate goes stale daily by design. news/index.html embeds a rendered relative age ("latest published evidence 2026-08-25 · 6 days old") while api/news-desk-freshness.json and the scheduled cron both report age 5d for the same date on the same day. Two separate issues: reconcile the arithmetic (likely a ceil/floor or UTC-boundary difference), and decide whether a time-relative string belongs in a byte-checked static page at all — as built, generate-news-pages --check reports drift every single day purely from the clock, which trains readers of that gate to treat real drift as routine.
Why it matters: The Desk freshness banner disagrees with its own API by one day, and i is open, local, and unblocked — can ship this session.

#### 4. [INTELLIGENCE] Audit every other fixed-size scan window against current automation c…
Final score: **93**
[S333][SIL][OBS/P2] Audit every other fixed-size scan window against current automation churn. The forge ledger went blind because it scanned a fixed last-120 commits while [skip ci] publishers commit several times an hour. Any other producer that samples "the last N commits/rows/lines" and then filters is vulnerable to the same burial. Enumerate them, re-size each by what it is looking for rather than by a raw count, and add a gate that fails when a noise-filtered producer yields zero entries while the repo has recent human commits — zero-with-activity is the signature, and it is currently indistinguishable from a genuinely quiet repo.
Why it matters: Audit every other fixed-size scan window against current automation ch keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

### NEXT

#### 1. [VERIFY] Confirm The Desk actually resumes on its own schedule. The fix is pro…
Final score: **91**
[S333][SIL][NEWS/P1] Confirm The Desk actually resumes on its own schedule. The fix is proven locally and in a live drafting run, but the proof that matters is a scheduled The Desk — Scheduled Publish run going green without intervention and a new edition dated after 2026-08-30. Verify the next run; if it still drops, the next suspect is queue freshness (news-trend-radar.mjs --scan), not selection.
Why it matters: Confirm The Desk actually resumes on its own schedule. The fix is prov shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 2. [PRODUCT] Sweep for other orphaned self-tests. build-order.mjs --self-test pass…
Final score: **84**
[S333][SIL][GATE/P1] Sweep for other orphaned self-tests. build-order.mjs --self-test passed 25/25 for sessions while being invoked by nothing. check-build-gate-reachability.mjs reports 246/246 reachable but did not consider scripts/lib/*.mjs self-tests, so its denominator excluded the orphan. Extend the reachability gate's corpus to every --self-test-bearing module under scripts/ and scripts/lib/, then re-run — a gate whose denominator omits the orphan class cannot report the orphan.
Why it matters: Sweep for other orphaned self-tests. build-order.mjs --self-test passe is open, local, and unblocked — can ship this session.

#### 3. [INTELLIGENCE] Phase 5
Final score: **78**
[S329][SEC/P1] Phase 5 — security. Fix the two "unverified" posture controls in build-security-posture.mjs evidence resolution (csp-audit + supply-chain) → posture "attention"→clean; Turnstile on contact + Desk dispatch (edge siteverify FIRST, then client embed — D-S318.2 one release unit; e2e proving token-less submit rejected); build /ask-founders/ (founder-approved; the Worker rate-limit route already exists).
Why it matters: Phase 5 keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 4. [SECURITY] Phase 4b
Final score: **72**
[S329][IA/P1] Phase 4b — analysis-gated merges. Per founder directive: write a merge-analysis per cluster to DECISIONS before merging. Membership funnel 5→2 (/membership/ canonical + /vaultsparked/ comparison; /membership-value/, /vault-portal/, /join/ → redirects/rows); one leaderboard home (fold /vault-wall/ + /community/ leaderboard sections); orphan link-or-retire batch (/notebook/, /ip/, /share/, /brand/system/, /ignis/roi/, /security/trusted-types/, legacy /franchise-architect/ + /solara/ roots); /projects/ catalog 11→20.
Why it matters: Phase 4b lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 5. [AI] Phase 8
Final score: **70**
[S329][ELITE/P2] Phase 8 — elite features. Eternal Intelligence gets a real model call (reuse ask-ignis tokenMeter/cache/persona; function deploy before portal cascade); portal member→studio feedback panel (page_feedback reuse first); agent actions API + Obelisk agent tokens (CANON-048 completion); declare the 17 .cache/ artifacts in the evidence graph; Desk visual receipt per story (rank 98) + visual-diversity memory (rank 90).
Why it matters: Phase 8 must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

### LATER

#### 1. [COHESION] Bind a deterministic visual receipt to every newly published story. R…
Final score: **68**
[S327][SIL:1][NEWS/P1] Bind a deterministic visual receipt to every newly published story. Record source-master and derivative hashes, compositor safe-zone geometry, and desktop/mobile render evidence in the edition contract so unattended publication proves visual integrity without a paid runtime judge.
Why it matters: Bind a deterministic visual receipt to every newly published story. Re is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 2. [PRODUCT] Add a Desk visual-diversity memory. Track scene archetype, palette, f…
Final score: **60**
[S327][SIL:1][NEWS/P2] Add a Desk visual-diversity memory. Track scene archetype, palette, focal arrangement, and satire target across recent editions, then reject repeated visual shorthand even when file hashes differ.
Why it matters: Add a Desk visual-diversity memory. Track scene archetype, palette, fo is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Phase 7
Final score: **59**
[S329][PERF/P2] Phase 7 — perf. Stale-shell prune (grep JS-resident refs first, D-S317.8); 187KB style.css weight pass; Lighthouse perf floor raise from 0.76 to measured headroom; visual-QA PNG retention policy (472 + 4/day); franchise-architect INP pointerenter fix (p75 640ms).
Why it matters: Phase 7 is a 4-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### DEFERRED / GATED

#### 1. [SECURITY] Phase 6
Final score: **100**
[S329][COST/P1] Phase 6 — token/compute. vault-narrative → free Hetzner desk-inference.chat() (Anthropic shape isolated at 3 points; raise maxTokens 220→≥512, thinking:false; workflow secret swap; grounding post-check) — kills all scheduled paid LLM spend; refresh-live-data.yml → runDerivedBuilds() slim profile + coverage assertion; monthly journal-revival lane on Hetzner inference (founder-approved, draft-for-review, never auto-publish) + wire update-journal-dates.mjs into build.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [SECURITY] Activate Cloudflare Web Analytics for the production hostname. data/s…
Final score: **87**
[S329] Activate Cloudflare Web Analytics for the production hostname. data/stats-surface.json → human-page-loads-30d reads available: false ("Cloudflare Web Analytics has not observed this production hostname") and performance-samples-7d is 0 — every voluntary-signal loop (Desk reactions, RUM floors, CWV pass rate, reader-view thresholds) is structurally starved by this one dashboard toggle. Enable Web Analytics for vaultsparkstudios.com in the Cloudflare dashboard (Analytics → Web Analytics → add site); check-cloudflare-web-analytics.mjs verifies once flipped. Agent preflight: the analytics-read token can query but cannot ENABLE the product — dashboard-only, genuinely founder-scoped.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [PRODUCT] Confirm The Dispatch double opt-in. Click the confirmation message se…
Final score: **84**
Confirm The Dispatch double opt-in. Click the confirmation message sent to the founder mailbox so the first newsletter subscriber becomes confirmed; the agent cannot truthfully count the address before that inbox action.
Why it matters: Requires a live account, real device, inbox receipt, payment-provider flow, or manual external confirmation.

#### 4. [VERIFY] Complete Obelisk relying-party setup and the real-provider passkey ce…
Final score: **75**
[S330][AUTH/P0] Complete Obelisk relying-party setup and the real-provider passkey ceremony. obelisk.identity.verify is missing OBELISK_RP_ID, OBELISK_RP_NAME, and OBELISK_RP_ORIGIN; release dependency obelisk-staging-registration is also missing. After registration/configuration, run node scripts/verify-provider-journey.mjs --live, complete the hardware-key step, and regenerate identity/release receipts. The S332 public release is live and passes 15/15 attention cases; this task remains the separate auth-surface hold and must not be inferred from deployment success.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 5. [PRODUCT] Surfaced, studio-ops-owned (CANON-018): mindframe registry deployedUr…
Final score: **72**
[S323][ADVISORY] Surfaced, studio-ops-owned (CANON-018): mindframe registry deployedUrl drift (local steadfast-determination-production.up.railway.app ≠ canonical usemindframe.com) and franchise-architect portfolio-coherence drift. Resolve upstream, not from here.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 6. [VERIFY] Prove the first privacy-thresholded article measurements from the rep…
Final score: **71**
[S325][SIL:2⛔][NEWS/P1] Prove the first privacy-thresholded article measurements from the repaired publisher. Wait for at least five real browser pageloads on a Desk article, then verify Reader views and measured engaged time replace the honest “Collecting” state without changing the privacy floor or counting UX events as views. The new qualification summary must identify the first qualifying receipt; it currently abstains honestly at zero qualified stories. (Blocked on real traffic + the CF Web Analytics founder unlock — exempt from forced escalation while externally starved.)
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 7. [AI] IGNIS freshness is portfolio-owned. Reads 15 days stale while ops.mjs…
Final score: **70**
[S319][ECOSYSTEM/P2] IGNIS freshness is portfolio-owned. Reads 15 days stale while ops.mjs rescore reports every project fresh, so the stale artifact lives in studio-ops and cannot be written from here (CANON-018). Resolve upstream rather than backdating a timestamp.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 8. [PRODUCT] Founder decision: authorize or decline migration of the GitHub Pages …
Final score: **69**
[S318][ROLLBACK/P0] Founder decision: authorize or decline migration of the GitHub Pages warm rollback origin away from mutable main. D-S303 makes this provider architecture founder-scoped. Unchanged from S318.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. The full derived-build profile is not full: it omits build-public-sta…
2. Post-push CI confirmation
3. The Desk freshness banner disagrees with its own API by one day, and …
4. Audit every other fixed-size scan window against current automation c…
5. Confirm The Desk actually resumes on its own schedule. The fix is pro…
6. Sweep for other orphaned self-tests. build-order.mjs --self-test pass…
7. Phase 5
8. Phase 4b
9. Phase 8
10. Bind a deterministic visual receipt to every newly published story. R…
11. Add a Desk visual-diversity memory. Track scene archetype, palette, f…
12. Phase 7

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
