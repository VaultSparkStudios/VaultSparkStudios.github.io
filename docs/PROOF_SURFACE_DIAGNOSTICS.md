# Proof Surface Diagnostics

Generated: 2026-08-31T07:15:26.149Z
Receipt: `56a8a30a155cddf5cfe917e0` · coverage 107/107

Latest: **104/107** passed · blocking 90/90 · advisory findings 3/17 · total 73.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 1.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 79 | blocking | 1.6s | 0 | `node scripts/build-route-consolidation.mjs --self-test` |
| 104 | advisory | 1.3s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 17 | blocking | 1.3s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 33 | blocking | 1.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 71 | blocking | 1.2s | 0 | `node scripts/check-phantom-carries.mjs` |
| 93 | advisory | 1.1s | 0 | `node scripts/check-public-note-freshness.mjs --self-test` |
| 61 | blocking | 1.1s | 0 | `node scripts/check-sitemap-coverage.mjs` |
| 90 | blocking | 1.0s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 98 | advisory | 1.0s | 0 | `node scripts/build-oracle-feedback-themes.mjs --check` |

## Failures

- Step 94 [advisory]: `node scripts/check-public-note-freshness.mjs` exited 1 — self/freshness
- Step 104 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
- Step 107 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
