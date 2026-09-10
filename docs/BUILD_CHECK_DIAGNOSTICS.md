# Build Check Diagnostics

Generated: 2026-09-10T22:48:46.138Z
Receipt: `97265598d75840a86c77e59e` · coverage 480/480 from step 1

Latest: **480/480** passed · failed 0 · total 125.1s
Concentration: **14.4%** in step 142 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 142 | 18.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 98 | 7.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 7.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 368 | 4.9s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 247 | 3.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 259 | 3.4s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 95 | 2.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 379 | 1.5s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 344 | 1.4s | 0 | `node scripts/check-hero-lcp-element.mjs` |
| 29 | 1.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- None.
