# Current State

Last updated: 2026-09-15 (S356)

> Historical state through Session 346 is preserved verbatim in `context/archive/CURRENT_STATE_through_S347.md`. This hot file retains the newest shipped-session state only.

## S356 The Desk becomes the flagship, and the studio's public numbers start telling the truth (2026-09-15)

**Real illustrations are back.** 25 stories had shipped a procedural diagram card because the publisher never had an image model. A local worker now generates art on the founder's ChatGPT plan, ingest accepts only reviewed images, and all 25 were regenerated and reviewed one at a time; one was redone because it carried a company mascot.

**Articles are built for readers.** Headline, byline, illustration and a short-version box come first; persona blocks are readable prose instead of monospace; every fact keeps its receipt, folded away. The index is image-led. The Desk now leads the homepage and rides in a site-wide header strip that only says "Live" when the measured cadence is daily.

**Reactions behave.** One pick per bar, tap again to remove, eight panel emoji, and the floating feedback widget no longer covers them.

**Comments are built.** Anyone may post, an automatic filter decides publish/hold/reject, members are badged and featured, reports auto-hold, and moderation runs from a CLI. Not live until the migration and Worker deploy.

**Daily publishing is enforced by evidence.** Authoring now runs the same checks promote runs, anchors are repaired verbatim only when genuinely related, a missed day turns the late-night run red, novelty is 7 days, follow-ups need a new source, and 20 verified feeds widened supply.

**Studio Pulse stopped overstating.** Solara is no longer "right now in the forge" after 93 quiet days, dormancy comes from real activity, the founder presence tile is honest about staleness, a studio-wide timeline reports partial coverage instead of a false total, and the false "stranded deploy" alarm is closed.

