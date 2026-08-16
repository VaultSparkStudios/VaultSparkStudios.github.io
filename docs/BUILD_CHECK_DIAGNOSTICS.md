# Build Check Diagnostics

Generated: 2026-08-16T04:49:07.700Z
Receipt: `d33949f0911747cd7a74a134` · coverage 300/300 from step 1

Latest: **300/300** passed · failed 0 · total 184.9s
Concentration: **14.0%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 25.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 16.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 253 | 14.1s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 28 | 5.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 87 | 5.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 90 | 4.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 275 | 3.7s | 0 | `node scripts/crawl-all-pages.mjs` |
| 23 | 3.5s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 236 | 3.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 286 | 3.0s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
