# Build Check Diagnostics

Generated: 2026-09-02T22:14:12.998Z
Receipt: `495c1e0b3118c363a15591e7` · coverage 387/387 from step 1

Latest: **387/387** passed · failed 0 · total 166.1s
Concentration: **15.2%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 25.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 15.8s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 11.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 8.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 245 | 5.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 93 | 4.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 2.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 285 | 2.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 247 | 1.8s | 0 | `node scripts/check-public-safe-tracking.mjs` |
| 257 | 1.6s | 0 | `node scripts/check-evidence-check-reachability.mjs` |

## Failures

- None.
