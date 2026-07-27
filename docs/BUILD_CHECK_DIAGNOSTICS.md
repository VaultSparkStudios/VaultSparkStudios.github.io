# Build Check Diagnostics

Generated: 2026-07-27T09:57:39.333Z

Latest: **244/244** passed · failed 0 · total 130.0s
Concentration: **11.7%** in step 108 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 108 | 15.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 29 | 12.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 61 | 6.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 4.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 64 | 4.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 86 | 3.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 240 | 2.5s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 229 | 2.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 197 | 1.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 33 | 1.7s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- None.
