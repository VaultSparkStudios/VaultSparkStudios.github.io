# Build Check Diagnostics

Generated: 2026-08-17T17:04:35.833Z
Receipt: `bb76e07b3f627302df5dda72` · coverage 263/309 from step 1

Latest: **262/263** passed · failed 1 · total 194.4s
Concentration: **17.7%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 34.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 253 | 20.5s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 55 | 20.2s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 87 | 5.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 90 | 4.4s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 92 | 3.6s | 0 | `node scripts/validate-module-imports.mjs` |
| 127 | 3.6s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 52 | 3.4s | 0 | `node scripts/run-build-check.mjs --self-test` |
| 59 | 3.2s | 0 | `node scripts/check-startup-meter-freshness.mjs` |
| 28 | 3.1s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- Step 263: `node scripts/build-agents-json.mjs --check` exited 1
