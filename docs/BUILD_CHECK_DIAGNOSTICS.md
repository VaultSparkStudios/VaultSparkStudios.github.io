# Build Check Diagnostics

Generated: 2026-08-19T04:51:36.824Z
Receipt: `26d5e626cec551d80b0dbf3f` · coverage 319/319 from step 1

Latest: **319/319** passed · failed 0 · total 62.4s
Concentration: **13.8%** in step 94 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 94 | 8.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 59 | 6.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 138 | 6.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 242 | 3.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 91 | 1.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 292 | 1.0s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 281 | 0.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 29 | 0.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 187 | 0.7s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |
| 96 | 0.7s | 0 | `node scripts/validate-module-imports.mjs` |

## Failures

- None.
