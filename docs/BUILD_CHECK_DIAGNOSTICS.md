# Build Check Diagnostics

Generated: 2026-09-03T21:51:23.054Z
Receipt: `2e9c0e08a4aa0e08e7ce01b1` · coverage 388/388 from step 1

Latest: **388/388** passed · failed 0 · total 319.3s
Concentration: **15.1%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 48.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 32.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 263 | 30.3s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 96 | 10.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 133 | 7.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 245 | 6.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 6.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 93 | 6.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 97 | 5.6s | 0 | `node scripts/lint-repo.mjs` |
| 58 | 3.8s | 0 | `node scripts/run-build-check.mjs --self-test` |

## Failures

- None.
