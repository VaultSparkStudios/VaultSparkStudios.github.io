# Build Check Diagnostics

Generated: 2026-07-07T00:09:36.700Z

Latest: **21/21** passed · failed 0 · total 5.5s

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 168 | 1.1s | 0 | `node scripts/crawl-all-pages.mjs` |
| 179 | 0.8s | 0 | `node scripts/check-audit-staleness.mjs --self-test` |
| 174 | 0.3s | 0 | `node scripts/check-active-tt-sinks.mjs` |
| 170 | 0.3s | 0 | `node scripts/check-vocabulary-consistency.mjs` |
| 165 | 0.2s | 0 | `node scripts/check-meta-descriptions.mjs` |
| 178 | 0.2s | 0 | `node scripts/check-rum-allowlist.mjs` |
| 173 | 0.2s | 0 | `node scripts/analyze-tt-violations.mjs --self-test` |
| 172 | 0.2s | 0 | `node scripts/lint-tt-policies.mjs` |
| 181 | 0.2s | 0 | `node scripts/check-content-freshness.mjs` |
| 176 | 0.2s | 0 | `node scripts/build-tt-readiness.mjs --check` |

## Failures

- None.
