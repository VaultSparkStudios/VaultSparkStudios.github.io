# Proof Surface Diagnostics

Generated: 2026-09-14T04:27:29.005Z
Receipt: `6fc50dd31ac9bb2d9c5e3839` · coverage 14/109

Latest: **13/14** passed · blocking 13/14 · advisory findings 0/0 · total 0.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 13 | blocking | 0.1s | 0 | `node scripts/build-og-coverage.mjs --check` |
| 14 | blocking | 0.1s | 1 | `node scripts/build-og-cards.mjs --self-test` |
| 12 | blocking | 0.1s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 7 | blocking | 0.1s | 0 | `node scripts/build-status-proof.mjs --check --check-content` |
| 1 | blocking | 0.0s | 0 | `node scripts/build-ecosystem-stats-page.mjs --check` |
| 2 | blocking | 0.0s | 0 | `node scripts/check-deploy-parity.mjs --local` |
| 11 | blocking | 0.0s | 0 | `node scripts/check-og-images.mjs` |
| 3 | blocking | 0.0s | 0 | `node scripts/build-public-status.mjs --self-test` |
| 6 | blocking | 0.0s | 0 | `node scripts/build-security-posture.mjs --check` |
| 9 | blocking | 0.0s | 0 | `node scripts/check-proof-feed-generators.mjs` |

## Failures

- Step 14 [blocking]: `node scripts/build-og-cards.mjs --self-test` exited 1 — self/contract
