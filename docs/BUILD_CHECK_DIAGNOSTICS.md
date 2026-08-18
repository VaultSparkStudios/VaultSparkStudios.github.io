# Build Check Diagnostics

Generated: 2026-08-18T04:23:43.309Z
Receipt: `8bcda166a2216d80c31eb1a2` · coverage 317/317 from step 1

Latest: **317/317** passed · failed 0 · total 146.6s
Concentration: **17.9%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 26.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 257 | 15.3s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 11.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 94 | 6.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 3.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 240 | 3.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 2.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 231 | 2.1s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 279 | 1.3s | 0 | `node scripts/crawl-all-pages.mjs` |
| 290 | 1.2s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
