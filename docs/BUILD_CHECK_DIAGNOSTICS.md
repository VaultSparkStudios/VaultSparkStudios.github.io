# Build Check Diagnostics

Generated: 2026-08-08T23:37:36.603Z
Receipt: `71b9e8e5272a4547eebc973a` · coverage 288/288 from step 1

Latest: **288/288** passed · failed 0 · total 293.7s
Concentration: **14.5%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 42.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 24.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 279 | 16.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 87 | 6.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 28 | 5.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 232 | 4.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 90 | 4.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 52 | 3.3s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 268 | 3.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 270 | 3.1s | 0 | `node scripts/check-vocabulary-consistency.mjs` |

## Failures

- None.
