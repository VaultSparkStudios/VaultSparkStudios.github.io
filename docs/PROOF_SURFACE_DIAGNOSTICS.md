# Proof Surface Diagnostics

Generated: 2026-09-23T05:33:56.158Z
Receipt: `ba5fe76c3e26d191ed7bbe92` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 28.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 106 | advisory | 1.2s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 90 | blocking | 0.9s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 89 | blocking | 0.9s | 0 | `node scripts/check-visual-qa-retention.mjs --self-test` |
| 37 | blocking | 0.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 24 | blocking | 0.7s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 49 | blocking | 0.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 78 | blocking | 0.6s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 82 | blocking | 0.5s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 88 | blocking | 0.5s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 35 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
