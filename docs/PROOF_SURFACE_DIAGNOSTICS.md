# Proof Surface Diagnostics

Generated: 2026-08-01T02:23:14.445Z
Receipt: `e5b9c5c381b14c9e16bf25eb` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 29.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 66 | blocking | 0.9s | 0 | `node scripts/check-phantom-carries.mjs` |
| 9 | blocking | 0.7s | 0 | `node scripts/check-og-images.mjs` |
| 10 | blocking | 0.7s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 40 | blocking | 0.7s | 0 | `node scripts/derive-game-index.mjs --self-test` |
| 41 | blocking | 0.7s | 0 | `node scripts/derive-game-index.mjs --check` |
| 79 | advisory | 0.6s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 70 | advisory | 0.6s | 0 | `node scripts/check-identity-coherence.mjs` |
| 27 | blocking | 0.6s | 0 | `node scripts/build-forge-project-pages.mjs --self-test` |
| 74 | advisory | 0.5s | 0 | `node scripts/build-cta-state.mjs --check` |
| 33 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
