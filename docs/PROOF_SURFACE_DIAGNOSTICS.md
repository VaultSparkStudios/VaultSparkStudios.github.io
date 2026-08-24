# Proof Surface Diagnostics

Generated: 2026-08-24T10:50:08.503Z
Receipt: `f994c2ab89120202ac80edeb` · coverage 89/89

Latest: **88/89** passed · blocking 72/72 · advisory findings 1/17 · total 40.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 86 | advisory | 0.8s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 33 | blocking | 0.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 52 | blocking | 0.7s | 0 | `node scripts/build-vault-momentum.mjs --self-test` |
| 44 | blocking | 0.7s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 57 | blocking | 0.7s | 0 | `node scripts/check-decision-currency.mjs` |
| 22 | blocking | 0.7s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 79 | advisory | 0.6s | 0 | `node scripts/build-constellation-activity.mjs --check` |
| 63 | blocking | 0.6s | 0 | `node scripts/check-content-coherence.mjs` |
| 32 | blocking | 0.6s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs --self-test` |

## Failures

- Step 89 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
