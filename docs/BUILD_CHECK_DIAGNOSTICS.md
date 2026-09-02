# Build Check Diagnostics

Generated: 2026-09-02T00:57:57.679Z
Receipt: `56efb9f622f200935b2f2d41` · coverage 378/378 from step 1

Latest: **378/378** passed · failed 0 · total 230.2s
Concentration: **10.8%** in step 296 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 296 | 24.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 129 | 20.6s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 140 | 16.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 14.5s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 96 | 10.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 236 | 9.8s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 61 | 9.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 245 | 8.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 93 | 4.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 133 | 3.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |

## Failures

- None.
