# Genius Hit List — Session 338

Generated: 2026-09-02
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **79/100**
- Health: **yellow**
- Current SIL: **991/1000**
- CI health: **check gh run list**
- Current focus: Session 338 ran the arc under founder authorization for a direct push to main and a full production deploy, and its three findings were all gates that were not doing what their names promised. FIRST: the red uptime-probe cron was not the ordering race the board recorded. Reproduced locally, build-deploy-currency drifted between --probe and --check because observationFromReceipt() never restored the three content-clock fields added in S336 — the third time a field was added to the emitter and forgotten in the reader (after retainedForHours in S300 and historyComplete in S316). The consequence was far larger than a red cron: classify() reads contentLagHours, so every non-probe re-derive — npm run build:check, the content lane, every local build — collapsed it to null, which silently disabled the content ceiling S336 built specifically to catch a whole release stranded in production. Fixed, and the class closed with a fixed-point self-test that names no field (derive(read(derive(x))) === derive(x)) plus a companion case proving that guard can fail; 87/87, was 85. Notably an S300 test of exactly this shape already existed and stayed green throughout, because its fixtures omitted the dropped fields. SECOND: Lighthouse CI had been red for 15 consecutive runs across ~27 hours, so the site's performance gate had produced no verdict for over a day and nothing said so. /ranks/ was consolidated into /leaderboards/#ranks and answered by a _redirects 301, but three CI audit-target lists still named it — including the one auditing the LOCAL PREVIEW, which serves the built tree with no edge layer, so the redirect cannot apply and Lighthouse 404'd on a page that cannot exist there. /vaultsparked/ was in the same state. Both removed, and scripts/check-workflow-audit-targets.mjs added to build:check with two rules that name no route: no target may be a `from` in route-consolidation.json, and every local-preview target must resolve to a real page. THIRD: staging parity was a hand-maintained three-route sample and structurally could not see an absent route, which is why S337 could only record /how-we-build/ as an anecdote. It now compares the surface each origin advertises: production advertises 134 routes, staging 115, 23 missing on staging including /evidence/, /how-we-build/, three news editions and the whole .ai/ layer, with staging's build-sha reporting 94e78e93 built 2026-08-28 — five days behind production. Published as surfaceParity with gating:false and the reason stated on the artifact, because gating on a known-open blocker is a self-inflicted release outage. OUTCOME: closed out, pushed directly to main, and fully deployed to production. FOURTH, surfaced by converging the gate rather than by the audit: build-news-visual-receipts hashes each story's rendered page but ran four steps before build-shell-assets rewrote them, so it was stale by construction on every shell rotation and its own error message prescribed a hand-rebuild rather than the ordering fix; moved after every page rewriter and immediately before the seal, which also removes a confound from the standing build-to-build churn investigation. The visual and mobile proof receipts were then recaptured against the final tree: no UI changed, so CANON-053 was not triggered, but those receipts bind the candidate manifest sha rather than any appearance, and every reseal invalidates them.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Refresh staging, then flip surfaceParity.gating to true. S338 measure…
Final score: **96**
[S338][DEPLOY/P1] Refresh staging, then flip surfaceParity.gating to true. S338 measured it: staging is 23 advertised routes and five days behind production (94e78e93, 2026-08-28). The parity probe is built and reporting; it is deliberately non-gating because gating on a known-open blocker is a self-inflicted release outage. Find what deploys the Hetzner staging origin, why it stopped, and whether it is wired to any lane at all — then refresh, confirm surfaceParity.state reads matched, and set gating. Until then the release ceremony's browser matrix is measuring a tree that is five days older than the one being promoted, which inverts CANON-007. (D-S338.3)
Why it matters: Refresh staging, then flip surfaceParity.gating to true. S338 measured is open, local, and unblocked — can ship this session.

