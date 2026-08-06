# Build Check Diagnostics

Generated: 2026-08-06T03:37:33.797Z
Receipt: `188ec5585890a52aa2e967f5` · coverage 224/275 from step 1

Latest: **223/224** passed · failed 1 · total 47.7s
Concentration: **14.9%** in step 82 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 82 | 7.1s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 47 | 6.6s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 126 | 6.6s | 0 | `node scripts/check-proof-surface.mjs` |
| 221 | 2.6s | 0 | `node scripts/check-orphan-scripts.mjs --check` |
| 79 | 0.9s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 174 | 0.8s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --self-test` |
| 173 | 0.8s | 0 | `node scripts/analyze-home-lcp.mjs --check` |
| 115 | 0.7s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 175 | 0.7s | 0 | `node scripts/capture-home-first-viewport-proof.mjs --check` |
| 20 | 0.7s | 0 | `node scripts/check-generated-drift-preflight.mjs` |

## Failures

- Step 224: `node scripts/validate-skill-yaml.mjs` exited 1
