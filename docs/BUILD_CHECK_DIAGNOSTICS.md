# Build Check Diagnostics

Generated: 2026-09-02T04:44:09.463Z
Receipt: `bfb12076e8582c74a7429e5d` · coverage 379/379 from step 1

Latest: **379/379** passed · failed 0 · total 110.9s
Concentration: **13.3%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 14.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 10.1s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 96 | 7.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 236 | 6.9s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 61 | 6.5s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 245 | 3.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 93 | 2.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 133 | 1.4s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 342 | 1.3s | 0 | `node scripts/check-hero-lcp-element.mjs` |
| 285 | 1.2s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
