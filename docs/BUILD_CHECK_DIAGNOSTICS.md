# Build Check Diagnostics

Generated: 2026-09-04T03:11:37.429Z
Receipt: `1e3484976b80413f83dc0eb7` · coverage 388/388 from step 1

Latest: **388/388** passed · failed 0 · total 170.6s
Concentration: **16.2%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 27.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 22.8s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 11.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 7.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 245 | 3.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 93 | 3.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 133 | 2.6s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 29 | 2.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 236 | 1.7s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 257 | 1.5s | 0 | `node scripts/check-evidence-check-reachability.mjs` |

## Failures

- None.
