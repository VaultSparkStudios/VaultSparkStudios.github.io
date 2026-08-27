# Proof Surface Diagnostics

Generated: 2026-08-27T09:18:12.780Z
Receipt: `53be6dbff4971a58671b7811` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 152.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 90 | blocking | 5.4s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 100 | advisory | 3.3s | 0 | `node scripts/build-hero-portfolio.mjs --check` |
| 86 | blocking | 3.1s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 22 | blocking | 3.1s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 47 | blocking | 3.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 81 | blocking | 2.8s | 0 | `node scripts/check-cache-evidence-classification.mjs --self-test` |
| 104 | advisory | 2.6s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 74 | blocking | 2.6s | 0 | `node scripts/build-intelligence-suite.mjs --check` |
| 106 | advisory | 2.5s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs` |
| 91 | advisory | 2.5s | 0 | `node scripts/check-mission-statement-coherence.mjs` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
