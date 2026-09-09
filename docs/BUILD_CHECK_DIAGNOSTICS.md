# Build Check Diagnostics

Generated: 2026-09-09T22:13:14.445Z
Receipt: `c43451c385be974061ddfcb6` · coverage 477/477 from step 1

Latest: **477/477** passed · failed 0 · total 102.2s
Concentration: **11.7%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 11.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 96 | 7.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 61 | 5.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 296 | 3.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 245 | 3.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 366 | 2.9s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 93 | 2.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 133 | 2.4s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 342 | 1.2s | 0 | `node scripts/check-hero-lcp-element.mjs` |
| 285 | 1.2s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
