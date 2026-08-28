# Build Check Diagnostics

Generated: 2026-08-28T19:41:56.080Z
Receipt: `9390ed22ab9df512bb37e608` · coverage 370/370 from step 1

Latest: **370/370** passed · failed 0 · total 332.1s
Concentration: **20.3%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 67.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 50.4s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 20.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 93 | 6.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 96 | 5.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 29 | 4.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 244 | 4.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 256 | 4.2s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 133 | 3.5s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 97 | 3.2s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
