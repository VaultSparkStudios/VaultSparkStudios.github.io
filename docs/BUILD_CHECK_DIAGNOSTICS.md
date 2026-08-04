# Build Check Diagnostics

Generated: 2026-08-04T08:32:20.805Z
Receipt: `5d9c5c5ede1c717c5b11aa2c` · coverage 275/275 from step 1

Latest: **275/275** passed · failed 0 · total 909.4s
Concentration: **25.1%** in step 126 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 126 | 228.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 47 | 148.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 79 | 22.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 20 | 13.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 212 | 9.0s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 15 | 8.9s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 221 | 5.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 82 | 5.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 104 | 5.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 255 | 5.2s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
