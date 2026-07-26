# Build Check Diagnostics

Generated: 2026-07-26T19:39:07.921Z

Latest: **240/240** passed · failed 0 · total 155.7s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 86 | 37.2s | 0 | `node scripts/verify-supply-chain.mjs` |
| 108 | 34.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 29 | 9.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 239 | 5.9s | 0 | `node scripts/check-ndjson-integrity.mjs --self-test` |
| 61 | 3.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 64 | 3.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 236 | 2.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 196 | 2.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 2 | 1.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 101 | 1.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |

## Failures

- None.
