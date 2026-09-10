# Proof Surface Diagnostics

Generated: 2026-09-10T16:57:49.082Z
Receipt: `ec9210c66ca7e332d766efed` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 30.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 106 | advisory | 1.2s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 87 | blocking | 0.6s | 0 | `node scripts/check-receipt-ordering.mjs --self-test` |
| 107 | advisory | 0.6s | 0 | `node scripts/check-lighthouse-trend.mjs` |
| 101 | advisory | 0.6s | 0 | `node scripts/build-cta-state.mjs --check` |
| 49 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 35 | blocking | 0.5s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 109 | advisory | 0.5s | 0 | `node scripts/build-release-dependencies.mjs --check` |
| 18 | blocking | 0.5s | 0 | `node scripts/check-videogame-schema.mjs` |
| 108 | advisory | 0.5s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs` |
| 14 | blocking | 0.5s | 0 | `node scripts/build-og-cards.mjs --self-test` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
