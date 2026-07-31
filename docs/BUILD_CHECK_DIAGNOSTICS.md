# Build Check Diagnostics

Generated: 2026-07-31T20:21:14.650Z
Receipt: `aab370ba47673baec551bfe1` · coverage 262/262 from step 1

Latest: **262/262** passed · failed 0 · total 178.3s
Concentration: **17.1%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 30.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 16.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 6.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 11 | 4.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 73 | 3.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 242 | 2.5s | 0 | `node scripts/crawl-all-pages.mjs` |
| 210 | 2.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 95 | 1.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 253 | 1.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 165 | 1.1s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --self-test` |

## Failures

- None.
