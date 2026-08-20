# Build Check Diagnostics

Generated: 2026-08-20T05:16:23.253Z
Receipt: `f6c78fae84938e107e6dcc5e` · coverage 327/327 from step 1

Latest: **327/327** passed · failed 0 · total 214.5s
Concentration: **18.3%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 39.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 259 | 22.9s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 17.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 94 | 8.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 6.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 3.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 242 | 3.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 233 | 2.1s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 95 | 1.8s | 0 | `node scripts/lint-repo.mjs` |
| 281 | 1.7s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
