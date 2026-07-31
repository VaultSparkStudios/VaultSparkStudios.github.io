# Proof Surface Diagnostics

Generated: 2026-07-31T08:52:36.840Z
Receipt: `19dbc88b6af7d3205dc77fb4` · coverage 81/81

Latest: **80/81** passed · blocking 66/66 · advisory findings 1/15 · total 30.2s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 64 | blocking | 0.8s | 0 | `node scripts/check-project-status-coherence.mjs` |
| 7 | blocking | 0.8s | 0 | `node scripts/check-proof-feed-generators.mjs` |
| 70 | advisory | 0.7s | 0 | `node scripts/check-identity-coherence.mjs` |
| 32 | blocking | 0.7s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs --self-test` |
| 63 | blocking | 0.7s | 0 | `node scripts/check-project-status-coherence.mjs --self-test` |
| 68 | advisory | 0.7s | 0 | `node scripts/check-dead-ctas.mjs --check` |
| 9 | blocking | 0.6s | 0 | `node scripts/check-og-images.mjs` |
| 73 | advisory | 0.6s | 0 | `node scripts/build-oracle-feedback-themes.mjs --check` |
| 67 | advisory | 0.6s | 0 | `node scripts/check-mission-statement-coherence.mjs` |
| 13 | blocking | 0.6s | 0 | `node scripts/inject-collection-jsonld.mjs --self-test` |

## Failures

- Step 79 [advisory]: `node scripts/generate-build-sha.mjs --check` exited 1 — self/freshness
