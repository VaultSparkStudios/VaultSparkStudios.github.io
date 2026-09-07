# Build Check Diagnostics

Generated: 2026-09-07T05:08:32.407Z
Receipt: `ccc4e44a1b78de25fa292ae7` · coverage 390/390 from step 1

Latest: **390/390** passed · failed 0 · total 277.2s
Concentration: **17.3%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 48.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 33.1s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 12.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 7.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 66 | 5.3s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 133 | 4.9s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 93 | 4.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 245 | 4.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 3.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 285 | 2.5s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
