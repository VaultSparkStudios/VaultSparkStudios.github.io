# Build Check Diagnostics

Generated: 2026-07-31T07:03:13.016Z
Receipt: `8cc75a462fe83639b7a8edfe` · coverage 261/261 from step 1

Latest: **261/261** passed · failed 0 · total 190.9s
Concentration: **16.1%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 30.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 28.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 8.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 4.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 11 | 3.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 210 | 2.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 95 | 2.0s | 0 | `node scripts/verify-supply-chain.mjs` |
| 74 | 1.9s | 0 | `node scripts/lint-repo.mjs` |
| 242 | 1.7s | 0 | `node scripts/crawl-all-pages.mjs` |
| 165 | 1.6s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --self-test` |

## Failures

- None.
