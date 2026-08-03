# Build Check Diagnostics

Generated: 2026-08-03T00:58:40.538Z
Receipt: `c3ec3b443d590b26e13b26ef` · coverage 267/267 from step 1

Latest: **267/267** passed · failed 0 · total 115.9s
Concentration: **16.1%** in step 122 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 122 | 18.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 43 | 13.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 75 | 4.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 16 | 3.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 78 | 2.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 215 | 2.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 100 | 1.5s | 0 | `node scripts/verify-supply-chain.mjs` |
| 258 | 1.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 247 | 1.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 11 | 1.0s | 0 | `node scripts/check-capability-discovery-contract.mjs` |

## Failures

- None.
