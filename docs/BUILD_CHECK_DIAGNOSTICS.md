# Build Check Diagnostics

Generated: 2026-11-23T15:12:01.149Z
Receipt: `e39cf1685a615a713ec7e012` · coverage 141/564 from step 424

Latest: **141/141** passed · failed 0 · total 131.6s
Concentration: **17.4%** in step 560 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 560 | 22.9s | 0 | `node --test tests/provider-journey-credential.unit.spec.mjs tests/production-postflight.unit.spec.mjs tests/content-baseline.unit.spec.mjs tests/checkout-renewal-disclosure.unit.spec.mjs tests/desk-publication-boundary.unit.spec.mjs` |
| 525 | 18.0s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 554 | 7.1s | 0 | `node --test tests/oracle-stream.unit.spec.mjs` |
| 555 | 5.0s | 0 | `node --test tests/desk-email-art.unit.spec.mjs` |
| 523 | 3.6s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 436 | 3.6s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 556 | 3.4s | 0 | `node --test tests/visual-capture-source.unit.spec.mjs tests/theme-scroll-tiles.unit.spec.mjs` |
| 504 | 3.4s | 0 | `node scripts/build-desk-dispatch-digest.mjs --self-test` |
| 524 | 2.9s | 0 | `node scripts/generate-vault-narrative.mjs --self-test` |
| 558 | 2.9s | 0 | `node --test tests/isolated-staging-workflow-inputs.unit.spec.mjs tests/isolated-staging-rendezvous.unit.spec.mjs` |

## Failures

- None.
