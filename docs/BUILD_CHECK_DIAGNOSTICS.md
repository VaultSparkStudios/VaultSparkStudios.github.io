# Build Check Diagnostics

Generated: 2026-08-01T22:43:17.682Z
Receipt: `8c338ec85044a9c6145b1b0b` · coverage 267/267 from step 1

Latest: **267/267** passed · failed 0 · total 316.5s
Concentration: **18.3%** in step 122 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 122 | 58.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 43 | 28.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 75 | 12.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 16 | 6.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 247 | 6.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 258 | 3.6s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 78 | 3.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 11 | 3.2s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 100 | 3.2s | 0 | `node scripts/verify-supply-chain.mjs` |
| 254 | 3.0s | 0 | `node scripts/build-tt-readiness.mjs --self-test` |

## Failures

- None.
