# Build Check Diagnostics

Generated: 2026-07-30T20:09:15.303Z
Receipt: `bb0e5bb52b7662f35cb05c49` · coverage 257/257 from step 1

Latest: **257/257** passed · failed 0 · total 77.3s
Concentration: **15.8%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 12.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 9.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 2.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 2.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 11 | 1.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 210 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 95 | 1.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 242 | 1.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 253 | 0.7s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 106 | 0.7s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |

## Failures

- None.
