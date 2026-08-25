# Build Check Diagnostics

Generated: 2026-08-25T08:06:23.386Z
Receipt: `5b161759ad0215b968503edb` · coverage 370/370 from step 1

Latest: **370/370** passed · failed 0 · total 451.2s
Concentration: **14.2%** in step 61 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 61 | 64.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 140 | 49.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 42.9s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 29 | 18.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 58 | 16.9s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 93 | 11.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 66 | 10.2s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 96 | 8.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 63 | 6.3s | 0 | `node scripts/check-lighthouse-route-tiers.mjs` |
| 244 | 4.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |

## Failures

- None.
