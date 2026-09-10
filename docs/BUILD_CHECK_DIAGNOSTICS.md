# Build Check Diagnostics

Generated: 2026-09-10T07:42:21.922Z
Receipt: `4878dd77616e2f95cddae5a5` · coverage 479/479 from step 1

Latest: **479/479** passed · failed 0 · total 225.8s
Concentration: **10.2%** in step 142 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 142 | 23.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 259 | 11.0s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 61 | 10.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 98 | 8.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 247 | 6.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 298 | 6.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 368 | 5.5s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 95 | 4.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 238 | 3.0s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 191 | 3.0s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |

## Failures

- None.
