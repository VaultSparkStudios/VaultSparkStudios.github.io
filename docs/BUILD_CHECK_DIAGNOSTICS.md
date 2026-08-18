# Build Check Diagnostics

Generated: 2026-08-18T05:31:10.978Z
Receipt: `d26d68b4f82557e8f6bac2bd` · coverage 319/319 from step 1

Latest: **319/319** passed · failed 0 · total 148.6s
Concentration: **18.6%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 27.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 259 | 15.8s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 12.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 94 | 6.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 3.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 242 | 3.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 2.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 233 | 2.1s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 281 | 1.4s | 0 | `node scripts/crawl-all-pages.mjs` |
| 292 | 1.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
