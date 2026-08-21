# Build Check Diagnostics

Generated: 2026-08-21T18:06:33.611Z
Receipt: `769ba30a0f69d6c8c38b03e3` · coverage 368/368 from step 1

Latest: **368/368** passed · failed 0 · total 476.6s
Concentration: **13.5%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 64.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 51.8s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 27.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 133 | 14.9s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 66 | 12.5s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 93 | 10.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 96 | 7.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 244 | 7.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 6.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 235 | 6.4s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |

## Failures

- None.
