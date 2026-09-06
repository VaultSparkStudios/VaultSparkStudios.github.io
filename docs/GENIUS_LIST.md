# Genius Hit List — Session 343

Generated: 2026-09-06
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **78/100**
- Health: **yellow**
- Current SIL: **982/1000**
- CI health: **check gh run list**
- Current focus: Phase 0-2 of the finalization plan shipped and verified live at 57e69bfcd: registration works again (an undefined VS.kitSubscribe had failed every signup while creating the account), a taken handle no longer reads as success, /login serves browsers a page instead of JSON, the funnel separates bots from people, and subscriptions have a working cancel path. Next: the human signup walkthrough that is the plan's actual Phase 0 gate, then Phases 3-7 (adaptive front door, activation instrumentation, welcome email, the three divergent rank ladders).

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

#### 2. [PRODUCT] The silent cron verdict is fixture-proven only. check-scheduled-workf…
Final score: **93**
[S341][OBS/P3] The silent cron verdict is fixture-proven only. check-scheduled-workflow-staleness gained a verdict for a cron that is not failing because it is not *running*, proven only by fixtures — no live cron is currently silent. Right today, untested tomorrow. Pin it against a real disabled workflow, or record it as fixture-proven.
Why it matters: The silent cron verdict is fixture-proven only. check-scheduled-workfl is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] resync-derived.mjs does not cover every --checked derived artifact, a…
Final score: **87**
[S340][BUILD/P2] resync-derived.mjs does not cover every --checked derived artifact, and the gap only shows up after a rebase. Found live during the S340 closeout push. Four scheduled-publisher races forced four rebases; each was resolved by taking one side and regenerating through resync-derived, which rebuilt up to 20 artifacts and reported clean. api/intelligence-budget.json is not in its set, so it stayed at the conflict-resolved value and build-intelligence-budget --check failed in CI at build:check step 185 — the compliance job of run 33702593208 — while every local coherence check I ran after the rebase passed. Reproduced locally on the pushed tip, fixed by hand. This is the cascade-width class: a resync is only as wide as its graph, and a rebase is exactly the situation where the uncovered artifact keeps a stale value rather than a regenerated one. Fix: derive resync-derived's set from the artifacts build:check actually --checks (or make check-publish-cascade-coverage assert the two sets match) so an artifact cannot be gated without being resyncable. Verify by rebasing onto a publisher commit, running only resync-derived, and confirming build:check is green with no hand-run. S341 confirmed it again and found a SECOND member. Enumerating all 61 build-*.mjs --check invocations in build:check against the graph: resync-derived --changed <all changed> rebuilt and verified 17 artifacts and reported clean, while build-nervous-system AND build-intelligence-budget were both stale and both absent from its graph. Two hand-rebuilds fixed them. The one-line reproduction of this gap is that enumeration -- run the 61 --checks and diff the failures against the graph's node set.
Why it matters: resync-derived.mjs does not cover every --checked derived artifact, an was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [PRODUCT] Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_UR…
Final score: **84**
[S344][INFRA/P1] Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_URL is vaulted. CANON-038 makes self-hosted Postgres first choice and cloud-managed the justified exception; D-S344.2 records the justification. The shared cluster's admin DSN is ABSENT, which CANON-038 itself names as its remaining founder-aware step, so there is currently nothing to migrate to. When it exists: this is an escalation, not a task — it moves live member accounts and the sign-in path onto a single box, AGENTS.md requires escalation before changing auth flows, and the cost saving is ~zero because the Supabase free tier is already cost-neutral (CANON-029). The static site is deliberately excluded: a free global CDN is not beaten by one box.
Why it matters: Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_URL is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [VERIFY] <!-- evidence-open: config/intelligence-suite.json and journal/index.…
Final score: **84**
<!-- evidence-open: config/intelligence-suite.json and journal/index.html are the config to EDIT and the page to VERIFY AGAINST, not deliverables; the deliverable is the route registered in that config and the instrument showing the writer pair gone --> [S340][BUILD/P1] Register /evidence/ in config/intelligence-suite.json and end the nav tug-of-war. propagate-nav.mjs (postbuild #5) strips the /evidence/ link from the nav AND footer of 125 pages on every build, and generate-evidence-hub.mjs (#13) puts it back. Reproduced directly: journal/index.html has the link, drops to 0 after propagate-nav, returns to 2 after generate-evidence-hub --apply. Net-zero across a full chain, so git status is clean and no surface-vs-surface gate can see it. Root cause: /evidence/ (S334) was never added to the canonical nav source, so the nav is rebuilt without it and a downstream script bolts it back on -- and that script's own comment refuses to gate its re-linking on "the page changed" because that would leave the hub "permanently unlinked on a settled tree", which is a repair built around a remover nobody went looking for. Deferred from S340 only because intelligence-suite.json is read by the nav, the footer, the Studio Pulse tiles, the sitemap expectations and the intelligence-suite builder, and that blast radius does not belong in a deploy session. Verify the fix by re-running check-postbuild-ordering --instrument and watching the pair disappear, then confirm generate-evidence-hub reports 0 pages linked -- it should become defence in depth, not a repair. (D-S340.5)
Why it matters: <!-- evidence-open: config/intelligence-suite.json and journal/index.h was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`

#### 2. [PRODUCT] Make the game covers art-only; the tile owns all text. The direction …
Final score: **84**
[S340][UX/P2] Make the game covers art-only; the tile owns all text. The direction is DECIDED (D-S340.7), so this is execution, not another design round. build-game-covers.mjs rasterizes the genre eyebrow and the game title into every cover while .hero-tile renders its own __kicker and __name over them. D-S339.6 already established the governing principle by removing the baked status word: text baked into an image goes stale against the feed that owns it, and the kicker and title are feed-derived from the same catalog. So the covers lose their text rather than the tiles losing their chrome -- the alternative re-introduces exactly what S339 removed. Deferred from S340 because regenerating every cover is binary churn that invalidates every cover-bound receipt and rotates the home page's LCP asset, which does not belong in a session that must also land a production deploy. Budget a reseal and a CANON-053 capture pass at both tile sizes and both themes. Supersedes [S339][UX/P3].
Why it matters: Make the game covers art-only; the tile owns all text. The direction i is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] check-postbuild-ordering --check reports unmeasured in CI and always …
Final score: **78**
[S340][OBS/P3] check-postbuild-ordering --check reports unmeasured in CI and always will. Only --self-test is wired into build:check; the --check half needs a trace, and no CI job runs --instrument. That is deliberate for now -- the instrument runs the whole postbuild chain, so wiring it into every build doubles the build -- but a gate that can only ever report unmeasured in CI is one step from a gate that has never run. Decide: either run --instrument on a weekly cron and commit the receipt, or fold the tracing into the real postbuild so every build produces its own evidence for free. The second is better if the preload cost is negligible; measure it before choosing.
Why it matters: check-postbuild-ordering --check reports unmeasured in CI and always w was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [PRODUCT] The cover artwork still duplicates the tile's KICKER and TITLE, the s…
Final score: **78**
[S339][UX/P3] The cover artwork still duplicates the tile's KICKER and TITLE, the same way it used to duplicate the status. D-S339.6 removed the baked status word, which was the reported defect and the only one that could go stale against a feed. But build-game-covers.mjs still rasterizes the genre eyebrow and the game title into every cover, and .hero-tile renders its own __kicker and __name over them — so "ACTION COMEDY SHOOTER / Call of Doodie" appears in the artwork behind "Action Comedy / Call of Doodie" in live text. It reads as a deliberate layered lockup at featured size and as a smudge at tile size, which is why it is P3 and not P1. Decide it as a design question with rendered captures at both sizes: either the cover goes art-only and the tile owns all text, or the tile drops its own chrome on covered tiles. Do not split the difference per-breakpoint.
Why it matters: The cover artwork still duplicates the tile's KICKER and TITLE, the sa is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] <!-- evidence-open: the files named are the churning OUTPUTS and the …
Final score: **72**
<!-- evidence-open: the files named are the churning OUTPUTS and the suspect generators, not deliverables; the deliverable is a pinned-clock bisect and fix --> [S335][BUILD/P2] Two identical builds minutes apart still churn 47 files — commit-derived feeds are the source, not timestamps. With no commit between them, build 2 rewrote feed/forge-ledger.{json,xml} (206 lines), api/feedback-provenance.json (a whole theme dropped), api/ship-receipts.json, api/status-proof.json, api/news-visual-receipts.json and the changelog SSR block; a third build would churn again. All derive from api/commit-map.json / the git log through build-parallel-phase.mjs (which runs build-feedback-provenance + build-ship-receipts), so the working theory is a clock-relative selection window in that chain. Bisect: run build-forge-feed.mjs twice with a pinned --now (add the flag if absent) and diff; then the provenance pair. This is the receipt-cascade cost the S334 "vs-yas" item was really measuring. Fixed this session: _headers lagged one build because early-hints ran before the postbuild shell rotation — moved into postbuild after build-shell-assets.
Why it matters: <!-- evidence-open: the files named are the churning OUTPUTS and the s is open, local, and unblocked — can ship this session.

### LATER

#### 1. [SECURITY] Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs s…
Final score: **60**
[S335][TOKEN/P2] Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs shards the handoff. It is the largest file any session can touch (~126K tokens raw). compact-handoff.mjs and rotate-ledger.mjs read the handoff archive, so the shard has to be introduced through those readers, not by moving files. Measure with context-meter.mjs before and after.
Why it matters: Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs sh lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 2. [VERIFY] <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are n…
Final score: **59**
<!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are named as context; the deliverable is the Worker scheduled handler + KV drain, which do not exist yet --> [S335][COST/P2] Move the 30-minute uptime probe off GitHub Actions. uptime-probe.yml is 48 runs and 48 [skip ci] commits a day (71% of all scheduled runs) and is the churn that buried the forge ledger in S333. Design: a Worker scheduled() handler probes the same route list and writes samples to KV under uptime:<ts>; the Actions job runs once daily, drains KV into api/uptime.json + geo-vitals + staging parity, and commits once. probe-uptime.mjs must learn to consume KV samples instead of producing them; check-uptime-contract.mjs defines the sample cadence the public SLA promises — keep it. Not done in S335 because it rewrites a public trust surface's data path; the same-cron pair (linkcheck + member-seo) was merged into weekly-maintenance.yml instead.
Why it matters: <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are na is a 8-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [VERIFY] The release-ceremony receipt truncates a failure message at 500 chara…
Final score: **55**
[S337][OBS/P2] The release-ceremony receipt truncates a failure message at 500 characters, so a multi-violation failure names only its first file. The S337 blocking run recorded Received + 6 — six console errors — and api/staging-release-browser.json disclosed exactly one file before the message was cut. Diagnosing it needed the CI artifact downloaded and the test re-run locally; the receipt that exists to make a rejection legible could not. Either raise the cap or, better, record the DISTINCT violating files as a structured array alongside the prose message, so the receipt answers "what is violating" without a round trip.
Why it matters: The release-ceremony receipt truncates a failure message at 500 charac is a 6-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### DEFERRED / GATED

#### 1. [VERIFY] FOUNDER: the website's Supabase slot needs its own scoped entry. Unti…
Final score: **100**
[S344][SEC/P0] FOUNDER: the website's Supabase slot needs its own scoped entry. Until studio-ops adopts scoped names, this repo resolves the sibling project's key and every supabase.admin call 401s. The website's own key is still on disk in secrets/supabase.env.2026-08-17.bak (project fjnpzjjyhnpmunfoycrp). One line in the gateway; not an agent path because it writes a sibling repo's secrets tree (CANON-018). This also blocks the Obelisk ceremony — verify-provider-journey --watch gets a non-null key, passes its guard, and fails at the truth reads *after* the passkey flow.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [VERIFY] The homepage hero is publishing CI jargon to strangers. The IGNIS chi…
Final score: **91**
[S343][VOICE/P1] The homepage hero is publishing CI jargon to strangers. The IGNIS chip on / rendered *"The studio keeps resync after publisher race"* — a chore commit about a rebase collision — as the first sentence under the studio name. Same class as public_surface_fed_by_raw_git_leaks; the publicNote/publicNextStep overrides that fixed the sibling surfaces are not consulted by this chip. Found in the CANON-053 pixel review and deliberately left: the tree was frozen under a passing gate with two hash-bound receipts. See D-S343.5.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 3. [PRODUCT] The Phase 0 gate is a HUMAN walkthrough and has not been run. The pla…
Final score: **84**
[S343][QA/P0] The Phase 0 gate is a HUMAN walkthrough and has not been run. The plan's own gate is a real signup in a clean browser profile with the subscribe box left checked, landing on the dashboard. The fix is verified by build:check 388/388, mobile 215/215, worker 57/57, and by reading the SERVED bundle — but not by a person actually creating an account. ~3 minutes; do it before any onboarding push.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 4. [VERIFY] Complete the Obelisk provider journey
Final score: **83**
[S342][AUTH/P0] Complete the Obelisk provider journey — it is the LAST step, and the command is --watch. node scripts/verify-provider-journey.mjs --watch, then in YOUR OWN browser (native Windows Hello works): sign in at /login → land on /vault-member/ → SIGN OUT there (the logout leg is the revocation evidence). 12-hour window, live callback:✓ compat:✓ logout:✓. Self-check: /api/auth/me returning identity: {...} means the callback landed. Do NOT use --live unless the passkey is in Windows Hello — it opens a fresh automated profile that cannot reach a Chrome-held credential (two 10-min runs expired writing nothing). Everything upstream is verified live: registration active with both callbacks, authorize with correct PKCE, revocation endpoint live, recordJourney wired at all three Worker legs. Clears real-provider-e2e-pending and unholds auth/, surface:identity, worker:identity.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 5. [PRODUCT] check-secrets reports READY for a credential it knows is failing. --f…
Final score: **81**
[S344][OBS/P1] check-secrets reports READY for a credential it knows is failing. --for supabase.admin prints ✓ READY 2/2 all present while the same CAPABILITY_MAP.json entry records lastProbeStatus: "auth-error" (2026-09-03). The gateway holds the disproof and does not consult it, on the surface an agent checks before declaring itself blocked (CANON-019). Shipped in the same Ark cargo; tracked here because this repo is the one being misled.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 6. [INTELLIGENCE] The gateway's Supabase service-role key is scoped to a DIFFERENT proj…
Final score: **81**
[S343][SEC/P0] The gateway's Supabase service-role key is scoped to a DIFFERENT project. Valid, unexpired, role: service_role — and ref: ckwtolofoqzrqouqkmvs while this site ships fjnpzjjyhnpmunfoycrp. Both are real VaultSpark projects; the gateway has one SUPABASE_SERVICE_ROLE_KEY slot for at least two. It 401s on first use while check-secrets --audit reports READY 2/2, because presence is not validity. This is a second, independent reason the Obelisk ceremony would not settle — --watch calls serviceRoleKey(), gets a non-null key, sails past its guard and fails at the truth reads AFTER the founder completes the passkey flow. Fix belongs in studio-ops (per-project key names, not one shared slot) — CANON-018 forbids writing that tree directly, so ship Ark cargo. See D-S343.4.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 7. [BRAND] The Trusted Types enforce blocker is LOAD ORDER, and it is measured. …
Final score: **75**
[S337][SEC/P1] The Trusted Types enforce blocker is LOAD ORDER, and it is measured. ambient-core.bundle.js installs the TT default policy that the site's ~167 legacy innerHTML sinks depend on, and its own comment says it "MUST load before any sink usage" — but ambient-core is not the first script on the page. Measured across 137 built pages in S337: 31 sink-bearing client assets load before it, led by pwa-nav.js (81 pages) and pwa-install.js (72). Report-Only hides this; enforcement throws. This is the concrete blocker the board has been recording as "stale soak evidence" — both are true, only this one names a defect. The repair hoists the policy installer ahead of every sink-bearing asset, which rewrites the head of every page and invalidates every hash-bound receipt at once, so it needs its own session and its own reseal budget, not a rider on a deploy. Re-measure with the scan in D-S337.3 before and after. (D-S337.3)
Why it matters: Changes public vocabulary or navigation — requires founder sign-off before user-visible copy changes.

#### 8. [SECURITY] Decide whether to arm the Monthly Member Newsletter
Final score: **72**
[S341][OPS/P1] Decide whether to arm the Monthly Member Newsletter — it has never once sent. Every scheduled run since 2026-04-02 has failed; zero successes on record. Two confirmed causes: NEWSLETTER_SECRET does not exist as a repository secret, so the workflow sends Authorization: Bearer with an empty token; and POST {SUPABASE_FUNCTION_BASE_URL}/send-member-newsletter returns 404 NOT_FOUND because supabase/functions/send-member-newsletter/ exists here but was never deployed. Not founder-blocked: supabase.management is READY, so both the deploy and the secret are agent paths (CANON-019, phantom-blocker test satisfied). Deliberately not armed because doing so emails every member on the 2nd of next month, which is not a side effect of a website deploy session (D-S341.4). If armed: deploy the function, mint the secret, dispatch ONE manual run before the cron fires.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

## Recommended Build Order

1. Post-push CI confirmation
2. The silent cron verdict is fixture-proven only. check-scheduled-workf…
3. resync-derived.mjs does not cover every --checked derived artifact, a…
4. Re-evaluate the data plane for the shared box once STUDIO_PG_ADMIN_UR…
5. <!-- evidence-open: config/intelligence-suite.json and journal/index.…
6. Make the game covers art-only; the tile owns all text. The direction …
7. check-postbuild-ordering --check reports unmeasured in CI and always …
8. The cover artwork still duplicates the tile's KICKER and TITLE, the s…
9. <!-- evidence-open: the files named are the churning OUTPUTS and the …
10. Shard context/CURRENT_STATE.md (503 KB) the way compact-handoff.mjs s…
11. <!-- evidence-open: weekly-maintenance.yml and uptime-probe.yml are n…
12. The release-ceremony receipt truncates a failure message at 500 chara…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
