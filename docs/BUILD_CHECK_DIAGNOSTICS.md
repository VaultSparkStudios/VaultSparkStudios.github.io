# Build Check Diagnostics

Generated: 2026-09-10T22:18:44.519Z
Receipt: `6ad512a0c27d56a87ee4ce41` · coverage 479/479 from step 1

Latest: **479/479** passed · failed 0 · total 169.6s
Concentration: **14.6%** in step 142 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 142 | 24.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 13.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 98 | 8.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 368 | 5.6s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 95 | 4.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 247 | 4.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 259 | 3.6s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 29 | 3.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 287 | 1.7s | 0 | `node scripts/crawl-all-pages.mjs` |
| 65 | 1.6s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- None.
