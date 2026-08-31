# Build Check Diagnostics

Generated: 2026-08-31T05:19:00.656Z
Receipt: `e6e13e8d0bfdcf54b7c87d20` · coverage 371/371 from step 1

Latest: **371/371** passed · failed 0 · total 1087.6s
Concentration: **18.2%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 198.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 262 | 100.8s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 53.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 133 | 47.4s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 93 | 29.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 66 | 28.9s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 98 | 27.0s | 0 | `node scripts/validate-module-imports.mjs` |
| 96 | 18.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 29 | 13.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 295 | 12.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
