# Build Check Diagnostics

Generated: 2026-08-31T20:03:42.846Z
Receipt: `d79d03aed9383dbfe1c5c70d` · coverage 372/372 from step 1

Latest: **372/372** passed · failed 0 · total 1191.8s
Concentration: **12.1%** in step 133 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 133 | 144.6s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 140 | 110.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 129 | 87.5s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 263 | 71.0s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 97 | 61.6s | 0 | `node scripts/lint-repo.mjs` |
| 61 | 49.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 93 | 31.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 98 | 30.5s | 0 | `node scripts/validate-module-imports.mjs` |
| 58 | 23.1s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 29 | 22.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- None.
