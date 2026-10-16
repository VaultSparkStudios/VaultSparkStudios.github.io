# Build Check Diagnostics

Generated: 2026-10-16T14:41:57.211Z
Receipt: `7a849806a63d6fc756dd11b2` · coverage 312/537 from step 226

Latest: **312/312** passed · failed 0 · total 177.8s
Concentration: **12.9%** in step 510 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 510 | 23.0s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 273 | 10.0s | 0 | `node scripts/check-evidence-graph.mjs` |
| 277 | 8.0s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 407 | 7.2s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 265 | 5.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 508 | 3.4s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 421 | 3.1s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 537 | 3.0s | 0 | `node scripts/verify-browser-collection.mjs` |
| 307 | 2.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 249 | 2.5s | 0 | `node scripts/check-image-formats.mjs --strict` |

## Failures

- None.
