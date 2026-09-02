# Build Check Diagnostics

Generated: 2026-09-02T06:15:56.087Z
Receipt: `069475da7dc47ada098f457f` · coverage 379/379 from step 1

Latest: **379/379** passed · failed 0 · total 259.7s
Concentration: **12.2%** in step 263 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 263 | 31.8s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 140 | 23.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 96 | 9.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 236 | 9.6s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 61 | 7.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 285 | 6.7s | 0 | `node scripts/crawl-all-pages.mjs` |
| 360 | 6.5s | 0 | `node scripts/check-mobile-runtime-contract.mjs` |
| 245 | 6.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 287 | 5.0s | 0 | `node scripts/check-vocabulary-consistency.mjs` |
| 93 | 4.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |

## Failures

- None.
