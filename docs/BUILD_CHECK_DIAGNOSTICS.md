# Build Check Diagnostics

Generated: 2026-08-14T06:00:39.440Z
Receipt: `1240335a38c680aa5369fbd4` · coverage 295/295 from step 1

Latest: **295/295** passed · failed 0 · total 139.9s
Concentration: **13.1%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 18.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 14.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 253 | 8.9s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 28 | 5.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 90 | 3.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 87 | 3.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 60 | 3.1s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 220 | 2.1s | 0 | `node scripts/check-image-formats.mjs --strict` |
| 286 | 2.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 236 | 2.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |

## Failures

- None.
