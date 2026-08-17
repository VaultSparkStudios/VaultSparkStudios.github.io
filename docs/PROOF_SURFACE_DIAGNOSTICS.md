# Proof Surface Diagnostics

Generated: 2026-08-17T03:30:46.319Z
Receipt: `dab3bc59f4b25f1c9ec42232` · coverage 12/84

Latest: **11/12** passed · blocking 11/12 · advisory findings 0/0 · total 0.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 11 | blocking | 0.1s | 0 | `node scripts/build-og-coverage.mjs --check` |
| 5 | blocking | 0.1s | 0 | `node scripts/build-status-proof.mjs --check --check-content` |
| 10 | blocking | 0.1s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 12 | blocking | 0.1s | 1 | `node scripts/build-og-cards.mjs --self-test` |
| 9 | blocking | 0.1s | 0 | `node scripts/check-og-images.mjs` |
| 2 | blocking | 0.0s | 0 | `node scripts/build-public-status.mjs --check` |
| 3 | blocking | 0.0s | 0 | `node scripts/build-security-posture.mjs --self-test` |
| 7 | blocking | 0.0s | 0 | `node scripts/check-proof-feed-generators.mjs` |
| 8 | blocking | 0.0s | 0 | `node scripts/check-og-images.mjs --self-test` |
| 1 | blocking | 0.0s | 0 | `node scripts/build-public-status.mjs --self-test` |

## Failures

- Step 12 [blocking]: `node scripts/build-og-cards.mjs --self-test` exited 1 — self/contract
