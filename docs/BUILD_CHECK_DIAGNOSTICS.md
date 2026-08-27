# Build Check Diagnostics

Generated: 2026-08-27T05:55:32.498Z
Receipt: `41b8a79b5945a28cf0e6719e` · coverage 370/370 from step 1

Latest: **370/370** passed · failed 0 · total 522.9s
Concentration: **20.5%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 107.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 57.3s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 40.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 129 | 29.0s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 29 | 13.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 93 | 11.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 133 | 10.3s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 96 | 9.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 294 | 8.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 244 | 7.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |

## Failures

- None.
