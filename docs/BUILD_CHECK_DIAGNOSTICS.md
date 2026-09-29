# Build Check Diagnostics

Generated: 2026-09-29T00:32:03.610Z
Receipt: `19a2df55ca3fb63b2b432201` · coverage 179/505 from step 327

Latest: **179/179** passed · failed 0 · total 379.0s
Concentration: **12.8%** in step 481 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 481 | 48.3s | 0 | `node scripts/ingest-news-art.mjs --self-test` |
| 388 | 42.5s | 0 | `node scripts/check-postbuild-ordering.mjs --self-test` |
| 402 | 16.7s | 0 | `node scripts/check-build-gate-reachability.mjs` |
| 384 | 13.0s | 0 | `node scripts/check-mobile-runtime-contract.mjs` |
| 479 | 9.7s | 0 | `node scripts/generate-news-art.mjs --self-test` |
| 417 | 6.2s | 0 | `node scripts/check-recovery-process-contract.mjs` |
| 355 | 4.6s | 0 | `node scripts/check-hero-lcp-element.mjs` |
| 367 | 4.2s | 0 | `node scripts/check-visual-review-receipt.mjs` |
| 478 | 3.8s | 0 | `node scripts/generate-news-art-codex.mjs --self-test` |
| 359 | 3.8s | 0 | `node scripts/check-orphan-libs.mjs --check` |

## Failures

- None.
