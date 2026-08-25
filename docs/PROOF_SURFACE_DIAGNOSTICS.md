# Proof Surface Diagnostics

Generated: 2026-08-25T08:03:50.821Z
Receipt: `82f12b43fe6ce6ca700abf7f` · coverage 89/89

Latest: **88/89** passed · blocking 72/72 · advisory findings 1/17 · total 48.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 1.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 36 | blocking | 1.1s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 44 | blocking | 1.1s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 33 | blocking | 1.0s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 86 | advisory | 1.0s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 16 | blocking | 1.0s | 0 | `node scripts/check-videogame-schema.mjs` |
| 35 | blocking | 1.0s | 0 | `node scripts/build-news-desk.mjs --check` |
| 77 | advisory | 0.9s | 0 | `node scripts/check-identity-coherence.mjs` |
| 28 | blocking | 0.8s | 0 | `node scripts/build-forge-project-pages.mjs --check` |
| 12 | blocking | 0.8s | 0 | `node scripts/build-og-cards.mjs --self-test` |

## Failures

- Step 89 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
