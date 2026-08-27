# Build Check Diagnostics

Generated: 2026-08-27T23:09:48.922Z
Receipt: `dd7af4535de5e7128aed9ce7` · coverage 370/370 from step 1

Latest: **370/370** passed · failed 0 · total 1114.2s
Concentration: **24.1%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 268.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 133 | 122.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 129 | 87.4s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 261 | 80.5s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 42.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 294 | 40.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 93 | 12.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 10.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 96 | 9.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 154 | 9.1s | 0 | `node scripts/inject-main-content-id.mjs --check` |

## Failures

- None.
