# Build Check Diagnostics

Generated: 2026-09-14T02:56:44.761Z
Receipt: `6962b95590bbaec8339067ec` · coverage 483/483 from step 1

Latest: **483/483** passed · failed 0 · total 270.4s
Concentration: **9.1%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 24.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 301 | 14.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 61 | 11.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 99 | 9.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 371 | 8.2s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 250 | 5.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 262 | 5.0s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 382 | 4.2s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 95 | 3.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 290 | 3.3s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
