# Build Check Diagnostics

Generated: 2026-08-31T04:06:37.503Z
Receipt: `bd0dab16ee1514f5d80b3d15` · coverage 371/371 from step 1

Latest: **371/371** passed · failed 0 · total 676.2s
Concentration: **17.6%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 119.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 262 | 71.6s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 46.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 93 | 18.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 295 | 15.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 29 | 15.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 284 | 11.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 96 | 10.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 58 | 9.0s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 244 | 5.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |

## Failures

- None.
