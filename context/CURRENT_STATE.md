# Current State

Last updated: 2026-09-12 (S351)

> Historical state through Session 346 is preserved verbatim in `context/archive/CURRENT_STATE_through_S347.md`. This hot file retains the newest shipped-session state only.

## S351 the edge is now sampled from inside the edge (2026-09-12)

**The uptime sampler is ENABLED.** S349 shipped `scheduled()` dark and S350 recorded it as founder-held. S351 re-probed the hold instead of carrying it and found it gone: the Cloudflare bindings API created `production-UPTIME_SAMPLES` (`adfe5ed60c90426ea1286321360138e3`) with no founder action. The binding is declared beside the other production KV namespaces, the cron is declared as `[env.production.triggers]`, and `UPTIME_SAMPLER_ENABLED` is `"1"`. A wrangler dry-run confirms binding + flag on production and their absence on staging.

**This is a producer, not yet a measurement.** Nothing has been read back. `/status/` continues to report the edge as UNMEASURED, and must, until `drain-uptime-kv.mjs` reads a real sample. Arming a producer is not observation.

**A near-miss caught before deploy.** The first placement of the new table headers sat between `[env.production.vars]` and the bare keys following it, which silently re-parents `HUB_SUBDOMAIN_ENABLED` and `HUB_SESSION_TTL_SEC` into `[triggers]` — turning the hub subdomain off as a side effect of enabling uptime sampling. Both keys are verified back in `env.production.vars`.

**`build-brand-assets.mjs` could only ever destroy its own manifest.** `BRAND_ROOT` was the *sanitized* literal `<user-home>/Documents/...` with nothing expanding it, so every job skipped on every run — and the caller wrote the manifest anyway. The failure mode S350 hit under `--sweep-repair` (a correct 7-entry `brand/assets.json` replaced by `"assets": []`, exit 0) was not an edge case; it was the only behaviour. Now the placeholder expands to the real home directory at runtime (`BRAND_ASSETS_ROOT` overrides) so the generator finds the masters, and it REFUSES to write a manifest when any job was skipped, naming each missing source. Verified both ways: all 7 jobs build and reproduce every committed `.png` byte-identically, and a deliberately bad root exits 1 with the manifest byte-preserved.

**Three unit suites were coverage that never ran.** `test:unit` declared five spec files; `build:check:steps` executed two; and `npm run test:unit` was invoked by nothing — not the runner, not any workflow. `tt-report-only`, `resync-derived` and `local-preview` (16 tests) were gated by no runner at all. They pass, so this armed an alarm rather than fixing a red; the gate now runs all five.

**The stale-shell matcher can no longer go dead silently.** S350 root-fixed a regex here that had never matched anything. The predicate is now exported, the live path routes through it, and `--self-test` (8 cases, wired into `build:check`) asserts a known-stale fixture classifies as stale — the one thing that distinguishes a working cleaner from a dead pattern, since both print "no stale shell files found".

**Publisher cascade debt, paid by hand.** A `[skip ci]` desk publisher had changed `index.html` and added news art without regenerating anything downstream. S351 ran the cascade (lqip-map, sitemap, news freshness, home desk module, oracle sanitizer + answers, candidate manifest) and re-captured the 215-cell mobile receipt against the settled tree. Recorded as structural debt in TASK_BOARD, not as a one-off.

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
