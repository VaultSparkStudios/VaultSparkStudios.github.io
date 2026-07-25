# Build Check Diagnostics

Generated: 2026-07-25T01:41:02.272Z

Latest: **218/218** passed · failed 0 · total 103.7s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 78 | 28.3s | 0 | `node scripts/verify-supply-chain.mjs` |
| 100 | 9.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 21 | 7.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 56 | 2.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 184 | 2.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 53 | 2.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 149 | 2.2s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |
| 2 | 1.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 57 | 1.3s | 0 | `node scripts/lint-repo.mjs` |
| 214 | 1.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
