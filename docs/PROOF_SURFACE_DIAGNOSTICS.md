# Proof Surface Diagnostics

Generated: 2026-10-07T14:54:00.581Z
Receipt: `2a05c987510cdcdc873be074` · coverage 90/109

Latest: **89/90** passed · blocking 89/90 · advisory findings 0/0 · total 53.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 22 | blocking | 3.1s | 0 | `node scripts/check-schema-coverage.mjs` |
| 49 | blocking | 3.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 2.0s | 0 | `node scripts/check-content-coherence.mjs` |
| 18 | blocking | 1.9s | 0 | `node scripts/check-videogame-schema.mjs` |
| 38 | blocking | 1.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 35 | blocking | 1.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 24 | blocking | 1.7s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 57 | blocking | 1.6s | 0 | `node scripts/check-journal-dates.mjs` |
| 37 | blocking | 1.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 56 | blocking | 1.5s | 0 | `node scripts/check-journal-dates.mjs --self-test` |

## Failures

- Step 90 [blocking]: `node scripts/check-visual-qa-retention.mjs --check` exited 1 — self/contract
