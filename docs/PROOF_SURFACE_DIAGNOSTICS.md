# Proof Surface Diagnostics

Generated: 2026-10-25T18:30:34.202Z
Receipt: `f88387abe1a495073b441a6e` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 164.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 78 | blocking | 11.9s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 65 | blocking | 6.8s | 0 | `node scripts/check-content-coherence.mjs` |
| 88 | blocking | 4.6s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 22 | blocking | 4.5s | 0 | `node scripts/check-schema-coverage.mjs` |
| 49 | blocking | 3.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 38 | blocking | 3.4s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 61 | blocking | 3.4s | 0 | `node scripts/build-proposed-edges.mjs --check` |
| 37 | blocking | 3.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 40 | blocking | 3.2s | 0 | `node scripts/build-newsroom-run.mjs --check` |
| 60 | blocking | 2.8s | 0 | `node scripts/build-proposed-edges.mjs --self-test` |

## Failures

- None.
