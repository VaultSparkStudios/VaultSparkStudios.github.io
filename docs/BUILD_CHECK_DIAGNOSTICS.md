# Build Check Diagnostics

Generated: 2026-08-20T04:58:57.086Z
Receipt: `6f375579f6897fd4e974874f` · coverage 327/327 from step 1

Latest: **327/327** passed · failed 0 · total 209.0s
Concentration: **17.8%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 37.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 259 | 25.4s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 16.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 94 | 7.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 6.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 242 | 3.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 2.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 63 | 2.2s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 233 | 1.9s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 292 | 1.7s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
