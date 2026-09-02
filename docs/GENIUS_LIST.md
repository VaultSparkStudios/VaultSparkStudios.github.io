# Genius Hit List — Session 336

Generated: 2026-09-02
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **80/100**
- Health: **yellow**
- Current SIL: **987/1000**
- CI health: **check gh run list**
- Current focus: Session 336 set out to run the arc and deploy, and found the deploy path itself was broken: prune-served-surface had been REFUSING on /evidence/ (added S334) and /how-we-build/ (added S335) because neither page was ever added to the hand-maintained config/served-surface.json, so no deploy of any kind could succeed. The failure was self-planting — the content lane promotes sitemap.xml, so a new route becomes advertised in production on one deploy and only breaks the next one, which is why S334 and S335 both looked like they worked. The entire S335 release had been sitting unserved. Fixed the manifest, added a prune --check that runs the real manifest against the real tree in build:check (proven to fire on the restored regression), and promoted the content lane: /how-we-build/ now returns 200 and the deployed contentLaneHead contains the S335 commit. Then fixed the reason nothing alarmed — deploy-currency measured only deployed-commit-to-tip against a 48h ceiling, a clock hourly cron commits continuously reset, so 34 uptime crons and one stranded release read identically; it now ages a second clock from the oldest undeployed hand-authored commit, classified structurally against the served-surface manifest and evidence graph. Also made api/tt-readiness.json disclose the age of its evidence: it had been stamping a fresh generatedAt over a manifest from 2026-07-07 and holding amber-soak forever on rows nothing ever aged out.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Confirm the promotion stuck, and that the new content clock reads tru…
Final score: **100**
[S336][DEPLOY/P2] Confirm the promotion stuck, and that the new content clock reads true. deploy-currency should keep reporting content-current with undeployedContentCommits: 0. If it drifts back to behind with a rising contentLagHours, the content lane needs another dispatch — that is now the intended signal rather than a silent gap. Also confirm prune-served-surface --check stays green in CI, since it is newly wired into build:check.
Why it matters: Confirm the promotion stuck, and that the new content clock reads true shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Retire vault-wall/ from config/served-surface.json once a FULL produc…
Final score: **93**
[S336][DEPLOY/P3] Retire vault-wall/ from config/served-surface.json once a FULL production deploy has actually removed the page. The prefix was restored in S336 (D-S336.2) because the content lane cannot delete files or promote _redirects, so production still serves /vault-wall/ (probed 200) and the deployed sitemap still advertises it. At HEAD the prefix matches nothing and is inert. Remove it only after a confirm_production deploy retires the page and regenerates the sitemap — which is itself gated on the Obelisk identity hold.
Why it matters: Retire vault-wall/ from config/served-surface.json once a FULL product is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] <!-- evidence-open: the files named are the churning OUTPUTS and the …
Final score: **90**
<!-- evidence-open: the files named are the churning OUTPUTS and the suspect generators, not deliverables; the deliverable is a pinned-clock bisect and fix --> [S335][BUILD/P2] Two identical builds minutes apart still churn 47 files — commit-derived feeds are the source, not timestamps. With no commit between them, build 2 rewrote feed/forge-ledger.{json,xml} (206 lines), api/feedback-provenance.json (a whole theme dropped), api/ship-receipts.json, api/status-proof.json, api/news-visual-receipts.json and the changelog SSR block; a third build would churn again. All derive from api/commit-map.json / the git log through build-parallel-phase.mjs (which runs build-feedback-provenance + build-ship-receipts), so the working theory is a clock-relative selection window in that chain. Bisect: run build-forge-feed.mjs twice with a pinned --now (add the flag if absent) and diff; then the provenance pair. This is the receipt-cascade cost the S334 "vs-yas" item was really measuring. Fixed this session: _headers lagged one build because early-hints ran before the postbuild shell rotation — moved into postbuild after build-shell-assets.
Why it matters: <!-- evidence-open: the files named are the churning OUTPUTS and the s is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [VERIFY] <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are n…
Final score: **89**
<!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are named as context; the deliverable is the Worker scheduled handler + KV drain, which do not exist yet --> [S335][COST/P2] Move the 30-minute uptime probe off GitHub Actions. uptime-probe.yml is 48 runs and 48 [skip ci] commits a day (71% of all scheduled runs) and is the churn that buried the forge ledger in S333. Design: a Worker scheduled() handler probes the same route list and writes samples to KV under uptime:<ts>; the Actions job runs once daily, drains KV into api/uptime.json + geo-vitals + staging parity, and commits once. probe-uptime.mjs must learn to consume KV samples instead of producing them; check-uptime-contract.mjs defines the sample cadence the public SLA promises — keep it. Not done in S335 because it rewrites a public trust surface's data path; the same-cron pair (linkcheck + member-seo) was merged into weekly-maintenance.yml instead.
Why it matters: <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are na shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [SECURITY] Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs s…
Final score: **78**
[S335][TOKEN/P2] Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs shards the handoff. It is the largest file any session can touch (~126K tokens raw). compact-handoff.mjs and rotate-ledger.mjs read the handoff archive, so the shard has to be introduced through those readers, not by moving files. Measure with context-meter.mjs before and after.
Why it matters: Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs sh lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 3. [VERIFY] Four new readable feeds are on probation
Final score: **72**
[S333][NEWS/P2] Four new readable feeds are on probation — verify they earn their place. the-decoder, MarkTechPost, ZDNet AI and The Register AI/ML were added on measured reachability and freshness, and moved the queue 0 -> 1. Confirm over a week that they contribute topics that actually publish rather than only inflating item counts, and drop any that do not. sources reached went 12/15 -> 16/19, so three feeds are still failing and should be identified and either fixed or removed.
Why it matters: Four new readable feeds are on probation was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`

#### 4. [PRODUCT] The Desk's binding constraint is now topic ACCEPTANCE, and it current…
Final score: **72**
[S333][NEWS/P0] The Desk's binding constraint is now topic ACCEPTANCE, and it currently queues nothing. Measured across four runs on 2026-08-31: 03:19 queued 3, 04:10 queued 2 (one became the published edition), the 06:44 scheduled run queued 0 of 177, and a local news-trend-radar.mjs --scan reproduces 0 queued / 176 rejected deterministically. Selection and the authoring model are both fixed and proven; the pipeline now starves upstream instead. Prediction to check first: today's edition ages to 1 day old on 2026-09-01, at which point build-news-freshness --check --require-daily fails again and the Desk returns to red — not from the defects fixed in S333, but from an empty queue. Investigate the rejection thresholds (corroboration count, recency window, published-slug dedupe from S329, vendor filter) and establish what acceptance rate a 4-slot daily cadence actually requires.
Why it matters: The Desk's binding constraint is now topic ACCEPTANCE, and it currentl is open, local, and unblocked — can ship this session.

#### 5. [SECURITY] Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-0…
Final score: **72**
[S333][NEWS/P1] Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-08-31 edition proves the pipeline works, but it was manually dispatched under observation. The cron itself has not gone green unattended since 2026-08-29. Check the 06:07 / 12:07 / 18:07 / 22:07 UTC slots; if they still drop while a dispatch succeeds, the difference is environmental (scheduler context, token scope, or queue freshness), not the selection or model logic this session fixed.
Why it matters: Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-08 lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

### LATER

#### 1. [PRODUCT] news-trend-radar --scan failure is swallowed by || echo in the publis…
Final score: **69**
[S333][OBS/P2] news-trend-radar --scan failure is swallowed by || echo in the publish workflow. Line 91 of news-publish.yml runs the scan with || echo "trend radar produced no new corroborated topics", so a genuine radar crash and a legitimate empty result are indistinguishable — the failure then resurfaces one step later as the misleading ✗ no topic queue. In S333 the scan had genuinely succeeded (2904 items → 177 topics → 0 queued), but that had to be confirmed by reading the log rather than by the run status. Report the scan verdict explicitly (items/topics/queued/rejected) as a step output so an empty queue states its own cause.
Why it matters: news-trend-radar --scan failure is swallowed by || echo in the publish is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Fact extraction accepts advertising copy as a sourced fact. The 2026-…
Final score: **66**
[S334][NEWS/P2] Fact extraction accepts advertising copy as a sourced fact. The 2026-08-31 edition's first fact reads "Scott Gilbertson Top Shark Promo Codes for August 2026 Shark makes some seriously powerful vacuums..." sourced to the Wired article. factCandidates() scores for digits, proper nouns and reporting verbs and penalises marketing pronouns, but a syndicated promo block passes every filter. This is a public-surface truth issue, not a cosmetic one: it is rendered as a cited fact under a real publisher URL. Consider penalising sentences whose entities do not appear in the headline or topic title.
Why it matters: Fact extraction accepts advertising copy as a sourced fact. The 2026-0 is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Thread fellBackFrom into published story provenance. The inference la…
Final score: **63**
[S333][NEWS/P2] Thread fellBackFrom into published story provenance. The inference layer knows which model authored and returns it, but the run log only says "authored on attempt 1" and the published day artifact does not record the model. With the preferred model depooled, editions are almost certainly standby-authored — and "almost certainly" is not a receipt. Persist the authoring model per story so AI-disclosure surfaces state a fact rather than an assumption.
Why it matters: Thread fellBackFrom into published story provenance. The inference lay is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [VERIFY] Manual CANON-053 rendered-pixel review of the surfaces that only NOW …
Final score: **100**
[S336][VERIFY/P2] Manual CANON-053 rendered-pixel review of the surfaces that only NOW actually serve. S335 captured automated receipts for /community/#wall, /changelog/#requests, /evidence/#verify, /how-we-build/ and the member dashboard meter — but production was serving the pre-S335 build at the time, so those captures could not have been of the live pages. They serve as of S336. Capture across all seven themes at 1366px desktop and 390px mobile, inspect the images, and leave a hash-bound docs/visual-qa/LATEST.json. Verify with check-visual-qa.mjs --project . --changed.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 2. [VERIFY] Re-run the Trusted Types KV soak, then decide the enforce flip on cur…
Final score: **94**
[S336][SEC/P1] Re-run the Trusted Types KV soak, then decide the enforce flip on current evidence. S336 fixed the receipt, not the blocker. build-tt-readiness.mjs computed no age at all — amber-soak held whenever a warm row existed, forever, while nextAction told the reader to wait for rows to age out that nothing aged — and it re-stamped generatedAt every build over a manifest generated 2026-07-07 against a declared 30-day window. It now ages rows for real, publishes manifestAgeDays/soakWindowDays/evidenceStale, and reports the new stale-evidence status, which keeps enforceEligible:false. That refusal is deliberate: all 17 warm rows would age out, so ageing alone would have manufactured enforce-candidate from a fossil. The remaining work is INPUT, not code — run scripts/analyze-tt-violations.mjs against live Workers KV to regenerate .cache/tt-active-local-sinks.json, then re-read the receipt. Only if it reaches enforce-candidate do you set TT_ENFORCE_ENABLED="1" in cloudflare/wrangler.toml, deploy, verify live headers on the apex (not pages.dev), and regenerate api/security-posture.json so "active" means enforced. Founder approval for the flip was given in S335 and still stands. (D-S336.4)
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [PRODUCT] portal-feedback.js writes columns the checked-in page_feedback migrat…
Final score: **93**
[S335][DATA/P2] portal-feedback.js writes columns the checked-in page_feedback migration does not define. The client inserts page_path/question/answer/session_id; the migration defines path/reaction/visit_depth_bucket/ua_kind/created_at with service-role-only SELECT and no user_id. Either the live table was altered in the dashboard (probe it with the pre-image shape in apply-supabase-migration.mjs) or member feedback has been failing silently. A true account-linked "your feedback shipped" loop needs a user_id-bearing feedback table with read-own RLS; the S335 chronicle strip is device-scoped (localStorage) for that reason.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 4. [INTELLIGENCE] Four public tables still render a silent zero
Final score: **90**
[S336][SEC/P1 · FOUNDER DECISION] Four public tables still render a silent zero — decide which member activity becomes publicly readable, then ship one migration. S336 completed the audit; the remaining step is a decision, not investigation. Verified against the migrations and probed live: challenge_submissions (no anon SELECT policy — only read_own + admin; read anonymously by /community/ and all seven /leaderboards/*; probe returns HTTP 200 count 0), game_sessions (no anon SELECT at all; /community/ and /), point_events (auth.uid() = user_id only — powers the referral leaderboard and the public profile's "Recent activity", which renders its empty state forever), member_achievements (auth.uid() = member_id only — public profile shows "No achievements unlocked yet." permanently; its policy also keys member_id while the client filters user_id). The vault_members(username,…) PostgREST embeds at leaderboards/index.html:822,868 resolve to null for anon, so fixing the four alone would render raw UUIDs. Proposed shape, generalizing S335's public_leaderboard: definer projection views (public_challenge_feed, public_game_activity, public_point_events, public_member_achievements), each honouring vault_members.public_profile, each with an explicit grant select … to anon, authenticated, then repoint the ~20 call sites. NOT applied in S336 because it decides what member activity is publicly visible — a privacy/product call reserved for the founder. Apply with scripts/apply-supabase-migration.mjs (pre-image + probe) once the columns are chosen. (D-S336.5)
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 5. [PRODUCT] Confirm the founder-approved Season 1 defaults, then watch the first …
Final score: **84**
[S335][ENGAGE/P2] Confirm the founder-approved Season 1 defaults, then watch the first week. data/seasons.json declares "Season 1 — Ignition" (2026-09-02 → 2026-10-14, rewards in Vault Points only). Founder may veto name/dates/rewards at review. After a week: does season_xp move, does the weekly board fill, does the community #wall countdown render on mobile across all themes (CANON-053 receipt).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 6. [INTELLIGENCE] The mobile audit measures PRODUCTION by default, so it cannot see an …
Final score: **84**
[S334][MOBILE/P2] The mobile audit measures PRODUCTION by default, so it cannot see an undeployed change. playwright's baseURL defaults to https://vaultsparkstudios.com, and a local pass on a not-yet-deployed page is measuring the OLD live page. That is exactly how a P1 tap-target on the new pathway route reached CI: six local runs passed because they were probing the previous version. Set BASE_URL to a local preview when verifying an unshipped change, and add a route to the audit list only AFTER the deploy that ships it. Also run it at default concurrency — a --workers=4 pass raced on findings.jsonl and persisted 139 of 215 cells, which reads as missing matrix cells rather than lost writes.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 7. [PRODUCT] Alert when a provider advertises a model it cannot serve. GET /models…
Final score: **69**
[S333][OBS/P2] Alert when a provider advertises a model it cannot serve. GET /models listed the retired model as available, so no health check could distinguish "model exists" from "model is servable". A cheap periodic completion against each declared authoring model would have caught this before it stopped the newsroom.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 8. [PRODUCT] startup-revenue-agreement is red and the cause is upstream, not here.…
Final score: **66**
[S334][OBS/P1] startup-revenue-agreement is red and the cause is upstream, not here. The promoted v5 startup brief renders Revenue sig. 1d old (2026-08-30) while the shared resolver — the same one doctor uses — computes 2 days. Both clock paths inside revenue-freshness.mjs agree on 2 (studioCalendarDate() and the UTC default both return 2026-09-01), so the disagreement is in the v5 renderer's SIGNALS composition, which promotes over the v3 block that computed correctly. context/SIGNALS.md, the documented fallback, is 18 days stale and says not found, so a reader is keyed on an artifact its producer stopped writing. This is a studio-ops brief-renderer concern — ship repo-question or pattern-share cargo rather than editing the sibling repo. It surfaced only because the date rolled over mid-session; it will recur every session boundary until fixed.
Why it matters: Owned by another repo or already moved through Ark cargo.

## Recommended Build Order

1. Confirm the promotion stuck, and that the new content clock reads tru…
2. Post-push CI confirmation
3. Retire vault-wall/ from config/served-surface.json once a FULL produc…
4. <!-- evidence-open: the files named are the churning OUTPUTS and the …
5. <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are n…
6. Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs s…
7. Four new readable feeds are on probation
8. The Desk's binding constraint is now topic ACCEPTANCE, and it current…
9. Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-0…
10. news-trend-radar --scan failure is swallowed by || echo in the publis…
11. Fact extraction accepts advertising copy as a sourced fact. The 2026-…
12. Thread fellBackFrom into published story provenance. The inference la…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
