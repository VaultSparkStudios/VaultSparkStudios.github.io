# Build Check Diagnostics

Generated: 2026-07-15T21:39:23.808Z

Latest: **209/209** passed · failed 0 · total 100.0s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 71 | 33.6s | 0 | `node scripts/verify-supply-chain.mjs` |
| 93 | 18.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 2.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 49 | 2.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 205 | 1.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 46 | 1.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 175 | 1.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 2 | 1.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 86 | 1.1s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 104 | 1.1s | 0 | `node scripts/build-lqip-map.mjs --check` |

## Failures

- None.
