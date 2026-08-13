# Build Check Diagnostics

Generated: 2026-08-13T20:01:44.858Z
Receipt: `dd89723a93fed70d3c55ef89` · coverage 295/295 from step 1

Latest: **295/295** passed · failed 0 · total 65.2s
Concentration: **15.6%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 10.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 253 | 7.1s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 55 | 4.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 90 | 3.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 87 | 1.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 286 | 1.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 236 | 1.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 127 | 1.1s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 275 | 0.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 28 | 0.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- None.
