# Build Check Diagnostics

Generated: 2026-09-07T05:53:19.600Z
Receipt: `f4231a1fabc0f4464567fd65` · coverage 390/390 from step 1

Latest: **390/390** passed · failed 0 · total 277.1s
Concentration: **16.0%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 44.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 34.5s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 18.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 11.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 245 | 6.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 93 | 6.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 133 | 4.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 29 | 3.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 296 | 2.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 257 | 2.7s | 0 | `node scripts/check-evidence-check-reachability.mjs` |

## Failures

- None.
