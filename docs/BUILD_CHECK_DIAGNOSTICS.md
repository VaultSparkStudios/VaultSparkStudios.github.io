# Build Check Diagnostics

Generated: 2026-10-07T15:14:51.606Z
Receipt: `f5afab3264f033f0867df1a0` · coverage 286/530 from step 245

Latest: **286/286** passed · failed 0 · total 474.9s
Concentration: **9.4%** in step 403 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 403 | 44.7s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 505 | 27.6s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 273 | 24.5s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 417 | 17.2s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 399 | 14.7s | 0 | `node scripts/check-mobile-runtime-contract.mjs` |
| 388 | 14.6s | 0 | `node scripts/check-workflow-git-add-pathspecs.mjs` |
| 428 | 10.2s | 0 | `node scripts/generate-evidence-hub.mjs --check` |
| 387 | 7.8s | 0 | `node scripts/check-workflow-git-add-pathspecs.mjs --self-test` |
| 404 | 6.8s | 0 | `node scripts/check-workflow-audit-targets.mjs` |
| 503 | 6.5s | 0 | `node scripts/generate-news-art.mjs --self-test` |

## Failures

- None.
