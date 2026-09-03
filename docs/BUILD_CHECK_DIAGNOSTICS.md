# Build Check Diagnostics

Generated: 2026-09-03T05:08:49.860Z
Receipt: `c8a1b360c5ad1b2dff821455` · coverage 388/388 from step 1

Latest: **388/388** passed · failed 0 · total 521.8s
Concentration: **12.3%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 64.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 37.9s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 296 | 21.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 61 | 20.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 287 | 15.0s | 0 | `node scripts/check-vocabulary-consistency.mjs` |
| 285 | 13.6s | 0 | `node scripts/crawl-all-pages.mjs` |
| 360 | 13.4s | 0 | `node scripts/check-mobile-runtime-contract.mjs` |
| 133 | 12.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 96 | 11.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 93 | 8.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |

## Failures

- None.
