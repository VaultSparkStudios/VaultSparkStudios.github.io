# Build Check Diagnostics

Generated: 2026-08-19T02:42:35.423Z
Receipt: `33d5c023aaa5f5a952753103` · coverage 319/319 from step 1

Latest: **319/319** passed · failed 0 · total 175.9s
Concentration: **16.1%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 28.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 259 | 20.0s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 12.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 94 | 6.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 91 | 4.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 131 | 3.7s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 242 | 3.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 2.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 233 | 2.1s | 0 | `node scripts/preflight-content-lane.mjs --warn-only` |
| 95 | 1.6s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
