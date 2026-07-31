# Build Check Diagnostics

Generated: 2026-07-31T03:26:26.627Z
Receipt: `edec74f272eb0df08ccc7101` · coverage 261/261 from step 1

Latest: **261/261** passed · failed 0 · total 194.8s
Concentration: **15.5%** in step 38 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 38 | 30.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 117 | 25.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 11 | 6.3s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 70 | 6.3s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 210 | 3.7s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 73 | 2.9s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 242 | 2.7s | 0 | `node scripts/crawl-all-pages.mjs` |
| 261 | 2.2s | 0 | `node scripts/check-served-feed-content-type.mjs --self-test` |
| 205 | 1.6s | 0 | `node scripts/check-placeholder-orphans.mjs` |
| 253 | 1.5s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |

## Failures

- None.
