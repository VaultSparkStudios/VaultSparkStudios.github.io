# Build Check Diagnostics

Generated: 2026-08-10T15:48:09.388Z
Receipt: `f018ad0dcf4c552779170353` · coverage 291/291 from step 1

Latest: **291/291** passed · failed 0 · total 301.7s
Concentration: **10.8%** in step 249 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 249 | 32.7s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 134 | 31.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 19.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 282 | 10.5s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 87 | 7.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 271 | 6.4s | 0 | `node scripts/crawl-all-pages.mjs` |
| 28 | 4.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 90 | 3.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 232 | 3.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 216 | 3.1s | 0 | `node scripts/check-image-formats.mjs --strict` |

## Failures

- None.
