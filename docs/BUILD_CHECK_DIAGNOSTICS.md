# Build Check Diagnostics

Generated: 2026-07-27T08:17:29.924Z

Latest: **244/244** passed · failed 0 · total 120.4s
Concentration: **10.8%** in step 108 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 108 | 13.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 29 | 8.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 197 | 3.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 61 | 3.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 64 | 3.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 229 | 2.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 240 | 2.6s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 2 | 2.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 86 | 2.0s | 0 | `node scripts/verify-supply-chain.mjs` |
| 157 | 1.3s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |

## Failures

- None.
