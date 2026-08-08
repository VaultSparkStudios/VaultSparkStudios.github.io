# Build Check Diagnostics

Generated: 2026-08-08T00:17:57.964Z
Receipt: `3a68dcd75965141da58e4090` · coverage 283/283 from step 1

Latest: **283/283** passed · failed 0 · total 419.9s
Concentration: **14.7%** in step 55 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 55 | 61.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 134 | 36.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 123 | 24.9s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 28 | 20.6s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 23 | 14.0s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 87 | 10.2s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 52 | 8.9s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 229 | 4.5s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 90 | 4.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 19 | 4.0s | 0 | `node scripts/verify-supabase-runtime.mjs --self-test` |

## Failures

- None.
