# Build Check Diagnostics

Generated: 2026-09-10T05:07:17.464Z
Receipt: `347d12fd436a6135ac31f4a2` · coverage 479/479 from step 1

Latest: **479/479** passed · failed 0 · total 411.7s
Concentration: **7.9%** in step 142 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 142 | 32.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 29.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 135 | 22.6s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 298 | 17.6s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 98 | 14.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 29 | 8.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 95 | 8.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 247 | 7.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 368 | 6.7s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 259 | 6.4s | 0 | `node scripts/check-evidence-check-reachability.mjs` |

## Failures

- None.
