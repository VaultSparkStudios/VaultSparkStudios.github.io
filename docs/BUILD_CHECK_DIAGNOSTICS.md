# Build Check Diagnostics

Generated: 2026-08-13T20:11:22.736Z
Receipt: `8665896ab32e6609aef3054b` · coverage 295/295 from step 1

Latest: **295/295** passed · failed 0 · total 108.2s
Concentration: **12.8%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 13.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 253 | 9.4s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 55 | 8.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 87 | 5.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 286 | 5.0s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 90 | 4.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 28 | 4.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 236 | 2.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 127 | 1.9s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 275 | 1.7s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
