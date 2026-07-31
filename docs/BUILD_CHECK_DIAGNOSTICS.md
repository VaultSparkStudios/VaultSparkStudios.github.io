# Build Check Diagnostics

Generated: 2026-07-31T02:34:57.678Z
Receipt: `fec3c8f699552ab0c0883fd1` · coverage 261/261 from step 1

Latest: **261/261** passed · failed 0 · total 92.1s
Concentration: **16.7%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 15.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 10.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 3.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 2.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 11 | 2.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 210 | 1.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 242 | 1.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 110 | 1.0s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 95 | 0.9s | 0 | `node scripts/verify-supply-chain.mjs` |
| 74 | 0.8s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
