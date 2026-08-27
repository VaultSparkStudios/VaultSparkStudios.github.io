# Build Check Diagnostics

Generated: 2026-08-27T09:25:18.434Z
Receipt: `d78dfcacd4fe4f21ca40c3e9` · coverage 370/370 from step 1

Latest: **370/370** passed · failed 0 · total 784.2s
Concentration: **19.6%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 153.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 261 | 86.4s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 36.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 93 | 18.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 13.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 235 | 11.9s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 96 | 9.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 294 | 9.1s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 256 | 8.1s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 283 | 8.0s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
