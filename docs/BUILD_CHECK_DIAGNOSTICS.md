# Build Check Diagnostics

Generated: 2026-09-03T14:29:51.469Z
Receipt: `239382fb2c4e774a0eea5682` · coverage 388/388 from step 1

Latest: **388/388** passed · failed 0 · total 223.4s
Concentration: **17.0%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 38.0s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 24.2s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 61 | 13.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 8.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 245 | 5.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 93 | 4.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 296 | 3.7s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 133 | 3.3s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 29 | 3.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 58 | 2.1s | 0 | `node scripts/run-build-check.mjs --self-test` |

## Failures

- None.
