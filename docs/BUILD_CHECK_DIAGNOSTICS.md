# Build Check Diagnostics

Generated: 2026-07-10T03:08:04.740Z

Latest: **186/186** passed · failed 0 · total 211.8s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 83 | 60.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 64 | 29.1s | 0 | `node scripts/verify-supply-chain.mjs` |
| 22 | 15.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 41 | 8.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 2 | 7.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 44 | 2.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 173 | 1.6s | 0 | `node scripts/crawl-all-pages.mjs` |
| 104 | 1.5s | 0 | `node scripts/report-ambient-coverage.mjs --check` |
| 96 | 1.4s | 0 | `node scripts/build-entity-graph.mjs --check` |
| 107 | 1.4s | 0 | `node scripts/build-feedback-provenance.mjs --check` |

## Failures

- None.