**A site-wide crawl (736 loads, 7 themes) found 25 defects; the P0s and most P1s are fixed:** a decorative sigil covered the mobile menu button on 134 pages, floating widgets covered content on 104+ loads (including a service's "Down" state), two links 404'd in production, /invite/ threw on every load, light-theme buttons sat at 2.8:1, and 181 tap targets were under 44px.

## S355 seven agent-owned fixes to publishing, gates and observability (2026-09-14)

**Promotions can no longer be cancelled by a no-op.** `pages-deploy.yml` cancels an in-flight run only for a dispatch confirming production or content, so publisher dispatches that take "Promotion held" queue instead of killing a real deploy.

**Publishers re-derive after the push-time rebase.** refresh-live-data (84 graph sources), leaderboard-api and weekly-maintenance now push with `--resync`. `check-publisher-resync` (in build:check) fails any `[skip ci]` publisher that stages a graph source without it; 12 publishers, 9 staging graph sources, all compliant.

**This repo's gates stop depending on other repos' sessions.** Founder presence `--check` validates the committed payload against a `sourceDigest` of its own generator, slug library and registry instead of today's studio-wide sessions; `--check-live` keeps the strict comparison.

**A Desk edition refusal that was the gate's own bug.** `check-news-claim-parity` escaped `& < >` while the renderer also escaped `"`, so a quoted fact read as absent and the 2026-09-13 latenight edition was refused. Both share `scripts/lib/news-html.mjs`; pages unchanged (39/39).

**More observable publishing.** The scheduled-staleness probe reports runs that concluded success while logging a held marker (advisory, checked only for workflows that can emit one). `check-desk-model-servability` asks each declared authoring model for one completion with no failover and is a doctor advisory; both models are servable today.

**The mobile audit cannot silently measure production.** `.env.playwright.local*` sets BASE_URL to production for the credentialed specs; the audit now refuses that host unless `MOBILE_AUDIT_ALLOW_PRODUCTION=1`.

**Deferred with reasons:** the /journal/ narrative mount, staging Worker observability, Desk source breadth, the S336 visual review, the Trusted Types hoist and /atlas/ (D-S355.5).

## S354 analytics that was delivered all along, and a release proof no job rebuilt (2026-09-14)

**Cloudflare Web Analytics works end to end; the seven-day zero was real traffic.** Enabled with auto-install since 2026-03-04. In a real Chromium visit to production, the page carries one nonce-bound beacon, `beacon.min.js` loads (200), no CSP violation fires, and the page-load report POSTs to same-origin `/cdn-cgi/rum` (204). Four headless test visits then appeared in GraphQL within minutes (bot=1, ChromeHeadless), so ingestion works; before them this site had no rows for seven days while other sites had up to 493. An earlier "zero for every site" reading was a parser bug in my probe, not the query. Two wrong diagnoses were coded and reverted before any build: "no beacon" (a probe without `Accept: text/html`) and "`connect-src` blocks it" (the beacon posts same-origin). `/privacy/` now discloses the measurement, which had been running without mention.

**Release proof strand, found by modeling one generator.** `build-release-proof` reads `api/release-dependencies.json`, an edge the evidence graph lacked. Once modeled, the cascade gate named Weekly Maintenance, which committed the dependency receipt without rebuilding the proof. It now rebuilds and stages both. Coverage 73/92, baseline 19.

**Smaller repairs:** `scan-secrets` no longer calls an empty file set clean; `capture-theme-matrix` refuses routes Git Bash rewrote into Windows paths; `build-og-cards` writes through a helper that retries transient Windows locks.

**Observed, not a defect:** one homepage Supabase request failed CORS once; three fresh loads returned 200/206 with the correct header, consistent with a transient error response that carries no CORS headers.

**Released:** production serves `a4a40a84a` (SCOPED dispatch `34824371781`, smoke 6/6), staging first. Two earlier dispatches did not land: one rejected for a flaky CI-only staging 503, one cancelled by a publisher's held no-op Pages dispatch. Both causes are recorded for wave 2.

**Cross-repo:** five Ark messages (sampler follow-up, brief revenue-age bug, credential-owner status, registry field/case bugs, external-source resync pattern).

## S353 three scheduled publishers that could not do their job, and one that said it had (2026-09-14)

**Vault Narrative had been red since 2026-09-10 and committed nothing.** The workflow never ran `npm install`. Its `refresh-live-data` profile reaches `build-news-desk.mjs --rebuild`, which imports `sharp`, so the profile reported `build-news-desk.mjs:warn` and the job failed before its commit step. The job now installs first. `check-workflow-runtime-dependencies` (new, in `build:check`) follows `node scripts/…`, derived-build profiles and `npm run` into local imports per job, and fails when a declared package is needed without an install. Against the pre-fix workflow it names `sharp`; a try-guarded optional import (the CI beacon's Playwright path) is exempt.

**Before that, the same workflow was green for 13 days while publishing no dispatch.** Every run from 2026-08-27 either timed out or rejected the model's answer as ungrounded, kept the 2026-08-26 dispatch, and exited 0. The validator and the prompt disagreed on what "concrete" meant. Both now read `groundingAnchors()`, and count claims are checked against the snapshot. Three real answers from a live rerun are self-test fixtures that pass on merit (15/15), and a fresh live run through the new code accepted two of three, rejecting one for a real error. A held publisher now shows a GitHub warning, and a final `--check-fresh` step fails the run past 48h. It currently fails at 446.8h, which is true.

**Weekly Maintenance failed on an empty glob.** `git add member/*/index.html` matched nothing because the anonymous member read returns 0 rows, so git exited 128 before staging the Obelisk registration probe the job exists to refresh. It now stages the directory. `check-workflow-git-add-pathspecs` (new, in `build:check`) fails any unguarded glob matching no tracked file, and names this line against the pre-fix workflow.

**The coverage ratchet was measuring a subset.** `check-evidence-graph-coverage` read only `build:check:steps`; 25 generator checks run inside `check-proof-surface`, and 20 of those are unmodeled. Coverage is now 72/92, baseline 20. This closes the S352 staged-but-unmodeled row by making the debt visible, not by modeling it.

**Unchanged:** no page, style or Worker changed. The edge sampler still waits on studio-ops (the handoff was drained, not answered).

**Found by the live run, fixed the same session: rebased publishers could not push.** Dispatched on the released commit, Vault Narrative wrote its first grounded dispatch since 2026-08-26 and then failed at commit. After a rebase, `resync-derived` forced every node with a source git does not track to rebuild, and `brand-assets`' source is `external:founder-brand-masters`, which no runner has. `build-brand-assets` refused, so the publisher refused to push. Desk edition and uptime publishers had hit the same error since S351. `external:` sources no longer make a node always-dirty (16 → 13 on the live graph); `founder-presence` is still forced.

**Released:** production serves `ea6cd1c9f` (SCOPED dispatch `34807949053`, smoke 6/6), staging first. Weekly Maintenance succeeded live with 0 members.

## S352 a publisher that staged the sitemap and never rebuilt it (2026-09-13)

**New stories were reaching production missing from `sitemap.xml`.** `news-publish.yml` listed `sitemap.xml` in its `git add` but its cascade step never ran `generate-sitemap.mjs`. The midday edition of 2026-09-12 published `/news/2026-09-12/anthropic-says-it-blocked-potential-ai-bioweapon-misuse/` and the sitemap did not list it. `generate-sitemap --check` was red on a freshly pulled `origin/main`. The publisher now rebuilds and checks the sitemap in the same commit.

**Why the cascade gate said "all closed".** `check-publish-cascade-coverage` reads its edges from `config/evidence-graph.json`, and the graph had no sitemap node, so there was nothing for it to check. The graph now models `sitemap <- news/` (81 nodes). With the graph fixed and no workflow edited yet, the gate named four publishers, and all four are now closed: `news-publish` and `rum-pull` never rebuilt the sitemap, while `refresh-live-data`, `rum-pull` and `vault-narrative` staged `news/` without staging it. The self-test fixture was widened the same way as S319/S328, and two new mutation cases show it still fails when it should (23/23).

**The write-back check no longer reports regeneration as unfinished work.** It flagged `c29a1b0f`, a regeneration-only commit, because its hand-written generated-path list did not match `brand/assets.json`, `data/stats-surface.json`, `feed/forge-ledger.*`, `stats.json` or `.cache/*`. It now takes the generated set from the evidence graph, excluding HTML pages and `sharedOutput` nodes so a homepage edit still counts as work. If the graph is unreadable the set is empty, so the error goes toward reporting debt. Self-test 15/15, including the real `c29a1b0f` file list.

**Unit-suite lists are now gated.** `scripts/check-unit-suite-parity.mjs` requires `test:unit` specs = specs run by `build:check` = git-tracked `tests/*.unit.spec.js`. It runs in `build:check:steps` right before `node --test`, and exits 3 when it cannot measure. Self-test 9/9. A live mutation (one spec removed from `test:unit`) fails and names the file.

**Edge sampler: an agent path around the cron cap, sent and not yet shipped.** `studio-ops-cron` already fires every 30 minutes. An Ark `agent-handoff` to studio-ops proposes it call the website Worker through a service-binding RPC entrypoint, so no new trigger is needed. Nothing in this repo changed for it: an entrypoint with no caller does nothing yet. The sampler stays dark and `/status/` still reports the edge as UNMEASURED.

## S351 the edge is now sampled from inside the edge (2026-09-12)

**The uptime sampler is ENABLED.** S349 shipped `scheduled()` dark and S350 recorded it as founder-held. S351 re-probed the hold instead of carrying it and found it gone: the Cloudflare bindings API created `production-UPTIME_SAMPLES` (`adfe5ed60c90426ea1286321360138e3`) with no founder action. The binding is declared beside the other production KV namespaces, the cron is declared as `[env.production.triggers]`, and `UPTIME_SAMPLER_ENABLED` is `"1"`. A wrangler dry-run confirms binding + flag on production and their absence on staging.

**This is a producer, not yet a measurement.** Nothing has been read back. `/status/` continues to report the edge as UNMEASURED, and must, until `drain-uptime-kv.mjs` reads a real sample. Arming a producer is not observation.

**A near-miss caught before deploy.** The first placement of the new table headers sat between `[env.production.vars]` and the bare keys following it, which silently re-parents `HUB_SUBDOMAIN_ENABLED` and `HUB_SESSION_TTL_SEC` into `[triggers]` — turning the hub subdomain off as a side effect of enabling uptime sampling. Both keys are verified back in `env.production.vars`.

**`build-brand-assets.mjs` could only ever destroy its own manifest.** `BRAND_ROOT` was the *sanitized* literal `<user-home>/Documents/...` with nothing expanding it, so every job skipped on every run — and the caller wrote the manifest anyway. The failure mode S350 hit under `--sweep-repair` (a correct 7-entry `brand/assets.json` replaced by `"assets": []`, exit 0) was not an edge case; it was the only behaviour. Now the placeholder expands to the real home directory at runtime (`BRAND_ASSETS_ROOT` overrides) so the generator finds the masters, and it REFUSES to write a manifest when any job was skipped, naming each missing source. Verified both ways: all 7 jobs build and reproduce every committed `.png` byte-identically, and a deliberately bad root exits 1 with the manifest byte-preserved.

**Three unit suites were coverage that never ran.** `test:unit` declared five spec files; `build:check:steps` executed two; and `npm run test:unit` was invoked by nothing — not the runner, not any workflow. `tt-report-only`, `resync-derived` and `local-preview` (16 tests) were gated by no runner at all. They pass, so this armed an alarm rather than fixing a red; the gate now runs all five.

**The stale-shell matcher can no longer go dead silently.** S350 root-fixed a regex here that had never matched anything. The predicate is now exported, the live path routes through it, and `--self-test` (8 cases, wired into `build:check`) asserts a known-stale fixture classifies as stale — the one thing that distinguishes a working cleaner from a dead pattern, since both print "no stale shell files found".

**Publisher cascade debt, paid by hand.** A `[skip ci]` desk publisher had changed `index.html` and added news art without regenerating anything downstream. S351 ran the cascade (lqip-map, sitemap, news freshness, home desk module, oracle sanitizer + answers, candidate manifest) and re-captured the 215-cell mobile receipt against the settled tree. Recorded as structural debt in TASK_BOARD, not as a one-off.

## S351 CORRECTION — the sampler is NOT armed; the cron could not be registered

Written after the deploy, replacing the claim above it. The production Worker deployed
and the `UPTIME_SAMPLES` binding is LIVE (verified against the deployed script, not the
repo). The **cron trigger was refused**: Cloudflare error 10072 — Workers Free caps the
account at 5 cron triggers, and all five belong to other projects (seamline `*/5`,
studio-ops-cron `*/30`, veilos hourly, velaxis-proxy ×2).

With no cron there is no invoker, so `scheduled()` can never run. `UPTIME_SAMPLER_ENABLED`
is back to `"0"` and the cron is commented out — left declared it would fail EVERY future
Worker deploy at the trigger step, because wrangler does not roll back the part that
succeeded.

**What is genuinely done:** the KV namespace exists, the binding is live in production,
the drain resolves its namespace from the config, and the enabling step is now two lines.
**What is not:** nothing has observed our edge. `/status/` still reports UNMEASURED and
that remains correct.

**Founder decision required** — one of: (a) free a cron slot by retiring one of the five,
which is a live change to a different project and so not this repo's call; or (b) move the
account to Workers Paid, raising the limit to 1,000. Option (b) is billing and is founder-
reserved under CANON-019.

## S350 hidden-tab polling, shell pruning, heading order (2026-09-11)

**Background tabs stop spending requests.** `favicon-pulse.js` no longer polls founder presence while the tab is hidden, and `vault-pulse.js` neither rotates ticker rows nor refetches its pool off-screen. All three presence/ticker scripts refresh once when the reader returns, so what they see is current on sight rather than up to one interval stale.

**Superseded hashed shells are pruned at build time.** `build-shell-assets.mjs` always had `cleanupOldFingerprintedFiles`, but its pattern ended in `\\${ext...}`: the backslash escaped the `$`, the extension was never interpolated, and the pattern matched no file. Every rotation left its old shell tracked and publicly servable. Root-fixed; eight stale shells (six style, one nav-sheet, one ambient-feature) are gone.

**Heading order.** Community, Journal and Contact no longer jump from h1 to h3. The demoted headings keep their exact look via `font-family: inherit` (the critical shell CSS gives h2 Georgia).

**Contact form inputs render at their designed height.** Found during the rendered-pixel pass, not from the board: `.input-field` carries `flex: 1` for horizontal email rows, and inside Contact's column-flex `.form-group` that zero flex-basis overrode `height: 48px`. The name, email and subject inputs measured 22px in every theme, with placeholder text crowding the borders on the studio's main inbound form. Scoped fix on the Contact page only (`flex: none`); it is the only page that nests `.input-field` in `.form-group`.

**Recovered record.** `50f13941` (S349 follow-up: an unobservable uptime leg renders `?` and exits 0 instead of reading as an outage) landed without a write-back; it is recorded in this session.

**Not changed:** the edge uptime sampler is still dark. Creating its KV namespace was blocked by the agent permission layer; see TASK_BOARD.

## S349 uptime observability honesty + edge-vantage sampler (2026-09-10)

**Shipped behaviour change on a public surface.** `/status/` no longer reports a Cloudflare bot challenge as an outage. Between 2026-07-13 and this session it published `edge-degraded` on 604 consecutive samples — every one with content healthy and zero routes down — because Cloudflare widened bot challenges to JSON and OPTIONS paths, expiring the premise the probe was rewritten on in S177 ("JSON/API paths are not bot-challenged"). Measured live: `/api/founder-presence.json` answers 200 from a residential IP and 403 in 127ms from CI.

`observable` is now a question separate from `ok`. A challenged leg is neither an outage nor a pass: `overall` reports the new `edge-unobservable` state, such rows leave the rollup denominators (`fullStackObservedChecks`, `unobservableChecks` are published beside the percentage), the alert path no longer pages on a challenge, and the `/status/` tile reads "Not observable" with the reason rather than a false red or a laundered green. Pre-S349 rows are preserved exactly and published as `unresolvedLegacyChecks` — a challenge and a real edge outage are indistinguishable in them now that the shape is gone, so they are labelled rather than re-scored, and they age out of the retained window naturally.

A silent consequence was fixed at the same time: `edgeHtmlBroken` guarded on `!liveness.ok`, which was permanently true while challenged, so the S179 apex-HTML failure shape that function exists to catch could not have fired once in the entire window.

**The edge is now honestly unmeasured rather than falsely broken, which is not the same as fixed.** The Worker `scheduled()` sampler that can actually observe it — a Cloudflare cron is never challenged — ships this session but ships DARK: `UPTIME_SAMPLER_ENABLED = "0"`, no KV binding, cron trigger commented out. Five unit tests assert it performs no KV write and no subrequest while off, so the deploy is provably inert. Enabling it is its own release (four steps documented in `cloudflare/wrangler.toml`) with a flag-flip rollback. `scripts/drain-uptime-kv.mjs` is ready and folds samples into the unchanged uptime contract, append-only and never rewriting a row.

**Service worker.** Navigations moved to their own `PAGE_CACHE`. They had shared `CACHE_NAME` with the install precache, and the LRU deletes `keys[0]` — the first entry ever written, i.e. `/` from `STATIC_ASSETS` — so past 60 entries every navigation evicted a precached shell asset in order, quietly dismantling the offline experience. `activate` also kept only an exact `CACHE_NAME` match, destroying the API cache on every activation; it now keeps the whole version-prefixed family.

**Accessibility.** `.skip-link:focus{top:0}` lived only in the async-loaded stylesheet, so a keyboard user tabbing before the swap focused a link parked at `top:-100%` (WCAG 2.4.7). Fixed in the critical-shell generator and propagated: 108/108 pages carry it, 0 remain unpatched.

**Secrets gateway.** `resolveCapability` now returns `lastProbeStatus`/`lastProbeAt`/`probeFailing`, and `check-secrets` renders a distinct FAILING state instead of printing READY for a credential whose own map entry records `auth-error`. It immediately surfaced a second unknown failure (`openai.api` unreachable). Honest ready count is 44/72, not 46/72. Exit codes are unchanged so a failing probe cannot be folded into a human-blocked label.

Verification: 479/479 build steps exit 0 from a frozen tree, 119/119 unit tests, 62/62 probe self-tests, 12/12 drain self-tests, 215/215 mobile cells against a local preview, 14/14 theme captures re-captured and directly inspected, Doctor `blockingFailing: 0`. Identity/provider acceptance, newsletter arming, cadence, public-member-data and warm-origin decisions remain untouched holds.

## S347 recovered full arc — 2026-09-09

The cut-off S347 implementation is reconstructed, integrity-clean, and verified as one synchronized candidate. All 23 audited items are shipped in source and the complete 477-step build gate passed. Fresh CANON-053 evidence covers 84/84 normal captures across six routes, seven themes, and desktop/mobile; 84 supplemental interactive-state captures cover Search, navigation, changed covers, reader signals, and honest-empty/populated Reader-to-Director states. No blocking visual defect remained.

Recovery also found and fixed a local evidence defect: `_headers` preloaded the fingerprinted shell stylesheet while the preview served it `no-store`, causing a duplicate transfer. Fingerprinted shell CSS/JavaScript now receives immutable preview caching while HTML and unhashed assets remain `no-store`; its child-server unit test passes. Final mobile lab reports bind all six routes and preserve performance misses as exceptions rather than claiming field Core Web Vitals conformance.

The local candidate is green; production currency remains the one blocking Doctor finding until this commit is pushed and the canonical staging-first release path completes. Identity/provider acceptance, credential-owner reconciliation, newsletter arming, and the human signup walkthrough remain separate holds and were not cleared.
## S347 recovered full arc released (2026-09-09)

The recovered 23-item S347 candidate is committed on `main` as `172073cb7` (`recover S347 closeout`). The rebased final tree passed one uninterrupted 477/477 canonical build gate, 215/215 mobile runtime cells with zero P0/P1 findings, and 84/84 manually reviewed route/theme/viewport captures plus 84 supplemental interaction-state captures.

CANON-007 staging-first release completed with a full 6,490-file Hetzner staging deployment, rollback snapshot `20260909222156`, and attested receipt `bb5016b2a85891bf778e4f87` at lineage depth 59. The canonical ten-step release ceremony passed. Production content promotion completed in GitHub Actions run `34412238486`; live probes report content-current with matched shell parity. Studio Doctor now reports `blockingFailing: 0` (13 pass, 1 warning, 2 advisory failures). Identity/provider acceptance, newsletter arming, and Desk cadence remain separate holds and were not broadened by this scoped release.

## S348 full arc — 2026-09-10

S348 shipped eleven audited improvements after the recovered S347 boundary. Changelog reactions now hydrate only near view with a bounded idle fallback; the local performance harness records warmed multi-run distributions and a host-noise envelope; and mobile evidence writes atomically across navigation retries. The measured Changelog lab result was volatile and therefore abstained (LCP p75 1.636s; CLS median 0.0021); no field Core Web Vitals claim is made.

The evidence system is now complete for every checked generator: 67/67 are source-reviewed and modeled across 80 acyclic nodes, all declared checks and outputs are reachable, and all 29 scheduled publisher cascades close. Forge and feedback provenance use source-derived clocks and exact-byte checks. Fixed-size Git-history summaries must carry a sentinel/truncation verdict, and `CURRENT_STATE.md` now stays hot while its exact 563,454-byte preimage remains in `context/archive/CURRENT_STATE_through_S347.md`.

The Desk's eight-day source probation retained the two feeds that produced published work and removed the two that did not. All 30 stories now expose deterministic `critique.json` argument maps plus a hash manifest, joining stable fact receipts to stances, predictions, and visual evidence while labeling unsupported claims `unlinked`.

The synchronized local candidate passed the complete 479/479 build gate from step one, 215/215 mobile runtime cells with zero P0/P1 findings, 28/28 manually reviewed final touched-state captures, and Studio Doctor with `blockingFailing: 0`. Staging, production promotion, and post-push CI remain release observations; identity, privacy, newsletter arming, immutable-origin, and cadence decisions remain separate gates.

### S348 release addendum — 2026-09-10

The release gap found during production verification is closed. The content lane now carries the dynamically imported Vault Pulse module as immutable `assets/vault-pulse.shell-8204990170.js`; its fingerprinted parent loader references that exact child. The homepage ticker's previously missing `/api/recent-ships.json` fallback is now a deterministic projection of the public Changelog narrative, eliminating the staging 404 pair without broadening the content-only promotion scope.

The final rebased candidate passed the 479/479 repository gate, a retry-free 215/215 mobile matrix, 14/14 manually inspected Changelog theme captures, and the canonical release ceremony 10/10. Hetzner staging receipt `5d2df635546d213dbd236c80` is verified at lineage depth 71. Production content promotion run `34508529884` serves baseline `7ea9b3c579e5` plus content head `761ebb3ddd536755380f16120034838feb33f79a`; live smoke is 6/6 and the production seven-theme UI sweep passes Chromium, Firefox, and WebKit. The push-time sitemap drift exposed after a publisher rebase was regenerated to 147 indexable routes and landed by the canonical publisher.
