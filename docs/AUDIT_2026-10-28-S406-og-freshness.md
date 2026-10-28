<!-- generated-by: render-audit-md.mjs (R-H14) — DERIVED FROM AUDIT_2026-10-28-S406-og-freshness.json; do not hand-edit -->
<!-- generated-at: 2026-10-28 -->
<!-- project: vaultsparkstudios-website · type: website -->

# Project Audit — VaultSpark Studios

> One ranked improvement plan covering 9 axes. Top items first.
> Source of truth: this file is derived from the JSON sidecar. Edit the JSON, then re-render.
> Run `/implement` to execute in optimal order.

## Top-line

- Total items: 1
- Combined Priority: 11.35
- Top 3: og-coverage-closeout-freshness

## Lifecycle and readiness

- Stage: S1 · source: registry
- Work focus: supported-release · health: yellow · source: project-status

| Area | State | Evidence / reason | Owner | Next acceptance check |
|---|---|---|---|---|

## Ranked Plan

| # | Tier | Axis | Effort | Impact | Innov | Priority | Status | Item |
|---|:-:|---|---|:-:|:-:|:-:|:-:|---|
| 1 | ⚡ | speed-organization-efficiency | 30m | 5 | 3 | 11.3 | ✓ | **og-coverage-closeout-freshness** — Keep Open Graph (OG) coverage fresh during closeout. The native proof-surface gate requires OG coverage no older than2days, but the full and scheduled refresh build profiles omit its existing inventory generator. The live source run rejected a3day-old receipt. **Recipe:** Reuse build-og-coverage.mjs in both canonical profiles before public status and candidate sealing. Recompute actual current page inventory, retain freshness limits, verify existing generator/profile tests and complete source/release checks. **Readiness:** supported-release evidence freshness. Repair an observed blocking release gate using the existing producer, without adding product breadth or weakening verification. |

## Depth Ladder (per item: L1 minimal · L2 solid · L3 genius)

> Select the authorized depth before implementation (default L2).
> Complete the selected outcomes and their acceptance checks. Stop when they are verified. Explore and Maintain require an explicitly requested boundary. Budgets are ceilings. Unused tokens, an empty queue, or historical velocity never authorize additional work or greater depth. Partial, blocked, deferred, stale, or unmeasured evidence is not verified completion. Keep remaining authorized work visible. Preserve the user's scope and existing authorization. Apply the gates required by the action. Explicit /start and /closeout keep their canonical protocols.

### og-coverage-closeout-freshness
- **L1 · minimal** _(~15m)_ — Regenerate the actual inventory for this release.
- **L2 · solid** _(~30m)_ — Include the existing producer in both refresh profiles, regenerate real inventory, retain age limit and run focused plus full acceptance.
- **L3 · genius** _(~2h)_ — A separate broader producer/freshness graph review only after another demonstrated omission; not selected.

## Execution Log

### og-coverage-closeout-freshness
- `2026-10-28T18:25:31.137Z` · **shipped** · Both profiles include actual native inventory producer before status and seal; focused existing43+10+6checks and actual current --check passed; independent static review PASS0. Full release remains separate in docs/RELEASE_S406.json.

