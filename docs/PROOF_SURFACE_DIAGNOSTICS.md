# Proof Surface Diagnostics

Generated: 2026-09-02T22:28:30.426Z
Receipt: `b7857836beb75774ec811040` · coverage 107/107

Latest: **105/107** passed · blocking 90/90 · advisory findings 2/17 · total 20.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 0.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 80 | blocking | 0.4s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 76 | blocking | 0.4s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 44 | blocking | 0.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 104 | advisory | 0.4s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 12 | blocking | 0.3s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 77 | blocking | 0.3s | 0 | `node scripts/build-projects-catalog.mjs --self-test` |
| 22 | blocking | 0.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 33 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 51 | blocking | 0.3s | 0 | `node scripts/check-feed-publisher-manifest.mjs --check` |

## Failures

- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
