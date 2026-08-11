# Build Check Diagnostics

Generated: 2026-08-11T06:00:44.821Z
Receipt: `8a63abe1ca1aece4f4ce4430` · coverage 293/293 from step 1

Latest: **293/293** passed · failed 0 · total 1789.2s
Concentration: **13.8%** in step 134 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 134 | 247.4s | 0 | `node scripts/check-proof-surface.mjs` |
| 55 | 177.9s | 0 | `node scripts/smoke-startup-scripts.mjs` |
| 91 | 82.0s | 0 | `node scripts/lint-repo.mjs` |
| 123 | 81.6s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 92 | 81.5s | 0 | `node scripts/validate-module-imports.mjs` |
| 284 | 57.6s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 90 | 56.3s | 0 | `node scripts/check-orphan-assets.mjs --strict` |
| 251 | 55.0s | 0 | `node scripts/resync-derived.mjs --self-test` |
| 87 | 54.6s | 0 | `node scripts/smoke-s98-scripts.mjs` |
| 52 | 29.3s | 0 | `node scripts/run-build-check.mjs --self-test` |

## Failures

- None.
