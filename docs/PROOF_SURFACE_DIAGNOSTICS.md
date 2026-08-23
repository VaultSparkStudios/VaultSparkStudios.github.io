# Proof Surface Diagnostics

Generated: 2026-08-23T05:46:54.152Z
Receipt: `efe0e5cd199d6afe15247601` · coverage 89/89

Latest: **87/89** passed · blocking 72/72 · advisory findings 2/17 · total 234.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 33 | blocking | 15.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 12 | blocking | 12.1s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 35 | blocking | 10.0s | 0 | `node scripts/build-news-desk.mjs --check` |
| 9 | blocking | 7.9s | 0 | `node scripts/check-og-images.mjs` |
| 47 | blocking | 7.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 44 | blocking | 6.7s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 17 | blocking | 4.7s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 34 | blocking | 4.4s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 25 | blocking | 4.1s | 0 | `node scripts/check-project-links.mjs --self-test` |
| 86 | advisory | 4.0s | 0 | `node scripts/generate-build-sha.mjs --check` |

## Failures

- Step 76 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 89 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
