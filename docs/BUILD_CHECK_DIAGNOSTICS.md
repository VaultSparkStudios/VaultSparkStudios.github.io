# Build Check Diagnostics

Generated: 2026-07-29T20:10:20.234Z
Receipt: `7a4123b72bebaf03da346c19` · coverage 255/255 from step 1

Latest: **255/255** passed · failed 0 · total 152.2s
Concentration: **28.5%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 43.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 20.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 4.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 11 | 4.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 73 | 3.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 95 | 1.9s | 0 | `node scripts/verify-supply-chain.mjs` |
| 208 | 1.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 42 | 1.4s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 240 | 1.4s | 0 | `node scripts/crawl-all-pages.mjs` |
| 94 | 1.1s | 0 | `node scripts/check-sri.mjs` |

## Failures

- None.