#### 2. [INTELLIGENCE] Two more receipts may be ordered before what they observe
Final score: **96**
[S338][BUILD/P2] Two more receipts may be ordered before what they observe — audit the whole postbuild chain for the D-S338.4 class. build-news-visual-receipts hashed news pages while running four steps before build-shell-assets rewrote them, so it was stale by construction on every shell rotation and had been quietly listed among the S335 "47 files churn between identical builds" set. Fixed by moving it after every page rewriter and immediately before the seal. Walk the rest of postbuild with the same question — *does this step hash or read rendered pages, and does anything after it rewrite them?* — and in particular re-check whether the remaining build-to-build churn ([S335][BUILD/P2]) is the same defect rather than a clock-relative selection window, which was the standing theory. A pinned-clock double build now has one fewer confound.
Why it matters: Two more receipts may be ordered before what they observe keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 3. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 4. [PRODUCT] The home portfolio cards render a doubled status label. Observed dire…
Final score: **90**
[S338][UX/P3] The home portfolio cards render a doubled status label. Observed directly in the S338 CANON-053 capture pass: each card shows a ● SPARKED pill and, beneath it, a second orange SPARKED that is clipped to a bare S on the smaller tiles. It appears identically in dark and light at 1366px and is therefore not an animation frame, and no SPARKED badge exists in the static markup of index.html (only one unrelated prose mention), so it is rendered client-side — start at whatever writes the card status pill. PRE-EXISTING, not introduced in S338, and deliberately not fixed there: changing UI would have invalidated every hash-bound receipt immediately before an authorized production deploy. Full description is on docs/visual-qa/LATEST.json.
Why it matters: The home portfolio cards render a doubled status label. Observed direc is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [INTELLIGENCE] Audit the other receipt round trips for the D-S338.1 class. build-dep…
Final score: **90**
[S338][OBS/P2] Audit the other receipt round trips for the D-S338.1 class. build-deploy-currency.mjs now proves derive(read(derive(x))) === derive(x) over a fully-populated observation. Every other generator with a committed-receipt reader has the same hazard and, in at least one case, the same false comfort: an S300 structural case already existed here and stayed green for two sessions because its fixtures omitted the fields that were actually dropped. Enumerate the generators that read their own output back (build-worker-route-history, build-release-proof, build-status-proof, build-citation, build-public-status are the candidates), and give each the fully-populated fixed-point case plus its can-fail companion. A fixed-point test is only as wide as its fixture's field coverage.
Why it matters: Audit the other receipt round trips for the D-S338.1 class. build-depl keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 2. [PRODUCT] <!-- evidence-open: the files named are the churning OUTPUTS and the …
Final score: **81**
<!-- evidence-open: the files named are the churning OUTPUTS and the suspect generators, not deliverables; the deliverable is a pinned-clock bisect and fix --> [S335][BUILD/P2] Two identical builds minutes apart still churn 47 files — commit-derived feeds are the source, not timestamps. With no commit between them, build 2 rewrote feed/forge-ledger.{json,xml} (206 lines), api/feedback-provenance.json (a whole theme dropped), api/ship-receipts.json, api/status-proof.json, api/news-visual-receipts.json and the changelog SSR block; a third build would churn again. All derive from api/commit-map.json / the git log through build-parallel-phase.mjs (which runs build-feedback-provenance + build-ship-receipts), so the working theory is a clock-relative selection window in that chain. Bisect: run build-forge-feed.mjs twice with a pinned --now (add the flag if absent) and diff; then the provenance pair. This is the receipt-cascade cost the S334 "vs-yas" item was really measuring. Fixed this session: _headers lagged one build because early-hints ran before the postbuild shell rotation — moved into postbuild after build-shell-assets.
Why it matters: <!-- evidence-open: the files named are the churning OUTPUTS and the s is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are n…
Final score: **75**
<!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are named as context; the deliverable is the Worker scheduled handler + KV drain, which do not exist yet --> [S335][COST/P2] Move the 30-minute uptime probe off GitHub Actions. uptime-probe.yml is 48 runs and 48 [skip ci] commits a day (71% of all scheduled runs) and is the churn that buried the forge ledger in S333. Design: a Worker scheduled() handler probes the same route list and writes samples to KV under uptime:<ts>; the Actions job runs once daily, drains KV into api/uptime.json + geo-vitals + staging parity, and commits once. probe-uptime.mjs must learn to consume KV samples instead of producing them; check-uptime-contract.mjs defines the sample cadence the public SLA promises — keep it. Not done in S335 because it rewrites a public trust surface's data path; the same-cron pair (linkcheck + member-seo) was merged into weekly-maintenance.yml instead.
Why it matters: <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are na was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [VERIFY] The release-ceremony receipt truncates a failure message at 500 chara…
Final score: **74**
[S337][OBS/P2] The release-ceremony receipt truncates a failure message at 500 characters, so a multi-violation failure names only its first file. The S337 blocking run recorded Received + 6 — six console errors — and api/staging-release-browser.json disclosed exactly one file before the message was cut. Diagnosing it needed the CI artifact downloaded and the test re-run locally; the receipt that exists to make a rejection legible could not. Either raise the cap or, better, record the DISTINCT violating files as a structured array alongside the prose message, so the receipt answers "what is violating" without a round trip.
Why it matters: The release-ceremony receipt truncates a failure message at 500 charac shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 5. [SECURITY] Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs s…
Final score: **69**
[S335][TOKEN/P2] Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs shards the handoff. It is the largest file any session can touch (~126K tokens raw). compact-handoff.mjs and rotate-ledger.mjs read the handoff archive, so the shard has to be introduced through those readers, not by moving files. Measure with context-meter.mjs before and after.
Why it matters: Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs sh lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

