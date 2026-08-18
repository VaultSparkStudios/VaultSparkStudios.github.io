# Build Check Diagnostics

Generated: 2026-08-18T21:45:50.963Z
Receipt: `50b25984c3fc86cb02ba55da` · coverage 319/319 from step 1

Latest: **319/319** passed · failed 0 · total 1197.0s
Concentration: **10.4%** in step 59 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 59 | 124.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 138 | 116.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 131 | 100.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 95 | 77.3s | 0 | `node scripts/lint-repo.mjs` |
| 259 | 66.2s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 127 | 58.4s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 91 | 49.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 56 | 39.9s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 29 | 30.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 94 | 25.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |

## Failures

- None.
