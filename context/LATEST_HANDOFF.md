# Latest Handoff — VaultSparkStudios.github.io

## Where We Left Off — S362 · 2026-09-19

**Session intent:** founder `/arc`, with authorization to commit directly to main and fully deploy.

- **Triage disbelieved two alarms, and both were wrong.** The write-back probe reported DEBT 12.3h after a correct S361 closeout; the doctor reported Weekly Maintenance `silent` when it had run on time. Neither was a missed closeout or a dead cron — both were probe defects, and they headed the audit.
- **Shipped:** cron lines with trailing comments are readable and several lines combine by rate (D-S362.1); write-back currency classifies PROJECT_STATUS.json by key, not by file (D-S362.2); the unarmed newsletter cron holds instead of failing (D-S362.3); a blocking browser gate installs the service worker (D-S362.4); the precache is reviewed and kept with numbers (D-S362.5).
- **Nothing was armed and nothing was sent.** The newsletter change gates the scheduled send on a repository variable `NEWSLETTER_ARMED`; arming stays a founder decision (D-S341.4 preserved).
- **Verified locally:** `build:check` 502/502; staleness self-test 28/28 and live 14 workflows checked / 0 silent; write-back self-test 20/20 and live "current"; the service-worker spec mutation-tested in both directions (404 precache entry → `redundant` → red; duplicate entry → still green, because S361 de-duplicates at install).
- **Deferred, on purpose:** the doctor's IGNIS remedy cannot run in a project repo (it reads a studio-ops-only registry) — Ark repo-question `01K2TR2MCB649E1AD036E22BAD` shipped instead of a local workaround, and the IGNIS tree was left untouched because it holds another session's uncommitted work. Purging `api/founder-presence.json` from history still needs a force-push, which stays a founder action.
- **Ark:** two `pattern-share` cargos for the propagated probe fixes (`01K2TR2J2O36AABB2BCFBC91AE`, `01K2TR2KK71B4A94B828BDC63E`).

- **RELEASED — full deploy.** Staging full publish `27f1046cdb5d` (6969 files, chain 80) → ceremony **11/11** (refused once on `staging-deploy-lineage`: the continuity summary was behind the ledger the publish had just appended — rebuilt, depth 80) → scoped promotion run `35474267138` (`confirm_production=true`, identity surfaces held) **success**. Production `build-sha` = `dae84c0c4` = HEAD at release, `deployedBy: pages-deploy` — a full deploy, not a content-lane overlay.
- **Verified from served bytes:** the new install spec run against **production** passes — a real `register('/sw.js')` reaches `activated` with a complete precache; `smoke:live` 6/6. The same spec passed against staging before promotion.
- **Gates on the way (all real, all fixed at source):** the ceremony lineage refusal above; then the pre-push coherence gate caught `release-proof`, `status-proof` and `stats-surface` drifting over the upstream rebase — converged with `resync-derived` rather than resealed one at a time. Three pushes raced the hourly publishers and were landed with `git pull --rebase`; generated-file conflicts were resolved to the fresh release evidence and regenerated afterwards.

## Where We Left Off — S361 · 2026-09-19

**Session intent:** founder `cont` after the S360 arc (direct-to-main and full-deploy authorization carried from S360).

- **Supabase recovered.** db/rest/auth ACTIVE_HEALTHY; Desk comments `ok:true`; /status/ reads "All Systems Operational". The P0 is closed. The restart was not done by the agent.
- **Shipped:** service-worker install fixed (duplicate precache entries; D-S361.1); /status/ offline row is informational and truthful (D-S361.2).
- **Found by looking, not by a gate:** checking what the new status row would say led to discovering that the worker had never installed. Every production install went `redundant`, so push notifications could not be enabled.
- **RELEASED — full deploy.** Staging full publish `b79c4d8c50ee` (6960 files, chain 79) → ceremony **11/11** → scoped promotion run `35434590099` **success**. Production `build-sha` = `113474364` = HEAD at release (`pages-deploy`).
- **Verified from served bytes:** a real `register('/sw.js')` on production now reaches **activated** (it was `redundant` before the fix); `smoke:live` 6/6.

## Where We Left Off — S360 · 2026-09-18

**Session intent:** founder `/arc`, with authorization to commit directly to main and fully deploy.

- **P0, founder action: restart Supabase.** Still down at S360 (health API db/rest/auth UNHEALTHY; every anon call times out at 12s; `/v/desk-comments` → `comments_upstream_failed`). The Management API restart was refused by the permission classifier a second time. Command unchanged (see S359 below), or Dashboard → Project Settings → General → Restart project. Verify: `/status/` should flip from "Database Provider Outage" to "All Systems Operational".
- **Shipped:** /status/ provider-outage banner + note + Auth row, no summary before all 7 checks report, database-origin-only proof of life (D-S360.1); leaderboard embed literal palette (D-S360.2); `build-shell-assets` import-safe + `tests/shell-assets.unit.spec.js`; Desk comments link to /status/ on upstream failure; two stale S356 items closed with evidence (D-S360.3).
- **Verified locally:** build:check all steps passed; mobile 215/215 (local preview); visual receipt 84 captures (3 inspected by hand, recorded); rendered-pixel pass on /status/ against the live outage in dark, light and high-contrast at desktop and mobile.
- **RELEASED — full deploy.** Staging full publish `834fb0216357` (6950 files, chain 78) → ceremony **11/11** (lineage refused once: continuity summary behind the ledger, rebuilt) → `check-promotion-scope` promotable · scoped-disjoint → scoped full promotion run `35413377247` (`confirm_production=true`, identity surfaces held) **success**. Production `build-sha` = `f2066eb7e` = HEAD at release, `deployedBy: pages-deploy`.
- **Verified from served bytes:** `/status/` in a real browser on production: "Checking services… (2 of 7)" → "Database Provider Outage", Auth row Down, provider note shown, 0 page errors; widget.js has no `var(--`; `smoke:live` 6/6.
- **Next:** the two new `[SIL]` rows (credential-side per-service health feed; Service Worker absence treated as informational).

