# Implementation Plan — S297

Source: `docs/AUDIT_2026-07-27.json`

Strategy: L3 depth throughout; repair queue truth first, then closeout truth, then diagnostic completeness, then transport canonical defects through Ark.

| Wave | Audit item | Why this order | Verification |
|---:|---|---|---|
| 1 | `external-evidence-actionability-guard` | Removes the fabricated local NOW item and gives the saturation loop an honest project queue. | Classifier self-test; regenerated JSON/Markdown list; RUM wait gated; zero actionable items. |
| 2 | `closeout-test-evidence-derivation` | Makes every later closeout/status board derive from the direct suite receipt. | Adapter self-test; green/red/malformed fixtures; autopilot caller contract; PROJECT_STATUS dry fixture. |
| 3 | `proof-surface-advisory-observability` | Completes the slowest proof orchestrator's own evidence before final suite timing. | Orchestrator self-test; full live run; blocking/advisory counts; inner/outer duration reconciliation. |
| 4 | `canonical-start-contract-repair-cargo` | Ships exact canonical fixes without contaminating the local tree with control-plane forks. | Founder-Twin verdict; signed Ark cargo receipt; payload contains three fixtures and acceptance tests. |

No page markup or styling changes are planned, so the Lighthouse page-change success bar is not triggered. Existing public contracts remain mandatory.
