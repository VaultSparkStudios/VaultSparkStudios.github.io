# Proof Surface Diagnostics

Generated: 2026-09-01T13:34:46.871Z
Receipt: `d3a0c54611b463e562ecf1f9` · coverage 76/107

Latest: **75/76** passed · blocking 75/76 · advisory findings 0/0 · total 48.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 1.8s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 15 | blocking | 1.1s | 0 | `node scripts/check-videogame-schema.mjs --self-test` |
| 22 | blocking | 1.0s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 31 | blocking | 1.0s | 0 | `node scripts/check-registry-freshness.mjs --self-test` |
| 33 | blocking | 1.0s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 57 | blocking | 1.0s | 0 | `node scripts/check-decision-currency.mjs` |
| 73 | blocking | 1.0s | 0 | `node scripts/build-intelligence-suite.mjs --self-test` |
| 19 | blocking | 1.0s | 0 | `node scripts/check-schema-coverage.mjs --self-test` |
| 35 | blocking | 1.0s | 0 | `node scripts/build-news-desk.mjs --check` |
| 59 | blocking | 0.9s | 0 | `node scripts/build-proposed-edges.mjs --check` |

## Failures

- Step 76 [blocking]: `node scripts/build-news-visual-receipts.mjs --check` exited 1 — self/contract
