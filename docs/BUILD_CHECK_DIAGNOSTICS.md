# Build Check Diagnostics

Generated: 2026-07-27T10:02:35.229Z

Latest: **244/244** passed · failed 0 · total 96.9s
Concentration: **14.9%** in step 108 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 108 | 14.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 29 | 10.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 61 | 4.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 64 | 3.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 86 | 2.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 2 | 2.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 197 | 2.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 240 | 1.7s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 229 | 1.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 33 | 1.2s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- None.
