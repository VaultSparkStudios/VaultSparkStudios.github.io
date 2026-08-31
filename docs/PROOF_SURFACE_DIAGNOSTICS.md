# Proof Surface Diagnostics

Generated: 2026-08-31T20:43:55.842Z
Receipt: `60e84c516b7f45c1d2a99cbb` · coverage 107/107

Latest: **104/107** passed · blocking 90/90 · advisory findings 3/17 · total 250.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 104 | advisory | 7.1s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 33 | blocking | 6.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 90 | blocking | 6.3s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 55 | blocking | 6.2s | 0 | `node scripts/check-journal-dates.mjs` |
| 9 | blocking | 5.6s | 0 | `node scripts/check-og-images.mjs` |
| 12 | blocking | 5.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 38 | blocking | 5.4s | 0 | `node scripts/build-newsroom-run.mjs --check` |
| 16 | blocking | 4.7s | 0 | `node scripts/check-videogame-schema.mjs` |
| 28 | blocking | 4.7s | 0 | `node scripts/build-forge-project-pages.mjs --check` |
| 27 | blocking | 4.5s | 0 | `node scripts/build-forge-project-pages.mjs --self-test` |

## Failures

- Step 94 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
