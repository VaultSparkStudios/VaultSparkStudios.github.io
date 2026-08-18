# Build Check Diagnostics

Generated: 2026-08-18T03:31:32.275Z
Receipt: `065fbd751035ca4b0cfd7ff5` · coverage 317/317 from step 1

Latest: **317/317** passed · failed 0 · total 159.0s
Concentration: **17.7%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 28.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 257 | 15.9s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 12.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 94 | 6.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 4.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 3.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 240 | 3.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 231 | 2.4s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 279 | 1.5s | 0 | `node scripts/crawl-all-pages.mjs` |
| 290 | 1.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
