# Build Check Diagnostics

Generated: 2026-08-24T01:33:12.012Z
Receipt: `cfa34e2fe5127273eabe5f32` · coverage 368/368 from step 1

Latest: **368/368** passed · failed 0 · total 842.7s
Concentration: **17.9%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 150.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 123.4s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 47.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 93 | 19.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 294 | 12.5s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 96 | 9.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 29 | 8.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 133 | 8.6s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 283 | 7.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 97 | 6.4s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
