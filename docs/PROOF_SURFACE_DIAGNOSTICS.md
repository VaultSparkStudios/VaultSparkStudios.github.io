# Proof Surface Diagnostics

Generated: 2026-07-31T03:25:10.387Z
Receipt: `ff81e3a1971ba0ddbac08604` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 25.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 79 | advisory | 0.8s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 32 | blocking | 0.7s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs --self-test` |
| 6 | blocking | 0.7s | 0 | `node scripts/check-proof-feed-generators.mjs --self-test` |
| 49 | blocking | 0.6s | 0 | `node scripts/check-journal-dates.mjs --self-test` |
| 22 | blocking | 0.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 33 | blocking | 0.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 65 | blocking | 0.6s | 0 | `node scripts/check-phantom-carries.mjs --self-test` |
| 53 | blocking | 0.6s | 0 | `node scripts/build-proposed-edges.mjs --self-test` |
| 9 | blocking | 0.5s | 0 | `node scripts/check-og-images.mjs` |
| 1 | blocking | 0.5s | 0 | `node scripts/build-public-status.mjs --self-test` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
