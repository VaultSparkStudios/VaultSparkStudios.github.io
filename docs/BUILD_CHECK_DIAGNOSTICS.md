# Build Check Diagnostics

Generated: 2026-08-20T05:37:01.199Z
Receipt: `eaa154cef1b24772312376a2` · coverage 327/327 from step 1

Latest: **327/327** passed · failed 0 · total 186.2s
Concentration: **17.6%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 32.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 259 | 22.0s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 14.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 94 | 6.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 4.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 242 | 3.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 3.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 233 | 2.0s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 281 | 1.8s | 0 | `node scripts/crawl-all-pages.mjs` |
| 95 | 1.8s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
