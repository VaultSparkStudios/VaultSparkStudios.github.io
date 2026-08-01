# Build Check Diagnostics

Generated: 2026-08-01T02:24:15.896Z
Receipt: `dcf91c151d8cbb5ba34843a8` · coverage 262/262 from step 1

Latest: **262/262** passed · failed 0 · total 186.5s
Concentration: **16.2%** in step 117 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 117 | 30.2s | 0 | `node scripts/check-proof-surface.mjs` |
| 38 | 18.3s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 11 | 7.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 70 | 7.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 73 | 4.5s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 95 | 2.8s | 0 | `node scripts/verify-supply-chain.mjs` |
| 210 | 2.3s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 242 | 1.9s | 0 | `node scripts/crawl-all-pages.mjs` |
| 253 | 1.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 42 | 1.3s | 0 | `node scripts/check-startup-meter-freshness.mjs` |

## Failures

- None.
