# Build Check Diagnostics

Generated: 2026-09-02T09:07:20.614Z
Receipt: `a60b90313f7a5b0ee6e0991d` · coverage 381/381 from step 1

Latest: **381/381** passed · failed 0 · total 144.1s
Concentration: **14.4%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 20.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 15.4s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 8.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 6.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 245 | 4.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 93 | 3.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 342 | 1.9s | 0 | `node scripts/check-hero-lcp-element.mjs` |
| 285 | 1.6s | 0 | `node scripts/crawl-all-pages.mjs` |
| 125 | 1.6s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 29 | 1.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- None.
