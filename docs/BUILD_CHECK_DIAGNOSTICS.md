# Build Check Diagnostics

Generated: 2026-08-16T02:55:57.179Z
Receipt: `8f6ecbfe53f280c8e06a4307` · coverage 295/295 from step 1

Latest: **295/295** passed · failed 0 · total 154.7s
Concentration: **14.4%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 22.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 127 | 11.2s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 253 | 8.0s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 55 | 7.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 90 | 6.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 87 | 5.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 91 | 4.9s | 0 | `node scripts/lint-repo.mjs` |
| 119 | 4.5s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 110 | 2.8s | 0 | `node scripts/csp-audit.mjs` |
| 286 | 2.7s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
