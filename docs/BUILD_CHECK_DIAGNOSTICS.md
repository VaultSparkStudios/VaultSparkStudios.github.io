# Build Check Diagnostics

Generated: 2026-09-02T21:17:53.040Z
Receipt: `6fe97e7c370597cf2ccc5e74` · coverage 387/387 from step 1

Latest: **387/387** passed · failed 0 · total 285.2s
Concentration: **15.0%** in step 263 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 263 | 42.9s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 140 | 37.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 96 | 9.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 9.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 245 | 8.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 236 | 5.4s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 257 | 5.0s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 93 | 3.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 240 | 3.0s | 0 | `node scripts/check-placeholder-orphans.mjs` |
| 186 | 2.8s | 0 | `node scripts/analyze-home-lcp.mjs --self-test` |

## Failures

- None.
