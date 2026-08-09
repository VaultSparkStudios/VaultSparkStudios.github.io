# Build Check Diagnostics

Generated: 2026-08-09T09:54:57.914Z
Receipt: `58ca66263b37ba0c27f9dd1c` · coverage 288/288 from step 1

Latest: **288/288** passed · failed 0 · total 448.5s
Concentration: **13.9%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 62.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 54.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 28 | 17.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 87 | 16.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 52 | 12.7s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 127 | 11.6s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 91 | 9.2s | 0 | `node scripts/lint-repo.mjs` |
| 92 | 7.8s | 0 | `node scripts/validate-module-imports.mjs` |
| 23 | 7.0s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 90 | 6.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |

## Failures

- None.
