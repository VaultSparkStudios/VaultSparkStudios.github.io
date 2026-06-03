<!-- generated-by: /implement skill v1.0 -->
<!-- generated-at: 2026-06-03 · session 172 -->
<!-- source: docs/AUDIT_2026-06-03.json -->

# Implement Plan — S172

Optimal-efficiency sequencing of the 12-item S172 audit (raw Priority sum 281.0).

## Wave 1 — RUM data spine (foundations; 🔥 first)
1. **rum-r2-field-unlock** (#1, 40.0) — R2→local fetch script; the phantom-blocker kill
2. **perf-truth-cascade** (#2, 34.2) — branch on sample count; flip or wire accrual

## Wave 2 — credential probes (same secrets-gateway surface)
3. **tt-soak-kv-probe** (#5, 26.6) — cfut_ KV read of tt: soak
4. **ark-drain-restore** (#6, 25.3) — restore cargo transport; drain immediately

## Wave 3 — perf intelligence (same perf-history surface)
5. **perf-forensic-commit-correlator** (#3, 31.5) — suspect commits in fix recipes
6. **closeout-prod-perf-sample** (#10, 12.7) — continuous accrual gate
7. **field-health-public-badge** (#4, 28.0) — needs RUM summary shape from Wave 1

## Wave 4 — forensics + protocol hygiene
8. **membership-orphan-dossier** (#8, 24.0) — git forensics → founder decision doc
9. **protocol-script-self-heal** (#7, 24.5) — classify + heal MODULE_NOT_FOUND drift

## Wave 5 — polish + ops (token-cost last)
10. **visual-proof-gallery** (#9, 19.0)
11. **testing-surfaces-registration** (#11, 9.1)
12. **ops-freshness-refresh** (#12, 6.1)

Rationale: Wave 1 is foundational (3 downstream items feed on field data). Waves 2–3 group by shared code surface. Dossier and self-heal are independent and safe mid-pass. Polish and freshness land last when measurement is meaningful.

## Verification

- `node scripts/fetch-rum-from-r2.mjs --dry-run` then real pull + `npm run rum:summary`
- `node scripts/check-perf-budget.mjs` (source branch verified)
- `node scripts/check-protocol-scripts.mjs --info`
- `npm run build` + `npm run build:check` end-to-end at pass completion
