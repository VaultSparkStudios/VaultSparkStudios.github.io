# Proof Surface Diagnostics

Generated: 2026-08-24T07:38:23.132Z
Receipt: `a5467c369c19934f91ad9a68` · coverage 89/89

Latest: **88/89** passed · blocking 72/72 · advisory findings 1/17 · total 79.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 2.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 44 | blocking | 2.0s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 13 | blocking | 1.6s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |
| 58 | blocking | 1.5s | 0 | `node scripts/build-proposed-edges.mjs --self-test` |
| 89 | advisory | 1.5s | 1 | `node scripts/build-release-dependencies.mjs --check` |
| 74 | advisory | 1.5s | 0 | `node scripts/check-dead-ctas.mjs --check` |
| 88 | advisory | 1.5s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs` |
| 72 | blocking | 1.4s | 0 | `node scripts/verify-provider-chain.mjs --self-test` |
| 76 | advisory | 1.4s | 0 | `node scripts/check-public-note-freshness.mjs` |
| 35 | blocking | 1.4s | 0 | `node scripts/build-news-desk.mjs --check` |

## Failures

- Step 89 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
