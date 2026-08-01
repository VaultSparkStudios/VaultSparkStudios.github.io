# Build Check Diagnostics

Generated: 2026-08-01T06:18:16.452Z
Receipt: `1835fce299df472f08aab892` · coverage 267/267 from step 1

Latest: **267/267** passed · failed 0 · total 256.2s
Concentration: **14.0%** in step 43 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 43 | 35.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 122 | 27.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 16 | 13.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 75 | 8.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 78 | 4.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 247 | 4.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 11 | 3.7s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 215 | 3.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 100 | 2.8s | 0 | `node scripts/verify-supply-chain.mjs` |
| 168 | 1.8s | 0 | `node scripts/analyze-home-lcp.mjs --self-test` |

## Failures

- None.
