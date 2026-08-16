# Build Check Diagnostics

Generated: 2026-08-16T04:36:53.654Z
Receipt: `c9741f4eb9178f111884375b` · coverage 300/300 from step 1

Latest: **300/300** passed · failed 0 · total 411.8s
Concentration: **19.0%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 78.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 31.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 253 | 29.8s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 87 | 11.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 28 | 9.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 90 | 7.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 6.8s | 0 | `node scripts/lint-repo.mjs` |
| 286 | 5.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 119 | 5.3s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 275 | 4.8s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