## Where We Left Off — S359 · 2026-09-18

- **P0, founder action: restart Supabase.** Project `fjnpzjjyhnpmunfoycrp`: db/rest/auth UNHEALTHY, REST times out, control plane cannot reach the DB (status still ACTIVE_HEALTHY). Desk comments and Vault Member sign-in are both down. The agent restart was refused by the session permission policy. Run from this repo:
  `node --input-type=module -e "const {getSecret}=await import('./scripts/lib/secrets.mjs');const t=await getSecret('SUPABASE_ACCESS_TOKEN','supabase.management');const r=await fetch('https://api.supabase.com/v1/projects/fjnpzjjyhnpmunfoycrp/restart',{method:'POST',headers:{Authorization:'Bearer '+t}});console.log('restart',r.status)"`
  (or Dashboard → Project Settings → General → Restart project). Verify: `curl -s "https://vaultsparkstudios.com/v/desk-comments?slug=2026-08-10/test-story"` returns `{"ok":true,...}`.
- **Shipped:** "You asked" counts k-anonymous reader choices only (D-S359.1); narrative + subscriber push built from the reader changelog, notifier keyed on a git-free id (D-S359.2); /games/ light-theme status labels pass AA (D-S359.3); predicate/shell-asset gate; `answers:` keys bound to the sampler.
- **RELEASED — full deploy.** Staging full publish `c83259337df4` (6946 files, chain 77) → ceremony **11/11** → scoped full promotion run `35403055493` (`confirm_production=true`, identity surfaces held). Production `build-sha` = `453dd16d0` = HEAD at release — a full deploy, not a content-lane overlay.
- **Verified from served bytes:** `/api/changelog-narrative.json` `source: data/consumer-changelog.json`, schema 2.0; `/games/` serves the theme classes; `/api/ship-receipts.json` 0 receipts (honest-dark); lane drift 171 held · 164 match · 7 drift · **0 referenced**; smoke-live 6/6. The 7 are edge-cached plain copies (s-maxage 7d) that nothing loads; the deploy token returned 401 on a targeted purge, so they expire by 2026-09-25.

## Where We Left Off — S358 · 2026-09-18

- **Recovered:** S357's tail was never written back (closeout `b3e28806` skipped the SIL; `24933cc9`, `0d6d5459`, `f695a43f` landed after it). Recorded here; no code redone.
- **Shipped:** 17 still-loaded client scripts fingerprinted (D-S358.1); the lane-drift gate follows served reachability; "You asked → we shipped" reads founder-declared changelog links only (D-S358.2); the dead `vault_feedback` fetch and a retired-feature claim removed from /changelog/ (D-S358.3); the homepage ticker and returning-visitor strip re-sourced to the reader changelog (D-S358.4, found in the rendered-pixel pass).
- **Supabase is intermittent, not recovered.** Healthy at session start (`/v/desk-comments` 200 on both origins); UNHEALTHY again by release (db/rest/auth, status still ACTIVE_HEALTHY). Blocker reopened as INTERMITTENT, founder/provider action.
- **RELEASED.** Full staging publish `88ef1f382c75` (6937 files, chain 76) → release ceremony **11/11** → production content lane run `35388747654` succeeded. Production `contentLaneHead` = `fabe5dfee` = origin/main; `build-sha.sha` stays at baseline `e65eca737` by content-lane design (identity backlog held). No Worker change this session.

## S358 release addendum — verified from served bytes

- Fingerprinted scripts served 200 on production (e.g. `pwa-nav.shell-5f63b6b75a.js`, `returning-signal-strip.shell-d927bf3c2d.js`, `countdown.shell-f058757524.js`); the homepage references the hashed `pwa-nav`.
- `/api/recent-ships.json` on production: `source: data/consumer-changelog.json` — the hero names "The Desk: real art, reader-first articles…".
- `/changelog/` on production: 0 occurrences of `vault_feedback`.
- Staging lane drift after the full publish: **171 match · 0 drift · 0 referenced**.
- Gates on the way: the ceremony's `staging-deploy-lineage` refused once (continuity summary behind the ledger the publish had just appended — rebuilt, depth 76), and the pre-push coherence gate caught `release-proof` drifting over the staging receipts (resealed; candidate manifest unchanged at `10093039ef9a`). Both real, both fixed at source.
- **Not fixed by this release:** Desk comments return `comments_upstream_failed` on production and staging because the Supabase project went UNHEALTHY again during the session.

**Next session:** measure the two light-theme candidates (/membership/ "See The Value", /games/ status-count labels) before claiming either.

**Founder item:** tag a changelog entry with `answers: frontdoor` (the one live theme) in its draft frontmatter when one genuinely answers it. Until then the box stays empty, which is correct.

**Read before promoting next time:** the lane-drift line in the ceremony should now read 0 still-referenced on production. Any non-zero number is a newly added unhashed script. Fingerprint it; do not relax the purity rule.

## Where We Left Off — S357 · 2026-09-17

- **Recovered:** the cut-off S356 closeout tail. 19 commits reconstructed, rebased over 112 + 16 upstream publisher commits, and pushed. Three stale agent worktrees and nine duplicate cache captures removed.
- **Shipped:** deploy-truth binding + clock, 32 WCAG AA contrast repairs, four gates that had never run, a public-voice firewall on /changelog/, 83% off the slowest build:check step, the first public changelog entry since 2026-07-16, and two client scripts content-addressed.
- **Released to staging, verified:** staging serves the exact candidate, zero failed responses, release ceremony 9/10.
- **RELEASED.** Production Worker version `b19ce12e`; content-lane promotion run `35256380631` succeeded. Production `contentLaneHead` = `949cfacb6` = origin/main exactly. `build-sha.sha` deliberately stays at the baseline — the identity backlog is still held, which is the documented content-lane behaviour.

