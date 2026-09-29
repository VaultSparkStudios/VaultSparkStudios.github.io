# Build Check Diagnostics

Generated: 2026-09-29T19:33:57.796Z
Receipt: `16058ee850167b823612089d` · coverage 135/505 from step 371

Latest: **135/135** passed · failed 0 · total 184.6s
Concentration: **17.5%** in step 481 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 481 | 32.3s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 388 | 15.2s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 479 | 8.2s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 402 | 3.8s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 384 | 3.5s | 0 | `node scripts/check-mobile-runtime-contract.mjs` |
| 411 | 3.1s | 0 | `node scripts/check-site-integrity.mjs` |
| 478 | 2.8s | 0 | `node scripts/generate-news-art-codex.mjs --self-test` |
| 413 | 2.4s | 0 | `node scripts/generate-evidence-hub.mjs --check` |
| 417 | 2.2s | 0 | `node scripts/check-recovery-process-contract.mjs` |
| 373 | 1.7s | 0 | `node scripts/check-workflow-git-add-pathspecs.mjs` |

## Failures

- None.
