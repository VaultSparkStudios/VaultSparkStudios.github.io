# Proof Surface Diagnostics

Generated: 2026-07-31T08:08:45.729Z
Receipt: `f9da48e3a46e85741fc8e55a` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 16.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 64 | blocking | 0.5s | 0 | `node scripts/check-project-status-coherence.mjs` |
| 9 | blocking | 0.5s | 0 | `node scripts/check-og-images.mjs` |
| 16 | blocking | 0.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 10 | blocking | 0.4s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 79 | advisory | 0.4s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 21 | blocking | 0.4s | 0 | `node scripts/check-game-playability-coherence.mjs --self-test` |
| 42 | blocking | 0.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 56 | blocking | 0.3s | 0 | `node scripts/check-sitemap-coverage.mjs` |
| 72 | advisory | 0.3s | 0 | `node scripts/build-constellation-activity.mjs --check` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
