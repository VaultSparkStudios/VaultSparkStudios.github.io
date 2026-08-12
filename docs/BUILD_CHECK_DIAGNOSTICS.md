# Build Check Diagnostics

Generated: 2026-08-12T05:06:10.915Z
Receipt: `532855ae0d9ecb7a99819561` · coverage 295/295 from step 1

Latest: **295/295** passed · failed 0 · total 1442.0s
Concentration: **10.1%** in step 286 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 286 | 146.2s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 134 | 126.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 119.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 253 | 74.3s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 275 | 50.7s | 0 | `node scripts/crawl-all-pages.mjs` |
| 87 | 29.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 60 | 28.7s | 0 | `node scripts/build-shell-assets.mjs --check` |
| 119 | 26.5s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 110 | 25.0s | 0 | `node scripts/csp-audit.mjs` |
| 277 | 24.7s | 0 | `node scripts/check-vocabulary-consistency.mjs` |

## Failures

- None.
