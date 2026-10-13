# Build Check Diagnostics

Generated: 2026-10-13T04:29:39.946Z
Receipt: `06b343e93b37d14879aaa9f7` · coverage 270/534 from step 265

Latest: **270/270** passed · failed 0 · total 166.6s
Concentration: **14.6%** in step 509 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 509 | 24.4s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 277 | 15.3s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 407 | 8.9s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 265 | 5.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 507 | 3.4s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 307 | 2.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 421 | 2.4s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 392 | 2.0s | 0 | `node scripts/check-workflow-git-add-pathspecs.mjs` |
| 378 | 1.9s | 0 | `node scripts/check-orphan-libs.mjs --check` |
| 273 | 1.7s | 0 | `node scripts/check-evidence-graph.mjs` |

## Failures

- None.
