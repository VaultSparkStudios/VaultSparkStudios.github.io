# Proof Surface Diagnostics

Generated: 2026-08-27T20:52:34.642Z
Receipt: `919e42c8df6ee7fb01451849` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 103.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 3.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 90 | blocking | 2.1s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 33 | blocking | 1.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 16 | blocking | 1.9s | 0 | `node scripts/check-videogame-schema.mjs` |
| 67 | blocking | 1.8s | 0 | `node scripts/check-worker-rewriter-safety.mjs` |
| 92 | advisory | 1.7s | 0 | `node scripts/check-dead-ctas.mjs --check` |
| 46 | blocking | 1.6s | 0 | `node scripts/derive-game-index.mjs --check` |
| 22 | blocking | 1.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 55 | blocking | 1.5s | 0 | `node scripts/check-journal-dates.mjs` |
| 106 | advisory | 1.5s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
