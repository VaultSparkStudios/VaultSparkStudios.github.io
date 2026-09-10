# Build Check Diagnostics

Generated: 2026-09-10T23:17:56.345Z
Receipt: `c65178127463d10db35b7866` · coverage 480/480 from step 1

Latest: **480/480** passed · failed 0 · total 122.3s
Concentration: **14.5%** in step 142 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 142 | 17.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 7.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 98 | 7.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 368 | 4.5s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 247 | 3.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 259 | 3.2s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 95 | 3.0s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 379 | 1.3s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 344 | 1.3s | 0 | `node scripts/check-hero-lcp-element.mjs` |
| 29 | 1.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- None.
