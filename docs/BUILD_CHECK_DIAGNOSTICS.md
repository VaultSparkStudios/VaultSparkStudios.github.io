# Build Check Diagnostics

Generated: 2026-07-31T01:34:04.740Z
Receipt: `048eac4937c6a34bc2ed1eab` · coverage 259/259 from step 1

Latest: **259/259** passed · failed 0 · total 85.2s
Concentration: **15.8%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 13.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 8.8s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 73 | 4.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 70 | 3.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 11 | 1.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 210 | 1.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 74 | 1.6s | 0 | `node scripts/lint-repo.mjs` |
| 242 | 1.0s | 0 | `node scripts/crawl-all-pages.mjs` |
| 110 | 0.8s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 95 | 0.8s | 0 | `node scripts/verify-supply-chain.mjs` |

## Failures

- None.
