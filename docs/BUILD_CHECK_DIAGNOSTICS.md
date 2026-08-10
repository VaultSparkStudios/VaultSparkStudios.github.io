# Build Check Diagnostics

Generated: 2026-08-10T02:17:46.746Z
Receipt: `77a5a745a41fcee245188944` · coverage 288/288 from step 1

Latest: **288/288** passed · failed 0 · total 864.6s
Concentration: **12.6%** in step 55 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 55 | 108.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 134 | 93.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 28 | 37.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 123 | 27.9s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 87 | 24.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 279 | 21.0s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 52 | 11.1s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 268 | 9.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 91 | 8.6s | 0 | `node scripts/lint-repo.mjs` |
| 23 | 8.5s | 0 | `node scripts/check-capability-discovery-contract.mjs` |

## Failures

- None.
