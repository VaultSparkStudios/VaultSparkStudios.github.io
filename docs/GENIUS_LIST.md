# Genius Hit List — Session 346

Generated: 2026-09-09
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **75/100**
- Health: **yellow**
- Current SIL: **980/1000**
- CI health: **check gh run list**
- Current focus: S346 recovery verified locally: 390 build checks, 215 mobile checks, and 42 reviewed theme captures. Create the recovery checkpoint, then continue the S347 full arc.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Preserve the active verification lock during build-runner self-tests …
Final score: **96**
[SIL][S346][BUILD/P1] Preserve the active verification lock during build-runner self-tests and diagnostics. A nested read-only invocation currently overwrites and deletes its parent lock. Prove lock preservation with a sentinel and ownership tests.
Why it matters: Preserve the active verification lock during build-runner self-tests a is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [VERIFY] 38 byte-checked generators are still outside the evidence graph. The …
Final score: **92**
[S345][BUILD/P3] 38 byte-checked generators are still outside the evidence graph. The S345 sweep makes this SAFE (drift is now caught and named at repair time) but not CLOSED: the graph still cannot order these nodes topologically, so --sweep-repair rebuilds them independently and a node whose source is another unmodeled node's output could need two passes. Modeling them requires real sources per node -- the ratchet exists precisely to stop that being guessed. Correct next step is to model them a few at a time, at the moment someone knows the inputs, lowering the baseline each time (now 38/67). Not urgent: the sweep converts what was a silent CI red into a local named failure.
Why it matters: 38 byte-checked generators are still outside the evidence graph. The S shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [VERIFY] ESCALATION: The Desk's cadence lever is still the founder's pick -- b…
Final score: **84**
[S344][DESK/P1] ESCALATION: The Desk's cadence lever is still the founder's pick -- but the S344 symptom sentence has EXPIRED. Re-probed S345: build-news-freshness --check --require-daily now reports daily - latest 2026-09-07 - age 0d, and 2 editions published on 2026-09-07. The S344 text ('nothing has published since 2026-09-04', 'degraded to periodic') was true when written and is false now; it is corrected here rather than carried, because a blocker sentence is a claim with an expiry. What is NOT resolved, and is not claimed to be: the queue-width constraint that caused the 3-day gap is UNMEASURED locally -- the radar cache is CI-only and absent from a local tree, so this session could not confirm whether the queue widened or the day was simply lucky. 2 editions against a 4-slot/day promise is a partial recovery, not a met promise. The founder's pick (widen radar yield, shorten novelty, or reduce slots) stands, and the cadence gate's reds remain HONEST (D-S344.5).
Why it matters: ESCALATION: The Desk's cadence lever is still the founder's pick -- bu was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [PRODUCT] Make the game covers art-only; the tile owns all text. The direction …
Final score: **78**
[S340][UX/P2] Make the game covers art-only; the tile owns all text. The direction is DECIDED (D-S340.7), so this is execution, not another design round. build-game-covers.mjs rasterizes the genre eyebrow and the game title into every cover while .hero-tile renders its own __kicker and __name over them. D-S339.6 already established the governing principle by removing the baked status word: text baked into an image goes stale against the feed that owns it, and the kicker and title are feed-derived from the same catalog. So the covers lose their text rather than the tiles losing their chrome -- the alternative re-introduces exactly what S339 removed. Deferred from S340 because regenerating every cover is binary churn that invalidates every cover-bound receipt and rotates the home page's LCP asset, which does not belong in a session that must also land a production deploy. Budget a reseal and a CANON-053 capture pass at both tile sizes and both themes. Supersedes [S339][UX/P3].
Why it matters: Make the game covers art-only; the tile owns all text. The direction i is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_UR…
Final score: **72**
[S344][INFRA/P1] Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_URL is vaulted. CANON-038 makes self-hosted Postgres first choice and cloud-managed the justified exception; D-S344.2 records the justification. The shared cluster's admin DSN is ABSENT, which CANON-038 itself names as its remaining founder-aware step, so there is currently nothing to migrate to. When it exists: this is an escalation, not a task — it moves live member accounts and the sign-in path onto a single box, AGENTS.md requires escalation before changing auth flows, and the cost saving is ~zero because the Supabase free tier is already cost-neutral (CANON-029). The static site is deliberately excluded: a free global CDN is not beaten by one box.
Why it matters: Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_URL is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] The cover artwork still duplicates the tile's KICKER and TITLE, the s…
Final score: **72**
[S339][UX/P3] The cover artwork still duplicates the tile's KICKER and TITLE, the same way it used to duplicate the status. D-S339.6 removed the baked status word, which was the reported defect and the only one that could go stale against a feed. But build-game-covers.mjs still rasterizes the genre eyebrow and the game title into every cover, and .hero-tile renders its own __kicker and __name over them — so "ACTION COMEDY SHOOTER / Call of Doodie" appears in the artwork behind "Action Comedy / Call of Doodie" in live text. It reads as a deliberate layered lockup at featured size and as a smudge at tile size, which is why it is P3 and not P1. Decide it as a design question with rendered captures at both sizes: either the cover goes art-only and the tile owns all text, or the tile drops its own chrome on covered tiles. Do not split the difference per-breakpoint.
Why it matters: The cover artwork still duplicates the tile's KICKER and TITLE, the sa is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] <!-- evidence-open: config/intelligence-suite.json and journal/index.…
Final score: **71**
<!-- evidence-open: config/intelligence-suite.json and journal/index.html are the config to EDIT and the page to VERIFY AGAINST, not deliverables; the deliverable is the route registered in that config and the instrument showing the writer pair gone --> [S340][BUILD/P1] Register /evidence/ in config/intelligence-suite.json and end the nav tug-of-war. propagate-nav.mjs (postbuild #5) strips the /evidence/ link from the nav AND footer of 125 pages on every build, and generate-evidence-hub.mjs (#13) puts it back. Reproduced directly: journal/index.html has the link, drops to 0 after propagate-nav, returns to 2 after generate-evidence-hub --apply. Net-zero across a full chain, so git status is clean and no surface-vs-surface gate can see it. Root cause: /evidence/ (S334) was never added to the canonical nav source, so the nav is rebuilt without it and a downstream script bolts it back on -- and that script's own comment refuses to gate its re-linking on "the page changed" because that would leave the hub "permanently unlinked on a settled tree", which is a repair built around a remover nobody went looking for. Deferred from S340 only because intelligence-suite.json is read by the nav, the footer, the Studio Pulse tiles, the sitemap expectations and the intelligence-suite builder, and that blast radius does not belong in a deploy session. Verify the fix by re-running check-postbuild-ordering --instrument and watching the pair disappear, then confirm generate-evidence-hub reports 0 pages linked -- it should become defence in depth, not a repair. (D-S340.5)
Why it matters: <!-- evidence-open: config/intelligence-suite.json and journal/index.h is a 6-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

#### 5. [PRODUCT] <!-- evidence-open: the files named are the churning OUTPUTS and the …
Final score: **66**
<!-- evidence-open: the files named are the churning OUTPUTS and the suspect generators, not deliverables; the deliverable is a pinned-clock bisect and fix --> [S335][BUILD/P2] Two identical builds minutes apart still churn 47 files — commit-derived feeds are the source, not timestamps. With no commit between them, build 2 rewrote feed/forge-ledger.{json,xml} (206 lines), api/feedback-provenance.json (a whole theme dropped), api/ship-receipts.json, api/status-proof.json, api/news-visual-receipts.json and the changelog SSR block; a third build would churn again. All derive from api/commit-map.json / the git log through build-parallel-phase.mjs (which runs build-feedback-provenance + build-ship-receipts), so the working theory is a clock-relative selection window in that chain. Bisect: run build-forge-feed.mjs twice with a pinned --now (add the flag if absent) and diff; then the provenance pair. This is the receipt-cascade cost the S334 "vs-yas" item was really measuring. Fixed this session: _headers lagged one build because early-hints ran before the postbuild shell rotation — moved into postbuild after build-shell-assets.
Why it matters: <!-- evidence-open: the files named are the churning OUTPUTS and the s is open, local, and unblocked — can ship this session.

### LATER

#### 1. [VERIFY] check-postbuild-ordering --check reports unmeasured in CI and always …
Final score: **65**
[S340][OBS/P3] check-postbuild-ordering --check reports unmeasured in CI and always will. Only --self-test is wired into build:check; the --check half needs a trace, and no CI job runs --instrument. That is deliberate for now -- the instrument runs the whole postbuild chain, so wiring it into every build doubles the build -- but a gate that can only ever report unmeasured in CI is one step from a gate that has never run. Decide: either run --instrument on a weekly cron and commit the receipt, or fold the tracing into the real postbuild so every build produces its own evidence for free. The second is better if the preload cost is negligible; measure it before choosing.
Why it matters: check-postbuild-ordering --check reports unmeasured in CI and always w is a 6-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] The release-ceremony receipt truncates a failure message at 500 chara…
Final score: **55**
[S337][OBS/P2] The release-ceremony receipt truncates a failure message at 500 characters, so a multi-violation failure names only its first file. The S337 blocking run recorded Received + 6 — six console errors — and api/staging-release-browser.json disclosed exactly one file before the message was cut. Diagnosing it needed the CI artifact downloaded and the test re-run locally; the receipt that exists to make a rejection legible could not. Either raise the cap or, better, record the DISTINCT violating files as a structured array alongside the prose message, so the receipt answers "what is violating" without a round trip.
Why it matters: The release-ceremony receipt truncates a failure message at 500 charac is a 9-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [VERIFY] <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are n…
Final score: **55**
<!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are named as context; the deliverable is the Worker scheduled handler + KV drain, which do not exist yet --> [S335][COST/P2] Move the 30-minute uptime probe off GitHub Actions. uptime-probe.yml is 48 runs and 48 [skip ci] commits a day (71% of all scheduled runs) and is the churn that buried the forge ledger in S333. Design: a Worker scheduled() handler probes the same route list and writes samples to KV under uptime:<ts>; the Actions job runs once daily, drains KV into api/uptime.json + geo-vitals + staging parity, and commits once. probe-uptime.mjs must learn to consume KV samples instead of producing them; check-uptime-contract.mjs defines the sample cadence the public SLA promises — keep it. Not done in S335 because it rewrites a public trust surface's data path; the same-cron pair (linkcheck + member-seo) was merged into weekly-maintenance.yml instead.
Why it matters: <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are na is a 11-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### DEFERRED / GATED

