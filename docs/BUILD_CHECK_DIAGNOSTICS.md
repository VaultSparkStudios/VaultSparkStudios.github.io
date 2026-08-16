# Build Check Diagnostics

Generated: 2026-08-16T04:59:32.426Z
Receipt: `489c1b5d7d26bdf549870d28` · coverage 302/302 from step 1

Latest: **302/302** passed · failed 0 · total 118.8s
Concentration: **21.1%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 25.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 11.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 253 | 9.2s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 90 | 3.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 87 | 3.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 28 | 2.4s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 236 | 2.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 286 | 1.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 275 | 1.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 227 | 1.2s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |

## Failures

- None.
