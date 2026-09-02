# Genius Hit List — Session 337

Generated: 2026-09-02
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **79/100**
- Health: **yellow**
- Current SIL: **991/1000**
- CI health: **check gh run list**
- Current focus: Session 337 ran the arc under founder authorization for a full production deploy and found, first, that the deploy had never been identity-blocked: check-promotion-scope returns promotable=true scoped-disjoint and the gate returns allowed=true mode=scoped, and has since S319 — three surfaces had been asserting a blocker the gate itself disagreed with. The dispatched deploy then failed the release ceremony 9/10 on staging-browser-receipt with reason flaky-1, and the cause was ours but not the site's: tests/staging-release.spec.js classifies Trusted Types Report-Only console notices as observations by design, but recognised only Chromium's phrasing. Firefox words the same notice completely differently, so every Firefox report-only notice became a hard console error; the sinks render asynchronously, so it fired on some runs and not others, which Playwright calls flaky, and a flaky result rejects the ceremony. Fixed conjunctively — a report-only marker AND a Trusted Types marker — so an ENFORCED violation still fails loudly, extracted to a shared module, and pinned by a regression spec carrying each engine's verbatim string; proven by 6/6 staging release tests passing locally on all three engines with zero flake. While there, measured the real enforce blocker across 137 built pages: 31 sink-bearing client assets load BEFORE ambient-core installs the Trusted Types default policy they depend on, led by pwa-nav.js on 81 pages and pwa-install.js on 72. Recorded with its numbers and deliberately not fixed — the repair rewrites every page head and invalidates every hash-bound receipt at once. Also closed two Desk truth defects: fact extraction scored register but never subject, so a syndicated promo block published as a sourced fact under a real publisher URL; and no published story recorded which model wrote it while the preferred model is depooled.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] The uptime-probe cron is RED and fails on a race with itself. Two con…
Final score: **96**
[S337][OBS/P1] The uptime-probe cron is RED and fails on a race with itself. Two consecutive scheduled failures as of 2026-09-02 (runs 33593653589 05:10:50Z and 33595469317 05:38:09Z; the 04:39 and 04:15 runs were green), so check-scheduled-workflow-staleness reports a dead cron. The job succeeds at everything and then dies on its last step: it runs build-deploy-currency early — logging content-current · 3 commit(s) behind and deploy-currency observation changed — commit-worthy — then runs the seal chain (candidate manifest → release-proof → status-proof → citation), and then runs build-deploy-currency --check, which reports receipt drifted; run --probe for live evidence or without --check to rebind. A publisher that rebinds a derived artifact and then byte-checks it *after* moving the inputs it binds will fail whenever the observation is commit-worthy — which is exactly when the run matters. This is the uptime publisher, so a public trust surface's writer is currently failing on its own ordering; the deploy-currency numbers it publishes are the ones the deploy alarm reads. Fix by ordering the --check before the seal chain, or by rebinding once after it — not by dropping the check. Not caused by S337's changes, which were unpushed at both failure timestamps.
Why it matters: The uptime-probe cron is RED and fails on a race with itself. Two cons is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Staging is behind production and nothing said so. Probed in S337: htt…
Final score: **90**
[S337][DEPLOY/P2] Staging is behind production and nothing said so. Probed in S337: https://website.staging.vaultsparkstudios.com/how-we-build/ returns 404 while the apex returns 200. CANON-007 makes staging the thing production is verified against, so a staging origin quietly older than production inverts the gate — the release ceremony's browser matrix is measuring a tree that no longer matches what is being promoted. Establish what refreshes staging, whether it is on the content lane at all, and add a parity probe that fails when a route serving in production is absent from staging.
Why it matters: Staging is behind production and nothing said so. Probed in S337: http is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Retire vault-wall/ from config/served-surface.json once a FULL produc…
Final score: **87**
[S336][DEPLOY/P3] Retire vault-wall/ from config/served-surface.json once a FULL production deploy has actually removed the page. The prefix was restored in S336 (D-S336.2) because the content lane cannot delete files or promote _redirects, so production still serves /vault-wall/ (probed 200) and the deployed sitemap still advertises it. At HEAD the prefix matches nothing and is inert. Remove it only after a confirm_production deploy retires the page and regenerates the sitemap — which S337 proved is NOT gated on the Obelisk identity hold — the S319 scoped path returns allowed=true; mode=scoped today (D-S337.1). The remaining dependency is simply a confirm_production run that completes the release ceremony.
Why it matters: Retire vault-wall/ from config/served-surface.json once a FULL product is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [VERIFY] The release-ceremony receipt truncates a failure message at 500 chara…
Final score: **85**
[S337][OBS/P2] The release-ceremony receipt truncates a failure message at 500 characters, so a multi-violation failure names only its first file. The S337 blocking run recorded Received + 6 — six console errors — and api/staging-release-browser.json disclosed exactly one file before the message was cut. Diagnosing it needed the CI artifact downloaded and the test re-run locally; the receipt that exists to make a rejection legible could not. Either raise the cap or, better, record the DISTINCT violating files as a structured array alongside the prose message, so the receipt answers "what is violating" without a round trip.
Why it matters: The release-ceremony receipt truncates a failure message at 500 charac shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [PRODUCT] <!-- evidence-open: the files named are the churning OUTPUTS and the …
Final score: **84**
<!-- evidence-open: the files named are the churning OUTPUTS and the suspect generators, not deliverables; the deliverable is a pinned-clock bisect and fix --> [S335][BUILD/P2] Two identical builds minutes apart still churn 47 files — commit-derived feeds are the source, not timestamps. With no commit between them, build 2 rewrote feed/forge-ledger.{json,xml} (206 lines), api/feedback-provenance.json (a whole theme dropped), api/ship-receipts.json, api/status-proof.json, api/news-visual-receipts.json and the changelog SSR block; a third build would churn again. All derive from api/commit-map.json / the git log through build-parallel-phase.mjs (which runs build-feedback-provenance + build-ship-receipts), so the working theory is a clock-relative selection window in that chain. Bisect: run build-forge-feed.mjs twice with a pinned --now (add the flag if absent) and diff; then the provenance pair. This is the receipt-cascade cost the S334 "vs-yas" item was really measuring. Fixed this session: _headers lagged one build because early-hints ran before the postbuild shell rotation — moved into postbuild after build-shell-assets.
Why it matters: <!-- evidence-open: the files named are the churning OUTPUTS and the s is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are n…
Final score: **78**
<!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are named as context; the deliverable is the Worker scheduled handler + KV drain, which do not exist yet --> [S335][COST/P2] Move the 30-minute uptime probe off GitHub Actions. uptime-probe.yml is 48 runs and 48 [skip ci] commits a day (71% of all scheduled runs) and is the churn that buried the forge ledger in S333. Design: a Worker scheduled() handler probes the same route list and writes samples to KV under uptime:<ts>; the Actions job runs once daily, drains KV into api/uptime.json + geo-vitals + staging parity, and commits once. probe-uptime.mjs must learn to consume KV samples instead of producing them; check-uptime-contract.mjs defines the sample cadence the public SLA promises — keep it. Not done in S335 because it rewrites a public trust surface's data path; the same-cron pair (linkcheck + member-seo) was merged into weekly-maintenance.yml instead.
Why it matters: <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are na was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [SECURITY] Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs s…
Final score: **72**
[S335][TOKEN/P2] Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs shards the handoff. It is the largest file any session can touch (~126K tokens raw). compact-handoff.mjs and rotate-ledger.mjs read the handoff archive, so the shard has to be introduced through those readers, not by moving files. Measure with context-meter.mjs before and after.
Why it matters: Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs sh lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 5. [PRODUCT] The Desk's binding constraint is now topic ACCEPTANCE, and it current…
Final score: **66**
[S333][NEWS/P0] The Desk's binding constraint is now topic ACCEPTANCE, and it currently queues nothing. Measured across four runs on 2026-08-31: 03:19 queued 3, 04:10 queued 2 (one became the published edition), the 06:44 scheduled run queued 0 of 177, and a local news-trend-radar.mjs --scan reproduces 0 queued / 176 rejected deterministically. Selection and the authoring model are both fixed and proven; the pipeline now starves upstream instead. Prediction to check first: today's edition ages to 1 day old on 2026-09-01, at which point build-news-freshness --check --require-daily fails again and the Desk returns to red — not from the defects fixed in S333, but from an empty queue. Investigate the rejection thresholds (corroboration count, recency window, published-slug dedupe from S329, vendor filter) and establish what acceptance rate a 4-slot daily cadence actually requires.
Why it matters: The Desk's binding constraint is now topic ACCEPTANCE, and it currentl is open, local, and unblocked — can ship this session.

