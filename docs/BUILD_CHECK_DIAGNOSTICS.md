# Build Check Diagnostics

Generated: 2026-08-23T06:04:13.172Z
Receipt: `c20beb0f9453759f6d7ffef0` · coverage 368/368 from step 1

Latest: **368/368** passed · failed 0 · total 2020.5s
Concentration: **11.7%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 237.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 121.0s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 133 | 109.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 61 | 95.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 294 | 91.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 129 | 91.4s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 244 | 46.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 242 | 34.5s | 0 | `node scripts/ensure-preconnects.mjs --check` |
| 93 | 31.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 97 | 30.5s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
