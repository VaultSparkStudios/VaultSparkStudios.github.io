# Proof Surface Diagnostics

Generated: 2026-08-31T07:44:32.014Z
Receipt: `e3f9a9edd7d82fe58c0521aa` · coverage 107/107

Latest: **104/107** passed · blocking 90/90 · advisory findings 3/17 · total 76.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 2.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 16 | blocking | 1.8s | 0 | `node scripts/check-videogame-schema.mjs` |
| 104 | advisory | 1.3s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 33 | blocking | 1.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 1.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 74 | blocking | 1.2s | 0 | `node scripts/build-intelligence-suite.mjs --check` |
| 25 | blocking | 1.2s | 0 | `node scripts/check-project-links.mjs --self-test` |
| 75 | blocking | 1.1s | 0 | `node scripts/build-news-visual-receipts.mjs --self-test` |
| 90 | blocking | 1.1s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 12 | blocking | 1.1s | 0 | `node scripts/build-og-cards.mjs --self-test` |

## Failures

- Step 94 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
