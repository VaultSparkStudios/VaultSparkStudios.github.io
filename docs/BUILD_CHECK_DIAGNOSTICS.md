# Build Check Diagnostics

Generated: 2026-08-19T21:16:30.218Z
Receipt: `dd8801b4b342df953b83e9e8` · coverage 319/319 from step 1

Latest: **319/319** passed · failed 0 · total 169.5s
Concentration: **17.0%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 28.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 259 | 16.7s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 12.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 94 | 7.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 5.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 242 | 3.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 131 | 3.1s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 29 | 2.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 233 | 1.6s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 292 | 1.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
