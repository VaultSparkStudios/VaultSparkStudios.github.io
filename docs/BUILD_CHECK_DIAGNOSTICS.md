# Build Check Diagnostics

Generated: 2026-09-12T02:52:17.999Z
Receipt: `63c425e50c9b9b93c7fce982` · coverage 481/481 from step 1

Latest: **481/481** passed · failed 0 · total 141.7s
Concentration: **14.4%** in step 143 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 143 | 20.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 8.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 99 | 7.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 369 | 5.1s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 248 | 3.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 260 | 3.7s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 95 | 3.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 136 | 2.1s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 299 | 2.0s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 29 | 1.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- None.
