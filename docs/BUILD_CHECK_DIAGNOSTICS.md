# Build Check Diagnostics

Generated: 2026-08-11T00:47:41.104Z
Receipt: `8f1d86f13327f497e90f5d2b` · coverage 293/293 from step 1

Latest: **293/293** passed · failed 0 · total 250.5s
Concentration: **13.0%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 32.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 251 | 25.0s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 55 | 23.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 123 | 13.3s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 87 | 9.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 28 | 5.2s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 284 | 3.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 90 | 3.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 127 | 3.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 234 | 3.1s | 0 | `node scripts/check-orphan-scripts.mjs --check` |

## Failures

- None.
