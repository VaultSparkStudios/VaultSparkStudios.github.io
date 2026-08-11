# Build Check Diagnostics

Generated: 2026-08-11T23:01:04.644Z
Receipt: `cf774febfdc668dae34a51bf` · coverage 295/295 from step 1

Latest: **295/295** passed · failed 0 · total 1300.2s
Concentration: **8.5%** in step 55 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 55 | 110.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 134 | 105.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 286 | 103.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 87 | 47.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 253 | 45.4s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 91 | 30.0s | 0 | `node scripts/lint-repo.mjs` |
| 275 | 28.8s | 0 | `node scripts/crawl-all-pages.mjs` |
| 28 | 27.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 23 | 23.6s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 220 | 22.5s | 0 | `node scripts/check-image-formats.mjs --strict` |

## Failures

- None.