### LATER

#### 1. [PRODUCT] The Desk's binding constraint is now topic ACCEPTANCE, and it current…
Final score: **63**
[S333][NEWS/P0] The Desk's binding constraint is now topic ACCEPTANCE, and it currently queues nothing. Measured across four runs on 2026-08-31: 03:19 queued 3, 04:10 queued 2 (one became the published edition), the 06:44 scheduled run queued 0 of 177, and a local news-trend-radar.mjs --scan reproduces 0 queued / 176 rejected deterministically. Selection and the authoring model are both fixed and proven; the pipeline now starves upstream instead. Prediction to check first: today's edition ages to 1 day old on 2026-09-01, at which point build-news-freshness --check --require-daily fails again and the Desk returns to red — not from the defects fixed in S333, but from an empty queue. Investigate the rejection thresholds (corroboration count, recency window, published-slug dedupe from S329, vendor filter) and establish what acceptance rate a 4-slot daily cadence actually requires.
Why it matters: The Desk's binding constraint is now topic ACCEPTANCE, and it currentl is open, local, and unblocked — can ship this session.

#### 2. [SECURITY] Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-0…
Final score: **63**
[S333][NEWS/P1] Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-08-31 edition proves the pipeline works, but it was manually dispatched under observation. The cron itself has not gone green unattended since 2026-08-29. Check the 06:07 / 12:07 / 18:07 / 22:07 UTC slots; if they still drop while a dispatch succeeds, the difference is environmental (scheduler context, token scope, or queue freshness), not the selection or model logic this session fixed.
Why it matters: Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-08 lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 3. [PRODUCT] news-trend-radar --scan failure is swallowed by || echo in the publis…
Final score: **60**
[S333][OBS/P2] news-trend-radar --scan failure is swallowed by || echo in the publish workflow. Line 91 of news-publish.yml runs the scan with || echo "trend radar produced no new corroborated topics", so a genuine radar crash and a legitimate empty result are indistinguishable — the failure then resurfaces one step later as the misleading ✗ no topic queue. In S333 the scan had genuinely succeeded (2904 items → 177 topics → 0 queued), but that had to be confirmed by reading the log rather than by the run status. Report the scan verdict explicitly (items/topics/queued/rejected) as a step output so an empty queue states its own cause.
Why it matters: news-trend-radar --scan failure is swallowed by || echo in the publish is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [BRAND] The Trusted Types enforce blocker is LOAD ORDER, and it is measured. …
Final score: **96**
[S337][SEC/P1] The Trusted Types enforce blocker is LOAD ORDER, and it is measured. ambient-core.bundle.js installs the TT default policy that the site's ~167 legacy innerHTML sinks depend on, and its own comment says it "MUST load before any sink usage" — but ambient-core is not the first script on the page. Measured across 137 built pages in S337: 31 sink-bearing client assets load before it, led by pwa-nav.js (81 pages) and pwa-install.js (72). Report-Only hides this; enforcement throws. This is the concrete blocker the board has been recording as "stale soak evidence" — both are true, only this one names a defect. The repair hoists the policy installer ahead of every sink-bearing asset, which rewrites the head of every page and invalidates every hash-bound receipt at once, so it needs its own session and its own reseal budget, not a rider on a deploy. Re-measure with the scan in D-S337.3 before and after. (D-S337.3)
Why it matters: Changes public vocabulary or navigation — requires founder sign-off before user-visible copy changes.