## S357 release addendum — what reached production

**Two steps, in the order S356 required** (an old Worker treats a reaction retract as an add, so the Worker went first).

**1. Worker.** The local preflight refused twice before it passed, and both refusals were real:
- `doctor` rejected on `deploy-currency-live`. The ceremony is written to accept that pre-deploy staleness, but only alongside a verified staging candidate — and `candidateReady` is structurally unreachable through a content-lane **overlay**, because the overlay deliberately leaves staging's `build-sha.sha` at the base deployment while only `contentLaneHead` moves. Fixed by doing a **full** staging publish (`scripts/deploy-staging.mjs`, 6893 files, chain depth 75, receipt `38b05c300781`), after which staging served the candidate sha exactly and all four attestations flipped true.
- `staging-deploy-lineage` rejected: the published continuity summary had drifted from the committed ledger. Rebuilt.
Ceremony then **10/10** and the Worker deployed. Verified live: `/v/desk-comments` 404 → **200**, `/api/newsletter/unsubscribe` 404 → **400** on a bad token, `/v/desk-reaction` 200.

**2. Content lane.** The first dispatch (`35255812298`) was **BLOCKED**, correctly:
```
content-capability-slice: BLOCKED · 10 caller(s) · 3 Worker route(s)
  - /v/desk-comments: no production route contract exists
```
S356 added `/v/desk-comments` and `/v/desk-comments/report` to the Worker and never added them to `ROUTE_CONTRACT`, so provenance recorded 7 routes without them, and the gate refuses to ship a caller for a route whose production contract is unproven. Added both (verified OPTIONS 204 against production), provenance now **matched 9/9** on both vantages, self-test 21/21. Re-dispatch `35256380631` succeeded.

**Verified from served bytes:** changelog entry live · light-theme contrast fix in the served CSS · `ignis-surface` tokens live (9 occurrences) · both fingerprinted clients served · real mobile browser through the drawer and all seven themes: **0 failed responses** · `smoke:live` 6/6.

**The deploy-truth fix proving itself:** `build-deploy-currency --probe` now reports `content-current` with parity `matched`, **0 missing / 0 unexpected**, age 0h, `expectedFrom` bound to this tree, 0 undeployed content commits. This morning it reported the same words with four shell assets missing, no binding and no clock.

**Read this first if you are promoting.** Two steps, in this order:
1. `node scripts/deploy-worker.mjs --env production --confirm-production` — production currently 404s `/v/desk-comments` and `/api/newsletter/unsubscribe`; staging returns 200 and 400 (bad token) respectively. The old production Worker also treats a reaction retract as an add, so it must go first.
2. Dispatch `pages-deploy.yml` with `confirm_content: true` (the SCOPED content lane). `check-promotion-scope` reports `promotable=true · scoped-disjoint`, held surfaces `auth/**, identity, worker:identity` — the identity backlog does not move.
Then verify from served bytes: `/api/build-sha.json`, `/v/desk-comments` 200, `npm run smoke:live`.

**The local release ceremony will sit at 9/10 and that is expected.** Its `doctor` step fails on one blocking check, `deploy-currency-live`, which is the pre-deploy staleness the ceremony is written to accept — but acceptance also requires a full staging attestation (`candidateReady`, `candidateShaBound`, `deployAttested`) that a content-lane OVERLAY never produces, because staging's base `build-sha` stays at the base deployment. Do not read 9/10 as a refusal of the candidate; both browser gates pass 6/6 and 15/15.

**The finding that matters most for future releases.** `check-content-lane-purity` holds unhashed `.js` as "sensitive, executable, or unrecognised type" and promotes only fingerprinted shell assets. **The content lane therefore cannot update a plain client script at all.** Measured on staging: 27 of 171 unhashed client scripts were serving pre-S356 bytes. That is how a fetch S356 deleted stayed live and made the ceremony's browser gate red — and production looked clean only because it still serves the pre-removal deploy. Two are fixed by content-addressing; 25 remain.

**Deploy-truth was publishing a false green.** `api/deploy-currency.json` said `content-current` while a live probe said `stale` with four shell assets missing. Not an ordering bug — a tree-identity one: shell parity records only one of its two operands as evidence, so a CI reading was rebased into a tree it had never measured. Fixed with a freshness clock on the parity reading, a binding to the tree it was taken against (retroactive, because the operand was always in `expected[]`), and honest naming of what the pages.dev vantage can certify.

**Two audit items on the board were wrong, and are corrected in place.** `.ignis-chip` is not "solid orange with near-black text" and is not defined in `ignis-answer-engine.js`; its real defect is a 4.22:1 label over the hero wash. The leaderboard item named 2 declarations; there are 5. The worst contrast failures were not on the board at all — `/ignis/` in light theme had text at 1.40:1.

## Where We Left Off — S356 · 2026-09-15

- **Shipped:** The Desk rebuilt as the studio's flagship (real art + reader-first articles + reactions + site-wide presence), studio-truth fixes across Pulse and the deploy beacons, 18 crawl defects, the newsletter repaired end to end, and a copy-quality gate.
- **Built, not yet live:** Desk comments (migration + Worker), the newsletter (functions + secrets + preview to founder@ before any member send).
- **Deploy:** see the S356 release addendum below.

**Session intent:** founder directive — fix The Desk's art, formatting, reach, reactions and community; make Studio Pulse honest; then keep improving the site while waves ran.

**Order that matters at release:** Worker BEFORE the content lane for reactions (an old Worker treats a retract as an add), and the content lane before the Worker for the unsubscribe proxy page. Re-hash shell assets or the /invite/ fix, the strip and the new reaction client never reach production.

**Open, founder-owned:** "Coming soon"/"TBD" copy on six live game pages; the leaderboard embed's hard-coded greys; staging Worker observability (still the only way to source the S354/S355 staging 503s).

## S355 release addendum · 2026-09-14

