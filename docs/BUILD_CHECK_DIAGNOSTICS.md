# Build Check Diagnostics

Generated: 2026-09-10T23:01:07.856Z
Receipt: `aa1b14122adad97849c1385b` · coverage 480/480 from step 1

Latest: **480/480** passed · failed 0 · total 133.4s
Concentration: **15.8%** in step 142 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 142 | 21.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 98 | 7.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 7.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 368 | 4.4s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 247 | 3.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 259 | 3.1s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 95 | 2.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 379 | 1.4s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 238 | 1.3s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 344 | 1.3s | 0 | `node scripts/check-hero-lcp-element.mjs` |

## Failures

- None.