### LATER

#### 1. [SECURITY] Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-0…
Final score: **66**
[S333][NEWS/P1] Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-08-31 edition proves the pipeline works, but it was manually dispatched under observation. The cron itself has not gone green unattended since 2026-08-29. Check the 06:07 / 12:07 / 18:07 / 22:07 UTC slots; if they still drop while a dispatch succeeds, the difference is environmental (scheduler context, token scope, or queue freshness), not the selection or model logic this session fixed.
Why it matters: Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-08 lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 2. [PRODUCT] news-trend-radar --scan failure is swallowed by || echo in the publis…
Final score: **63**
[S333][OBS/P2] news-trend-radar --scan failure is swallowed by || echo in the publish workflow. Line 91 of news-publish.yml runs the scan with || echo "trend radar produced no new corroborated topics", so a genuine radar crash and a legitimate empty result are indistinguishable — the failure then resurfaces one step later as the misleading ✗ no topic queue. In S333 the scan had genuinely succeeded (2904 items → 177 topics → 0 queued), but that had to be confirmed by reading the log rather than by the run status. Report the scan verdict explicitly (items/topics/queued/rejected) as a step output so an empty queue states its own cause.
Why it matters: news-trend-radar --scan failure is swallowed by || echo in the publish is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Fact extraction accepts advertising copy as a sourced fact. The 2026-…
Final score: **60**
[S334][NEWS/P2] Fact extraction accepts advertising copy as a sourced fact. The 2026-08-31 edition's first fact reads "Scott Gilbertson Top Shark Promo Codes for August 2026 Shark makes some seriously powerful vacuums..." sourced to the Wired article. factCandidates() scores for digits, proper nouns and reporting verbs and penalises marketing pronouns, but a syndicated promo block passes every filter. This is a public-surface truth issue, not a cosmetic one: it is rendered as a cited fact under a real publisher URL. Consider penalising sentences whose entities do not appear in the headline or topic title.
Why it matters: Fact extraction accepts advertising copy as a sourced fact. The 2026-0 is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [BRAND] The Trusted Types enforce blocker is LOAD ORDER, and it is measured. …
Final score: **96**
[S337][SEC/P1] The Trusted Types enforce blocker is LOAD ORDER, and it is measured. ambient-core.bundle.js installs the TT default policy that the site's ~167 legacy innerHTML sinks depend on, and its own comment says it "MUST load before any sink usage" — but ambient-core is not the first script on the page. Measured across 137 built pages in S337: 31 sink-bearing client assets load before it, led by pwa-nav.js (81 pages) and pwa-install.js (72). Report-Only hides this; enforcement throws. This is the concrete blocker the board has been recording as "stale soak evidence" — both are true, only this one names a defect. The repair hoists the policy installer ahead of every sink-bearing asset, which rewrites the head of every page and invalidates every hash-bound receipt at once, so it needs its own session and its own reseal budget, not a rider on a deploy. Re-measure with the scan in D-S337.3 before and after. (D-S337.3)
Why it matters: Changes public vocabulary or navigation — requires founder sign-off before user-visible copy changes.

