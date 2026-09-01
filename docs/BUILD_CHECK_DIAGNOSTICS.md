# Build Check Diagnostics

Generated: 2026-09-01T13:42:50.888Z
Receipt: `9089f13294755546f7e8a0e0` · coverage 26/378 from step 239

Latest: **25/26** passed · failed 1 · total 73.6s
Concentration: **69.5%** in step 263 · ratchet BREACHED (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 263 | 51.2s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 257 | 5.5s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 245 | 4.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 243 | 1.5s | 0 | `node scripts/ensure-preconnects.mjs --check` |
| 253 | 1.1s | 0 | `node scripts/check-evidence-graph.mjs` |
| 259 | 0.9s | 0 | `node scripts/check-status-feed-field-contract.mjs` |
| 246 | 0.9s | 0 | `node scripts/check-public-safe-tracking.mjs --self-test` |
| 247 | 0.7s | 0 | `node scripts/check-public-safe-tracking.mjs` |
| 251 | 0.7s | 0 | `node scripts/check-build-step-resilience.mjs --check` |
| 240 | 0.7s | 0 | `node scripts/check-placeholder-orphans.mjs` |

## Failures

- Step 264: `node scripts/check-evidence-graph-coverage.mjs --self-test` exited 1
