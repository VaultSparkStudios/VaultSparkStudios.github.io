# Build Check Diagnostics

Generated: 2026-08-17T06:09:36.176Z
Receipt: `8b4541ab90e06cabb41bbe35` · coverage 309/309 from step 1

Latest: **309/309** passed · failed 0 · total 385.3s
Concentration: **19.3%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 74.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 253 | 26.3s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 87 | 18.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 91 | 17.4s | 0 | `node scripts/lint-repo.mjs` |
| 55 | 15.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 127 | 12.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 90 | 8.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 220 | 6.9s | 0 | `node scripts/check-image-formats.mjs --strict` |
| 286 | 6.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 119 | 6.2s | 0 | `node scripts/check-mobile-contracts.mjs` |

## Failures

- None.
