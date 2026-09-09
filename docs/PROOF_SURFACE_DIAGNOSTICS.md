# Proof Surface Diagnostics

Generated: 2026-09-09T04:44:35.991Z
Receipt: `1f6b608c2c4a8e1d160fad6d` · coverage 107/107

Latest: **107/107** passed · blocking 90/90 · advisory findings 0/17 · total 60.6s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 1.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 16 | blocking | 1.6s | 0 | `node scripts/check-videogame-schema.mjs` |
| 33 | blocking | 1.4s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 31 | blocking | 1.4s | 0 | `node scripts/check-registry-freshness.mjs --self-test` |
| 101 | advisory | 1.2s | 0 | `node scripts/build-atlas.mjs --check` |
| 48 | blocking | 1.2s | 0 | `node scripts/check-trust-feed-freshness.mjs --self-test` |
| 44 | blocking | 1.1s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 9 | blocking | 1.0s | 0 | `node scripts/check-og-images.mjs` |
| 104 | advisory | 0.9s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 30 | blocking | 0.9s | 0 | `node scripts/build-portfolio-counts.mjs --check` |

## Failures

- None.
