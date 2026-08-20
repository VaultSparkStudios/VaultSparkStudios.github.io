# Build Check Diagnostics

Generated: 2026-08-20T04:49:14.193Z
Receipt: `5e253c0575649dcac8a3cc26` · coverage 327/327 from step 1

Latest: **327/327** passed · failed 0 · total 194.4s
Concentration: **18.0%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 35.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 259 | 20.3s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 15.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 94 | 6.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 4.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 3.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 242 | 3.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 292 | 2.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 233 | 2.1s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 281 | 1.8s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
