# Proof Surface Diagnostics

Generated: 2026-08-23T21:54:56.616Z
Receipt: `d54725167508092b518a381c` · coverage 89/89

Latest: **87/89** passed · blocking 72/72 · advisory findings 2/17 · total 108.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 82 | advisory | 2.7s | 0 | `node scripts/build-hero-portfolio.mjs --check` |
| 86 | advisory | 2.6s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 89 | advisory | 2.6s | 1 | `node scripts/build-release-dependencies.mjs --check` |
| 87 | advisory | 2.5s | 0 | `node scripts/check-lighthouse-trend.mjs` |
| 54 | blocking | 2.2s | 0 | `node scripts/check-journal-dates.mjs --self-test` |
| 22 | blocking | 2.2s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 18 | blocking | 2.1s | 0 | `node scripts/enrich-projects-schema.mjs --check` |
| 55 | blocking | 2.0s | 0 | `node scripts/check-journal-dates.mjs` |
| 77 | advisory | 2.0s | 0 | `node scripts/check-identity-coherence.mjs` |
| 16 | blocking | 2.0s | 0 | `node scripts/check-videogame-schema.mjs` |

## Failures

- Step 86 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
- Step 89 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
