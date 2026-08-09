# Build Check Diagnostics

Generated: 2026-08-09T20:39:30.008Z
Receipt: `792c8331732aa766641f3491` · coverage 288/288 from step 1

Latest: **288/288** passed · failed 0 · total 1363.9s
Concentration: **16.1%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 220.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 127 | 169.0s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 55 | 94.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 279 | 60.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 119 | 35.8s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 121 | 33.9s | 0 | `node scripts/check-ambient-placement.mjs` |
| 28 | 32.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 87 | 29.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 232 | 17.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 52 | 15.2s | 0 | `node scripts/run-build-check.mjs --self-test` |

## Failures

- None.
