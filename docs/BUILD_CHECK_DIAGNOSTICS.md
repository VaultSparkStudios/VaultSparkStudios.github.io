# Build Check Diagnostics

Generated: 2026-10-20T19:43:50.411Z
Receipt: `8d8b662c8ff10533f239eee7` · coverage 272/545 from step 274

Latest: **272/272** passed · failed 0 · total 278.2s
Concentration: **7.8%** in step 518 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 518 | 21.6s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 285 | 17.6s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 415 | 17.5s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 429 | 6.9s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 545 | 5.6s | 0 | `node scripts/verify-browser-collection.mjs` |
| 315 | 5.5s | 0 | `node scripts/crawl-all-pages.mjs` |
| 281 | 5.4s | 0 | `node scripts/check-evidence-graph.mjs` |
| 341 | 4.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 516 | 3.9s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 439 | 3.7s | 0 | `node scripts/check-site-integrity.mjs` |

## Failures

- None.
