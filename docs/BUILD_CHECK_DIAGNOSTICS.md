# Build Check Diagnostics

Generated: 2026-07-31T03:12:28.359Z
Receipt: `89a74f54c07f5f034cb4470c` · coverage 261/261 from step 1

Latest: **261/261** passed · failed 0 · total 85.6s
Concentration: **16.7%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 14.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 9.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 3.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 2.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 11 | 2.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 210 | 1.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 242 | 1.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 95 | 0.9s | 0 | `node scripts/verify-supply-chain.mjs` |
| 110 | 0.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 74 | 0.6s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
