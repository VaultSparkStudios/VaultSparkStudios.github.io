# Proof Surface Diagnostics

Generated: 2026-08-10T22:15:30.926Z
Receipt: `1ce4a1ed46467c621116c570` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 38.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 33 | blocking | 1.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 1 | blocking | 0.9s | 0 | `node scripts/build-public-status.mjs --self-test` |
| 7 | blocking | 0.9s | 0 | `node scripts/check-proof-feed-generators.mjs` |
| 3 | blocking | 0.9s | 0 | `node scripts/build-security-posture.mjs --self-test` |
| 4 | blocking | 0.9s | 0 | `node scripts/build-security-posture.mjs --check` |
| 22 | blocking | 0.8s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 83 | advisory | 0.8s | 0 | `node scripts/check-lighthouse-trend.mjs` |
| 67 | blocking | 0.7s | 0 | `node scripts/check-project-status-coherence.mjs` |
| 57 | blocking | 0.7s | 0 | `node scripts/build-proposed-edges.mjs --check` |
| 30 | blocking | 0.7s | 0 | `node scripts/build-portfolio-counts.mjs --check` |

## Failures

- None.
