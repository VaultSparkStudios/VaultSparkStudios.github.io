# Build Check Diagnostics

Generated: 2026-08-03T03:40:03.383Z
Receipt: `58769ff5dcadac73aef8b064` · coverage 218/269 from step 1

Latest: **217/218** passed · failed 1 · total 32.6s
Concentration: **14.3%** in step 78 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 78 | 4.7s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 122 | 4.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 43 | 3.4s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 215 | 2.0s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 75 | 0.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 171 | 0.6s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |
| 170 | 0.6s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --self-test` |
| 16 | 0.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 169 | 0.5s | 0 | `node scripts/analyze-home-lcp.mjs --check` |
| 168 | 0.4s | 0 | `node scripts/analyze-home-lcp.mjs --self-test` |

## Failures

- Step 218: `node scripts/validate-skill-yaml.mjs` exited 1
