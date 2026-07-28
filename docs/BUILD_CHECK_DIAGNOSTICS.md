# Build Check Diagnostics

Generated: 2026-07-28T03:00:29.691Z
Receipt: `6d1491b4d8e37a71b6464f4f` · coverage 253/253 from step 1

Latest: **253/253** passed · failed 0 · total 71.2s
Concentration: **16.3%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 11.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 7.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 2.7s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 2.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 95 | 2.1s | 0 | `node scripts/verify-supply-chain.mjs` |
| 11 | 1.8s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 206 | 1.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 238 | 1.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 166 | 0.7s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |
| 42 | 0.7s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- None.
