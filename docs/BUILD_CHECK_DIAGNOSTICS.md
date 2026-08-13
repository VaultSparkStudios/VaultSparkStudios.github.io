# Build Check Diagnostics

Generated: 2026-08-13T20:04:06.172Z
Receipt: `19b92037e0a1730766a70241` · coverage 295/295 from step 1

Latest: **295/295** passed · failed 0 · total 66.8s
Concentration: **15.6%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 10.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 253 | 7.2s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 55 | 5.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 90 | 3.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 286 | 2.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 87 | 1.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 236 | 1.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 127 | 1.1s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 28 | 1.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 275 | 0.9s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
