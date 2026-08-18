# Build Check Diagnostics

Generated: 2026-08-18T04:47:21.699Z
Receipt: `7cf9e7bc75da6643d77cfe39` · coverage 317/317 from step 1

Latest: **317/317** passed · failed 0 · total 146.9s
Concentration: **17.2%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 25.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 257 | 15.7s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 12.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 94 | 6.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 4.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 240 | 3.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 2.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 231 | 2.0s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 290 | 1.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 279 | 1.4s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
