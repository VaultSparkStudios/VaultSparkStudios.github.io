# Build Check Diagnostics

Generated: 2026-11-20T05:31:44.367Z
Receipt: `8f1d4f91ebb642a8675b8a70` · coverage 103/562 from step 258

Latest: **102/103** passed · failed 1 · total 175.6s
Concentration: **13.0%** in step 291 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 291 | 22.8s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 332 | 22.0s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 279 | 12.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 323 | 8.5s | 0 | `node scripts/check-vocabulary-consistency.mjs` |
| 347 | 5.7s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 287 | 5.1s | 0 | `node scripts/check-evidence-graph.mjs` |
| 303 | 4.3s | 0 | `node scripts/check-page-script-relevance.mjs` |
| 321 | 3.8s | 0 | `node scripts/crawl-all-pages.mjs` |
| 265 | 2.7s | 0 | `node scripts/check-local-references.mjs` |
| 318 | 2.7s | 0 | `node scripts/check-meta-descriptions.mjs` |

## Failures

- Step 360: `node scripts/build-news-freshness.mjs --check` exited 1
