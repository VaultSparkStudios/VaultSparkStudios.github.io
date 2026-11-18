# Proof Surface Diagnostics

Generated: 2026-11-18T08:40:22.617Z
Receipt: `dd76412c63e4ff58855ff095` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 51.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 38 | blocking | 2.5s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 90 | blocking | 2.3s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 37 | blocking | 2.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 2.0s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 49 | blocking | 1.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 1.6s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 65 | blocking | 1.5s | 0 | `node scripts/check-content-coherence.mjs` |
| 88 | blocking | 1.3s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 46 | blocking | 1.0s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 103 | advisory | 0.9s | 0 | `node scripts/build-atlas.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
