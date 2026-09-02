# Build Check Diagnostics

Generated: 2026-09-02T22:29:35.045Z
Receipt: `177e081853ce003134bfad1f` · coverage 387/387 from step 1

Latest: **387/387** passed · failed 0 · total 128.2s
Concentration: **15.8%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 20.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 15.1s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 7.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 7.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 245 | 3.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 93 | 2.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 29 | 1.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 342 | 1.4s | 0 | `node scripts/check-hero-lcp-element.mjs` |
| 257 | 1.3s | 0 | `node scripts/check-evidence-check-reachability.mjs` |
| 285 | 1.2s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
