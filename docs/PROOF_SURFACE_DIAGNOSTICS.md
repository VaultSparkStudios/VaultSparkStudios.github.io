# Proof Surface Diagnostics

Generated: 2026-09-15T02:14:43.829Z
Receipt: `cf88db225285f94b86126d95` · coverage 37/109

Latest: **36/37** passed · blocking 36/37 · advisory findings 0/0 · total 18.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 35 | blocking | 1.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 31 | blocking | 1.2s | 0 | `node scripts/build-portfolio-counts.mjs --self-test` |
| 26 | blocking | 1.1s | 0 | `node scripts/check-hero-spotlight-coherence.mjs` |
| 28 | blocking | 1.0s | 0 | `node scripts/check-project-links.mjs` |
| 37 | blocking | 1.0s | 1 | `node scripts/build-news-desk.mjs --check` |
| 36 | blocking | 0.9s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 29 | blocking | 0.8s | 0 | `node scripts/build-forge-project-pages.mjs --self-test` |
| 24 | blocking | 0.7s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 34 | blocking | 0.7s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs --self-test` |
| 14 | blocking | 0.6s | 0 | `node scripts/build-og-cards.mjs --self-test` |

## Failures

- Step 37 [blocking]: `node scripts/build-news-desk.mjs --check` exited 1 — self/contract
