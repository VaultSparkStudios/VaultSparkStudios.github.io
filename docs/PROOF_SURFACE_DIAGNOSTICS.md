# Proof Surface Diagnostics

Generated: 2026-08-22T04:45:16.210Z
Receipt: `fb13ea6f1ee1943933a7ed8a` · coverage 87/87

Latest: **85/87** passed · blocking 70/70 · advisory findings 2/17 · total 32.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 45 | blocking | 0.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 16 | blocking | 0.9s | 0 | `node scripts/check-videogame-schema.mjs` |
| 84 | advisory | 0.9s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 33 | blocking | 0.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 22 | blocking | 0.7s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 42 | blocking | 0.6s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 68 | blocking | 0.5s | 0 | `node scripts/check-phantom-carries.mjs --self-test` |
| 17 | blocking | 0.5s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 14 | blocking | 0.5s | 0 | `node scripts/inject-collection-jsonld.mjs --check` |
| 75 | advisory | 0.5s | 0 | `node scripts/check-identity-coherence.mjs` |

## Failures

- Step 84 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
- Step 87 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
