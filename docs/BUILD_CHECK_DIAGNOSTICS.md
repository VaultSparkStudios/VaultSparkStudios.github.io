# Build Check Diagnostics

Generated: 2026-09-03T19:53:43.330Z
Receipt: `c25b5f35a99809ef4329eaa3` · coverage 388/388 from step 1

Latest: **388/388** passed · failed 0 · total 457.4s
Concentration: **15.0%** in step 133 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 133 | 68.6s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 140 | 51.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 34.4s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 21.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 10.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 93 | 8.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 360 | 6.9s | 0 | `node scripts/check-mobile-runtime-contract.mjs` |
| 97 | 6.8s | 0 | `node scripts/lint-repo.mjs` |
| 245 | 5.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 125 | 4.9s | 0 | `node scripts/check-mobile-contracts.mjs` |

## Failures

- None.
