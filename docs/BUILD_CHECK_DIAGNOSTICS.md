# Build Check Diagnostics

Generated: 2026-09-10T18:22:35.616Z
Receipt: `4cedd81fb237caa7f8de7e6b` · coverage 479/479 from step 1

Latest: **479/479** passed · failed 0 · total 226.1s
Concentration: **10.5%** in step 142 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 142 | 23.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 10.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 98 | 10.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 298 | 9.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 247 | 6.2s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 368 | 6.1s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 259 | 5.3s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 95 | 5.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 2.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 287 | 2.0s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
