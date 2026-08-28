# Build Check Diagnostics

Generated: 2026-08-28T08:50:11.965Z
Receipt: `c5ca3cc152bb56e2e9f6dd12` · coverage 370/370 from step 1

Latest: **370/370** passed · failed 0 · total 715.3s
Concentration: **9.9%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 70.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 60.9s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 46.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 283 | 20.7s | 0 | `node scripts/crawl-all-pages.mjs` |
| 93 | 18.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 294 | 14.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 29 | 13.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 96 | 11.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 357 | 8.8s | 0 | `node scripts/check-mobile-runtime-contract.mjs` |
| 335 | 8.7s | 0 | `node scripts/check-hardfail-resilience.mjs` |

## Failures

- None.
