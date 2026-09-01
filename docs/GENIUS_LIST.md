# Genius Hit List — Session 334

Generated: 2026-09-01
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **79/100**
- Health: **yellow**
- Current SIL: **988/1000**
- CI health: **check gh run list**
- Current focus: Session 334 audited all 185 pages from the marketing landing to the member panel and shipped 12 of 14 ranked items — while disproving 2 of them with measurement rather than building them. Four defects were live: _redirects splat rules that 301'd three Solara world pages, the legacy Franchise Architect build and two whole app trees into 404s; /ignis-health/ calling itself internal while protected only by robots.txt; a tracked duplicate sitemap the orphan gate had been told to ignore; and a newsroom that could spend three consecutive editions on one story because selection remembered dead hosts but not its own output. Two fixes were joins rather than builds — the pathway route data had existed unrendered since S201, and the 17 .ai/ canonical fact sheets were referenced by nothing until they reached sitemap, agents.json, JSON-LD, human cross-links and the answer engine's retrieval corpus. New surface: /evidence/, one front door for eight live-data pages, with freshness fetched live rather than baked and honest UNKNOWN states.

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

#### 2. [VERIFY] Four new readable feeds are on probation
Final score: **92**
[S333][NEWS/P2] Four new readable feeds are on probation — verify they earn their place. the-decoder, MarkTechPost, ZDNet AI and The Register AI/ML were added on measured reachability and freshness, and moved the queue 0 -> 1. Confirm over a week that they contribute topics that actually publish rather than only inflating item counts, and drop any that do not. sources reached went 12/15 -> 16/19, so three feeds are still failing and should be identified and either fixed or removed.
Why it matters: Four new readable feeds are on probation shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 3. [PRODUCT] The Desk's binding constraint is now topic ACCEPTANCE, and it current…
Final score: **87**
[S333][NEWS/P0] The Desk's binding constraint is now topic ACCEPTANCE, and it currently queues nothing. Measured across four runs on 2026-08-31: 03:19 queued 3, 04:10 queued 2 (one became the published edition), the 06:44 scheduled run queued 0 of 177, and a local news-trend-radar.mjs --scan reproduces 0 queued / 176 rejected deterministically. Selection and the authoring model are both fixed and proven; the pipeline now starves upstream instead. Prediction to check first: today's edition ages to 1 day old on 2026-09-01, at which point build-news-freshness --check --require-daily fails again and the Desk returns to red — not from the defects fixed in S333, but from an empty queue. Investigate the rejection thresholds (corroboration count, recency window, published-slug dedupe from S329, vendor filter) and establish what acceptance rate a 4-slot daily cadence actually requires.
Why it matters: The Desk's binding constraint is now topic ACCEPTANCE, and it currentl is open, local, and unblocked — can ship this session.

#### 4. [SECURITY] Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-0…
Final score: **87**
[S333][NEWS/P1] Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-08-31 edition proves the pipeline works, but it was manually dispatched under observation. The cron itself has not gone green unattended since 2026-08-29. Check the 06:07 / 12:07 / 18:07 / 22:07 UTC slots; if they still drop while a dispatch succeeds, the difference is environmental (scheduler context, token scope, or queue freshness), not the selection or model logic this session fixed.
Why it matters: Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-08 lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

### NEXT

