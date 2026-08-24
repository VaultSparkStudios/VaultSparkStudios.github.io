# Build Check Diagnostics

Generated: 2026-08-24T10:10:48.008Z
Receipt: `d56147dffabcaa9f9ebdb419` · coverage 357/370 from step 1

Latest: **356/357** passed · failed 1 · total 279.1s
Concentration: **15.3%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 42.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 31.9s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 17.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 7.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 93 | 6.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 244 | 4.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 283 | 3.8s | 0 | `node scripts/crawl-all-pages.mjs` |
| 29 | 3.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 133 | 3.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 256 | 2.4s | 0 | `node scripts/check-evidence-check-reachability.mjs` |

## Failures

- Step 357: `node scripts/check-mobile-runtime-contract.mjs` exited 1
