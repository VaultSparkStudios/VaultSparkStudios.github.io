# Build Check Diagnostics

Generated: 2026-08-10T22:17:04.868Z
Receipt: `6cb3c439caa4e859d7c0eb8b` · coverage 291/291 from step 1

Latest: **291/291** passed · failed 0 · total 378.3s
Concentration: **13.0%** in step 123 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 123 | 49.3s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 134 | 39.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 23.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 249 | 22.4s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 87 | 17.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 91 | 14.1s | 0 | `node scripts/lint-repo.mjs` |
| 90 | 11.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 60 | 7.5s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 28 | 6.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 119 | 5.3s | 0 | `node scripts/check-mobile-contracts.mjs` |

## Failures

- None.