- **Pushed:** `8b7bb4501` (S355) + `a5668648b` (receipts re-bound after rebase: mobile 215/215, visual 98/98, ordering green on candidate `03995683c2ff`). build:check 490/490 on the pre-rebase tree.
- **Staging:** content lane `8b7bb4501` served and verified (233 overlays, 11 safe removals, identity untouched).
- **Promotion:** First promotion `34831145405` was REJECTED at the release ceremony (9/10): `staging-browser-receipt` failed "mobile drawer and every theme are readable" on chromium and webkit with 9 console lines "Failed to load resource: 503" at 10:05Z, both attempts. Not reproduced afterwards: 8 routes and a 40-request parallel burst all 200; a settled real-browser probe (themes + drawer) showed 0 failed responses and 0 console errors on staging and production. Same unsourced class as S354; it stays unsourced until staging Worker observability exists ([S355] task). An intermediate CSP-hash lead was a false positive (the Worker authorizes by nonce; production "failed" identically).
- **Result:** Re-dispatched promotion `34832157155` succeeded. Production verified by served bytes: `/api/build-sha.json` sha `e65eca737` (builtAt 2026-09-14T10:17:34Z) equals origin/main; `/api/founder-presence.json` `sourceDigest` matches the committed file (S355-only field); `smoke-live` exit 0.
- **Concurrency fix observed live:** push run `34831099401` was cancelled by the confirmed dispatch on the same sha — the intended D-S355.1 behaviour.

## Where We Left Off — S355 · 2026-09-14

- **Shipped:** 7 improvements across 3 groups: release safety (Pages concurrency, publisher --resync gate), gate truth (founder-presence gate stability, Desk claim-parity escaping, mobile audit production guard), observability (held-run advisory, Desk model servability).
- **Tests:** build:check result in the S355 release addendum below · publisher-resync 11/11 (new) · founder-presence 11/11 (new) · model servability 13/13 (new) · sched-staleness 28/28 (+10) · recovery contract 20/20 (+1) · claim parity 5/5 (+2).
- **Deploy:** see the S355 release addendum. No page or Worker change; workflows and scripts reach GitHub on push.

**Session Intent:** founder directive continued: defer founder items, work every agent-owned item.

**Read before dispatching a promotion:** until this commit is on main, an input-less publisher dispatch can still cancel a confirmed promotion. After it, held runs queue. Confirm deployment only from served `build-sha.json`.

**Two Desk refusals, only one was a bug.** Run `34786386279` authored an edition that the claim-parity gate wrongly refused (escaping mismatch, fixed). Run `34814843409` was a correct refusal: a visual anchor absent from the corpus, then the cadence postcondition. Desk cadence remains the founder's decision.

**Still broken on schedule, honestly:** Monthly Member Newsletter (founder-deferred, never armed) and Generate Vault Narrative (pre-fix scheduled failures; clears at its next 13:00 UTC run).

**Deferred with reasons (D-S355.5):** /journal/ mount, staging Worker observability, Desk source breadth, S336 visual review, Trusted Types hoist, /atlas/, 19 generators.

## Where We Left Off — S354 · 2026-09-14

- **Shipped:** 5 improvements across 3 groups: measurement truth (analytics delivery verified in a real browser, privacy disclosure), gate truth (release-dependencies modeled with its release-proof edge and the Weekly Maintenance strand it exposed; empty secret scan no longer reads clean), tooling resilience (theme-matrix route guard, transient-lock write retry).
- **Tests:** build:check result in the S354 release addendum below · og-cards 21/21 · resync 19/19 · cascade 29/29 closed.
- **Deploy:** see the S354 release addendum. No Worker change.

**Session Intent:** founder enabled Web Analytics and directed: defer founder-owned items, work on every agent-owned item.

**Analytics works end to end; the zero was real.** Real Chromium on production: one nonce-bound beacon, no CSP violations, report POST to `/cdn-cgi/rum` 204. Four headless test visits appeared in GraphQL (`rumPageloadEventsAdaptiveGroups`, site tag `5ed6e30f31944c8aa5a1aec3ab7ea091`) within minutes as bot=1. Before them: no rows for seven days. **Probe note:** the Cloudflare API tool returns the GraphQL body as `result.viewer`, not `result.data`; reading the wrong path silently yields an empty list. **Read before touching CSP:** I coded a Worker beacon and a `connect-src` change on two wrong premises and reverted both. The injection would have double-counted. Test in a browser first.

**First read next session:** GraphQL for this site tag with `bot: 0`. Human page loads will appear as real visitors arrive; the pipeline is proven, so the number is a traffic measurement, not a health check.

**Deferred by founder directive:** passkey sign-in, signup walkthrough, public member data, newsletter arming, Desk cadence, warm-origin, Workers Paid, Dispatch opt-in, Season 1 defaults, nav-sheet device check, devlog drafts.

**Agent-owned, still open:** 19 proof-surface generators to model; a gate that every `[skip ci]` publisher pushes through `publish-push.sh --resync`; a doctor probe that reads held-run markers; mobile audit starting its own local preview; mounting the narrative on `/journal/`; model-servability alerts; Desk source breadth; `/atlas/` retirement; the S336 surfaces' visual review; the Trusted Types load-order hoist (own session).

### S354 release addendum — what reached production

**Pushed:** release commits `d839667cc`, `75dbf0f9b`, `21397ec3c`, `77f5f4ff1` on main after two rebases onto publishers. Generated-feed conflicts were resolved by taking upstream and regenerating. The second rebase moved the candidate to `6483486d8524` (LQIP map and build SHA), so both receipts were re-captured: theme matrix 98 captures reviewed, mobile 215/215. The third rebase kept the candidate. Pre-push coherence 54/54.

**Gate:** `build:check` 487/487 from a frozen tree on the final candidate, after two honest reds: step 145 (visual-QA retention report stale after adding `/privacy/` to the receipt; regenerated, not a leaf) and step 94 (founder-presence drift, below).

