# Proof Surface Diagnostics

Generated: 2026-07-31T09:01:50.554Z
Receipt: `11c47c660791f14151fe3e89` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 21.5s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 56 | blocking | 0.6s | 0 | `node scripts/check-sitemap-coverage.mjs` |
| 12 | blocking | 0.6s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 8 | blocking | 0.5s | 0 | `node scripts/check-og-images.mjs --self-test` |
| 16 | blocking | 0.5s | 0 | `node scripts/check-videogame-schema.mjs` |
| 3 | blocking | 0.5s | 0 | `node scripts/build-security-posture.mjs --self-test` |
| 14 | blocking | 0.5s | 0 | `node scripts/inject-collection-jsonld.mjs --check` |
| 42 | blocking | 0.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 2 | blocking | 0.4s | 0 | `node scripts/build-public-status.mjs --check` |
| 79 | advisory | 0.4s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 19 | blocking | 0.4s | 0 | `node scripts/check-schema-coverage.mjs --self-test` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
