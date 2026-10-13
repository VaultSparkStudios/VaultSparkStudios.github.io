# Proof Surface Diagnostics

Generated: 2026-10-13T02:44:50.378Z
Receipt: `0fb864c38ffcedb931d9ba4d` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 22.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 0.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 0.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 0.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 88 | blocking | 0.8s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 22 | blocking | 0.7s | 0 | `node scripts/check-schema-coverage.mjs` |
| 78 | blocking | 0.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 65 | blocking | 0.6s | 0 | `node scripts/check-content-coherence.mjs` |
| 82 | blocking | 0.4s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 42 | blocking | 0.4s | 0 | `node scripts/check-intelligence-hydration.mjs` |
| 24 | blocking | 0.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
