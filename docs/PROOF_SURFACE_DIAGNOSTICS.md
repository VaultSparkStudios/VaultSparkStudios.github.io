# Proof Surface Diagnostics

Generated: 2026-09-01T12:59:47.740Z
Receipt: `806c916984400f4c620e5ef9` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 82.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 41 | blocking | 2.5s | 0 | `node scripts/build-velocity-series.mjs --self-test` |
| 47 | blocking | 1.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 1.6s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 52 | blocking | 1.6s | 0 | `node scripts/build-vault-momentum.mjs --self-test` |
| 53 | blocking | 1.6s | 0 | `node scripts/build-vault-momentum.mjs --check` |
| 65 | blocking | 1.5s | 0 | `node scripts/build-oracle-answers.mjs --check` |
| 104 | advisory | 1.5s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 86 | blocking | 1.4s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 93 | advisory | 1.4s | 0 | `node scripts/check-public-note-freshness.mjs --self-test` |
| 22 | blocking | 1.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
