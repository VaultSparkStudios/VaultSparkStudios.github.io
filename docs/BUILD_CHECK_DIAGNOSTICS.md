# Build Check Diagnostics

Generated: 2026-09-14T04:50:24.924Z
Receipt: `f24c62ca1344a09667d4b281` · coverage 487/487 from step 1

Latest: **487/487** passed · failed 0 · total 229.0s
Concentration: **13.0%** in step 145 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 145 | 29.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 11.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 99 | 11.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 375 | 8.0s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 95 | 5.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 262 | 4.9s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 250 | 4.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 386 | 4.5s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 138 | 4.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 29 | 2.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- None.
