# Proof Surface Diagnostics

Generated: 2026-09-06T22:36:47.071Z
Receipt: `4fc90a0d812e74d1bc4887f0` · coverage 107/107

Latest: **107/107** passed · blocking 90/90 · advisory findings 0/17 · total 38.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 9 | blocking | 1.1s | 0 | `node scripts/check-og-images.mjs` |
| 90 | blocking | 1.0s | 0 | `node scripts/generate-sitemap.mjs --check` |
| 107 | advisory | 0.9s | 0 | `node scripts/build-release-dependencies.mjs --check` |
| 88 | blocking | 0.9s | 0 | `node scripts/check-visual-qa-retention.mjs --check` |
| 33 | blocking | 0.8s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 70 | blocking | 0.8s | 0 | `node scripts/check-phantom-carries.mjs --self-test` |
| 47 | blocking | 0.7s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 106 | advisory | 0.7s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs` |
| 104 | advisory | 0.7s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 24 | blocking | 0.6s | 0 | `node scripts/check-hero-spotlight-coherence.mjs` |

## Failures

- None.
