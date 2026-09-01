# Genius Hit List — Session 335

Generated: 2026-09-01
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **80/100**
- Health: **yellow**
- Current SIL: **989/1000**
- CI health: **check gh run list**
- Current focus: Session 335 re-audited the site one day after S334 and found the P0 was not on the list: any signed-in member could write their own points, plan and paid AI tier from the browser, and every anonymous public member surface had been blank for months because the members table had no anon read policy. Both are closed with a live-applied, probe-proven migration (column-scoped grants, atomic gift RPC, a public_leaderboard projection view). The stub deletion S334 recorded as shipped had been silently reverted by a generator on every build; that generator is now a court and the stubs are gone. Four redundant routes merged into their canonical pages with edge 301s, a new /how-we-build/ page with a vocabulary gate, Season 1 live, member dashboard quota meter and feedback loop, 16 duplicate build invocations removed, and ~360 MB of session snapshots out of the index.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] <!-- evidence-open: the files named are the churning OUTPUTS and the …
Final score: **96**
<!-- evidence-open: the files named are the churning OUTPUTS and the suspect generators, not deliverables; the deliverable is a pinned-clock bisect and fix --> [S335][BUILD/P2] Two identical builds minutes apart still churn 47 files — commit-derived feeds are the source, not timestamps. With no commit between them, build 2 rewrote feed/forge-ledger.{json,xml} (206 lines), api/feedback-provenance.json (a whole theme dropped), api/ship-receipts.json, api/status-proof.json, api/news-visual-receipts.json and the changelog SSR block; a third build would churn again. All derive from api/commit-map.json / the git log through build-parallel-phase.mjs (which runs build-feedback-provenance + build-ship-receipts), so the working theory is a clock-relative selection window in that chain. Bisect: run build-forge-feed.mjs twice with a pinned --now (add the flag if absent) and diff; then the provenance pair. This is the receipt-cascade cost the S334 "vs-yas" item was really measuring. Fixed this session: _headers lagged one build because early-hints ran before the postbuild shell rotation — moved into postbuild after build-shell-assets.
Why it matters: <!-- evidence-open: the files named are the churning OUTPUTS and the s is open, local, and unblocked — can ship this session.

