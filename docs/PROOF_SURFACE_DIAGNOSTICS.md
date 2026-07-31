# Proof Surface Diagnostics

Generated: 2026-07-31T07:02:09.610Z
Receipt: `9d23395ac594a45c05b7de0b` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 30.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 30 | blocking | 1.0s | 0 | `node scripts/build-portfolio-counts.mjs --check` |
| 12 | blocking | 1.0s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 28 | blocking | 0.9s | 0 | `node scripts/build-forge-project-pages.mjs --check` |
| 33 | blocking | 0.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 54 | blocking | 0.8s | 0 | `node scripts/build-proposed-edges.mjs --check` |
| 48 | blocking | 0.8s | 0 | `node scripts/build-vault-momentum.mjs --check` |
| 27 | blocking | 0.8s | 0 | `node scripts/build-forge-project-pages.mjs --self-test` |
| 26 | blocking | 0.8s | 0 | `node scripts/check-project-links.mjs` |
| 58 | blocking | 0.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 29 | blocking | 0.7s | 0 | `node scripts/build-portfolio-counts.mjs --self-test` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
