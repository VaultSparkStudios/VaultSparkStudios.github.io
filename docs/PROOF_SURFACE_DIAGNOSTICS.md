# Proof Surface Diagnostics

Generated: 2026-10-10T05:10:02.410Z
Receipt: `ac369e509f20e4d2c3e46891` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 20.1s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 18 | blocking | 2.4s | 0 | `node scripts/check-videogame-schema.mjs` |
| 37 | blocking | 0.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 11 | blocking | 0.7s | 0 | `node scripts/check-og-images.mjs` |
| 78 | blocking | 0.7s | 0 | `node scripts/build-news-visual-receipts.mjs --check` |
| 2 | blocking | 0.6s | 0 | `node scripts/check-deploy-parity.mjs --local` |
| 38 | blocking | 0.6s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 0.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 65 | blocking | 0.5s | 0 | `node scripts/check-content-coherence.mjs` |
| 7 | blocking | 0.5s | 0 | `node scripts/build-status-proof.mjs --check --check-content` |
| 1 | blocking | 0.4s | 0 | `node scripts/build-ecosystem-stats-page.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