#### 2. [INTELLIGENCE] Every anonymous public read of vault_members was empty until S335
Final score: **96**
[S335][SEC/P2] Every anonymous public read of vault_members was empty until S335 — audit the other public tables for the same silent-zero. The live table had no anon SELECT policy; public_leaderboard (definer view, opt-out enforced) now feeds every public surface. Run the same probe (apply-supabase-migration.mjs --probe) shape against challenge_submissions, game_sessions, polls, studio_pulse, treasury_items: for each, compare set local role anon count against the base count and list which public surfaces read it. A public surface that renders "—" forever is indistinguishable from an honest empty state, which is exactly why this hid for months.
Why it matters: Every anonymous public read of vault_members was empty until S335 keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 3. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 4. [VERIFY] <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are n…
Final score: **94**
<!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are named as context; the deliverable is the Worker scheduled handler + KV drain, which do not exist yet --> [S335][COST/P2] Move the 30-minute uptime probe off GitHub Actions. uptime-probe.yml is 48 runs and 48 [skip ci] commits a day (71% of all scheduled runs) and is the churn that buried the forge ledger in S333. Design: a Worker scheduled() handler probes the same route list and writes samples to KV under uptime:<ts>; the Actions job runs once daily, drains KV into api/uptime.json + geo-vitals + staging parity, and commits once. probe-uptime.mjs must learn to consume KV samples instead of producing them; check-uptime-contract.mjs defines the sample cadence the public SLA promises — keep it. Not done in S335 because it rewrites a public trust surface's data path; the same-cron pair (linkcheck + member-seo) was merged into weekly-maintenance.yml instead.
Why it matters: <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are na shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [SECURITY] Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs s…
Final score: **81**
[S335][TOKEN/P2] Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs shards the handoff. It is the largest file any session can touch (~126K tokens raw). compact-handoff.mjs and rotate-ledger.mjs read the handoff archive, so the shard has to be introduced through those readers, not by moving files. Measure with context-meter.mjs before and after.
Why it matters: Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs sh lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 2. [VERIFY] Four new readable feeds are on probation
Final score: **75**
[S333][NEWS/P2] Four new readable feeds are on probation — verify they earn their place. the-decoder, MarkTechPost, ZDNet AI and The Register AI/ML were added on measured reachability and freshness, and moved the queue 0 -> 1. Confirm over a week that they contribute topics that actually publish rather than only inflating item counts, and drop any that do not. sources reached went 12/15 -> 16/19, so three feeds are still failing and should be identified and either fixed or removed.
Why it matters: Four new readable feeds are on probation was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`

#### 3. [PRODUCT] The Desk's binding constraint is now topic ACCEPTANCE, and it current…
Final score: **75**
[S333][NEWS/P0] The Desk's binding constraint is now topic ACCEPTANCE, and it currently queues nothing. Measured across four runs on 2026-08-31: 03:19 queued 3, 04:10 queued 2 (one became the published edition), the 06:44 scheduled run queued 0 of 177, and a local news-trend-radar.mjs --scan reproduces 0 queued / 176 rejected deterministically. Selection and the authoring model are both fixed and proven; the pipeline now starves upstream instead. Prediction to check first: today's edition ages to 1 day old on 2026-09-01, at which point build-news-freshness --check --require-daily fails again and the Desk returns to red — not from the defects fixed in S333, but from an empty queue. Investigate the rejection thresholds (corroboration count, recency window, published-slug dedupe from S329, vendor filter) and establish what acceptance rate a 4-slot daily cadence actually requires.
Why it matters: The Desk's binding constraint is now topic ACCEPTANCE, and it currentl is open, local, and unblocked — can ship this session.

#### 4. [SECURITY] Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-0…
Final score: **75**
[S333][NEWS/P1] Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-08-31 edition proves the pipeline works, but it was manually dispatched under observation. The cron itself has not gone green unattended since 2026-08-29. Check the 06:07 / 12:07 / 18:07 / 22:07 UTC slots; if they still drop while a dispatch succeeds, the difference is environmental (scheduler context, token scope, or queue freshness), not the selection or model logic this session fixed.
Why it matters: Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-08 lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 5. [PRODUCT] news-trend-radar --scan failure is swallowed by || echo in the publis…
Final score: **72**
[S333][OBS/P2] news-trend-radar --scan failure is swallowed by || echo in the publish workflow. Line 91 of news-publish.yml runs the scan with || echo "trend radar produced no new corroborated topics", so a genuine radar crash and a legitimate empty result are indistinguishable — the failure then resurfaces one step later as the misleading ✗ no topic queue. In S333 the scan had genuinely succeeded (2904 items → 177 topics → 0 queued), but that had to be confirmed by reading the log rather than by the run status. Report the scan verdict explicitly (items/topics/queued/rejected) as a step output so an empty queue states its own cause.
Why it matters: news-trend-radar --scan failure is swallowed by || echo in the publish is open, local, and unblocked — can ship this session.

### LATER

#### 1. [PRODUCT] Fact extraction accepts advertising copy as a sourced fact. The 2026-…
Final score: **69**
[S334][NEWS/P2] Fact extraction accepts advertising copy as a sourced fact. The 2026-08-31 edition's first fact reads "Scott Gilbertson Top Shark Promo Codes for August 2026 Shark makes some seriously powerful vacuums..." sourced to the Wired article. factCandidates() scores for digits, proper nouns and reporting verbs and penalises marketing pronouns, but a syndicated promo block passes every filter. This is a public-surface truth issue, not a cosmetic one: it is rendered as a cited fact under a real publisher URL. Consider penalising sentences whose entities do not appear in the headline or topic title.
Why it matters: Fact extraction accepts advertising copy as a sourced fact. The 2026-0 is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Thread fellBackFrom into published story provenance. The inference la…
Final score: **66**
[S333][NEWS/P2] Thread fellBackFrom into published story provenance. The inference layer knows which model authored and returns it, but the run log only says "authored on attempt 1" and the published day artifact does not record the model. With the preferred model depooled, editions are almost certainly standby-authored — and "almost certainly" is not a receipt. Persist the authoring model per story so AI-disclosure surfaces state a fact rather than an assumption.
Why it matters: Thread fellBackFrom into published story provenance. The inference lay is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] The Desk freshness banner disagrees with its own API by one day, and …
Final score: **60**
[S333][OBS/P3] The Desk freshness banner disagrees with its own API by one day, and its --check gate goes stale daily by design. news/index.html embeds a rendered relative age ("latest published evidence 2026-08-25 · 6 days old") while api/news-desk-freshness.json and the scheduled cron both report age 5d for the same date on the same day. Two separate issues: reconcile the arithmetic (likely a ceil/floor or UTC-boundary difference), and decide whether a time-relative string belongs in a byte-checked static page at all — as built, generate-news-pages --check reports drift every single day purely from the clock, which trains readers of that gate to treat real drift as routine.
Why it matters: The Desk freshness banner disagrees with its own API by one day, and i is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [VERIFY] Flip Trusted Types to enforce once the readiness receipt is honest. T…
Final score: **97**
[S335][SEC/P1] Flip Trusted Types to enforce once the readiness receipt is honest. The Worker now honours TT_ENFORCE_ENABLED (default "0", one-variable rollback); founder approved the flip in S335. Held because api/tt-readiness.json reports enforceEligible:false on 17 "warm" rows whose newest report is 2026-07-03 — two-month-old rows should have aged to stale, so build-tt-readiness.mjs's warm/stale window is the first suspect. Fix the ageing, regenerate, then set the var to "1" in cloudflare/wrangler.toml, deploy, verify live headers on the apex (not pages.dev), and regenerate api/security-posture.json so "active" means enforced.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [PRODUCT] portal-feedback.js writes columns the checked-in page_feedback migrat…
Final score: **96**
[S335][DATA/P2] portal-feedback.js writes columns the checked-in page_feedback migration does not define. The client inserts page_path/question/answer/session_id; the migration defines path/reaction/visit_depth_bucket/ua_kind/created_at with service-role-only SELECT and no user_id. Either the live table was altered in the dashboard (probe it with the pre-image shape in apply-supabase-migration.mjs) or member feedback has been failing silently. A true account-linked "your feedback shipped" loop needs a user_id-bearing feedback table with read-own RLS; the S335 chronicle strip is device-scoped (localStorage) for that reason.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [VERIFY] Confirm the four merged routes 301 at the apex from a real browser. /…
Final score: **91**
[S335][UX/P3] Confirm the four merged routes 301 at the apex from a real browser. /proof/, /feedback/, /feedback/insights/, /vault-wall/ now live in _redirects only. Scripted probes of the apex return 429 from the Worker's scanner block, so the S335 verification was against the tree (route court) and the Pages origin rules, not a live apex fetch. verify-provider-journey-style headed Playwright or the existing smoke-http.mjs with a real browser UA is the receipt.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 4. [PRODUCT] Confirm the founder-approved Season 1 defaults, then watch the first …
Final score: **90**
[S335][ENGAGE/P2] Confirm the founder-approved Season 1 defaults, then watch the first week. data/seasons.json declares "Season 1 — Ignition" (2026-09-02 → 2026-10-14, rewards in Vault Points only). Founder may veto name/dates/rewards at review. After a week: does season_xp move, does the weekly board fill, does the community #wall countdown render on mobile across all themes (CANON-053 receipt).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 5. [INTELLIGENCE] The mobile audit measures PRODUCTION by default, so it cannot see an …
Final score: **87**
[S334][MOBILE/P2] The mobile audit measures PRODUCTION by default, so it cannot see an undeployed change. playwright's baseURL defaults to https://vaultsparkstudios.com, and a local pass on a not-yet-deployed page is measuring the OLD live page. That is exactly how a P1 tap-target on the new pathway route reached CI: six local runs passed because they were probing the previous version. Set BASE_URL to a local preview when verifying an unshipped change, and add a route to the audit list only AFTER the deploy that ships it. Also run it at default concurrency — a --workers=4 pass raced on findings.jsonl and persisted 139 of 215 cells, which reads as missing matrix cells rather than lost writes.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 6. [PRODUCT] Alert when a provider advertises a model it cannot serve. GET /models…
Final score: **72**
[S333][OBS/P2] Alert when a provider advertises a model it cannot serve. GET /models listed the retired model as available, so no health check could distinguish "model exists" from "model is servable". A cheap periodic completion against each declared authoring model would have caught this before it stopped the newsroom.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 7. [PRODUCT] startup-revenue-agreement is red and the cause is upstream, not here.…
Final score: **69**
[S334][OBS/P1] startup-revenue-agreement is red and the cause is upstream, not here. The promoted v5 startup brief renders Revenue sig. 1d old (2026-08-30) while the shared resolver — the same one doctor uses — computes 2 days. Both clock paths inside revenue-freshness.mjs agree on 2 (studioCalendarDate() and the UTC default both return 2026-09-01), so the disagreement is in the v5 renderer's SIGNALS composition, which promotes over the v3 block that computed correctly. context/SIGNALS.md, the documented fallback, is 18 days stale and says not found, so a reader is keyed on an artifact its producer stopped writing. This is a studio-ops brief-renderer concern — ship repo-question or pattern-share cargo rather than editing the sibling repo. It surfaced only because the date rolled over mid-session; it will recur every session boundary until fixed.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 8. [INTELLIGENCE] Two audit items were disproved, not deferred
Final score: **69**
[S334][PERF/P3] Two audit items were disproved, not deferred — do not re-raise them without new measurement. The homepage's inline CSS is page-unique (7% overlap with the shared sheet) and its measured mobile LCP is ~900ms; the member dashboard measures FCP 860ms at 1,414 DOM nodes. A controlled A/B also confirmed S275's blocking-stylesheet decision (724ms vs 752ms median FCP), and the alarming 4,724ms /games/ reading was a cold-start artifact of the first page load in a fresh browser process. Any future perf work here starts from a warmed-browser measurement, not from document size.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

## Recommended Build Order

1. <!-- evidence-open: the files named are the churning OUTPUTS and the …
2. Every anonymous public read of vault_members was empty until S335
3. Post-push CI confirmation
4. <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are n…
5. Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs s…
6. Four new readable feeds are on probation
7. The Desk's binding constraint is now topic ACCEPTANCE, and it current…
8. Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-0…
9. news-trend-radar --scan failure is swallowed by || echo in the publis…
10. Fact extraction accepts advertising copy as a sourced fact. The 2026-…
11. Thread fellBackFrom into published story provenance. The inference la…
12. The Desk freshness banner disagrees with its own API by one day, and …

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
