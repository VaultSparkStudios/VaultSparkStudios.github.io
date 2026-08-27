# Proof Surface Diagnostics

Generated: 2026-08-27T05:52:21.571Z
Receipt: `15d4186403fd38d5b70929a4` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 106.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 22 | blocking | 2.9s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 12 | blocking | 2.7s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 21 | blocking | 2.6s | 0 | `node scripts/check-game-playability-coherence.mjs --self-test` |
| 5 | blocking | 2.4s | 0 | `node scripts/build-status-proof.mjs --check --check-content` |
| 33 | blocking | 2.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 47 | blocking | 2.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 16 | blocking | 2.2s | 0 | `node scripts/check-videogame-schema.mjs` |
| 70 | blocking | 2.0s | 0 | `node scripts/check-phantom-carries.mjs --self-test` |
| 9 | blocking | 2.0s | 0 | `node scripts/check-og-images.mjs` |
| 82 | blocking | 1.9s | 0 | `node scripts/check-cache-evidence-classification.mjs` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
