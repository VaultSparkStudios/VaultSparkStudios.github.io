# Build Check Diagnostics

Generated: 2026-07-31T02:25:58.301Z
Receipt: `15441bb6b601fe81480d8ffd` · coverage 261/261 from step 1

Latest: **261/261** passed · failed 0 · total 86.7s
Concentration: **18.9%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 16.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 9.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 3.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 2.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 11 | 2.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 210 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 242 | 1.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 110 | 0.9s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 95 | 0.8s | 0 | `node scripts/verify-supply-chain.mjs` |
| 74 | 0.8s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
