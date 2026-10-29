# Proof Surface Diagnostics

Generated: 2026-10-29T06:59:18.008Z
Receipt: `a4054a8ce266f10af547601b` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 70.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 4.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 18 | blocking | 2.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 22 | blocking | 2.3s | 0 | `node scripts/check-schema-coverage.mjs` |
| 16 | blocking | 2.2s | 0 | `node scripts/inject-collection-jsonld.mjs --check` |
| 68 | blocking | 2.2s | 0 | `node scripts/check-worker-rewriter-safety.mjs --self-test` |
| 38 | blocking | 1.9s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 65 | blocking | 1.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 37 | blocking | 1.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 82 | blocking | 1.5s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 72 | blocking | 1.4s | 0 | `node scripts/check-phantom-carries.mjs --self-test` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
