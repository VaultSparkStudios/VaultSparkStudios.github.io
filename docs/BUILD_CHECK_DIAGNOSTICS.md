# Build Check Diagnostics

Generated: 2026-10-08T14:56:25.102Z
Receipt: `8e96c5c2fc5cdd6bafad2a49` · coverage 285/530 from step 246

Latest: **285/285** passed · failed 0 · total 522.6s
Concentration: **8.5%** in step 273 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 273 | 44.6s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 505 | 19.0s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 252 | 16.4s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 403 | 15.4s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 280 | 7.7s | 0 | `node scripts/check-evidence-graph-coverage.mjs --self-test` |
| 261 | 7.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 388 | 6.8s | 0 | `node scripts/check-workflow-git-add-pathspecs.mjs` |
| 305 | 6.7s | 0 | `node scripts/check-vocabulary-consistency.mjs` |
| 314 | 5.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 250 | 5.6s | 0 | `node scripts/check-content-hotfix-gate.mjs --self-test` |

## Failures

- None.