#### 1. [PRODUCT] Fact extraction accepts advertising copy as a sourced fact. The 2026-…
Final score: **84**
[S334][NEWS/P2] Fact extraction accepts advertising copy as a sourced fact. The 2026-08-31 edition's first fact reads "Scott Gilbertson Top Shark Promo Codes for August 2026 Shark makes some seriously powerful vacuums..." sourced to the Wired article. factCandidates() scores for digits, proper nouns and reporting verbs and penalises marketing pronouns, but a syndicated promo block passes every filter. This is a public-surface truth issue, not a cosmetic one: it is rendered as a cited fact under a real publisher URL. Consider penalising sentences whose entities do not appear in the headline or topic title.
Why it matters: Fact extraction accepts advertising copy as a sourced fact. The 2026-0 is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] news-trend-radar --scan failure is swallowed by || echo in the publis…
Final score: **84**
[S333][OBS/P2] news-trend-radar --scan failure is swallowed by || echo in the publish workflow. Line 91 of news-publish.yml runs the scan with || echo "trend radar produced no new corroborated topics", so a genuine radar crash and a legitimate empty result are indistinguishable — the failure then resurfaces one step later as the misleading ✗ no topic queue. In S333 the scan had genuinely succeeded (2904 items → 177 topics → 0 queued), but that had to be confirmed by reading the log rather than by the run status. Report the scan verdict explicitly (items/topics/queued/rejected) as a step output so an empty queue states its own cause.
Why it matters: news-trend-radar --scan failure is swallowed by || echo in the publish is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Thread fellBackFrom into published story provenance. The inference la…
Final score: **78**
[S333][NEWS/P2] Thread fellBackFrom into published story provenance. The inference layer knows which model authored and returns it, but the run log only says "authored on attempt 1" and the published day artifact does not record the model. With the preferred model depooled, editions are almost certainly standby-authored — and "almost certainly" is not a receipt. Persist the authoring model per story so AI-disclosure surfaces state a fact rather than an assumption.
Why it matters: Thread fellBackFrom into published story provenance. The inference lay is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] The full derived-build profile is not full: it omits build-public-sta…
Final score: **72**
[S333][INFRA/P2] The full derived-build profile is not full: it omits build-public-status.mjs, so a closeout cascade leaves the public status surface stale. DERIVED_BUILD_PROFILES.full is the profile closeout-autopilot runs after context write-back, but build-public-status.mjs appears only in refresh-live-data. Observed live in S333: after regenerating public-intelligence and running the full profile to green preflight, build-public-status --check still failed at build:check step 140 because nothing in full re-derived it. A profile named full that is a strict subset of another profile is a naming trap, and the cascade is only ever as wide as its declared graph. Either make full a genuine superset, or derive both profiles from one dependency graph so a consumer cannot be reachable in one profile and orphaned in the other. Pairs with the S333 invocation-mode work: same file, same class of gap.
Why it matters: The full derived-build profile is not full: it omits build-public-stat is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] The Desk freshness banner disagrees with its own API by one day, and …
Final score: **69**
[S333][OBS/P3] The Desk freshness banner disagrees with its own API by one day, and its --check gate goes stale daily by design. news/index.html embeds a rendered relative age ("latest published evidence 2026-08-25 · 6 days old") while api/news-desk-freshness.json and the scheduled cron both report age 5d for the same date on the same day. Two separate issues: reconcile the arithmetic (likely a ceil/floor or UTC-boundary difference), and decide whether a time-relative string belongs in a byte-checked static page at all — as built, generate-news-pages --check reports drift every single day purely from the clock, which trains readers of that gate to treat real drift as routine.
Why it matters: The Desk freshness banner disagrees with its own API by one day, and i is open, local, and unblocked — can ship this session.

### LATER

