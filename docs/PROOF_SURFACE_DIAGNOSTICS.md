# Proof Surface Diagnostics

Generated: 2026-08-27T10:42:08.623Z
Receipt: `f0b99d4fb9b77ac24cc0eff3` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 58.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 33 | blocking | 1.2s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 47 | blocking | 1.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 104 | advisory | 1.1s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 90 | blocking | 1.0s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 22 | blocking | 1.0s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 100 | advisory | 0.8s | 0 | `node scripts/build-hero-portfolio.mjs --check` |
| 66 | blocking | 0.8s | 0 | `node scripts/check-worker-rewriter-safety.mjs --self-test` |
| 78 | blocking | 0.8s | 0 | `node scripts/build-projects-catalog.mjs --check` |
| 74 | blocking | 0.8s | 0 | `node scripts/build-intelligence-suite.mjs --check` |
| 16 | blocking | 0.8s | 0 | `node scripts/check-videogame-schema.mjs` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
