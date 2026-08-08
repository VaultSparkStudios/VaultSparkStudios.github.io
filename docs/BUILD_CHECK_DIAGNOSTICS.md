# Build Check Diagnostics

Generated: 2026-08-08T18:25:12.318Z
Receipt: `e423efceba03f15afd3903aa` · coverage 285/285 from step 1

Latest: **285/285** passed · failed 0 · total 303.8s
Concentration: **17.1%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 51.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 38.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 123 | 12.7s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 87 | 7.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 28 | 5.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 90 | 4.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 229 | 4.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 276 | 4.0s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 60 | 3.5s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 52 | 3.3s | 0 | `node scripts/run-build-check.mjs --self-test` |

## Failures

- None.
