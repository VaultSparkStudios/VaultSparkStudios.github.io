# Build Check Diagnostics

Generated: 2026-08-12T08:17:23.864Z
Receipt: `61d7ff8fe7dc3f7b7730e446` · coverage 295/295 from step 1

Latest: **295/295** passed · failed 0 · total 750.6s
Concentration: **13.7%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 102.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 253 | 62.4s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 286 | 44.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 55 | 43.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 127 | 22.5s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 119 | 19.2s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 275 | 17.5s | 0 | `node scripts/crawl-all-pages.mjs` |
| 91 | 13.3s | 0 | `node scripts/lint-repo.mjs` |
| 87 | 10.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 110 | 9.8s | 0 | `node scripts/csp-audit.mjs` |

## Failures

- None.