**Staging first (CANON-007):** `deploy-staging-content --baseline 222037112782` ran 233 overlays and 11 safe removals, identity untouched. Staging `contentLaneHead` = `21397ec3c`; `/privacy/` shows the new section and date; parity green. The first overlay run exited 1 with its output filtered away; the re-run verified cleanly. That first exit is unexplained, not assumed harmless.

**Production, SCOPED path (`promotable=true · scoped-disjoint`), three dispatches:**
- `34823347676`: **rejected** by the release ceremony (9/10). `staging-browser-receipt` recorded the Chromium drawer-and-themes test as flaky (`passed 2 · failed 0 · flaky 1`): its first attempt collected five `503` console errors from staging, and the retry was clean. The same suite run locally against the same staging passed 6/6. The staging Worker has no `[observability]` block, so its logs recorded no events and cannot name the 503 source. It stays unexplained.
- `34824034218`: **cancelled** at step 5. `refresh-live-data.yml` dispatches `pages-deploy.yml` with no inputs whenever it commits. That run took "Promotion held — no production mutation", deployed nothing, and `concurrency: pages-deploy` with `cancel-in-progress: true` killed the confirmed promotion 41 seconds in.
- `34824371781`: **success** on `a4a40a84a`: ceremony, clean dist, stamped SHA, Pages deploy, purge, post-purge liveness, served feed contract and exact live News freshness all green.

**Served bytes (08:51Z):** `/api/build-sha.json` = `a4a40a84ab7d…`, deployed by `pages-deploy`. `/privacy/` serves "Analytics (Cloudflare Web Analytics)" and "Last updated: September 14, 2026", with the beacon present. `smoke-live` 6/6.

**Worker:** not redeployed. Nothing under `cloudflare/` or `config/csp-policy.mjs` changed since `c29a1b0f5` (dispatch `34669052231`).

**Post-push CI on `77f5f4ff1`:** E2E, Lighthouse, Accessibility, Minify, Generate Sitemap, Cache Purge, Sentry Release, Secret Lint and the Pages build all green. The push-triggered Pages Deploy was cancelled by the concurrency group, superseded by the dispatch.

**Proven on a real cron:** today's scheduled Weekly Maintenance (06:15Z) succeeded with 0 members and pushed `b27b535`, the S353 empty-glob fix working unprompted.

**Two structural findings for wave 2, neither fixed yet:**
1. **A held Pages run can cancel a confirmed promotion.** Fix: `cancel-in-progress` true only when a dispatch sets `confirm_production` or `confirm_content` (via `github.event.inputs`, which is empty on push and schedule), so held runs queue instead of cancelling.
2. **This repo's gates depend on other repos' sessions.** `generate-founder-presence --check` reads `../vaultspark-studio-ops/portfolio/ACTIVE_SESSIONS.json`, so a session starting or expiring anywhere in the studio failed `build:check` once and the pre-push hook once (StatVault, then VEILOS). Each time the fix was a regenerate, but the class will recur.

## Where We Left Off — S353 · 2026-09-14

- **Shipped:** 7 improvements across 3 groups: publisher repair (Vault Narrative install, Weekly Maintenance pathspec), publisher honesty (shared grounding vocabulary with verified counts, held-publisher warning plus `--check-fresh`), gate coverage (runtime-dependency gate, zero-match pathspec gate, coverage ratchet widened to the proof surface).
- **Tests:** build:check result in the S353 release addendum below · self-tests: narrative 15/15 (new), runtime deps 10/10 (new), pathspecs 8/8 (new), coverage 17/17 (+5).
- **Deploy:** see the S353 release addendum. Staging first, then SCOPED promotion.

**Session Intent:** founder-directed `/arc`, then commit and push directly to main and fully deploy.

**Triage:** not cut off. Tree clean, write-back current, 5 automation commits behind. Doctor `blockingFailing: 0`; its `sched-staleness` line (Vault Narrative 4 failures, Weekly Maintenance silent) became this session's audit.

**Every S353 item came from reading run logs, not the board.** A scheduled workflow's conclusion is not its outcome: Vault Narrative was green for 13 days while it published nothing, then red for 4 while it committed nothing. Read the step output (`gh run view <id> --log`) before believing either colour.

**First thing next session:** read the next Vault Narrative run (13:00 UTC). It should log `wrote api/vault-narrative.json (anchor:…)` and pass `--check-fresh`. If it rejects again, the log now prints the rejected text; fix the vocabulary, never the freshness limit.

**Unchanged holds:** the edge sampler waits on studio-ops (Ark `01K2EQ77M9F29A0EC9619EA4BC` was drained, not answered). Identity/provider acceptance, newsletter arming, Desk cadence, public-member-data policy, the warm-origin decision and Trusted Types enforce remain with the founder. The member SEO job now succeeds with 0 profiles; which member data is public is still the S336 founder decision.

### S353 release addendum — what reached production

**Pushed:** `ea6cd1c9f` to main after rebasing onto 3 `[skip ci]` publishers. All 14 conflicts were generated feeds; took the upstream side and regenerated (converged in round 2). The candidate manifest stayed `e959e4c51711`, so both receipts stayed valid. Pre-push coherence 46/46; the staged secret scan was clean. An earlier "clean" scan had covered an empty index and is not counted.

**Gate:** `build:check` 487/487 from a frozen tree, with the exit read from the log. The first run stopped at step 211 because the closeout brief had not been rendered, which was correct. Mobile 215/215 against a local preview. Theme matrix 84 captures, all inspected on six per-route contact sheets plus 4 at full resolution. The first matrix run failed because Git Bash rewrote the route `/` into a Windows path; it now runs with `MSYS_NO_PATHCONV=1`.

**Staging first (CANON-007):** `deploy-staging-content --baseline 222037112782` ran 231 overlays and 11 safe removals, exact-byte verified with identity untouched. Staging `contentLaneHead` = `ea6cd1c9f`; parity green.