#### 2. [VERIFY] Manual CANON-053 rendered-pixel review of the surfaces that only NOW …
Final score: **95**
[S336][VERIFY/P2] Manual CANON-053 rendered-pixel review of the surfaces that only NOW actually serve. S335 captured automated receipts for /community/#wall, /changelog/#requests, /evidence/#verify, /how-we-build/ and the member dashboard meter — but production was serving the pre-S335 build at the time, so those captures could not have been of the live pages. They serve as of S336. Capture across all seven themes at 1366px desktop and 390px mobile, inspect the images, and leave a hash-bound docs/visual-qa/LATEST.json. Verify with check-visual-qa.mjs --project . --changed.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [PRODUCT] portal-feedback.js writes columns the checked-in page_feedback migrat…
Final score: **90**
[S335][DATA/P2] portal-feedback.js writes columns the checked-in page_feedback migration does not define. The client inserts page_path/question/answer/session_id; the migration defines path/reaction/visit_depth_bucket/ua_kind/created_at with service-role-only SELECT and no user_id. Either the live table was altered in the dashboard (probe it with the pre-image shape in apply-supabase-migration.mjs) or member feedback has been failing silently. A true account-linked "your feedback shipped" loop needs a user_id-bearing feedback table with read-own RLS; the S335 chronicle strip is device-scoped (localStorage) for that reason.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 4. [VERIFY] Re-run the Trusted Types KV soak, then decide the enforce flip on cur…
Final score: **89**
[S336][SEC/P1] Re-run the Trusted Types KV soak, then decide the enforce flip on current evidence. S336 fixed the receipt, not the blocker. build-tt-readiness.mjs computed no age at all — amber-soak held whenever a warm row existed, forever, while nextAction told the reader to wait for rows to age out that nothing aged — and it re-stamped generatedAt every build over a manifest generated 2026-07-07 against a declared 30-day window. It now ages rows for real, publishes manifestAgeDays/soakWindowDays/evidenceStale, and reports the new stale-evidence status, which keeps enforceEligible:false. That refusal is deliberate: all 17 warm rows would age out, so ageing alone would have manufactured enforce-candidate from a fossil. The remaining work is INPUT, not code — run scripts/analyze-tt-violations.mjs against live Workers KV to regenerate .cache/tt-active-local-sinks.json, then re-read the receipt. Only if it reaches enforce-candidate do you set TT_ENFORCE_ENABLED="1" in cloudflare/wrangler.toml, deploy, verify live headers on the apex (not pages.dev), and regenerate api/security-posture.json so "active" means enforced. Founder approval for the flip was given in S335 and still stands. (D-S336.4)
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 5. [INTELLIGENCE] Four public tables still render a silent zero
Final score: **87**
[S336][SEC/P1 · FOUNDER DECISION] Four public tables still render a silent zero — decide which member activity becomes publicly readable, then ship one migration. S336 completed the audit; the remaining step is a decision, not investigation. Verified against the migrations and probed live: challenge_submissions (no anon SELECT policy — only read_own + admin; read anonymously by /community/ and all seven /leaderboards/*; probe returns HTTP 200 count 0), game_sessions (no anon SELECT at all; /community/ and /), point_events (auth.uid() = user_id only — powers the referral leaderboard and the public profile's "Recent activity", which renders its empty state forever), member_achievements (auth.uid() = member_id only — public profile shows "No achievements unlocked yet." permanently; its policy also keys member_id while the client filters user_id). The vault_members(username,…) PostgREST embeds at leaderboards/index.html:822,868 resolve to null for anon, so fixing the four alone would render raw UUIDs. Proposed shape, generalizing S335's public_leaderboard: definer projection views (public_challenge_feed, public_game_activity, public_point_events, public_member_achievements), each honouring vault_members.public_profile, each with an explicit grant select … to anon, authenticated, then repoint the ~20 call sites. NOT applied in S336 because it decides what member activity is publicly visible — a privacy/product call reserved for the founder. Apply with scripts/apply-supabase-migration.mjs (pre-image + probe) once the columns are chosen. (D-S336.5)
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 6. [PRODUCT] Confirm the founder-approved Season 1 defaults, then watch the first …
Final score: **81**
[S335][ENGAGE/P2] Confirm the founder-approved Season 1 defaults, then watch the first week. data/seasons.json declares "Season 1 — Ignition" (2026-09-02 → 2026-10-14, rewards in Vault Points only). Founder may veto name/dates/rewards at review. After a week: does season_xp move, does the weekly board fill, does the community #wall countdown render on mobile across all themes (CANON-053 receipt).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [INTELLIGENCE] The mobile audit measures PRODUCTION by default, so it cannot see an …
Final score: **81**
[S334][MOBILE/P2] The mobile audit measures PRODUCTION by default, so it cannot see an undeployed change. playwright's baseURL defaults to https://vaultsparkstudios.com, and a local pass on a not-yet-deployed page is measuring the OLD live page. That is exactly how a P1 tap-target on the new pathway route reached CI: six local runs passed because they were probing the previous version. Set BASE_URL to a local preview when verifying an unshipped change, and add a route to the audit list only AFTER the deploy that ships it. Also run it at default concurrency — a --workers=4 pass raced on findings.jsonl and persisted 139 of 215 cells, which reads as missing matrix cells rather than lost writes.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 8. [PRODUCT] Alert when a provider advertises a model it cannot serve. GET /models…
Final score: **66**
[S333][OBS/P2] Alert when a provider advertises a model it cannot serve. GET /models listed the retired model as available, so no health check could distinguish "model exists" from "model is servable". A cheap periodic completion against each declared authoring model would have caught this before it stopped the newsroom.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

## Recommended Build Order

1. The uptime-probe cron is RED and fails on a race with itself. Two con…
2. Post-push CI confirmation
3. Staging is behind production and nothing said so. Probed in S337: htt…
4. Retire vault-wall/ from config/served-surface.json once a FULL produc…
5. The release-ceremony receipt truncates a failure message at 500 chara…
6. <!-- evidence-open: the files named are the churning OUTPUTS and the …
7. <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are n…
8. Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs s…
9. The Desk's binding constraint is now topic ACCEPTANCE, and it current…
10. Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-0…
11. news-trend-radar --scan failure is swallowed by || echo in the publis…
12. Fact extraction accepts advertising copy as a sourced fact. The 2026-…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
