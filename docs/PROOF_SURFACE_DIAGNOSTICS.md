# Proof Surface Diagnostics

Generated: 2026-09-01T08:03:45.283Z
Receipt: `98300f317157d14e7b9a9537` · coverage 86/107

Latest: **85/86** passed · blocking 85/86 · advisory findings 0/0 · total 178.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 11.8s | 0 | `node scripts/check-og-images.mjs` |
| 22 | blocking | 6.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 12 | blocking | 5.8s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 30 | blocking | 5.3s | 0 | `node scripts/build-portfolio-counts.mjs --check` |
| 36 | blocking | 5.2s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 15 | blocking | 4.9s | 0 | `node scripts/check-videogame-schema.mjs --self-test` |
| 44 | blocking | 4.7s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 16 | blocking | 4.5s | 0 | `node scripts/check-videogame-schema.mjs` |
| 19 | blocking | 4.0s | 0 | `node scripts/check-schema-coverage.mjs --self-test` |
| 65 | blocking | 3.7s | 0 | `node scripts/build-oracle-answers.mjs --check` |

## Failures

- Step 86 [blocking]: `node scripts/check-receipt-ordering.mjs` exited 1 — self/contract
