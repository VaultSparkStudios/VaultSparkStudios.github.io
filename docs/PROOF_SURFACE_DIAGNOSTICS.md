# Proof Surface Diagnostics

Generated: 2026-08-08T05:53:17.607Z
Receipt: `2050dea510157764472e72e2` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 179.3s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 33 | blocking | 11.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 9 | blocking | 6.8s | 0 | `node scripts/check-og-images.mjs` |
| 45 | blocking | 6.2s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 67 | blocking | 5.4s | 0 | `node scripts/check-project-status-coherence.mjs` |
| 14 | blocking | 4.2s | 0 | `node scripts/inject-collection-jsonld.mjs --check` |
| 42 | blocking | 4.1s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 71 | advisory | 3.8s | 0 | `node scripts/check-dead-ctas.mjs --check` |
| 53 | blocking | 3.6s | 0 | `node scripts/check-journal-dates.mjs` |
| 47 | blocking | 3.2s | 0 | `node scripts/check-trust-feed-freshness.mjs` |
| 22 | blocking | 3.1s | 0 | `node scripts/check-game-playability-coherence.mjs` |

## Failures

- None.
