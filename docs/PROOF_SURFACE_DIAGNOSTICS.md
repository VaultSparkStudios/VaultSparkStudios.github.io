# Proof Surface Diagnostics

Generated: 2026-08-04T08:27:48.691Z
Receipt: `9b3ad8cbb1e949567d267ad5` · coverage 84/84

Latest: **83/84** passed · blocking 69/69 · advisory findings 1/15 · total 226.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 51 | blocking | 5.1s | 0 | `node scripts/build-vault-momentum.mjs --check` |
| 49 | blocking | 4.8s | 0 | `node scripts/check-feed-publisher-manifest.mjs --check` |
| 42 | blocking | 4.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 33 | blocking | 4.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 27 | blocking | 4.2s | 0 | `node scripts/build-forge-project-pages.mjs --self-test` |
| 56 | blocking | 4.2s | 0 | `node scripts/build-proposed-edges.mjs --self-test` |
| 15 | blocking | 4.0s | 0 | `node scripts/check-videogame-schema.mjs --self-test` |
| 53 | blocking | 4.0s | 0 | `node scripts/check-journal-dates.mjs` |
| 66 | blocking | 3.9s | 0 | `node scripts/check-project-status-coherence.mjs --self-test` |
| 52 | blocking | 3.8s | 0 | `node scripts/check-journal-dates.mjs --self-test` |

## Failures

- Step 82 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
