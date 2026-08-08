# Build Check Diagnostics

Generated: 2026-08-08T22:00:51.773Z
Receipt: `bfb0f02caace42449380a22a` · coverage 288/288 from step 1

Latest: **288/288** passed · failed 0 · total 837.9s
Concentration: **11.2%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 93.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 87.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 52 | 32.8s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 28 | 20.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 87 | 19.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 232 | 18.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 279 | 14.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 268 | 12.5s | 0 | `node scripts/crawl-all-pages.mjs` |
| 227 | 10.5s | 0 | `node scripts/check-placeholder-orphans.mjs` |
| 90 | 9.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |

## Failures

- None.
