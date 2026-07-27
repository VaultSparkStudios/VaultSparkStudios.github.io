# Build Check Diagnostics

Generated: 2026-07-27T08:58:07.278Z

Latest: **244/244** passed · failed 0 · total 86.3s
Concentration: **17.1%** in step 108 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 108 | 14.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 29 | 8.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 61 | 3.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 64 | 3.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 86 | 2.0s | 0 | `node scripts/verify-supply-chain.mjs` |
| 2 | 1.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 197 | 1.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 33 | 1.3s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 229 | 1.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 240 | 1.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
