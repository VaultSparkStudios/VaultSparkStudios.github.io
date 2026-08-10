# Proof Surface Diagnostics

Generated: 2026-08-10T15:45:11.474Z
Receipt: `7bbe18f59f518bec05268fb5` · coverage 84/84

Latest: **84/84** passed · blocking 69/69 · advisory findings 0/15 · total 30.8s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 17 | blocking | 1.2s | 0 | `node scripts/enrich-videogame-schema.mjs --check` |
| 75 | advisory | 0.8s | 0 | `node scripts/build-constellation-activity.mjs --check` |
| 29 | blocking | 0.7s | 0 | `node scripts/build-portfolio-counts.mjs --self-test` |
| 53 | blocking | 0.7s | 0 | `node scripts/check-journal-dates.mjs` |
| 82 | advisory | 0.7s | 0 | `node scripts/generate-build-sha.mjs --check` |
| 33 | blocking | 0.7s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |
| 45 | blocking | 0.6s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 15 | blocking | 0.5s | 0 | `node scripts/check-videogame-schema.mjs --self-test` |
| 24 | blocking | 0.5s | 0 | `node scripts/check-hero-spotlight-coherence.mjs` |
| 26 | blocking | 0.5s | 0 | `node scripts/check-project-links.mjs` |

## Failures

- None.
