# Build Check Diagnostics

Generated: 2026-08-31T08:17:19.630Z
Receipt: `d0951c96cd4e47e4e5052cd5` · coverage 371/371 from step 1

Latest: **371/371** passed · failed 0 · total 609.3s
Concentration: **21.3%** in step 262 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 262 | 129.7s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 140 | 77.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 26.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 284 | 12.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 244 | 11.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 256 | 10.6s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 295 | 9.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 96 | 7.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 235 | 7.7s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 93 | 6.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |

## Failures

- None.
