# Proof Surface Diagnostics

Generated: 2026-10-21T03:44:00.886Z
Receipt: `187792737f3f5ea329398e8d` · coverage 109/109

Latest: **108/109** passed · blocking 92/92 · advisory findings 1/17 · total 78.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 106 | advisory | 2.5s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 50 | blocking | 1.9s | 0 | `node scripts/check-trust-feed-freshness.mjs --self-test` |
| 49 | blocking | 1.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 24 | blocking | 1.6s | 0 | `node scripts/check-game-playability-coherence.mjs` |
| 38 | blocking | 1.4s | 0 | `node scripts/generate-news-pages.mjs --check` |
| 14 | blocking | 1.4s | 0 | `node scripts/build-og-cards.mjs --self-test` |
| 25 | blocking | 1.4s | 0 | `node scripts/check-hero-spotlight-coherence.mjs --self-test` |
| 52 | blocking | 1.4s | 0 | `node scripts/check-feed-publisher-manifest.mjs --self-test` |
| 16 | blocking | 1.4s | 0 | `node scripts/inject-collection-jsonld.mjs --check` |
| 37 | blocking | 1.3s | 0 | `node scripts/build-news-desk.mjs --check` |

## Failures

- Step 106 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
