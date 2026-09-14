# Build Check Diagnostics

Generated: 2026-09-14T09:50:29.316Z
Receipt: `1bf2416bd4e4ecbe72c4f3f8` · coverage 490/490 from step 1

Latest: **490/490** passed · failed 0 · total 162.0s
Concentration: **15.2%** in step 146 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 146 | 24.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 10.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 100 | 6.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 378 | 6.4s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 96 | 4.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 263 | 4.0s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 251 | 3.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 2.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 105 | 1.8s | 0 | `node --test tests/worker.unit.spec.js tests/obelisk-auth.unit.spec.js tests/tt-report-only.unit.spec.js tests/resync-derived.unit.spec.js tests/local-preview.unit.spec.js` |
| 291 | 1.7s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
