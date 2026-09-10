# Current State

Last updated: 2026-09-10

> Historical state through Session 346 is preserved verbatim in `context/archive/CURRENT_STATE_through_S347.md`. This hot file retains the newest shipped-session state only.

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
