# Build Check Diagnostics

Generated: 2026-07-31T08:09:34.386Z
Receipt: `7f8bafcb55f8a5a5458b676e` · coverage 261/261 from step 1

Latest: **261/261** passed · failed 0 · total 112.5s
Concentration: **15.2%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 17.1s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 10.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 3.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 253 | 3.3s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 73 | 3.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 11 | 2.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 242 | 2.2s | 0 | `node scripts/crawl-all-pages.mjs` |
| 210 | 1.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 95 | 1.5s | 0 | `node scripts/verify-supply-chain.mjs` |
| 74 | 1.1s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
