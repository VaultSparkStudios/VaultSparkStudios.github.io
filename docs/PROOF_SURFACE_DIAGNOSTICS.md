# Proof Surface Diagnostics

Generated: 2026-08-28T08:44:01.586Z
Receipt: `1121b91bad8d1bfcbe862da7` · coverage 107/107

Latest: **106/107** passed · blocking 90/90 · advisory findings 1/17 · total 70.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 12 | blocking | 1.7s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 47 | blocking | 1.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 16 | blocking | 1.5s | 0 | `node scripts/check-videogame-schema.mjs` |
| 14 | blocking | 1.2s | 0 | `node scripts/inject-collection-jsonld.mjs --check` |
| 57 | blocking | 1.1s | 0 | `node scripts/check-decision-currency.mjs` |
| 17 | blocking | 1.1s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 10 | blocking | 1.0s | 0 | `node scripts/build-og-coverage.mjs --self-test` |
| 104 | advisory | 1.0s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 51 | blocking | 1.0s | 0 | `node scripts/check-feed-publisher-manifest.mjs --check` |
| 13 | blocking | 1.0s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |

## Failures

- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
