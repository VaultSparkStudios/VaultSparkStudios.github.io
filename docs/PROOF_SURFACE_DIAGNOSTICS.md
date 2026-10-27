# Proof Surface Diagnostics

Generated: 2026-10-27T06:17:28.638Z
Receipt: `1430c02bb5e16cd3a1539538` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 164.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 22 | blocking | 8.5s | 0 | `node scripts/check-schema-coverage.mjs` |
| 37 | blocking | 5.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 11 | blocking | 4.8s | 0 | `node scripts/check-og-images.mjs` |
| 49 | blocking | 4.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 38 | blocking | 4.6s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 36 | blocking | 4.2s | 0 | `node scripts/build-news-desk.mjs --self-test` |
| 65 | blocking | 4.1s | 0 | `node scripts/check-content-coherence.mjs` |
| 35 | blocking | 4.0s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 26 | blocking | 3.2s | 0 | `node scripts/check-hero-spotlight-coherence.mjs` |
| 78 | blocking | 3.2s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
