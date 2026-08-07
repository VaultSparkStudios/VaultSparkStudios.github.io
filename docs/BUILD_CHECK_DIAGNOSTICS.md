# Build Check Diagnostics

Generated: 2026-08-07T11:03:33.042Z
Receipt: `3783fa6f7ceda6fb792670fd` · coverage 283/283 from step 1

Latest: **283/283** passed · failed 0 · total 132.1s
Concentration: **16.1%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 21.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 14.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 87 | 4.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 28 | 3.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 90 | 3.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 274 | 2.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 229 | 2.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 52 | 1.6s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 127 | 1.3s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 263 | 1.3s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