**Production, SCOPED path:** `promotable=true · scoped-disjoint`. Dispatch run `34807949053` succeeded, including the ceremony, Pages deploy, purge, post-purge liveness and exact live News freshness. **Served bytes:** `/api/build-sha.json` reports `ea6cd1c9f…`, deployed by `pages-deploy`. `smoke-live` 6/6.

**Worker:** not redeployed. Nothing under `cloudflare/` or `config/csp-policy.mjs` changed since the last dispatched Worker deploy (`34669052231` at `c29a1b0f5`).

**Live runs of the repaired workflows (dispatched on `ea6cd1c9f`):**
- Weekly Maintenance `34808007739`: **success.** Fetched 0 members, re-probed Obelisk, and got past the `git add` that used to exit 128.
- Vault Narrative `34808006238`: install, evidence graph and generate all passed. It logged `[vault-narrative] wrote api/vault-narrative.json (anchor:Studio Pulse live data)`, the first grounded dispatch since 2026-08-26. **The commit step then failed**, a new and real defect found only because this workflow reached its commit for the first time since the fix.

**Found live and fixed: every rebased publisher tried to rebuild brand assets.** `resync-derived` treats a node with an untracked, non-glob source as always dirty, a rule built for `context/.session-lock`. `brand-assets`' only source is `external:founder-brand-masters`, outside the repo, so after any rebase `build-brand-assets` ran, correctly refused without the masters, and the publisher refused to push. The same error is in Desk edition `34743168203` (2026-09-13) and uptime `34801923561` (2026-09-14): a class, not one run. `untrackedSourceNodes` now ignores `external:` sources. Against the live graph the old helper forced 16 nodes and the fixed one forces 13, the removed three being exactly the external-sourced ones. `founder-presence` is still forced. `resync-derived --self-test` 19/19 (+3), unit spec 10/10 with an external fixture.

**Decision (recorded here because DECISIONS is in the verification fingerprint):** `external:` sources never make a node always-dirty. A node whose tracked sources or output change still resyncs through normal closure.

**Next session, first read:** the next Vault Narrative run should now commit its dispatch and pass `--check-fresh`. The fix commit also re-dispatched it; read that run's commit step before claiming the archive grows.

## Where We Left Off — S352 · 2026-09-13

- **Shipped:** 4 improvements across 3 groups: publisher cascades (sitemap node in the evidence graph, 4 publishers closed), probe honesty (the write-back check reads generated paths from the graph), gate coverage (unit-suite parity check).
- **Tests:** build:check result in the S352 release addendum below · self-tests: cascade 23/23 (+2), write-back 15/15 (+4), unit parity 9/9 (new).
- **Deploy:** see the S352 release addendum. Staging first, then SCOPED promotion.

**Session Intent:** founder-directed `/arc`, then commit and push directly to main and fully deploy.

**Triage:** not cut off. The write-back check flagged `c29a1b0f`, but that is S351's own post-rebase regeneration commit, which is a false positive and is fixed at its root this session. Pulled 108 automation commits before starting.

**The sitemap was stale on main, and a gate said everything was fine.** The Desk publisher staged `sitemap.xml` without regenerating it. The cascade gate reads its edges from the evidence graph, which had no sitemap node, so it had nothing to check. The rule to keep: a gate built on a graph can only see what the graph models. Add the node first, run the gate against unchanged workflows (it must fail), then fix what it names.

**Read before touching uptime.** Nothing about the sampler changed in production. An Ark `agent-handoff` to studio-ops proposes routing the sampler through `studio-ops-cron`'s existing `*/30` trigger with a service-binding RPC entrypoint. That needs no founder billing and frees no slot. If studio-ops accepts, this repo ships the entrypoint (the Worker unit tests import the worker under node, so `cloudflare:workers` needs a shim) in the same window as their binding. The founder alternatives still stand.

**Unchanged holds:** identity/provider acceptance, newsletter arming and first send, Desk cadence, public-member-data policy, the immutable warm-origin decision, the signup walkthrough and Trusted Types enforce all remain with the founder and were not touched.

## Where We Left Off — S351 · 2026-09-12

- **Shipped:** 6 improvements across 3 groups — observability (sampler enabling release, drain namespace resolution), generator honesty (brand-assets refusal + placeholder expansion, stale-shell self-test), gate coverage (three ungated unit suites wired in).
- **Tests:** 481/481 build steps · 215/215 mobile cells · 16 previously-ungated unit tests now executed · delta +16 gated.
- **Deploy:** FULLY DEPLOYED. Content promoted to production via scoped dispatch (run 34667221562) and verified live; staging re-deployed first per CANON-007 (225 overlays); Worker deployed with the UPTIME_SAMPLES binding live. The uptime CRON alone was refused on the Workers Free 5-trigger cap — see the correction below.

**Session Intent:** founder-directed `/arc`, then commit and push directly to main and fully deploy. **Achieved.**

**The blocker was a stale sentence — and a real one sat behind it.**  The top item had been held since S349 and recorded in S350 as needing a founder allow. Re-probed under CANON-019 it worked immediately — `production-UPTIME_SAMPLES` = `adfe5ed60c90426ea1286321360138e3`. The sampler is now armed on a 30-minute production cron with the flag at `"1"`.

**Read this before touching uptime again.** The sampler is NOT enabled. The Worker deployed and the `UPTIME_SAMPLES` binding is live, but the cron was REFUSED (error 10072 — Workers Free allows 5 cron triggers per account and all five belong to other projects). No cron means no invoker, so `scheduled()` can never fire; the flag is back to `"0"` and the cron is commented out, because a declared-but-unregisterable cron fails every future Worker deploy. Nothing has been read back and nothing can be until a founder frees a slot or moves the account to Workers Paid. `/status/` still reports the edge as UNMEASURED and that is correct. The next action is `node scripts/drain-uptime-kv.mjs --dry-run` after a window has elapsed: confirm keys exist and parse, then drain for real. Arming a producer is not a measurement, and the flag being `"1"` is not evidence.

