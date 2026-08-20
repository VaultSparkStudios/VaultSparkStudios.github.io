# Proof Surface Diagnostics

Generated: 2026-08-20T05:56:28.286Z
Receipt: `6850f443bcd4d62e58b4cc76` · coverage 87/87

Latest: **86/87** passed · blocking 70/70 · advisory findings 1/17 · total 35.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 12 | blocking | 1.1s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 55 | blocking | 0.9s | 0 | `node scripts/check-decision-currency.mjs` |
| 45 | blocking | 0.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 16 | blocking | 0.9s | 0 | `node scripts/check-videogame-schema.mjs` |
| 51 | blocking | 0.8s | 0 | `node scripts/build-vault-momentum.mjs --check` |
| 30 | blocking | 0.8s | 0 | `node scripts/build-portfolio-counts.mjs --check` |
| 35 | blocking | 0.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 84 | advisory | 0.7s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 68 | blocking | 0.6s | 0 | `node scripts/check-phantom-carries.mjs --self-test` |
| 33 | blocking | 0.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 87 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
