# Proof Surface Diagnostics

Generated: 2026-08-31T19:57:41.652Z
Receipt: `594d46b0e0f2a8d7628f1495` · coverage 107/107

Latest: **104/107** passed · blocking 90/90 · advisory findings 3/17 · total 110.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 3.6s | 0 | `node scripts/check-og-images.mjs` |
| 44 | blocking | 3.2s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 47 | blocking | 2.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 13 | blocking | 2.8s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |
| 48 | blocking | 2.5s | 0 | `node scripts/check-trust-feed-freshness.mjs --self-test` |
| 33 | blocking | 2.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 37 | blocking | 2.1s | 0 | `node scripts/build-newsroom-run.mjs --self-test` |
| 43 | blocking | 1.8s | 0 | `node scripts/derive-game-nav.mjs --self-test` |
| 12 | blocking | 1.8s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 58 | blocking | 1.8s | 0 | `node scripts/build-proposed-edges.mjs --self-test` |

## Failures

- Step 94 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
