# Build Check Diagnostics

Generated: 2026-07-28T00:56:15.311Z
Receipt: `3a8198b02de1054e1ecd57a3` · coverage 253/253 from step 1

Latest: **253/253** passed · failed 0 · total 81.1s
Concentration: **13.9%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 11.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 8.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 4.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 3.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 249 | 1.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 206 | 1.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 95 | 1.7s | 0 | `node scripts/verify-supply-chain.mjs` |
| 11 | 1.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 238 | 1.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 166 | 0.9s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |

## Failures

- None.
