# Build Check Diagnostics

Generated: 2026-09-07T05:24:47.628Z
Receipt: `4e6ed71c8fa6f9e5ef8036b7` · coverage 390/390 from step 1

Latest: **390/390** passed · failed 0 · total 214.3s
Concentration: **15.6%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 33.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 25.8s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 11.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 7.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 93 | 4.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 245 | 3.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 296 | 3.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 133 | 2.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 29 | 2.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 285 | 2.3s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
