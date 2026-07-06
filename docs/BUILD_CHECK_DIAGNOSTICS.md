# Build Check Diagnostics

Generated: 2026-07-06T23:40:14.385Z

Latest: **21/21** passed · failed 0 · total 5.2s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 168 | 1.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 179 | 0.7s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 170 | 0.3s | 0 | `node scripts/check-vocabulary-consistency.mjs` |
| 165 | 0.2s | 0 | `node scripts/check-meta-descriptions.mjs` |
| 178 | 0.2s | 0 | `node scripts/check-rum-allowlist.mjs` |
| 173 | 0.2s | 0 | `node scripts/analyze-tt-violations.mjs --self-test` |
| 175 | 0.2s | 0 | `node scripts/build-tt-readiness.mjs --self-test` |
| 172 | 0.2s | 0 | `node scripts/lint-tt-policies.mjs` |
| 176 | 0.2s | 0 | `node scripts/build-tt-readiness.mjs --check` |
| 181 | 0.2s | 0 | `node scripts/check-content-freshness.mjs` |

## Failures

- None.
