# Build Check Diagnostics

Generated: 2026-08-18T23:17:00.378Z
Receipt: `4e61dc5fd3480ac51478433c` · coverage 319/319 from step 1

Latest: **319/319** passed · failed 0 · total 552.7s
Concentration: **16.5%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 91.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 59 | 61.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 131 | 38.3s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 259 | 33.8s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 91 | 15.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 95 | 11.5s | 0 | `node scripts/lint-repo.mjs` |
| 96 | 10.9s | 0 | `node scripts/validate-module-imports.mjs` |
| 94 | 10.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 29 | 10.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 56 | 9.0s | 0 | `node scripts/run-build-check.mjs --self-test` |

## Failures

- None.
