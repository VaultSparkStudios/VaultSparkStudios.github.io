# Build Check Diagnostics

Generated: 2026-08-18T05:15:02.184Z
Receipt: `2beb3ab073cd5111ba883f83` · coverage 317/317 from step 1

Latest: **317/317** passed · failed 0 · total 152.9s
Concentration: **17.3%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 26.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 257 | 20.2s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 11.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 94 | 6.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 4.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 240 | 3.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 2.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 231 | 2.2s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 279 | 1.4s | 0 | `node scripts/crawl-all-pages.mjs` |
| 56 | 1.4s | 0 | `node scripts/run-build-check.mjs --self-test` |

## Failures

- None.
