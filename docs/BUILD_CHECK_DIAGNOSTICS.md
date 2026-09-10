# Build Check Diagnostics

Generated: 2026-09-10T16:59:34.989Z
Receipt: `9d32e12c47d038d0294b21ea` · coverage 479/479 from step 1

Latest: **479/479** passed · failed 0 · total 234.9s
Concentration: **13.0%** in step 142 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 142 | 30.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 18.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 98 | 10.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 298 | 8.0s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 95 | 7.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 368 | 6.9s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 259 | 5.7s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 247 | 5.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 58 | 3.4s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 29 | 2.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- None.
