# Build Check Diagnostics

Generated: 2026-09-10T07:08:44.412Z
Receipt: `b20b5bbe0f1a4f1a1f686d5e` · coverage 479/479 from step 1

Latest: **479/479** passed · failed 0 · total 374.8s
Concentration: **14.4%** in step 142 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 142 | 53.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 20.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 98 | 14.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 135 | 14.1s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 368 | 14.0s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 95 | 11.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 100 | 8.1s | 0 | `node scripts/validate-module-imports.mjs` |
| 298 | 7.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 379 | 6.1s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 247 | 5.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |

## Failures

- None.
