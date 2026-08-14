# Build Check Diagnostics

Generated: 2026-08-14T05:41:55.204Z
Receipt: `fa2e02d1e4f872067940ca6a` · coverage 295/295 from step 1

Latest: **295/295** passed · failed 0 · total 151.3s
Concentration: **12.4%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 18.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 253 | 13.5s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 55 | 10.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 286 | 7.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 90 | 4.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 127 | 3.3s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 87 | 3.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 236 | 3.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 28 | 2.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 275 | 2.1s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
