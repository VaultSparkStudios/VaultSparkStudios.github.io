# Build Check Diagnostics

Generated: 2026-07-27T10:37:54.748Z

Latest: **244/244** passed · failed 0 · total 82.1s
Concentration: **16.1%** in step 108 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 108 | 13.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 29 | 9.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 61 | 3.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 64 | 3.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 2 | 2.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 86 | 2.1s | 0 | `node scripts/verify-supply-chain.mjs` |
| 197 | 1.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 240 | 1.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 229 | 1.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 156 | 0.9s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --self-test` |

## Failures

- None.
