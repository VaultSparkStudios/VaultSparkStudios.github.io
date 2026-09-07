# Build Check Diagnostics

Generated: 2026-09-07T18:02:15.398Z
Receipt: `a85398da0e3b492a30eaf266` · coverage 390/390 from step 1

Latest: **390/390** passed · failed 0 · total 466.6s
Concentration: **14.6%** in step 140 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 140 | 68.3s | 0 | `node scripts/check-proof-surface.mjs` |
| 263 | 60.9s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 97 | 28.6s | 0 | `node scripts/lint-repo.mjs` |
| 133 | 22.3s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 61 | 19.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 96 | 10.6s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 98 | 10.4s | 0 | `node scripts/validate-module-imports.mjs` |
| 245 | 9.8s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 125 | 8.5s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 296 | 8.4s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
