# Build Check Diagnostics

Generated: 2026-09-01T13:00:32.429Z
Receipt: `9a61696fda0b065a49aa5f74` · coverage 15/378 from step 171

Latest: **14/15** passed · failed 1 · total 5.6s
Concentration: **11.0%** in step 177 · ratchet clear (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 177 | 0.6s | 0 | `node scripts/build-nav-sheet-stats.mjs --self-test` |
| 182 | 0.4s | 0 | `node scripts/build-oracle-query-clusters.mjs --self-test` |
| 174 | 0.4s | 0 | `node scripts/build-inp-soak-verdicts.mjs --check` |
| 184 | 0.4s | 0 | `node scripts/build-intelligence-budget.mjs --self-test` |
| 185 | 0.4s | 1 | `node scripts/build-intelligence-budget.mjs --check` |
| 179 | 0.4s | 0 | `node scripts/build-ux-decision-ledger.mjs --check` |
| 181 | 0.4s | 0 | `node scripts/build-ignis-search-index.mjs --check` |
| 175 | 0.3s | 0 | `node scripts/inject-pre-paint-stage.mjs --self-test` |
| 176 | 0.3s | 0 | `node scripts/inject-pre-paint-stage.mjs --check` |
| 173 | 0.3s | 0 | `node scripts/build-inp-soak-verdicts.mjs --self-test` |

## Failures

- Step 185: `node scripts/build-intelligence-budget.mjs --check` exited 1