**Caught before deploy (would have been a live regression).** The first placement of the KV binding and cron sat between `[env.production.vars]` and the bare keys after it, re-parenting `HUB_SUBDOMAIN_ENABLED` and `HUB_SESSION_TTL_SEC` into `[triggers]` — enabling uptime sampling would have silently turned the hub subdomain off. Wrangler dry-run on both envs is the check that caught it and is worth running on any `wrangler.toml` table edit.

**Two producers that could only ever lie, fixed at the root.** `build-brand-assets.mjs`: `BRAND_ROOT` was the sanitized `<user-home>` literal with nothing expanding it, so every job skipped on every run and the caller wrote an empty manifest anyway and exited 0 — the S350 `--sweep-repair` incident was the only behaviour, not an edge case. `drain-uptime-kv.mjs`: required an env var nothing set, so the documented way to verify this very release would have printed "the sampler has not been enabled yet" and exited 0 while draining nothing.

**Three unit suites had never run.** `test:unit` declared five spec files, `build:check:steps` executed two, and `npm run test:unit` was invoked by no runner anywhere. 16 tests were gated by nothing. They pass — so this armed an alarm rather than fixing a red.

**Inherited debt, paid by hand and filed.** `b67c283d1` (a `[skip ci]` desk publisher) changed `index.html` and added news art at 22:20Z without cascading, leaving the sitemap stale, 5 images missing from the lqip map, the mobile receipt bound to a superseded page, and the startup brief disagreeing with the shared revenue resolver. Both failures reproduced with every S351 change stashed, so neither was inherited silently. The cascade was run manually; the structural fix is a TASK_BOARD row.

**Cost worth remembering:** three mobile re-captures (~21 min) because the first two were taken before the tree was final. Receipts capture AFTER the final build — including after `build-candidate-artifact-manifest.mjs`, which is what rotates the binding.

**Unchanged holds:** identity/provider acceptance, newsletter arming and first send, Desk cadence, public-member-data policy, the immutable warm-origin decision, and Trusted Types enforce all remain founder-gated and were not touched.


## Where We Left Off — S350 · 2026-09-11

**Session Intent:** founder-directed `/arc`, then commit and push directly to main and fully deploy.

**Recovery first.** `check-writeback-currency` found one substantive commit after the S349 closeout, `50f13941` (an unobservable uptime leg now renders `?` and exits 0 rather than reading as an alarm). It is recorded here. CANON-055 exempt for `50f13941`: its only effect is a CI probe's console line and exit code, which has no user-facing surface.

**Shipped:** hidden-tab gating for favicon-pulse and vault-pulse plus return-refresh on all three polling scripts; a root fix for the shell cleanup regex that had never matched, pruning eight stale shells; h1→h3 skips fixed on Community, Journal and Contact. Audit: `docs/AUDIT_2026-09-11.md`.

**Found by looking at pixels:** the Contact form's name, email and subject inputs rendered 22px tall instead of 48px on every theme (`flex: 1` collapsing height inside a column-flex group). Fixed with a Contact-scoped `flex: none`.

**Self-inflicted and caught:** `resync-derived --sweep-repair` ran `build-brand-assets.mjs`, which skips any job whose source master is absent and then writes the manifest anyway — so it replaced the correct 7-entry `brand/assets.json` with `"assets": []` and staged it. `build:check` step 111 caught it; restored from HEAD. **Next session: file a TASK_BOARD row** to make that generator refuse to write when any job was skipped (not added this session because TASK_BOARD is in the verification fingerprint).

**Premise corrections (wins):** desk-presence already skipped its network call when hidden, so only its return-refresh was new. The shell prune was not missing code: it existed and was dead.

**Held — needs the founder:** the edge uptime sampler. The gateway `cloudflare.deploy` token authenticates but has no KV scope (`kv namespace list` → error 10000). The Cloudflare MCP on the same account can create `production-UPTIME_SAMPLES`, but the agent permission layer denied it as a shared-resource change. Allow that once, then uncomment the binding and cron in `cloudflare/wrangler.toml`, flip the flag, and push (the push-triggered Worker deploy runs the gate and ceremony).

## Where We Left Off — S349 · 2026-09-10

**Full arc completed in one session.** `/start` → `/audit` (3 items, every premise pre-verified against live code and a live network probe) → `/implement` (all 3 shipped, plus 2 verified findings from a parallel read-only sweep) → `/closeout`.

**The headline was found by measurement, not from the board.** `/status/` had been publishing `edge-degraded` to visitors on 604 consecutive samples since 2026-07-13 while the site served every one of them. Cloudflare widened bot challenges to JSON and OPTIONS paths, expiring the stated premise the uptime probe was rewritten on. Each API leg read its own challenge as an outage. The fix makes "unobservable" a first-class state — explicitly not an outage and explicitly not a pass — and carries it to every consumer in the same session: the contract gate's `STATES`, the public tile, the rollup denominators, and the history row shape.

**Final evidence:** 479/479 build steps exit 0 from a frozen tree; 119/119 unit tests (5 new asserting the sampler is inert while flagged off); 62/62 probe self-tests (was ~43); 12/12 drain self-tests; 215/215 mobile cells retry-free against a LOCAL preview — production would have measured the pre-change pages; 14/14 Changelog theme/device captures re-captured after the sitewide shell change invalidated the S348 binding, and directly inspected across all seven themes at both viewports; Doctor `blockingFailing: 0` (one advisory: the deliberately unarmed Monthly Member Newsletter, D-S341.4).

**Read this before touching uptime again.** The edge is now honestly reported as UNMEASURED, not fixed. Nothing has yet observed our edge. The Worker `scheduled()` sampler that can — a Cloudflare cron is never bot-challenged — is committed but dark (`UPTIME_SAMPLER_ENABLED = "0"`, no KV binding, cron commented out). Do not treat its presence as coverage.

