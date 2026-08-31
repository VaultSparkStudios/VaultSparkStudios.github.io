# Build Check Diagnostics

Generated: 2026-08-31T21:35:19.869Z
Receipt: `52c8dc0e5634d20da5681cfe` · coverage 372/372 from step 1

Latest: **372/372** passed · failed 0 · total 2245.3s
Concentration: **14.2%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 318.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 97 | 317.1s | 0 | `node scripts/lint-repo.mjs` |
| 61 | 161.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 156.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 263 | 106.6s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 125 | 76.7s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 93 | 68.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 98 | 66.0s | 0 | `node scripts/validate-module-imports.mjs` |
| 66 | 59.1s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 133 | 56.4s | 0 | `node scripts/build-geo-vitals.mjs --check` |

## Failures

- None.