#### 1. [VERIFY] FOUNDER: the website's Supabase slot needs its own scoped entry. Unti…
Final score: **90**
[S344][SEC/P0] FOUNDER: the website's Supabase slot needs its own scoped entry. Until studio-ops adopts scoped names, this repo resolves the sibling project's key and every supabase.admin call 401s. The website's own key is still on disk in secrets/supabase.env.2026-08-17.bak (project fjnpzjjyhnpmunfoycrp). One line in the gateway; not an agent path because it writes a sibling repo's secrets tree (CANON-018). This also blocks the Obelisk ceremony — verify-provider-journey --watch gets a non-null key, passes its guard, and fails at the truth reads *after* the passkey flow.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [VERIFY] FOUNDER: run the member-newsletter deploy (one command). Re-probed S3…
Final score: **86**
[S345][ENG/P0] FOUNDER: run the member-newsletter deploy (one command). Re-probed S345 and both faults are STILL LIVE: --status against a project-scoped 200 reports project fjnpzjjyhnpmunfoycrp (reachable, 29 functions deployed) / function: NOT DEPLOYED / NEWSLETTER_SECRET (GitHub Actions): ABSENT, and gh secret list confirms the secret is absent while SUPABASE_ACCESS_TOKEN is present. So the credential path is OPEN and this is not a phantom blocker (CANON-019) -- --self-test passes 5/5. The agent path is blocked by the Claude Code sandbox permission classifier, which denied --deploy in S344 and again in S345; running the same script through a different shell would be working around the denial rather than clearing it, so it was not attempted. Founder: ! node scripts/deploy-member-newsletter.mjs --deploy then --secret then --verify (verify stops at the 404->401 boundary and mails nobody). The function has no dry-run, so the first real send should stay a founder-observed workflow_dispatch. This is also the sole remaining doctor red (sched-staleness, advisory). <!-- was: [S344][ENG/P0] FOUNDER: authorise the member-newsletter deploy -->
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [VERIFY] The homepage hero is publishing CI jargon to strangers. The IGNIS chi…
Final score: **81**
[S343][VOICE/P1] The homepage hero is publishing CI jargon to strangers. The IGNIS chip on / rendered *"The studio keeps resync after publisher race"* — a chore commit about a rebase collision — as the first sentence under the studio name. Same class as public_surface_fed_by_raw_git_leaks; the publicNote/publicNextStep overrides that fixed the sibling surfaces are not consulted by this chip. Found in the CANON-053 pixel review and deliberately left: the tree was frozen under a passing gate with two hash-bound receipts. See D-S343.5.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 4. [PRODUCT] The Phase 0 gate is a HUMAN walkthrough and has not been run. The pla…
Final score: **81**
[S343][QA/P0] The Phase 0 gate is a HUMAN walkthrough and has not been run. The plan's own gate is a real signup in a clean browser profile with the subscribe box left checked, landing on the dashboard. The fix is verified by build:check 388/388, mobile 215/215, worker 57/57, and by reading the SERVED bundle — but not by a person actually creating an account. ~3 minutes; do it before any onboarding push.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 5. [PRODUCT] check-secrets reports READY for a credential it knows is failing. --f…
Final score: **78**
[S344][OBS/P1] check-secrets reports READY for a credential it knows is failing. --for supabase.admin prints ✓ READY 2/2 all present while the same CAPABILITY_MAP.json entry records lastProbeStatus: "auth-error" (2026-09-03). The gateway holds the disproof and does not consult it, on the surface an agent checks before declaring itself blocked (CANON-019). Shipped in the same Ark cargo; tracked here because this repo is the one being misled.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 6. [INTELLIGENCE] The gateway's Supabase service-role key is scoped to a DIFFERENT proj…
Final score: **78**
[S343][SEC/P0] The gateway's Supabase service-role key is scoped to a DIFFERENT project. Valid, unexpired, role: service_role — and ref: ckwtolofoqzrqouqkmvs while this site ships fjnpzjjyhnpmunfoycrp. Both are real VaultSpark projects; the gateway has one SUPABASE_SERVICE_ROLE_KEY slot for at least two. It 401s on first use while check-secrets --audit reports READY 2/2, because presence is not validity. This is a second, independent reason the Obelisk ceremony would not settle — --watch calls serviceRoleKey(), gets a non-null key, sails past its guard and fails at the truth reads AFTER the founder completes the passkey flow. Fix belongs in studio-ops (per-project key names, not one shared slot) — CANON-018 forbids writing that tree directly, so ship Ark cargo. See D-S343.4.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 7. [BRAND] The Trusted Types enforce blocker is LOAD ORDER, and it is measured. …
Final score: **72**
[S337][SEC/P1] The Trusted Types enforce blocker is LOAD ORDER, and it is measured. ambient-core.bundle.js installs the TT default policy that the site's ~167 legacy innerHTML sinks depend on, and its own comment says it "MUST load before any sink usage" — but ambient-core is not the first script on the page. Measured across 137 built pages in S337: 31 sink-bearing client assets load before it, led by pwa-nav.js (81 pages) and pwa-install.js (72). Report-Only hides this; enforcement throws. This is the concrete blocker the board has been recording as "stale soak evidence" — both are true, only this one names a defect. The repair hoists the policy installer ahead of every sink-bearing asset, which rewrites the head of every page and invalidates every hash-bound receipt at once, so it needs its own session and its own reseal budget, not a rider on a deploy. Re-measure with the scan in D-S337.3 before and after. (D-S337.3)
Why it matters: Changes public vocabulary or navigation — requires founder sign-off before user-visible copy changes.

