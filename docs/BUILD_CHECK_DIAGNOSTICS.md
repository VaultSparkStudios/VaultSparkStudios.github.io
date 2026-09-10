# Build Check Diagnostics

Generated: 2026-09-10T08:25:24.442Z
Receipt: `da2b194e75d69424328aba16` · coverage 479/479 from step 1

Latest: **479/479** passed · failed 0 · total 140.0s
Concentration: **14.1%** in step 142 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 142 | 19.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 98 | 8.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 8.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 298 | 5.5s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 368 | 4.5s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 247 | 4.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 95 | 3.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 259 | 3.1s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 29 | 1.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 287 | 1.6s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
