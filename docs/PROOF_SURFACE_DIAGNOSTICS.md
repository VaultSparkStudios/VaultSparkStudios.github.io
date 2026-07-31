# Proof Surface Diagnostics

Generated: 2026-07-31T09:16:38.778Z
Receipt: `5081ca5fd82f349da4c36f93` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 15.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 79 | advisory | 0.5s | 1 | `node scripts/generate-build-sha.mjs --check` |
| 37 | blocking | 0.4s | 0 | `node scripts/build-velocity-series.mjs --check` |
| 9 | blocking | 0.4s | 0 | `node scripts/check-og-images.mjs` |
| 13 | blocking | 0.4s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |
| 73 | advisory | 0.4s | 0 | `node scripts/build-oracle-feedback-themes.mjs --check` |
| 67 | advisory | 0.3s | 0 | `node scripts/check-mission-statement-coherence.mjs` |
| 69 | advisory | 0.3s | 0 | `node scripts/check-public-note-freshness.mjs` |
| 30 | blocking | 0.3s | 0 | `node scripts/build-portfolio-counts.mjs --check` |
| 42 | blocking | 0.3s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 33 | blocking | 0.3s | 0 | `node scripts/inject-breadcrumb-jsonld.mjs --check` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
