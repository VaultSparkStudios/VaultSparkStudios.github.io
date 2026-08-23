# Proof Surface Diagnostics

Generated: 2026-08-23T17:38:16.763Z
Receipt: `b61a11df5b90d237e9a691bf` · coverage 89/89

Latest: **88/89** passed · blocking 72/72 · advisory findings 1/17 · total 62.9s

## Slowest Substeps

| Step | Class | Duration | Status | Command |
|---:|---|---:|---:|---|
| 47 | blocking | 3.0s | 0 | `node scripts/clean-stale-shells.mjs --check` |
| 55 | blocking | 1.7s | 0 | `node scripts/check-journal-dates.mjs` |
| 57 | blocking | 1.5s | 0 | `node scripts/check-decision-currency.mjs` |
| 82 | advisory | 1.5s | 0 | `node scripts/build-hero-portfolio.mjs --check` |
| 32 | blocking | 1.4s | 0 | `node scripts/check-taskboard-duplicate-titles.mjs --self-test` |
| 81 | advisory | 1.3s | 0 | `node scripts/build-cta-state.mjs --check` |
| 44 | blocking | 1.2s | 0 | `node scripts/derive-game-nav.mjs --check` |
| 43 | blocking | 1.2s | 0 | `node scripts/derive-game-nav.mjs --self-test` |
| 83 | advisory | 1.2s | 0 | `node scripts/build-atlas.mjs --check` |
| 54 | blocking | 1.1s | 0 | `node scripts/check-journal-dates.mjs --self-test` |

## Failures

- Step 89 [advisory]: `node scripts/build-release-dependencies.mjs --check` exited 1 — self/contract
