# Build Check Diagnostics

Generated: 2026-09-10T18:58:53.473Z
Receipt: `ebf980ffef479dcf492f7537` · coverage 479/479 from step 1

Latest: **479/479** passed · failed 0 · total 138.0s
Concentration: **15.8%** in step 142 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 142 | 21.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 98 | 8.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 7.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 298 | 4.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 368 | 4.4s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 247 | 3.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 259 | 3.3s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 95 | 3.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 344 | 1.6s | 0 | `node scripts/check-hero-lcp-element.mjs` |
| 379 | 1.6s | 0 | `node scripts/check-build-gate-reachability.mjs` |

## Failures

- None.
