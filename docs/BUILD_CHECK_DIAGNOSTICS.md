# Build Check Diagnostics

Generated: 2026-09-10T04:41:59.759Z
Receipt: `7adf855d1e86f5a983c68e37` · coverage 479/479 from step 1

Latest: **479/479** passed · failed 0 · total 105.6s
Concentration: **12.5%** in step 142 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 142 | 13.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 98 | 7.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 5.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 298 | 4.5s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 247 | 3.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 368 | 3.4s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 259 | 2.5s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 95 | 2.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 135 | 2.0s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 344 | 1.2s | 0 | `node scripts/check-hero-lcp-element.mjs` |

## Failures

- None.
