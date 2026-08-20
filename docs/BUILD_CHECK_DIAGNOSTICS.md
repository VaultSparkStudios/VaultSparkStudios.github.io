# Build Check Diagnostics

Generated: 2026-08-20T05:58:57.447Z
Receipt: `fecfca3a5628d37ec05050a0` · coverage 327/327 from step 1

Latest: **327/327** passed · failed 0 · total 266.4s
Concentration: **13.4%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 35.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 259 | 27.9s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 265 | 19.0s | 0 | `node scripts/check-page-script-relevance.mjs` |
| 59 | 16.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 292 | 9.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 281 | 6.8s | 0 | `node scripts/crawl-all-pages.mjs` |
| 94 | 6.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 5.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 242 | 3.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 3.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- None.
