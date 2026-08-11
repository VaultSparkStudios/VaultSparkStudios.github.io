# Build Check Diagnostics

Generated: 2026-08-11T00:25:35.913Z
Receipt: `c95bd0d8f571286eaba46198` · coverage 293/293 from step 1

Latest: **293/293** passed · failed 0 · total 391.7s
Concentration: **23.1%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 90.5s | 0 | `node scripts/check-proof-surface.mjs` |
| 251 | 27.8s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 55 | 24.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 146 | 12.4s | 0 | `node scripts/inject-lqip.mjs --check` |
| 87 | 10.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 148 | 8.3s | 0 | `node scripts/inject-main-content-id.mjs --check` |
| 28 | 7.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 119 | 6.4s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 90 | 5.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 110 | 4.9s | 0 | `node scripts/csp-audit.mjs` |

## Failures

- None.
