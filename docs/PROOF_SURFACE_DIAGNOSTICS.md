# Proof Surface Diagnostics

Generated: 2026-08-03T03:02:30.831Z
Receipt: `6c61d741531662a4ba5d4029` · coverage 81/81

Latest: **81/81** passed · blocking 66/66 · advisory findings 0/15 · total 47.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 2 | blocking | 1.7s | 0 | `node scripts/build-public-status.mjs --check` |
| 7 | blocking | 1.6s | 0 | `node scripts/check-proof-feed-generators.mjs` |
| 4 | blocking | 1.6s | 0 | `node scripts/build-security-posture.mjs --check` |
| 75 | advisory | 1.2s | 0 | `node scripts/build-hero-portfolio.mjs --check` |
| 6 | blocking | 1.2s | 0 | `node scripts/check-proof-feed-generators.mjs --self-test` |
| 77 | advisory | 1.2s | 0 | `node scripts/check-registry-freshness.mjs` |
| 9 | blocking | 1.1s | 0 | `node scripts/check-og-images.mjs` |
| 79 | advisory | 1.1s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 78 | advisory | 1.1s | 0 | `node scripts/check-nav-catalog-sync.mjs` |
| 3 | blocking | 1.0s | 0 | `node scripts/build-security-posture.mjs --self-test` |

## Failures

- None.
