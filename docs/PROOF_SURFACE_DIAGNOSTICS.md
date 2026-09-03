# Proof Surface Diagnostics

Generated: 2026-09-03T04:37:10.981Z
Receipt: `e001dcb5c7b86430008b0c60` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 26.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 0.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 86 | blocking | 0.7s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 90 | blocking | 0.6s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 65 | blocking | 0.5s | 0 | `node scripts/build-oracle-answers.mjs --check` |
| 33 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 69 | blocking | 0.5s | 0 | `node scripts/check-project-status-coherence.mjs` |
| 64 | blocking | 0.4s | 0 | `node scripts/build-oracle-answers.mjs --self-test` |
| 44 | blocking | 0.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 12 | blocking | 0.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 63 | blocking | 0.3s | 0 | `node scripts/check-content-coherence.mjs` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
