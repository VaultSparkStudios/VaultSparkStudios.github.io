# Proof Surface Diagnostics

Generated: 2026-08-31T08:55:55.809Z
Receipt: `0568d9011b573f9671de3947` · coverage 107/107

Latest: **104/107** passed · blocking 90/90 · advisory findings 3/17 · total 82.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 100 | advisory | 2.4s | 0 | `node scripts/build-hero-portfolio.mjs --check` |
| 104 | advisory | 2.0s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 29 | blocking | 1.9s | 0 | `node scripts/build-portfolio-counts.mjs --self-test` |
| 47 | blocking | 1.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 70 | blocking | 1.6s | 0 | `node scripts/check-phantom-carries.mjs --self-test` |
| 22 | blocking | 1.5s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 41 | blocking | 1.5s | 0 | `node scripts/build-velocity-series.mjs --self-test` |
| 99 | advisory | 1.4s | 0 | `node scripts/build-cta-state.mjs --check` |
| 23 | blocking | 1.4s | 0 | `node scripts/check-hero-spotlight-coherence.mjs --self-test` |
| 81 | blocking | 1.4s | 0 | `node scripts/check-cache-evidence-classification.mjs --self-test` |

## Failures

- Step 94 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
