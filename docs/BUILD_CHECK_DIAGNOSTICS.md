# Build Check Diagnostics

Generated: 2026-07-31T01:58:42.664Z
Receipt: `a442c0b83b014e57d5972288` · coverage 260/260 from step 1

Latest: **260/260** passed · failed 0 · total 102.5s
Concentration: **17.3%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 17.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 11.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 3.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 3.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 11 | 2.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 210 | 1.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 242 | 1.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 166 | 1.0s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |
| 95 | 1.0s | 0 | `node scripts/verify-supply-chain.mjs` |
| 42 | 0.9s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- None.
