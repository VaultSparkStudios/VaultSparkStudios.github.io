# Build Check Diagnostics

Generated: 2026-07-28T01:02:32.447Z
Receipt: `c4adfdd86c21873517e73de0` · coverage 253/253 from step 1

Latest: **253/253** passed · failed 0 · total 83.6s
Concentration: **15.2%** in step 38 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 38 | 12.7s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 117 | 11.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 11 | 2.9s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 73 | 2.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 70 | 2.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 206 | 1.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 249 | 1.6s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 95 | 1.4s | 0 | `node scripts/verify-supply-chain.mjs` |
| 238 | 1.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 74 | 0.9s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
