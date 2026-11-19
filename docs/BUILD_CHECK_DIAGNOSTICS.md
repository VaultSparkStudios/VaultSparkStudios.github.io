# Build Check Diagnostics

Generated: 2026-11-19T06:36:28.105Z
Receipt: `dfb6a9ea219b3b797902b1b5` · coverage 75/562 from step 184

Latest: **74/75** passed · failed 1 · total 136.1s
Concentration: **11.5%** in step 221 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 221 | 15.7s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |
| 235 | 14.5s | 0 | `node scripts/check-public-contract-health.mjs` |
| 220 | 13.7s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --self-test` |
| 184 | 9.3s | 0 | `node scripts/inject-lqip.mjs --check` |
| 218 | 8.9s | 0 | `node scripts/analyze-home-lcp.mjs --self-test` |
| 219 | 6.5s | 0 | `node scripts/analyze-home-lcp.mjs --check` |
| 186 | 6.3s | 0 | `node scripts/inject-main-content-id.mjs --check` |
| 242 | 2.1s | 0 | `node scripts/check-studio-content-posture.mjs` |
| 202 | 1.7s | 0 | `node scripts/build-ship-receipts.mjs --check` |
| 229 | 1.6s | 0 | `node scripts/check-staging-parity.mjs --check` |

## Failures

- Step 258: `node scripts/check-longtail-visual-proof.mjs` exited 1
