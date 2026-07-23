# Proof Surface Diagnostics

Generated: 2026-07-23T04:21:33.045Z

Latest: **11/12** passed · failed 1 · total 0.9s

## Slowest Substeps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 9 | 0.1s | 0 | `node scripts/check-og-images.mjs` |
| 8 | 0.1s | 0 | `node scripts/check-og-images.mjs --self-test` |
| 3 | 0.1s | 0 | `node scripts/build-security-posture.mjs --self-test` |
| 5 | 0.1s | 0 | `node scripts/build-status-proof.mjs --check` |
| 10 | 0.1s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 11 | 0.1s | 0 | `node scripts/build-og-coverage.mjs --check` |
| 12 | 0.1s | 1 | `node scripts/build-og-cards.mjs --self-test` |
| 2 | 0.1s | 0 | `node scripts/build-public-status.mjs --check` |
| 1 | 0.1s | 0 | `node scripts/build-public-status.mjs --self-test` |
| 4 | 0.1s | 0 | `node scripts/build-security-posture.mjs --check` |

## Failures

- Step 12: `node scripts/build-og-cards.mjs --self-test` exited 1 — self/contract blocking
