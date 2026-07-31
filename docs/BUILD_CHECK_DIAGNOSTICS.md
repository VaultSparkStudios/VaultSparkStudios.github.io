# Build Check Diagnostics

Generated: 2026-07-31T03:01:26.659Z
Receipt: `d592aef179f49a4da1c7282e` · coverage 261/261 from step 1

Latest: **261/261** passed · failed 0 · total 85.3s
Concentration: **16.9%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 14.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 9.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 3.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 2.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 11 | 2.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 210 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 242 | 1.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 95 | 0.8s | 0 | `node scripts/verify-supply-chain.mjs` |
| 110 | 0.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 74 | 0.7s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
