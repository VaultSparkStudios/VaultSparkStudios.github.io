# Build Check Diagnostics

Generated: 2026-08-24T07:42:12.804Z
Receipt: `335357dba5c46bd63526f7b3` · coverage 368/368 from step 1

Latest: **368/368** passed · failed 0 · total 512.3s
Concentration: **15.6%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 80.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 38.1s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 37.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 133 | 16.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 93 | 11.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 9.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 97 | 9.1s | 0 | `node scripts/lint-repo.mjs` |
| 96 | 8.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 283 | 7.8s | 0 | `node scripts/crawl-all-pages.mjs` |
| 294 | 5.2s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
