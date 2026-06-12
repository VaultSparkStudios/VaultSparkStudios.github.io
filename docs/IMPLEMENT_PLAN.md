<!-- generated-by: /implement skill v1.0 -->
<!-- generated-at: 2026-06-11 · session 189 · source: docs/AUDIT_2026-06-11-S189.json -->

# Implement Plan — VaultSpark Studios (S189)

Optimal-efficiency order (not raw priority): RUM/allowlist cluster shares context → UX win → artifact-settle last.

| Seq | Slug | Axis | Effort | Priority | Why this position |
|----|------|------|--------|----------|-------------------|
| 1 | funnel-conversion-rollup | feedback | 4h | 31.3 | Foundational 🔥 — creates `api/funnel-summary.json` that #2 feeds and #3 reconciles. Front-loaded so the highest-impact ship lands first. |
| 2 | oracle-answer-feedback-loop | ai | 2h | 24.5 | Shares RUM-beacon + Worker-allowlist context with #1; adds events consumed by the new funnel summary. |
| 3 | rum-dead-allowlist-sweep | security | 0.5h | 11.3 | Must run AFTER #1+#2 land — reconciles `RUM_UX_EVENTS` once new beacons exist. |
| 4 | flagship-storytelling-wave2 | ux | 1h | 17.7 | Independent UX win; mirrors the S188 additive promise pattern to the 2nd live title. |
| 5 | ignis-rescore-artifact-settle | process | 0.5h | 6.0 | LAST — rescore + `npm run build` settles all generated artifacts after every code change. |

Quality gates per item: website medium → Lighthouse ≥90 mobile (CI-owned via `lighthouse.yml`; additive/non-page changes exempt) · `build:check` green · each item names a conversion/info-finding outcome.
