# Build Check Diagnostics

Generated: 2026-07-31T21:34:16.532Z
Receipt: `663fa27a1c0483a10a7669d9` · coverage 262/262 from step 1

Latest: **262/262** passed · failed 0 · total 442.9s
Concentration: **26.6%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 117.9s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 50.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 10.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 11 | 6.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 73 | 5.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 210 | 4.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 242 | 3.8s | 0 | `node scripts/crawl-all-pages.mjs` |
| 33 | 2.7s | 0 | `node scripts/check-cta-readiness.mjs --self-test` |
| 110 | 2.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 95 | 2.7s | 0 | `node scripts/verify-supply-chain.mjs` |

## Failures

- None.
