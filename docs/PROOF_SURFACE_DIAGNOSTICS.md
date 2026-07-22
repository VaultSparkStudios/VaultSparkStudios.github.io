# Proof Surface Diagnostics

Generated: 2026-07-22T04:32:03.367Z

Latest: **11/12** passed · failed 1 · total 0.8s

## Slowest Substeps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 9 | 0.1s | 0 | `node scripts/check-og-images.mjs` |
| 11 | 0.1s | 0 | `node scripts/build-og-coverage.mjs --check` |
| 10 | 0.1s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 8 | 0.1s | 0 | `node scripts/check-og-images.mjs --self-test` |
| 12 | 0.1s | 1 | `node scripts/build-og-cards.mjs --self-test` |
| 2 | 0.1s | 0 | `node scripts/build-public-status.mjs --check` |
| 5 | 0.1s | 0 | `node scripts/build-status-proof.mjs --check` |
| 1 | 0.1s | 0 | `node scripts/build-public-status.mjs --self-test` |
| 4 | 0.1s | 0 | `node scripts/build-security-posture.mjs --check` |
| 7 | 0.1s | 0 | `node scripts/check-proof-feed-generators.mjs` |

## Failures

- Step 12: `node scripts/build-og-cards.mjs --self-test` exited 1 — self/contract blocking
