# Proof Surface Diagnostics

Generated: 2026-08-24T01:25:35.261Z
Receipt: `564d4d7bcdacd509975e0f09` · coverage 89/89

Latest: **88/89** passed · blocking 72/72 · advisory findings 1/17 · total 150.0s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 5.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 69 | blocking | 4.9s | 0 | `node scripts/check-project-status-coherence.mjs` |
| 5 | blocking | 4.2s | 0 | `node scripts/build-status-proof.mjs --check --check-content` |
| 73 | advisory | 4.1s | 0 | `node scripts/check-mission-statement-coherence.mjs` |
| 46 | blocking | 4.0s | 0 | `node scripts/derive-game-index.mjs --check` |
| 33 | blocking | 3.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 17 | blocking | 3.3s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 62 | blocking | 3.3s | 0 | `node scripts/check-content-coherence.mjs --self-test` |
| 56 | blocking | 3.1s | 0 | `node scripts/check-decision-currency.mjs --self-test` |
| 86 | advisory | 3.1s | 0 | `node scripts/generate-build-sha.mjs --check` |

## Failures

- Step 89 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
