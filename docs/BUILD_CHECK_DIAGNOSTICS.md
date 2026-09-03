# Build Check Diagnostics

Generated: 2026-09-03T01:47:52.938Z
Receipt: `5b0547b7b0002074fc6e9b29` · coverage 388/388 from step 1

Latest: **388/388** passed · failed 0 · total 179.7s
Concentration: **11.3%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 20.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 14.7s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 129 | 13.1s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 61 | 11.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 9.8s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 245 | 4.4s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 97 | 4.2s | 0 | `node scripts/lint-repo.mjs` |
| 93 | 3.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 296 | 3.2s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 127 | 3.0s | 0 | `node scripts/check-ambient-placement.mjs` |

## Failures

- None.
