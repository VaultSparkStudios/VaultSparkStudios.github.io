# Proof Surface Diagnostics

Generated: 2026-08-28T09:50:15.086Z
Receipt: `e7b6eed6b92d170796da794c` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 80.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 2.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 16 | blocking | 1.9s | 0 | `node scripts/check-videogame-schema.mjs` |
| 22 | blocking | 1.4s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 33 | blocking | 1.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 58 | blocking | 1.3s | 0 | `node scripts/build-proposed-edges.mjs --self-test` |
| 72 | blocking | 1.2s | 0 | `node scripts/verify-provider-chain.mjs --self-test` |
| 21 | blocking | 1.2s | 0 | `node scripts/check-game-playability-coherence.mjs --self-test` |
| 34 | blocking | 1.2s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 76 | blocking | 1.1s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 12 | blocking | 1.1s | 0 | `node scripts/build-og-cards.mjs --self-test` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
