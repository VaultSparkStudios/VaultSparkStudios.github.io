# Build Check Diagnostics

Generated: 2026-10-13T21:37:32.340Z
Receipt: `1599d0800a6ee49084667d04` · coverage 26/534 from step 135

Latest: **25/26** passed · failed 1 · total 168.6s
Concentration: **59.9%** in step 153 · ratchet BREACHED (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 153 | 101.0s | 0 | `node scripts/build-geo-vitals.mjs --check` |
| 160 | 32.9s | 1 | `node scripts/check-proof-surface.mjs` |
| 145 | 16.2s | 0 | `node scripts/check-mobile-contracts.mjs` |
| 147 | 3.9s | 0 | `node scripts/check-ambient-placement.mjs` |
| 136 | 2.3s | 0 | `node scripts/csp-audit.mjs` |
| 149 | 1.7s | 0 | `node scripts/measure-throttled-vitals.mjs --self-test` |
| 151 | 1.0s | 0 | `node scripts/pull-rum-summary.mjs --check` |
| 135 | 0.9s | 0 | `node scripts/rotate-ledger.mjs --check-size` |
| 137 | 0.9s | 0 | `node scripts/check-sri.mjs` |
| 150 | 0.8s | 0 | `node scripts/pull-rum-summary.mjs --self-test` |

## Failures

- Step 160: `node scripts/check-proof-surface.mjs` exited 1
