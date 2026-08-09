# Proof Surface Diagnostics

Generated: 2026-08-09T07:58:05.832Z
Receipt: `15f059825f306d317ab8c44a` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 82.7s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 42 | blocking | 4.5s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 53 | blocking | 3.8s | 0 | `node scripts/check-journal-dates.mjs` |
| 82 | advisory | 2.7s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 9 | blocking | 2.4s | 0 | `node scripts/check-og-images.mjs` |
| 33 | blocking | 2.2s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 6 | blocking | 2.2s | 0 | `node scripts/check-proof-feed-generators.mjs --self-test` |
| 84 | advisory | 2.0s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs` |
| 45 | blocking | 1.9s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 47 | blocking | 1.9s | 0 | `node scripts/check-trust-feed-freshness.mjs` |
| 41 | blocking | 1.8s | 0 | `node scripts/derive-game-nav.mjs --self-test` |

## Failures

- None.
