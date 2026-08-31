# Proof Surface Diagnostics

Generated: 2026-08-31T21:27:57.199Z
Receipt: `9a3097341ca509ec73323884` · coverage 107/107

Latest: **104/107** passed · blocking 90/90 · advisory findings 3/17 · total 316.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 35 | blocking | 8.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 22 | blocking | 7.9s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 44 | blocking | 7.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 33 | blocking | 7.0s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 55 | blocking | 6.6s | 0 | `node scripts/check-journal-dates.mjs` |
| 36 | blocking | 6.6s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 34 | blocking | 6.5s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 76 | blocking | 6.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 24 | blocking | 6.2s | 0 | `node scripts/check-hero-spotlight-coherence.mjs` |
| 38 | blocking | 5.9s | 0 | `node scripts/build-newsroom-run.mjs --check` |

## Failures

- Step 94 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
