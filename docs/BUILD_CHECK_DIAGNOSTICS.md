# Build Check Diagnostics

Generated: 2026-07-30T01:39:54.227Z
Receipt: `dc981d4c96683fbdf03e2197` · coverage 255/255 from step 1

Latest: **255/255** passed · failed 0 · total 169.3s
Concentration: **14.2%** in step 38 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 38 | 24.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 117 | 19.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 11 | 11.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 70 | 7.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 4.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 42 | 2.4s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 95 | 1.9s | 0 | `node scripts/verify-supply-chain.mjs` |
| 208 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 74 | 1.5s | 0 | `node scripts/lint-repo.mjs` |
| 240 | 1.4s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
