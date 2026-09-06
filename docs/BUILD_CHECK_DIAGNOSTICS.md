# Build Check Diagnostics

Generated: 2026-09-06T22:42:08.704Z
Receipt: `0b291af0a2af369b7876aaff` · coverage 388/388 from step 1

Latest: **388/388** passed · failed 0 · total 450.4s
Concentration: **12.0%** in step 263 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 263 | 54.0s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 140 | 38.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 61 | 19.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 296 | 12.5s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 384 | 11.2s | 0 | `node scripts/check-site-integrity.mjs` |
| 285 | 9.5s | 0 | `node scripts/crawl-all-pages.mjs` |
| 287 | 7.6s | 0 | `node scripts/check-vocabulary-consistency.mjs` |
| 311 | 7.1s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 96 | 7.0s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 337 | 6.5s | 0 | `node scripts/check-hardfail-resilience.mjs --self-test` |

## Failures

- None.
