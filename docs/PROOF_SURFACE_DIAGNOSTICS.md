# Proof Surface Diagnostics

Generated: 2026-10-10T01:44:12.207Z
Receipt: `c7bfb6d9100b32f693bb6a6f` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 14.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 38 | blocking | 0.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 37 | blocking | 0.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 78 | blocking | 0.7s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 65 | blocking | 0.5s | 0 | `node scripts/check-content-coherence.mjs` |
| 49 | blocking | 0.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 59 | blocking | 0.3s | 0 | `node scripts/check-decision-currency.mjs` |
| 46 | blocking | 0.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 106 | advisory | 0.3s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 22 | blocking | 0.3s | 0 | `node scripts/check-schema-coverage.mjs` |
| 92 | blocking | 0.2s | 0 | `node scripts/generate-sitemap.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
