# Build Check Diagnostics

Generated: 2026-08-19T21:05:54.137Z
Receipt: `bcd73a488a0e0db1f5169f73` · coverage 319/319 from step 1

Latest: **319/319** passed · failed 0 · total 270.1s
Concentration: **21.4%** in step 138 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 138 | 57.7s | 0 | `node scripts/check-proof-surface.mjs` |
| 131 | 24.0s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 259 | 18.3s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 59 | 13.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 91 | 11.4s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 94 | 9.2s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 95 | 3.9s | 0 | `node scripts/lint-repo.mjs` |
| 242 | 3.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 29 | 2.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 114 | 2.7s | 0 | `node scripts/csp-audit.mjs` |

## Failures

- None.
