# Proof Surface Diagnostics

Generated: 2026-08-20T04:57:26.096Z
Receipt: `e52d13ed6c921b69ec1bf5ca` · coverage 87/87

Latest: **86/87** passed · blocking 70/70 · advisory findings 1/17 · total 37.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 45 | blocking | 1.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 42 | blocking | 1.4s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 44 | blocking | 1.1s | 0 | `node scripts/derive-game-index.mjs --check` |
| 33 | blocking | 1.0s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 68 | blocking | 0.9s | 0 | `node scripts/check-phantom-carries.mjs --self-test` |
| 35 | blocking | 0.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 16 | blocking | 0.7s | 0 | `node scripts/check-videogame-schema.mjs` |
| 26 | blocking | 0.7s | 0 | `node scripts/check-project-links.mjs` |
| 84 | advisory | 0.6s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 32 | blocking | 0.6s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs --self-test` |

## Failures

- Step 87 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
