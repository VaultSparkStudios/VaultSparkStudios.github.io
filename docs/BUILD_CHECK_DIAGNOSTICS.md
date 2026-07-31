# Build Check Diagnostics

Generated: 2026-07-31T21:06:30.588Z
Receipt: `1b4178aa6c53ba3665fbc7a0` · coverage 262/262 from step 1

Latest: **262/262** passed · failed 0 · total 194.1s
Concentration: **16.9%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 32.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 19.1s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 11 | 7.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 70 | 5.1s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 4.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 110 | 4.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 210 | 2.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 106 | 2.0s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 95 | 1.9s | 0 | `node scripts/verify-supply-chain.mjs` |
| 242 | 1.8s | 0 | `node scripts/crawl-all-pages.mjs` |

## Failures

- None.
