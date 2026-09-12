# Build Check Diagnostics

Generated: 2026-09-12T02:05:59.702Z
Receipt: `6ef5eed78216301420874d00` · coverage 481/481 from step 1

Latest: **481/481** passed · failed 0 · total 180.3s
Concentration: **13.1%** in step 143 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 143 | 23.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 132 | 15.6s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 61 | 10.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 99 | 8.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 369 | 6.0s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 299 | 4.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 248 | 4.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 260 | 4.1s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 95 | 3.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 380 | 2.7s | 0 | `node scripts/check-build-gate-reachability.mjs` |

## Failures

- None.
