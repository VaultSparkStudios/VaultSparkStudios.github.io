# Build Check Diagnostics

Generated: 2026-08-27T20:56:39.825Z
Receipt: `868ea4fee18d51a47d994b83` · coverage 370/370 from step 1

Latest: **370/370** passed · failed 0 · total 690.6s
Concentration: **15.1%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 104.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 56.9s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 54.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 93 | 23.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 97 | 20.5s | 0 | `node scripts/lint-repo.mjs` |
| 29 | 20.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 133 | 13.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 96 | 12.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 66 | 9.8s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 58 | 7.4s | 0 | `node scripts/run-build-check.mjs --self-test` |

## Failures

- None.
