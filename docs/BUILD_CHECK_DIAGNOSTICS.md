# Build Check Diagnostics

Generated: 2026-07-31T07:59:56.790Z
Receipt: `cb9177800e3a2e65de276a14` · coverage 261/261 from step 1

Latest: **261/261** passed · failed 0 · total 103.7s
Concentration: **17.7%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 18.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 11.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 70 | 3.5s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 3.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 11 | 2.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 210 | 1.9s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 95 | 1.7s | 0 | `node scripts/verify-supply-chain.mjs` |
| 253 | 1.5s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 242 | 1.4s | 0 | `node scripts/crawl-all-pages.mjs` |
| 74 | 1.0s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
