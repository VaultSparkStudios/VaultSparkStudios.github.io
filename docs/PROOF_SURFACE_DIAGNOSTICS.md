# Proof Surface Diagnostics

Generated: 2026-10-18T15:51:58.796Z
Receipt: `1c79b15e265bf93161cae2be` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 56.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 65 | blocking | 9.6s | 0 | `node scripts/check-content-coherence.mjs` |
| 78 | blocking | 3.8s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 37 | blocking | 2.3s | 0 | `node scripts/build-news-desk.mjs --check` |
| 38 | blocking | 1.8s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 1.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 64 | blocking | 1.1s | 0 | `node scripts/check-content-coherence.mjs --self-test` |
| 92 | blocking | 1.1s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 61 | blocking | 1.1s | 0 | `node scripts/build-proposed-edges.mjs --check` |
| 60 | blocking | 1.0s | 0 | `node scripts/build-proposed-edges.mjs --self-test` |
| 35 | blocking | 0.9s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
