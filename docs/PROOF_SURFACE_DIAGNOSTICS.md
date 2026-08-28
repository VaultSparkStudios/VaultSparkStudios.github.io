# Proof Surface Diagnostics

Generated: 2026-08-28T10:25:01.537Z
Receipt: `621e2f03fbfdfaa13c447609` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 60.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 104 | advisory | 1.2s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 47 | blocking | 1.1s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 76 | blocking | 0.9s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 60 | blocking | 0.9s | 0 | `node scripts/build-leaderboard-subpages.mjs --check` |
| 9 | blocking | 0.9s | 0 | `node scripts/check-og-images.mjs` |
| 16 | blocking | 0.9s | 0 | `node scripts/check-videogame-schema.mjs` |
| 33 | blocking | 0.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 95 | advisory | 0.9s | 0 | `node scripts/check-identity-coherence.mjs` |
| 81 | blocking | 0.8s | 0 | `node scripts/check-cache-evidence-classification.mjs --self-test` |
| 88 | blocking | 0.8s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
