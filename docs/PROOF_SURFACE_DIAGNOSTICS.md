# Proof Surface Diagnostics

Generated: 2026-08-04T00:19:08.858Z
Receipt: `4798948ddc3908c6437c913b` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 97.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 39 | blocking | 2.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 40 | blocking | 2.4s | 0 | `node scripts/derive-game-index.mjs --self-test` |
| 10 | blocking | 2.1s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 9 | blocking | 2.1s | 0 | `node scripts/check-og-images.mjs` |
| 48 | blocking | 1.9s | 0 | `node scripts/build-vault-momentum.mjs --check` |
| 63 | blocking | 1.9s | 0 | `node scripts/check-project-status-coherence.mjs --self-test` |
| 2 | blocking | 1.7s | 0 | `node scripts/build-public-status.mjs --check` |
| 20 | blocking | 1.7s | 0 | `node scripts/check-schema-coverage.mjs` |
| 81 | advisory | 1.6s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs` |
| 16 | blocking | 1.6s | 0 | `node scripts/check-videogame-schema.mjs` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