**Next session — the top item is the sampler's enabling release**, four steps documented inline in `cloudflare/wrangler.toml`: create the KV namespace, uncomment the binding and `[triggers]`, flip the flag to `"1"`, deploy, then `node scripts/drain-uptime-kv.mjs --dry-run` before draining for real. Rollback is a flag flip. After that: visibility-gated teardown for the four uncancellable client polling timers verified this session (`desk-presence.js:114` and `:49`, `favicon-pulse.js:136`, `vault-pulse.js:202`), then the stale hashed-shell prune and the three h1→h3 heading skips.

**Unchanged holds:** identity/provider acceptance, newsletter arming and first send, Desk cadence, public-member-data policy, and the immutable warm-origin decision all remain founder-gated and were not touched.

## Prior closeout — S348 released · 2026-09-10


**Intent achieved and released.** Phase 0 recovered the interrupted S347 work into its own pushed boundary; S348 then completed `/start → /audit → /implement → /closeout`, exhausting all eleven locally actionable audit outcomes plus the release-discovered immutable-module and ticker-feed fixes.

**Final evidence:** repository gate 479/479; mobile matrix 215/215 with retries disabled and zero P0/P1; 14/14 Changelog theme/device captures manually inspected; staging receipt `5d2df635546d213dbd236c80` at intact lineage depth 71; release ceremony 10/10; Doctor `blockingFailing: 0`. Production content workflow `34508529884` succeeded and stamps baseline `7ea9b3c579e5`, content head `761ebb3ddd536755380f16120034838feb33f79a`, and 122 promoted paths. Live smoke passes 6/6; the production theme/readability test passes Chromium, Firefox, and WebKit; the hashed Vault Pulse child and generated recent-ships feed are live. The publisher-generated sitemap now contains 147 indexable routes.

**Next session:** migrate the 30-minute uptime sampler to a Worker scheduled handler plus daily KV drain as a dedicated trust-path release. Close field-vitals freshness only from a genuinely fresh RUM cohort. Identity/provider acceptance, newsletter arming, public-member-data, cadence, and warm-origin decisions remain separate holds.

## Prior closeout — S348 local candidate · 2026-09-10

**Intent achieved locally; release seal in progress.** The recovered S347 boundary remains independently committed at `172073cb7` plus receipt binding `59bade85e`. S348 then shipped eleven audited improvements: progressive Changelog hydration; distributional, host-noise-aware lab measurements; atomic mobile evidence; deterministic Forge/feedback provenance; complete 67/67 checked-generator coverage across 80 evidence nodes; all 29 publisher cascades closed; meaningful Git-history window safety; byte-preserving CURRENT_STATE sharding; measured Desk feed probation; stale umbrella-task truth reconciliation; and 30 public claim/evidence critique packets with a hash manifest.

**Truthful evidence:** the Changelog lab run abstained as volatile (LCP p75 1.636s, CLS median 0.0021) and makes no field Core Web Vitals claim. The Decoder and MarkTechPost produced published stories and remain; ZDNet and The Register produced none during the eight-day window and were removed. Unsupported Desk predictions remain explicitly `unlinked` in critique packets. The synchronized local candidate passed 479/479 build steps from step one, 215/215 mobile runtime cells with zero P0/P1 findings, 28/28 manually reviewed final captures, and Doctor `blockingFailing: 0`. Staging, production, and post-push CI must be read from the newest S348 release addendum; do not reuse S347 receipts as S348 proof.

**Next session:** migrate the 30-minute uptime sampler from Actions to a Worker scheduled handler plus daily KV drain as its own trust-path release, and close field-vitals freshness only after a genuinely fresh RUM cohort exists. Founder-gated identity/privacy/newsletter/cadence/warm-origin decisions remain untouched.

## Session Intent — S348 · 2026-09-09

Execute the founder-requested full `/start → /audit → /implement → /closeout` arc without interruption: refresh and exhaust the Unified Genius List within the 34-item scope cap, implement second-order innovations while the context meter remains green, verify rendered pixels for every touched interface state, and finish with canonical write-back, release gating where applicable, and a pushed direct-to-main closeout.
## Where We Left Off — S347 recovered full arc · 2026-09-09

**Intent achieved and released.** Phase 0 proved S346 was already committed/pushed and S347 had died during final verification with all 23 audit items uncommitted. The recovery validated 96 JSON versions plus 501 JSONL records, found no half-written files or confirmed debris, and confirmed `~/.claude.json` is valid. The recovered boundary is committed and pushed as `172073cb7` (`recover S347 closeout`).

**Verified candidate:** all 23 audit items are marked shipped; `npm run build:check` completed 477/477. CANON-053 is hash-bound and manually reviewed for 84/84 normal captures (six routes × seven themes × desktop/mobile), with 84 additional state captures covering Search, open navigation, art-only covers, reader signals, and Reader-to-Director honest-empty/fixture states. Fresh lab reports cover all six routes. The preview cache-parity fix eliminates the duplicate fingerprinted-shell transfer without weakening HTML `no-store`.

**Release evidence:** full staging deployed 6,490 files with rollback snapshot `20260909222156`, attested receipt `bb5016b2a85891bf778e4f87`, lineage depth 59, and a green ten-step ceremony. Production content promotion completed in Actions run `34412238486`; live currency is content-current with matched shell parity. Doctor is 13 passing, 1 warning, 2 advisory failures, and `blockingFailing: 0`.

**Truthful holds / resume:** identity/provider acceptance, scoped credential-owner reconciliation, newsletter deployment/arming, the founder-observed signup walkthrough, and the Desk cadence decision remain independent and unresolved. Local performance exceptions are recorded; no field Core Web Vitals pass is claimed. Begin S348 with a fresh `/start → /audit → /implement → /closeout` arc from the two performance items and the regenerated Unified Genius List.
