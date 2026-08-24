# Proof Surface Diagnostics

Generated: 2026-08-24T11:26:25.258Z
Receipt: `0bd9f43849b8262be085f3a5` · coverage 89/89

Latest: **88/89** passed · blocking 72/72 · advisory findings 1/17 · total 40.4s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 1.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 12 | blocking | 0.7s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 86 | advisory | 0.7s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 33 | blocking | 0.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 84 | advisory | 0.7s | 0 | `node scripts/check-registry-freshness.mjs` |
| 16 | blocking | 0.7s | 0 | `node scripts/check-videogame-schema.mjs` |
| 63 | blocking | 0.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 44 | blocking | 0.7s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 57 | blocking | 0.7s | 0 | `node scripts/check-decision-currency.mjs` |
| 26 | blocking | 0.6s | 0 | `node scripts/check-project-links.mjs` |

## Failures

- Step 89 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
