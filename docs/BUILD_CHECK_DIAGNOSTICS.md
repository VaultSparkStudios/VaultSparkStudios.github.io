# Build Check Diagnostics

Generated: 2026-07-31T09:17:32.182Z
Receipt: `a17d72f372e8c425b9409b01` · coverage 262/262 from step 1

Latest: **262/262** passed · failed 0 · total 126.1s
Concentration: **12.1%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 15.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 10.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 11 | 8.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 70 | 3.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 3.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 210 | 1.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 95 | 1.7s | 0 | `node scripts/verify-supply-chain.mjs` |
| 165 | 1.5s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --self-test` |
| 166 | 1.4s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |
| 164 | 1.4s | 0 | `node scripts/analyze-home-lcp.mjs --check` |

## Failures

- None.
