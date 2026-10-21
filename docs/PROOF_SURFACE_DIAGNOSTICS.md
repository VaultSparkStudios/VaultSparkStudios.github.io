# Proof Surface Diagnostics

Generated: 2026-10-21T16:40:25.793Z
Receipt: `50114bf5898af3683ed2389c` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 128.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 4.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 78 | blocking | 4.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 65 | blocking | 4.6s | 0 | `node scripts/check-content-coherence.mjs` |
| 88 | blocking | 4.5s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 46 | blocking | 3.8s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 106 | advisory | 3.1s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 38 | blocking | 3.0s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 50 | blocking | 2.8s | 0 | `node scripts/check-trust-feed-freshness.mjs --self-test` |
| 11 | blocking | 2.7s | 0 | `node scripts/check-og-images.mjs` |
| 52 | blocking | 2.2s | 0 | `node scripts/check-feed-publisher-manifest.mjs --self-test` |

## Failures

- None.
