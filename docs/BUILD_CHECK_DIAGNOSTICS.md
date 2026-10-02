# Build Check Diagnostics

Generated: 2026-10-02T22:01:18.774Z
Receipt: `76beaab14bfedebe3627322b` · coverage 37/517 from step 115

Latest: **36/37** passed · failed 1 · total 108.9s
Concentration: **57.5%** in step 151 · ratchet BREACHED (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 151 | 62.6s | 1 | `node scripts/check-proof-surface.mjs` |
| 144 | 7.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 122 | 3.4s | 0 | `node scripts/check-stale-open-tasks.mjs --check` |
| 119 | 2.5s | 0 | `node scripts/check-press-kit-drift.mjs --check` |
| 140 | 2.4s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 143 | 2.2s | 0 | `node scripts/build-geo-vitals.mjs --self-test` |
| 136 | 2.1s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 127 | 2.1s | 0 | `node scripts/csp-audit.mjs` |
| 132 | 2.1s | 0 | `node scripts/check-render-blocking-routes.mjs` |
| 117 | 1.8s | 0 | `node scripts/verify-journal-feed.mjs` |

## Failures

- Step 151: `node scripts/check-proof-surface.mjs` exited 1
