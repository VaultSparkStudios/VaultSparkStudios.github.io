# Genius Hit List — Session 342

Generated: 2026-09-04
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **78/100**
- Health: **yellow**
- Current SIL: **977/1000**
- CI health: **check gh run list**
- Current focus: S342 answered the founder's challenge that Obelisk should already be complete -- and the founder was right. I had answered from api/identity-migration-receipt.json, generated 2026-08-26 and eight days stale, and named a cross-repo registration as the last step. Re-probing took minutes and found four of five listed blockers already satisfied: the relying party is ACTIVE in the Obelisk registry with passport v2 and BOTH callbacks registered including website.staging; /login redirects to obeliskgate.com/auth/authorize with correct PKCE S256, client_id, state and nonce; the revocation endpoint is live in OIDC discovery; recordJourney is wired at all three legs of the deployed Worker; and OBELISK_RP_ID/RP_NAME/RP_ORIGIN are consumed by ZERO files here, so their MISSING status blocks nothing. FIRST substantive fix: a public trust surface had published a phantom blocker for months -- api/release-dependencies.json read obelisk-staging-registration:missing and state:rejected because deriveDependency returns missing when it cannot find the request CARGO, and that cargo aged out of the 168-hour Ark window. All four of the contract's requestedChecks are directly observable at the IdP, so --probe observes them: each registered redirect_uri accepted AND an unregistered control redirect denied, which is the half that makes acceptance mean anything. Fails closed five ways -- unreachable, refuted, absent, stale past a 14-day clock, partial coverage -- 27/27 with each direction pinned, and --probe stays out of the default build so a byte-checked artifact cannot drift with the network. SECOND: the identity hold was preserved deliberately. releaseState stays hold, both real-provider-e2e-pending blockers remain, and auth/**, surface:identity and worker:identity stay held; only the two false entries cleared. THIRD: the task board's chronic budget ceiling got a real fix rather than a fourth shave -- 79 pre-S200 resolved rows moved verbatim into the archive the tooling already maintains, taking headroom from 4 tokens to 5,916, after confirming why the gate's named repair is a no-op here. FOURTH, and the session's real story: I sent the founder into the --live verifier twice, an automated browser that structurally could not reach a Chrome-held passkey, while --watch sat one line away in a usage block I had already read; two runs expired writing nothing and roughly forty minutes of founder time went to avoidable misdirection. Obelisk is NOT complete: the provider journey remains unobserved and requires a human at a passkey. POST-CLOSEOUT REVIEW PASS: found origin/main red from a [skip ci] Desk edition that committed five art files with no LQIP placeholders (build-lqip-map --check 1 -> 0 after the fix), then closed three of the four S342 items rather than carrying them. The cascade gate that should have caught the red now does -- and the first attempt at that fix was DECORATIVE, because the gate filters node.publishCascade === true and the new evidence-graph node lacked the flag; the negative control caught it before it shipped, and the corrected edge immediately found a second publisher with the same gap. Also fixed the latent demotion bug (a reopened Ark conversation could downgrade a live-verified dependency) plus a future-dated-probe hole found while writing its regression tests, and gave the 14-day probe clock a weekly re-probe cadence. Retracted a fifth wrong claim of mine: the identity migration receipt was never stale -- it carries generatedAt: evidence.updatedAt by construction, so a rebuild cannot advance it. The identity hold is untouched and the ceremony remains the only open S342 item.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] The silent cron verdict is fixture-proven only. check-scheduled-workf…
Final score: **96**
[S341][OBS/P3] The silent cron verdict is fixture-proven only. check-scheduled-workflow-staleness gained a verdict for a cron that is not failing because it is not *running*, proven only by fixtures — no live cron is currently silent. Right today, untested tomorrow. Pin it against a real disabled workflow, or record it as fixture-proven.
Why it matters: The silent cron verdict is fixture-proven only. check-scheduled-workfl is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [VERIFY] resync-derived.mjs does not cover every --checked derived artifact, a…
Final score: **90**
[S340][BUILD/P2] resync-derived.mjs does not cover every --checked derived artifact, and the gap only shows up after a rebase. Found live during the S340 closeout push. Four scheduled-publisher races forced four rebases; each was resolved by taking one side and regenerating through resync-derived, which rebuilt up to 20 artifacts and reported clean. api/intelligence-budget.json is not in its set, so it stayed at the conflict-resolved value and build-intelligence-budget --check failed in CI at build:check step 185 — the compliance job of run 33702593208 — while every local coherence check I ran after the rebase passed. Reproduced locally on the pushed tip, fixed by hand. This is the cascade-width class: a resync is only as wide as its graph, and a rebase is exactly the situation where the uncovered artifact keeps a stale value rather than a regenerated one. Fix: derive resync-derived's set from the artifacts build:check actually --checks (or make check-publish-cascade-coverage assert the two sets match) so an artifact cannot be gated without being resyncable. Verify by rebasing onto a publisher commit, running only resync-derived, and confirming build:check is green with no hand-run. S341 confirmed it again and found a SECOND member. Enumerating all 61 build-*.mjs --check invocations in build:check against the graph: resync-derived --changed <all changed> rebuilt and verified 17 artifacts and reported clean, while build-nervous-system AND build-intelligence-budget were both stale and both absent from its graph. Two hand-rebuilds fixed them. The one-line reproduction of this gap is that enumeration -- run the 61 --checks and diff the failures against the graph's node set.
Why it matters: resync-derived.mjs does not cover every --checked derived artifact, an was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [VERIFY] <!-- evidence-open: config/intelligence-suite.json and journal/index.…
Final score: **87**
<!-- evidence-open: config/intelligence-suite.json and journal/index.html are the config to EDIT and the page to VERIFY AGAINST, not deliverables; the deliverable is the route registered in that config and the instrument showing the writer pair gone --> [S340][BUILD/P1] Register /evidence/ in config/intelligence-suite.json and end the nav tug-of-war. propagate-nav.mjs (postbuild #5) strips the /evidence/ link from the nav AND footer of 125 pages on every build, and generate-evidence-hub.mjs (#13) puts it back. Reproduced directly: journal/index.html has the link, drops to 0 after propagate-nav, returns to 2 after generate-evidence-hub --apply. Net-zero across a full chain, so git status is clean and no surface-vs-surface gate can see it. Root cause: /evidence/ (S334) was never added to the canonical nav source, so the nav is rebuilt without it and a downstream script bolts it back on -- and that script's own comment refuses to gate its re-linking on "the page changed" because that would leave the hub "permanently unlinked on a settled tree", which is a repair built around a remover nobody went looking for. Deferred from S340 only because intelligence-suite.json is read by the nav, the footer, the Studio Pulse tiles, the sitemap expectations and the intelligence-suite builder, and that blast radius does not belong in a deploy session. Verify the fix by re-running check-postbuild-ordering --instrument and watching the pair disappear, then confirm generate-evidence-hub reports 0 pages linked -- it should become defence in depth, not a repair. (D-S340.5)
Why it matters: <!-- evidence-open: config/intelligence-suite.json and journal/index.h was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`

### NEXT

#### 1. [PRODUCT] Make the game covers art-only; the tile owns all text. The direction …
Final score: **87**
[S340][UX/P2] Make the game covers art-only; the tile owns all text. The direction is DECIDED (D-S340.7), so this is execution, not another design round. build-game-covers.mjs rasterizes the genre eyebrow and the game title into every cover while .hero-tile renders its own __kicker and __name over them. D-S339.6 already established the governing principle by removing the baked status word: text baked into an image goes stale against the feed that owns it, and the kicker and title are feed-derived from the same catalog. So the covers lose their text rather than the tiles losing their chrome -- the alternative re-introduces exactly what S339 removed. Deferred from S340 because regenerating every cover is binary churn that invalidates every cover-bound receipt and rotates the home page's LCP asset, which does not belong in a session that must also land a production deploy. Budget a reseal and a CANON-053 capture pass at both tile sizes and both themes. Supersedes [S339][UX/P3].
Why it matters: Make the game covers art-only; the tile owns all text. The direction i is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] check-postbuild-ordering --check reports unmeasured in CI and always …
Final score: **81**
[S340][OBS/P3] check-postbuild-ordering --check reports unmeasured in CI and always will. Only --self-test is wired into build:check; the --check half needs a trace, and no CI job runs --instrument. That is deliberate for now -- the instrument runs the whole postbuild chain, so wiring it into every build doubles the build -- but a gate that can only ever report unmeasured in CI is one step from a gate that has never run. Decide: either run --instrument on a weekly cron and commit the receipt, or fold the tracing into the real postbuild so every build produces its own evidence for free. The second is better if the preload cost is negligible; measure it before choosing.
Why it matters: check-postbuild-ordering --check reports unmeasured in CI and always w was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [PRODUCT] The cover artwork still duplicates the tile's KICKER and TITLE, the s…
Final score: **81**
[S339][UX/P3] The cover artwork still duplicates the tile's KICKER and TITLE, the same way it used to duplicate the status. D-S339.6 removed the baked status word, which was the reported defect and the only one that could go stale against a feed. But build-game-covers.mjs still rasterizes the genre eyebrow and the game title into every cover, and .hero-tile renders its own __kicker and __name over them — so "ACTION COMEDY SHOOTER / Call of Doodie" appears in the artwork behind "Action Comedy / Call of Doodie" in live text. It reads as a deliberate layered lockup at featured size and as a smudge at tile size, which is why it is P3 and not P1. Decide it as a design question with rendered captures at both sizes: either the cover goes art-only and the tile owns all text, or the tile drops its own chrome on covered tiles. Do not split the difference per-breakpoint.
Why it matters: The cover artwork still duplicates the tile's KICKER and TITLE, the sa is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] <!-- evidence-open: the files named are the churning OUTPUTS and the …
Final score: **75**
<!-- evidence-open: the files named are the churning OUTPUTS and the suspect generators, not deliverables; the deliverable is a pinned-clock bisect and fix --> [S335][BUILD/P2] Two identical builds minutes apart still churn 47 files — commit-derived feeds are the source, not timestamps. With no commit between them, build 2 rewrote feed/forge-ledger.{json,xml} (206 lines), api/feedback-provenance.json (a whole theme dropped), api/ship-receipts.json, api/status-proof.json, api/news-visual-receipts.json and the changelog SSR block; a third build would churn again. All derive from api/commit-map.json / the git log through build-parallel-phase.mjs (which runs build-feedback-provenance + build-ship-receipts), so the working theory is a clock-relative selection window in that chain. Bisect: run build-forge-feed.mjs twice with a pinned --now (add the flag if absent) and diff; then the provenance pair. This is the receipt-cascade cost the S334 "vs-yas" item was really measuring. Fixed this session: _headers lagged one build because early-hints ran before the postbuild shell rotation — moved into postbuild after build-shell-assets.
Why it matters: <!-- evidence-open: the files named are the churning OUTPUTS and the s is open, local, and unblocked — can ship this session.

#### 5. [SECURITY] Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs s…
Final score: **63**
[S335][TOKEN/P2] Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs shards the handoff. It is the largest file any session can touch (~126K tokens raw). compact-handoff.mjs and rotate-ledger.mjs read the handoff archive, so the shard has to be introduced through those readers, not by moving files. Measure with context-meter.mjs before and after.
Why it matters: Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs sh lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

### LATER

#### 1. [VERIFY] <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are n…
Final score: **62**
<!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are named as context; the deliverable is the Worker scheduled handler + KV drain, which do not exist yet --> [S335][COST/P2] Move the 30-minute uptime probe off GitHub Actions. uptime-probe.yml is 48 runs and 48 [skip ci] commits a day (71% of all scheduled runs) and is the churn that buried the forge ledger in S333. Design: a Worker scheduled() handler probes the same route list and writes samples to KV under uptime:<ts>; the Actions job runs once daily, drains KV into api/uptime.json + geo-vitals + staging parity, and commits once. probe-uptime.mjs must learn to consume KV samples instead of producing them; check-uptime-contract.mjs defines the sample cadence the public SLA promises — keep it. Not done in S335 because it rewrites a public trust surface's data path; the same-cron pair (linkcheck + member-seo) was merged into weekly-maintenance.yml instead.
Why it matters: <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are na is a 7-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [PRODUCT] The Desk's binding constraint is now topic ACCEPTANCE, and it current…
Final score: **57**
[S333][NEWS/P0] The Desk's binding constraint is now topic ACCEPTANCE, and it currently queues nothing. Measured across four runs on 2026-08-31: 03:19 queued 3, 04:10 queued 2 (one became the published edition), the 06:44 scheduled run queued 0 of 177, and a local news-trend-radar.mjs --scan reproduces 0 queued / 176 rejected deterministically. Selection and the authoring model are both fixed and proven; the pipeline now starves upstream instead. Prediction to check first: today's edition ages to 1 day old on 2026-09-01, at which point build-news-freshness --check --require-daily fails again and the Desk returns to red — not from the defects fixed in S333, but from an empty queue. Investigate the rejection thresholds (corroboration count, recency window, published-slug dedupe from S329, vendor filter) and establish what acceptance rate a 4-slot daily cadence actually requires.
Why it matters: The Desk's binding constraint is now topic ACCEPTANCE, and it currentl is open, local, and unblocked — can ship this session.

#### 3. [SECURITY] Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-0…
Final score: **57**
[S333][NEWS/P1] Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-08-31 edition proves the pipeline works, but it was manually dispatched under observation. The cron itself has not gone green unattended since 2026-08-29. Check the 06:07 / 12:07 / 18:07 / 22:07 UTC slots; if they still drop while a dispatch succeeds, the difference is environmental (scheduler context, token scope, or queue freshness), not the selection or model logic this session fixed.
Why it matters: Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-08 lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

### DEFERRED / GATED

#### 1. [VERIFY] Complete the Obelisk provider journey
Final score: **100**
[S342][AUTH/P0] Complete the Obelisk provider journey — it is the LAST step, and the command is --watch. node scripts/verify-provider-journey.mjs --watch, then in YOUR OWN browser (native Windows Hello works): sign in at /login → land on /vault-member/ → SIGN OUT there (the logout leg is the revocation evidence). 12-hour window, live callback:✓ compat:✓ logout:✓. Self-check: /api/auth/me returning identity: {...} means the callback landed. Do NOT use --live unless the passkey is in Windows Hello — it opens a fresh automated profile that cannot reach a Chrome-held credential (two 10-min runs expired writing nothing). Everything upstream is verified live: registration active with both callbacks, authorize with correct PKCE, revocation endpoint live, recordJourney wired at all three Worker legs. Clears real-provider-e2e-pending and unholds auth/, surface:identity, worker:identity.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 2. [BRAND] The Trusted Types enforce blocker is LOAD ORDER, and it is measured. …
Final score: **90**
[S337][SEC/P1] The Trusted Types enforce blocker is LOAD ORDER, and it is measured. ambient-core.bundle.js installs the TT default policy that the site's ~167 legacy innerHTML sinks depend on, and its own comment says it "MUST load before any sink usage" — but ambient-core is not the first script on the page. Measured across 137 built pages in S337: 31 sink-bearing client assets load before it, led by pwa-nav.js (81 pages) and pwa-install.js (72). Report-Only hides this; enforcement throws. This is the concrete blocker the board has been recording as "stale soak evidence" — both are true, only this one names a defect. The repair hoists the policy installer ahead of every sink-bearing asset, which rewrites the head of every page and invalidates every hash-bound receipt at once, so it needs its own session and its own reseal budget, not a rider on a deploy. Re-measure with the scan in D-S337.3 before and after. (D-S337.3)
Why it matters: Changes public vocabulary or navigation — requires founder sign-off before user-visible copy changes.

#### 3. [SECURITY] Decide whether to arm the Monthly Member Newsletter
Final score: **87**
[S341][OPS/P1] Decide whether to arm the Monthly Member Newsletter — it has never once sent. Every scheduled run since 2026-04-02 has failed; zero successes on record. Two confirmed causes: NEWSLETTER_SECRET does not exist as a repository secret, so the workflow sends Authorization: Bearer with an empty token; and POST {SUPABASE_FUNCTION_BASE_URL}/send-member-newsletter returns 404 NOT_FOUND because supabase/functions/send-member-newsletter/ exists here but was never deployed. Not founder-blocked: supabase.management is READY, so both the deploy and the secret are agent paths (CANON-019, phantom-blocker test satisfied). Deliberately not armed because doing so emails every member on the 2nd of next month, which is not a side effect of a website deploy session (D-S341.4). If armed: deploy the function, mint the secret, dispatch ONE manual run before the cron fires.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 4. [PRODUCT] portal-feedback.js writes columns the checked-in page_feedback migrat…
Final score: **84**
[S335][DATA/P2] portal-feedback.js writes columns the checked-in page_feedback migration does not define. The client inserts page_path/question/answer/session_id; the migration defines path/reaction/visit_depth_bucket/ua_kind/created_at with service-role-only SELECT and no user_id. Either the live table was altered in the dashboard (probe it with the pre-image shape in apply-supabase-migration.mjs) or member feedback has been failing silently. A true account-linked "your feedback shipped" loop needs a user_id-bearing feedback table with read-own RLS; the S335 chronicle strip is device-scoped (localStorage) for that reason.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 5. [INTELLIGENCE] Four public tables still render a silent zero
Final score: **81**
[S336][SEC/P1 · FOUNDER DECISION] Four public tables still render a silent zero — decide which member activity becomes publicly readable, then ship one migration. S336 completed the audit; the remaining step is a decision, not investigation. Verified against the migrations and probed live: challenge_submissions (no anon SELECT policy — only read_own + admin; read anonymously by /community/ and all seven /leaderboards/*; probe returns HTTP 200 count 0), game_sessions (no anon SELECT at all; /community/ and /), point_events (auth.uid() = user_id only — powers the referral leaderboard and the public profile's "Recent activity", which renders its empty state forever), member_achievements (auth.uid() = member_id only — public profile shows "No achievements unlocked yet." permanently; its policy also keys member_id while the client filters user_id). The vault_members(username,…) PostgREST embeds at leaderboards/index.html:822,868 resolve to null for anon, so fixing the four alone would render raw UUIDs. Proposed shape, generalizing S335's public_leaderboard: definer projection views (public_challenge_feed, public_game_activity, public_point_events, public_member_achievements), each honouring vault_members.public_profile, each with an explicit grant select … to anon, authenticated, then repoint the ~20 call sites. NOT applied in S336 because it decides what member activity is publicly visible — a privacy/product call reserved for the founder. Apply with scripts/apply-supabase-migration.mjs (pre-image + probe) once the columns are chosen. (D-S336.5)
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 6. [VERIFY] Manual CANON-053 rendered-pixel review of the surfaces that only NOW …
Final score: **77**
[S336][VERIFY/P2] Manual CANON-053 rendered-pixel review of the surfaces that only NOW actually serve. S335 captured automated receipts for /community/#wall, /changelog/#requests, /evidence/#verify, /how-we-build/ and the member dashboard meter — but production was serving the pre-S335 build at the time, so those captures could not have been of the live pages. They serve as of S336. Capture across all seven themes at 1366px desktop and 390px mobile, inspect the images, and leave a hash-bound docs/visual-qa/LATEST.json. Verify with check-visual-qa.mjs --project . --changed.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 7. [PRODUCT] Confirm the founder-approved Season 1 defaults, then watch the first …
Final score: **75**
[S335][ENGAGE/P2] Confirm the founder-approved Season 1 defaults, then watch the first week. data/seasons.json declares "Season 1 — Ignition" (2026-09-02 → 2026-10-14, rewards in Vault Points only). Founder may veto name/dates/rewards at review. After a week: does season_xp move, does the weekly board fill, does the community #wall countdown render on mobile across all themes (CANON-053 receipt).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [INTELLIGENCE] The mobile audit measures PRODUCTION by default, so it cannot see an …
Final score: **75**
[S334][MOBILE/P2] The mobile audit measures PRODUCTION by default, so it cannot see an undeployed change. playwright's baseURL defaults to https://vaultsparkstudios.com, and a local pass on a not-yet-deployed page is measuring the OLD live page. That is exactly how a P1 tap-target on the new pathway route reached CI: six local runs passed because they were probing the previous version. Set BASE_URL to a local preview when verifying an unshipped change, and add a route to the audit list only AFTER the deploy that ships it. Also run it at default concurrency — a --workers=4 pass raced on findings.jsonl and persisted 139 of 215 cells, which reads as missing matrix cells rather than lost writes.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

## Recommended Build Order

1. The silent cron verdict is fixture-proven only. check-scheduled-workf…
2. Post-push CI confirmation
3. resync-derived.mjs does not cover every --checked derived artifact, a…
4. <!-- evidence-open: config/intelligence-suite.json and journal/index.…
5. Make the game covers art-only; the tile owns all text. The direction …
6. check-postbuild-ordering --check reports unmeasured in CI and always …
7. The cover artwork still duplicates the tile's KICKER and TITLE, the s…
8. <!-- evidence-open: the files named are the churning OUTPUTS and the …
9. Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs s…
10. <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are n…
11. The Desk's binding constraint is now topic ACCEPTANCE, and it current…
12. Confirm an UNATTENDED scheduled Desk run lands an edition. The 2026-0…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