#### 8. [SECURITY] Decide whether to arm the Monthly Member Newsletter
Final score: **69**
[S341][OPS/P1] Decide whether to arm the Monthly Member Newsletter — it has never once sent. Every scheduled run since 2026-04-02 has failed; zero successes on record. Two confirmed causes: NEWSLETTER_SECRET does not exist as a repository secret, so the workflow sends Authorization: Bearer with an empty token; and POST {SUPABASE_FUNCTION_BASE_URL}/send-member-newsletter returns 404 NOT_FOUND because supabase/functions/send-member-newsletter/ exists here but was never deployed. Not founder-blocked: supabase.management is READY, so both the deploy and the secret are agent paths (CANON-019, phantom-blocker test satisfied). Deliberately not armed because doing so emails every member on the 2nd of next month, which is not a side effect of a website deploy session (D-S341.4). If armed: deploy the function, mint the secret, dispatch ONE manual run before the cron fires.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

## Recommended Build Order

1. Preserve the active verification lock during build-runner self-tests …
2. Post-push CI confirmation
3. 38 byte-checked generators are still outside the evidence graph. The …
4. ESCALATION: The Desk's cadence lever is still the founder's pick -- b…
5. Make the game covers art-only; the tile owns all text. The direction …
6. Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_UR…
7. The cover artwork still duplicates the tile's KICKER and TITLE, the s…
8. <!-- evidence-open: config/intelligence-suite.json and journal/index.…
9. <!-- evidence-open: the files named are the churning OUTPUTS and the …
10. check-postbuild-ordering --check reports unmeasured in CI and always …
11. The release-ceremony receipt truncates a failure message at 500 chara…
12. <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are n…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
