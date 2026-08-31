# Proof Surface Diagnostics

Generated: 2026-08-31T04:01:20.817Z
Receipt: `60aff63f82eeab27c0eb639f` · coverage 107/107

Latest: **104/107** passed · blocking 90/90 · advisory findings 3/17 · total 118.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 12 | blocking | 4.0s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 16 | blocking | 3.3s | 0 | `node scripts/check-videogame-schema.mjs` |
| 48 | blocking | 2.8s | 0 | `node scripts/check-trust-feed-freshness.mjs --self-test` |
| 51 | blocking | 2.5s | 0 | `node scripts/check-feed-publisher-manifest.mjs --check` |
| 10 | blocking | 2.2s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 100 | advisory | 2.2s | 0 | `node scripts/build-hero-portfolio.mjs --check` |
| 39 | blocking | 2.0s | 0 | `node scripts/check-intelligence-hydration.mjs --self-test` |
| 52 | blocking | 2.0s | 0 | `node scripts/build-vault-momentum.mjs --self-test` |
| 88 | blocking | 2.0s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 5 | blocking | 2.0s | 0 | `node scripts/build-status-proof.mjs --check --check-content` |

## Failures

- Step 94 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
