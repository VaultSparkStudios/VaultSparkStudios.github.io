# Proof Surface Diagnostics

Generated: 2026-09-01T12:52:39.164Z
Receipt: `b2e1a5ea4d65f0d55463db28` · coverage 36/107

Latest: **35/36** passed · blocking 35/36 · advisory findings 0/0 · total 22.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 14 | blocking | 1.7s | 0 | `node scripts/inject-collection-jsonld.mjs --check` |
| 16 | blocking | 1.6s | 0 | `node scripts/check-videogame-schema.mjs` |
| 36 | blocking | 1.1s | 1 | `node scripts/generate-news-pages.mjs --check` |
| 33 | blocking | 1.1s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 1.0s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 24 | blocking | 1.0s | 0 | `node scripts/check-hero-spotlight-coherence.mjs` |
| 34 | blocking | 0.9s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 35 | blocking | 0.9s | 0 | `node scripts/build-news-desk.mjs --check` |
| 29 | blocking | 0.9s | 0 | `node scripts/build-portfolio-counts.mjs --self-test` |
| 10 | blocking | 0.8s | 0 | `node scripts/build-og-coverage.mjs --self-test` |

## Failures

- Step 36 [blocking]: `node scripts/generate-news-pages.mjs --check` exited 1 — self/contract
