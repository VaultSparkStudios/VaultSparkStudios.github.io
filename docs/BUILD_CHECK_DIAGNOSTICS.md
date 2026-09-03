# Build Check Diagnostics

Generated: 2026-09-03T01:02:32.994Z
Receipt: `797bb04ad1866d74f82e02c7` · coverage 388/388 from step 1

Latest: **388/388** passed · failed 0 · total 183.6s
Concentration: **14.1%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 25.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 22.4s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 12.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 9.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 245 | 4.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 93 | 4.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 2.0s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 285 | 2.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 236 | 1.8s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 342 | 1.6s | 0 | `node scripts/check-hero-lcp-element.mjs` |

## Failures

- None.
