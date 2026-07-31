# Build Check Diagnostics

Generated: 2026-07-31T03:05:08.658Z
Receipt: `e623bb4c37ac5cc624fad4d9` · coverage 261/261 from step 1

Latest: **261/261** passed · failed 0 · total 87.1s
Concentration: **16.4%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 14.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 10.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 3.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 2.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 11 | 2.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 210 | 1.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 242 | 1.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 95 | 1.0s | 0 | `node scripts/verify-supply-chain.mjs` |
| 110 | 0.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 74 | 0.8s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
