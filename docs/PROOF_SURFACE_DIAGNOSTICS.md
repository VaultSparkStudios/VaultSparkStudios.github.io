# Proof Surface Diagnostics

Generated: 2026-09-03T02:17:38.471Z
Receipt: `b7a5c7664c807902dd861d4d` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 27.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 33 | blocking | 0.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 34 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 44 | blocking | 0.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 47 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 35 | blocking | 0.6s | 0 | `node scripts/build-news-desk.mjs --check` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 90 | blocking | 0.5s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 86 | blocking | 0.4s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 104 | advisory | 0.4s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 16 | blocking | 0.4s | 0 | `node scripts/check-videogame-schema.mjs` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
