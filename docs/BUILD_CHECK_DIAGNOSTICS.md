# Build Check Diagnostics

Generated: 2026-11-18T09:57:25.491Z
Receipt: `2a685c7da1a95d4bcbb84f9e` · coverage 220/561 from step 342

Latest: **220/220** passed · failed 0 · total 195.1s
Concentration: **12.2%** in step 524 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 524 | 23.8s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 551 | 19.6s | 0 | `node scripts/verify-browser-collection.mjs` |
| 553 | 13.8s | 0 | `node --test tests/oracle-stream.unit.spec.mjs` |
| 554 | 10.5s | 0 | `node --test tests/desk-email-art.unit.spec.mjs` |
| 421 | 9.5s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 557 | 6.6s | 0 | `node --test tests/isolated-staging-workflow-inputs.unit.spec.mjs tests/isolated-staging-rendezvous.unit.spec.mjs` |
| 503 | 4.3s | 0 | `node scripts/build-desk-dispatch-digest.mjs --self-test` |
| 522 | 4.1s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 392 | 4.1s | 0 | `node scripts/check-orphan-libs.mjs --check` |
| 555 | 4.0s | 0 | `node --test tests/visual-capture-source.unit.spec.mjs` |

## Failures

- None.
