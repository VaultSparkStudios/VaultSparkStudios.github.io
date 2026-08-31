# Proof Surface Diagnostics

Generated: 2026-08-31T08:10:35.778Z
Receipt: `1baa2f37bd24aad31aca95d6` · coverage 107/107

Latest: **104/107** passed · blocking 90/90 · advisory findings 3/17 · total 77.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 1.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 16 | blocking | 1.6s | 0 | `node scripts/check-videogame-schema.mjs` |
| 44 | blocking | 1.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 22 | blocking | 1.3s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 14 | blocking | 1.3s | 0 | `node scripts/inject-collection-jsonld.mjs --check` |
| 33 | blocking | 1.2s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 104 | advisory | 1.2s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 35 | blocking | 1.2s | 0 | `node scripts/build-news-desk.mjs --check` |
| 9 | blocking | 1.2s | 0 | `node scripts/check-og-images.mjs` |
| 43 | blocking | 1.2s | 0 | `node scripts/derive-game-nav.mjs --self-test` |

## Failures

- Step 94 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