#### 2. [VERIFY] Manual CANON-053 rendered-pixel review of the surfaces that only NOW …
Final score: **90**
[S336][VERIFY/P2] Manual CANON-053 rendered-pixel review of the surfaces that only NOW actually serve. S335 captured automated receipts for /community/#wall, /changelog/#requests, /evidence/#verify, /how-we-build/ and the member dashboard meter — but production was serving the pre-S335 build at the time, so those captures could not have been of the live pages. They serve as of S336. Capture across all seven themes at 1366px desktop and 390px mobile, inspect the images, and leave a hash-bound docs/visual-qa/LATEST.json. Verify with check-visual-qa.mjs --project . --changed.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [PRODUCT] portal-feedback.js writes columns the checked-in page_feedback migrat…
Final score: **90**
[S335][DATA/P2] portal-feedback.js writes columns the checked-in page_feedback migration does not define. The client inserts page_path/question/answer/session_id; the migration defines path/reaction/visit_depth_bucket/ua_kind/created_at with service-role-only SELECT and no user_id. Either the live table was altered in the dashboard (probe it with the pre-image shape in apply-supabase-migration.mjs) or member feedback has been failing silently. A true account-linked "your feedback shipped" loop needs a user_id-bearing feedback table with read-own RLS; the S335 chronicle strip is device-scoped (localStorage) for that reason.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 4. [INTELLIGENCE] Four public tables still render a silent zero
Final score: **87**
[S336][SEC/P1 · FOUNDER DECISION] Four public tables still render a silent zero — decide which member activity becomes publicly readable, then ship one migration. S336 completed the audit; the remaining step is a decision, not investigation. Verified against the migrations and probed live: challenge_submissions (no anon SELECT policy — only read_own + admin; read anonymously by /community/ and all seven /leaderboards/*; probe returns HTTP 200 count 0), game_sessions (no anon SELECT at all; /community/ and /), point_events (auth.uid() = user_id only — powers the referral leaderboard and the public profile's "Recent activity", which renders its empty state forever), member_achievements (auth.uid() = member_id only — public profile shows "No achievements unlocked yet." permanently; its policy also keys member_id while the client filters user_id). The vault_members(username,…) PostgREST embeds at leaderboards/index.html:822,868 resolve to null for anon, so fixing the four alone would render raw UUIDs. Proposed shape, generalizing S335's public_leaderboard: definer projection views (public_challenge_feed, public_game_activity, public_point_events, public_member_achievements), each honouring vault_members.public_profile, each with an explicit grant select … to anon, authenticated, then repoint the ~20 call sites. NOT applied in S336 because it decides what member activity is publicly visible — a privacy/product call reserved for the founder. Apply with scripts/apply-supabase-migration.mjs (pre-image + probe) once the columns are chosen. (D-S336.5)
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 5. [VERIFY] Re-run the Trusted Types KV soak, then decide the enforce flip on cur…
Final score: **84**
[S336][SEC/P1] Re-run the Trusted Types KV soak, then decide the enforce flip on current evidence. S336 fixed the receipt, not the blocker. build-tt-readiness.mjs computed no age at all — amber-soak held whenever a warm row existed, forever, while nextAction told the reader to wait for rows to age out that nothing aged — and it re-stamped generatedAt every build over a manifest generated 2026-07-07 against a declared 30-day window. It now ages rows for real, publishes manifestAgeDays/soakWindowDays/evidenceStale, and reports the new stale-evidence status, which keeps enforceEligible:false. That refusal is deliberate: all 17 warm rows would age out, so ageing alone would have manufactured enforce-candidate from a fossil. The remaining work is INPUT, not code — run scripts/analyze-tt-violations.mjs against live Workers KV to regenerate .cache/tt-active-local-sinks.json, then re-read the receipt. Only if it reaches enforce-candidate do you set TT_ENFORCE_ENABLED="1" in cloudflare/wrangler.toml, deploy, verify live headers on the apex (not pages.dev), and regenerate api/security-posture.json so "active" means enforced. Founder approval for the flip was given in S335 and still stands. (D-S336.4)
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

1. Refresh staging, then flip surfaceParity.gating to true. S338 measure…
2. Two more receipts may be ordered before what they observe
3. Post-push CI confirmation
4. The home portfolio cards render a doubled status label. Observed dire…
5. Audit the other receipt round trips for the D-S338.1 class. build-dep…
6. <!-- evidence-open: the files named are the churning OUTPUTS and the …
7. <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are n…
8. The release-ceremony receipt truncates a failure message at 500 chara…
9. Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs s…
10. The Desk's binding constraint is now topic ACCEPTANCE, and it current…
11. Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-0…
12. news-trend-radar --scan failure is swallowed by || echo in the publis…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
