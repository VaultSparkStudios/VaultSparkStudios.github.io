# Build Check Diagnostics

Generated: 2026-08-19T04:56:18.377Z
Receipt: `fe932d0fe69e64f15864a813` · coverage 319/319 from step 1

Latest: **319/319** passed · failed 0 · total 59.9s
Concentration: **13.5%** in step 94 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 94 | 8.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 59 | 6.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 138 | 6.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 242 | 3.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 91 | 0.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 281 | 0.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 292 | 0.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 187 | 0.7s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |
| 29 | 0.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 186 | 0.7s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --self-test` |

## Failures

- None.
