# Proof Surface Diagnostics

Generated: 2026-10-28T20:28:11.856Z
Receipt: `5de72699ab4f0a4f3b13ff78` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 76.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 4.4s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 3.6s | 0 | `node scripts/check-content-coherence.mjs` |
| 18 | blocking | 3.1s | 0 | `node scripts/check-videogame-schema.mjs` |
| 19 | blocking | 3.1s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 38 | blocking | 2.7s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 39 | blocking | 2.7s | 0 | `node scripts/build-newsroom-run.mjs --self-test` |
| 82 | blocking | 2.6s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 106 | advisory | 1.9s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 35 | blocking | 1.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 37 | blocking | 1.8s | 0 | `node scripts/build-news-desk.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
