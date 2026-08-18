# Build Check Diagnostics

Generated: 2026-08-18T02:24:00.092Z
Receipt: `8b25ec1d8d94c08dfee263d2` · coverage 317/317 from step 1

Latest: **317/317** passed · failed 0 · total 179.2s
Concentration: **16.9%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 30.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 257 | 19.0s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 14.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 94 | 7.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 4.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 240 | 3.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 3.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 279 | 2.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 231 | 2.3s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 290 | 1.6s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
