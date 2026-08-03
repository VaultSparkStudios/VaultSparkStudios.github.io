# Build Check Diagnostics

Generated: 2026-08-03T06:05:43.090Z
Receipt: `60e9e1412994b3de2f3204cc` · coverage 269/269 from step 1

Latest: **269/269** passed · failed 0 · total 374.5s
Concentration: **14.1%** in step 122 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 122 | 52.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 43 | 51.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 16 | 16.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 75 | 10.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 260 | 5.7s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 11 | 4.9s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 78 | 4.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 249 | 3.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 215 | 2.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 81 | 2.2s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js` |

## Failures

- None.
