# Build Check Diagnostics

Generated: 2026-09-11T20:58:42.325Z
Receipt: `b3becdb7caf7354dff595ad4` · coverage 480/480 from step 1

Latest: **480/480** passed · failed 0 · total 166.5s
Concentration: **17.9%** in step 142 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 142 | 29.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 8.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 98 | 8.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 368 | 5.4s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 135 | 4.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 247 | 3.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 259 | 3.6s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 95 | 3.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 99 | 2.0s | 0 | `node scripts/lint-repo.mjs` |
| 298 | 1.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
