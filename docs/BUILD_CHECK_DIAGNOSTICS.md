# Build Check Diagnostics

Generated: 2026-08-03T20:32:45.887Z
Receipt: `1c97f2bd62c146b2554eb7a0` · coverage 275/275 from step 1

Latest: **275/275** passed · failed 0 · total 243.9s
Concentration: **26.4%** in step 126 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 126 | 64.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 47 | 30.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 79 | 6.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 82 | 3.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 104 | 3.3s | 0 | `node scripts/verify-supply-chain.mjs` |
| 266 | 2.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 20 | 2.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 94 | 2.8s | 0 | `node scripts/check-press-kit-drift.mjs --check` |
| 95 | 2.7s | 0 | `node scripts/build-brand-assets.mjs --check` |
| 102 | 2.5s | 0 | `node scripts/csp-audit.mjs` |

## Failures

- None.
