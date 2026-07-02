# Implement Plan — 2026-07-01 S246

Source audit: `docs/AUDIT_2026-07-01.json`

## Wave Order

1. `startup-session-regression-guard` — fixed first because stale session truth poisons every later protocol phase.
2. `human-pressure-empty-state` — adjacent startup renderer surface; keeps canonical brief shape honest.
3. `router-preflight-shim` — removes `/start` module error without copying Studio Ops logic.
4. `closeout-brief-behavior-fixture` — turns S245 renderer restore into behavior-checked closeout proof.
5. `audit-implement-contract-shim` — stabilizes future `/implement` reads from audit sidecars.
6. `startup-session-coherence-gate` — second-order innovation: a reusable gate that prevents the session-regression class from returning.
7. `protocol-shim-completion` — second-order innovation: close all unexpected local protocol-script absences with Studio Ops delegation shims.

## Execution Log

| Item | Result | Evidence |
|---|---|---|
| startup-session-regression-guard | shipped | `render-startup-brief.mjs` now reconciles SIL/status/handoff/task/current-state and heals forward only. |
| human-pressure-empty-state | shipped | `docs/STARTUP_BRIEF.md` validates with HUMAN PRESSURE present and `brief-coherent: true`. |
| router-preflight-shim | shipped | `node scripts/router.mjs suggest --top 3 --json` returns route suggestions. |
| closeout-brief-behavior-fixture | shipped | `smoke-startup-scripts` checks voice rejection and archive creation. |
| audit-implement-contract-shim | shipped | `scripts/lib/audit-sidecar.mjs` imports through startup smoke. |
| startup-session-coherence-gate | shipped | `smoke-startup-scripts` reports `completed S245 -> brief S246`. |
| protocol-shim-completion | shipped | `check-protocol-scripts --info` reports `0 unexpected-absent`. |

## Honest Deferrals

- `inp-root-fix` remains data-blocked: `rollup-inp-telemetry --check` reports 0 routes / 0 samples.
- Lighthouse floor tuning remains evidence-gated: build-check reports all tracked pages at or above the current floor and no rolling-median regression.
