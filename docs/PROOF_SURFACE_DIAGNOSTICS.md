# Proof Surface Diagnostics

Generated: 2026-08-23T07:54:30.503Z
Receipt: `0b47efd371385200390fd208` · coverage 89/89

Latest: **88/89** passed · blocking 72/72 · advisory findings 1/17 · total 253.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 44 | blocking | 12.9s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 47 | blocking | 10.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 6.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 60 | blocking | 6.6s | 0 | `node scripts/build-leaderboard-subpages.mjs --check` |
| 9 | blocking | 6.1s | 0 | `node scripts/check-og-images.mjs` |
| 22 | blocking | 5.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 24 | blocking | 4.7s | 0 | `node scripts/check-hero-spotlight-coherence.mjs` |
| 61 | blocking | 4.6s | 0 | `node scripts/check-sitemap-coverage.mjs` |
| 77 | advisory | 4.5s | 0 | `node scripts/check-identity-coherence.mjs` |
| 14 | blocking | 4.3s | 0 | `node scripts/inject-collection-jsonld.mjs --check` |

## Failures

- Step 89 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
