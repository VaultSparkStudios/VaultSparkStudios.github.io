# Implement Plan — S334 (2026-09-01)

Source: `docs/AUDIT_2026-08-31.json` (14 items). Re-sorted for EFFICIENCY, not priority:
same-axis grouped, small 🔥 first, foundations before facades, token-cost item placed where
its measurement lane can run, consolidations last.

| Wave | Items | Rung | Why here |
|---|---|---|---|
| 1 — correctness + security | 6, 1, 7, 12 | L2 / L1 | Smallest verifiable fixes; builds the orphan/tombstone machinery waves 2 reuses |
| 2 — structural wins | 2, 5, 10 | L1 / L2 | Consumes wave-1 tombstone machinery; deletes 6 pages, joins the .ai layer |
| 3 — token | 4 | L2 | Standalone file, offline self-test, pays out every scheduled run |
| 4 — perf | 8, 14 | L2 / L1 | Both need the CANON-053 rendered-pixel loop — batch the browser work |
| 5 — consolidation | 3, 9, 13 | L1 | Largest; benefits from waves 1–2 having removed the noise |
| 6 — flagship | 11 | L1 | Depends on item 5 making the .ai corpus discoverable |

## Fork resolved (audit item 2)

The audit flagged a founder fork: collapse all six Pathways, or keep `investors` + `press` as
real guided routes. Resolved to **collapse all six to `/pathways/#anchor`** for this session.
Rationale: reversible, zero content lost, and the current 530-byte pages convert nothing — a
real investor/press route is a content commitment, not a refactor, so it belongs in a session
with founder copy input. Recorded in DECISIONS.
