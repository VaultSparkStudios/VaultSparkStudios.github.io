# Build Check Diagnostics

Generated: 2026-11-18T06:56:46.720Z
Receipt: `d2ef83a47d8d804211bcbd7f` · coverage 7/561 from step 555

Latest: **7/7** passed · failed 0 · total 19.0s
Concentration: **32.6%** in step 555 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 555 | 6.2s | 0 | `node --test tests/visual-capture-source.unit.spec.mjs` |
| 557 | 5.0s | 0 | `node --test tests/isolated-staging-workflow-inputs.unit.spec.mjs tests/isolated-staging-rendezvous.unit.spec.mjs` |
| 559 | 2.9s | 0 | `node --test tests/provider-journey-credential.unit.spec.mjs tests/production-postflight.unit.spec.mjs` |
| 556 | 2.4s | 0 | `node scripts/test/isolated-staging-evidence.mjs` |
| 560 | 1.1s | 0 | `node scripts/test/safe-inline-json.mjs` |
| 558 | 0.9s | 0 | `node --test tests/ambient-header-priority.unit.spec.mjs` |
| 561 | 0.5s | 0 | `node scripts/test/served-surface-boundary.mjs` |

## Failures

- None.
