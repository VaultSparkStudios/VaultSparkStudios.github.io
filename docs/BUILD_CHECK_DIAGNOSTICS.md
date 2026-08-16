# Build Check Diagnostics

Generated: 2026-08-16T03:40:01.635Z
Receipt: `e5ca6369b5f89782d79f349a` · coverage 295/295 from step 1

Latest: **295/295** passed · failed 0 · total 110.8s
Concentration: **16.5%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 18.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 10.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 253 | 9.5s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 90 | 4.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 87 | 2.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 236 | 2.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 28 | 2.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 127 | 1.9s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 286 | 1.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 275 | 1.4s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
