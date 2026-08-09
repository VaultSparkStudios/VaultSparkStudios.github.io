# Build Check Diagnostics

Generated: 2026-08-09T08:01:27.942Z
Receipt: `552f038e716cd0b79c1ea1cf` · coverage 288/288 from step 1

Latest: **288/288** passed · failed 0 · total 561.0s
Concentration: **15.1%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 84.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 65.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 87 | 23.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 279 | 21.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 127 | 13.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 28 | 12.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 52 | 10.2s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 90 | 8.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 268 | 8.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 91 | 7.2s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
