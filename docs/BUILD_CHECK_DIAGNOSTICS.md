# Build Check Diagnostics

Generated: 2026-08-24T10:52:02.325Z
Receipt: `935d06508dbbfef08d0db1ff` · coverage 370/370 from step 1

Latest: **370/370** passed · failed 0 · total 239.8s
Concentration: **17.1%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 40.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 29.2s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 17.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 6.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 93 | 6.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 3.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 244 | 3.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 256 | 2.7s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 133 | 2.6s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 235 | 2.3s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |

## Failures

- None.
