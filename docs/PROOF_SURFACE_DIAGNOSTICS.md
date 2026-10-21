# Proof Surface Diagnostics

Generated: 2026-10-21T01:51:02.802Z
Receipt: `203934e3bf1c766a32fc7a5f` · coverage 109/109

Latest: **109/109** passed · blocking 92/92 · advisory findings 0/17 · total 60.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 37 | blocking | 1.8s | 0 | `node scripts/build-news-desk.mjs --check` |
| 65 | blocking | 1.7s | 0 | `node scripts/check-content-coherence.mjs` |
| 38 | blocking | 1.5s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 49 | blocking | 1.5s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 22 | blocking | 1.4s | 0 | `node scripts/check-schema-coverage.mjs` |
| 34 | blocking | 1.4s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs --self-test` |
| 46 | blocking | 1.3s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 106 | advisory | 1.3s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 55 | blocking | 1.3s | 0 | `node scripts/build-vault-momentum.mjs --check` |
| 25 | blocking | 1.2s | 0 | `node scripts/check-hero-spotlight-coherence.mjs --self-test` |

## Failures

- None.
