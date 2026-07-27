# Implementation Plan — S296

Source: `docs/AUDIT_2026-07-26.json`

Strategy: L3 depth throughout; foundations and short compounding gates first.

| Wave | Audit item | Why this order | Verification |
|---:|---|---|---|
| 1 | `project-scoped-supply-chain-gate` | Removes roughly one-third of the full gate latency before later reruns. | Wrapper self-test; real scoped scan; diagnostics timing. |
| 2 | `doctor-unavailable-is-not-green` | Small truth fix that makes every later Doctor result trustworthy. | Doctor parser self-test; live Doctor JSON/board; blockingFailing 0. |
| 3 | `shared-revenue-freshness-source` | Shared resolver foundation removes startup/Doctor contradiction. | Resolver fixtures; checker; rendered brief; cross-surface agreement. |
| 4 | `rum-canary-honest-dark` | Deepest data-contract change; benefits from already-trustworthy diagnostics. | Empty/stale/thin/healthy/anomaly fixtures; live artifact; build step. |
| 5 | `closeout-taskboard-rotation-automation` | Commit-boundary automation lands after all active audit rows are recorded. | Rotator self-test/apply/idempotence; boundary contract; archive integrity. |

No page markup or styling changes are planned, so the Lighthouse page-change success bar is not triggered. Existing public contracts remain mandatory.