#### 1. [INTELLIGENCE] Audit every other fixed-size scan window against current automation c…
Final score: **69**
[S333][SIL][OBS/P2] Audit every other fixed-size scan window against current automation churn. The forge ledger went blind because it scanned a fixed last-120 commits while [skip ci] publishers commit several times an hour. Any other producer that samples "the last N commits/rows/lines" and then filters is vulnerable to the same burial. Enumerate them, re-size each by what it is looking for rather than by a raw count, and add a gate that fails when a noise-filtered producer yields zero entries while the repo has recent human commits — zero-with-activity is the signature, and it is currently indistinguishable from a genuinely quiet repo.
Why it matters: Audit every other fixed-size scan window against current automation ch keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 2. [VERIFY] Confirm The Desk actually resumes on its own schedule. The fix is pro…
Final score: **65**
[S333][SIL][NEWS/P1] Confirm The Desk actually resumes on its own schedule. The fix is proven locally and in a live drafting run, but the proof that matters is a scheduled The Desk — Scheduled Publish run going green without intervention and a new edition dated after 2026-08-30. Verify the next run; if it still drops, the next suspect is queue freshness (news-trend-radar.mjs --scan), not selection.
Why it matters: Confirm The Desk actually resumes on its own schedule. The fix is prov shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 3. [PRODUCT] Sweep for other orphaned self-tests. build-order.mjs --self-test pass…
Final score: **60**
[S333][SIL][GATE/P1] Sweep for other orphaned self-tests. build-order.mjs --self-test passed 25/25 for sessions while being invoked by nothing. check-build-gate-reachability.mjs reports 246/246 reachable but did not consider scripts/lib/*.mjs self-tests, so its denominator excluded the orphan. Extend the reachability gate's corpus to every --self-test-bearing module under scripts/ and scripts/lib/, then re-run — a gate whose denominator omits the orphan class cannot report the orphan.
Why it matters: Sweep for other orphaned self-tests. build-order.mjs --self-test passe is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [SECURITY] Phase 6
Final score: **90**
[S329][COST/P1] Phase 6 — token/compute. vault-narrative → free Hetzner desk-inference.chat() (Anthropic shape isolated at 3 points; raise maxTokens 220→≥512, thinking:false; workflow secret swap; grounding post-check) — kills all scheduled paid LLM spend; refresh-live-data.yml → runDerivedBuilds() slim profile + coverage assertion; monthly journal-revival lane on Hetzner inference (founder-approved, draft-for-review, never auto-publish) + wire update-journal-dates.mjs into build.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [PRODUCT] Alert when a provider advertises a model it cannot serve. GET /models…
Final score: **87**
[S333][OBS/P2] Alert when a provider advertises a model it cannot serve. GET /models listed the retired model as available, so no health check could distinguish "model exists" from "model is servable". A cheap periodic completion against each declared authoring model would have caught this before it stopped the newsroom.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [PRODUCT] startup-revenue-agreement is red and the cause is upstream, not here.…
Final score: **84**
[S334][OBS/P1] startup-revenue-agreement is red and the cause is upstream, not here. The promoted v5 startup brief renders Revenue sig. 1d old (2026-08-30) while the shared resolver — the same one doctor uses — computes 2 days. Both clock paths inside revenue-freshness.mjs agree on 2 (studioCalendarDate() and the UTC default both return 2026-09-01), so the disagreement is in the v5 renderer's SIGNALS composition, which promotes over the v3 block that computed correctly. context/SIGNALS.md, the documented fallback, is 18 days stale and says not found, so a reader is keyed on an artifact its producer stopped writing. This is a studio-ops brief-renderer concern — ship repo-question or pattern-share cargo rather than editing the sibling repo. It surfaced only because the date rolled over mid-session; it will recur every session boundary until fixed.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 4. [INTELLIGENCE] Two audit items were disproved, not deferred
Final score: **84**
[S334][PERF/P3] Two audit items were disproved, not deferred — do not re-raise them without new measurement. The homepage's inline CSS is page-unique (7% overlap with the shared sheet) and its measured mobile LCP is ~900ms; the member dashboard measures FCP 860ms at 1,414 DOM nodes. A controlled A/B also confirmed S275's blocking-stylesheet decision (724ms vs 752ms median FCP), and the alarming 4,724ms /games/ reading was a cold-start artifact of the first page load in a fresh browser process. Any future perf work here starts from a warmed-browser measurement, not from document size.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 5. [PRODUCT] Readable-source breadth is the last untouched lever, and it is now is…
Final score: **78**
[S333][NEWS/P1] Readable-source breadth is the last untouched lever, and it is now isolated. ~70 topics are blocked by nothing except having no readable body: they are corroborated, castable, fresh, and unusable because every source is a Google News redirect. Corroboration cannot help them and clustering cannot either. The only remaining approaches are more publisher-direct feeds (probe reachability and 72h freshness first, as S333 did — four were added this way) or resolving aggregator items to publisher URLs by matching on entities rather than the current same-outlet headline rule. Measure with --scan, whose single-blocker headroom tally now reports this number directly.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 6. [SECURITY] Activate Cloudflare Web Analytics for the production hostname. data/s…
Final score: **75**
[S329] Activate Cloudflare Web Analytics for the production hostname. data/stats-surface.json → human-page-loads-30d reads available: false ("Cloudflare Web Analytics has not observed this production hostname") and performance-samples-7d is 0 — every voluntary-signal loop (Desk reactions, RUM floors, CWV pass rate, reader-view thresholds) is structurally starved by this one dashboard toggle. Enable Web Analytics for vaultsparkstudios.com in the Cloudflare dashboard (Analytics → Web Analytics → add site); check-cloudflare-web-analytics.mjs verifies once flipped. Agent preflight: the analytics-read token can query but cannot ENABLE the product — dashboard-only, genuinely founder-scoped.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 7. [PRODUCT] Confirm The Dispatch double opt-in. Click the confirmation message se…
Final score: **72**
Confirm The Dispatch double opt-in. Click the confirmation message sent to the founder mailbox so the first newsletter subscriber becomes confirmed; the agent cannot truthfully count the address before that inbox action.
Why it matters: Requires a live account, real device, inbox receipt, payment-provider flow, or manual external confirmation.

#### 8. [PRODUCT] Surfaced, studio-ops-owned (CANON-018): mindframe registry deployedUr…
Final score: **60**
[S323][ADVISORY] Surfaced, studio-ops-owned (CANON-018): mindframe registry deployedUrl drift (local steadfast-determination-production.up.railway.app ≠ canonical usemindframe.com) and franchise-architect portfolio-coherence drift. Resolve upstream, not from here.
Why it matters: Owned by another repo or already moved through Ark cargo.

## Recommended Build Order

1. Post-push CI confirmation
2. Four new readable feeds are on probation
3. The Desk's binding constraint is now topic ACCEPTANCE, and it current…
4. Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-0…
5. Fact extraction accepts advertising copy as a sourced fact. The 2026-…
6. news-trend-radar --scan failure is swallowed by || echo in the publis…
7. Thread fellBackFrom into published story provenance. The inference la…
8. The full derived-build profile is not full: it omits build-public-sta…
9. The Desk freshness banner disagrees with its own API by one day, and …
10. Audit every other fixed-size scan window against current automation c…
11. Confirm The Desk actually resumes on its own schedule. The fix is pro…
12. Sweep for other orphaned self-tests. build-order.mjs --self-test pass…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
