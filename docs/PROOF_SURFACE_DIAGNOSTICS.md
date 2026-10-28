# Proof Surface Diagnostics

Generated: 2026-10-28T22:34:56.171Z
Receipt: `b2a5e7901f3f202039e228bd` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 65.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 49 | blocking | 4.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 37 | blocking | 2.7s | 0 | `node scripts/build-news-desk.mjs --check` |
| 88 | blocking | 2.6s | 0 | `node scripts/check-receipt-ordering.mjs` |
| 96 | advisory | 2.6s | 0 | `node scripts/check-public-note-freshness.mjs` |
| 35 | blocking | 2.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 65 | blocking | 1.9s | 0 | `node scripts/check-content-coherence.mjs` |
| 82 | blocking | 1.9s | 0 | `node scripts/build-route-consolidation.mjs --check` |
| 22 | blocking | 1.9s | 0 | `node scripts/check-schema-coverage.mjs` |
| 11 | blocking | 1.8s | 0 | `node scripts/check-og-images.mjs` |
| 106 | advisory | 1.5s | 1 | `node scripts/generate-build-sha.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
