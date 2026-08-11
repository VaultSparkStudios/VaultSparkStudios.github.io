# Build Check Diagnostics

Generated: 2026-08-10T23:59:44.275Z
Receipt: `39e402e2850eb2a658caa46b` · coverage 293/293 from step 1

Latest: **293/293** passed · failed 0 · total 765.8s
Concentration: **17.2%** in step 284 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 284 | 131.9s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 251 | 73.7s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 134 | 56.8s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 36.0s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 273 | 35.7s | 0 | `node scripts/crawl-all-pages.mjs` |
| 275 | 28.5s | 0 | `node scripts/check-vocabulary-consistency.mjs` |
| 28 | 21.5s | 0 | `node scripts/check-generated-drift-preflight.mjs` |
| 87 | 16.8s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 270 | 16.2s | 0 | `node scripts/check-meta-descriptions.mjs` |
| 91 | 7.7s | 0 | `node scripts/lint-repo.mjs` |

## Failures

- None.
