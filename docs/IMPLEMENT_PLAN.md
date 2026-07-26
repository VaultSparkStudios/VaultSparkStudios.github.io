<!-- generated-by: /implement S292 — efficiency-ordered execution plan for docs/AUDIT_2026-07-25.json -->

# IMPLEMENT PLAN — S292 (2026-07-25)

Source: `docs/AUDIT_2026-07-25.json` (5 verified items · combined priority 180.5). Pure evidence parsing lands first; source contracts precede consumers; release receipts follow; the final-state seal lands last so it guards the complete graph.

## Wave 1 — evidence primitives

| Order | Audit | Item | Verification |
|---|---|---|---|
| 1 | A5 | Startup evidence contract | legacy/current SIL fixtures; ten-category refusal; live brief self-coherence |
| 2 | A2 | Dimensional availability ledger | probe + contract fixtures; origin/full-stack/current telemetry consumers agree |

## Wave 2 — routed-runtime proof

| Order | Audit | Item | Verification |
|---|---|---|---|
| 3 | A3 | Production Worker route provenance | healthy/mismatch/unreachable fixtures; privacy validator; bounded live receipt |
| 4 | A4 | Candidate artifact Merkle manifest | deterministic tree/tamper/order fixtures; staging publish + comparison contract |

## Wave 3 — final-state release seal

| Order | Audit | Item | Verification |
|---|---|---|---|
| 5 | A1 | Final-state coherence seal | captured S290→S291 drift fails; code-only push stays fast; real pre-push path passes |

## Wave 4 — saturation

Regenerate the Unified Genius List, generate the innovation pack, premise-check every candidate, implement the valid second-order set, and run the context floor after each verified checkpoint.

---

## Historical implementation plans

<!-- generated-by: /implement S275 — efficiency-ordered execution plan for docs/AUDIT_2026-07-12-S275.json -->

# IMPLEMENT PLAN — S275 (2026-07-12)

Source: `docs/AUDIT_2026-07-12-S275.json` (20 items). Re-sorted for execution efficiency:
same-axis grouped · high-priority+small first · foundations before façades · token-cost last-ish
(skill-cost instrumentation rides with the org group since it shares the gate-wiring work).

## Group A — one-file policy/config wins (independent, fast)
| # | rank | slug | files |
|---|---|---|---|
| A1 | 1 | robots-wellknown-allow (+ coherence contract) | robots.txt, scripts/check-robots-discovery-coherence.mjs (new), package.json |
| A2 | 20 | sitemap-drop-disallowed | sitemap generator + sitemap.xml |
| A3 | 16 | portal-gate-nostore | cloudflare/security-headers-worker.js (+ spec) |
| A4 | 19 | obeliskgate-csp-allowlist | config/csp-policy.mjs |
| A5 | 18 | redirect-spec-worker-coverage | tests/redirects.spec.js |
| A6 | 15 | verify-jwt-pin-all-functions | supabase/config.toml |
| A7 | 12 | buildcheck-duplicate-steps | package.json, scripts/run-build-check.mjs (dup guard) |

## Group B — UX conversion (homepage + nav generators)
| # | rank | slug | files |
|---|---|---|---|
| B1 | 2 | hero-cta-conversion-hierarchy | index.html (+ style if needed) |
| B2 | 9 | forge-count-single-source | index.html markers, scripts/propagate-nav.mjs, scripts/build-hero-portfolio.mjs, coherence gate |
| B3 | 17 | nav-sheet-home-link | assets/nav-sheet.js |

## Group C — org/gates/observability-of-cost
| # | rank | slug | files |
|---|---|---|---|
| C1 | 4 | ark-sig-fail-noise-and-root-bug | .gitignore, drain rotation, Ark cargo → studio-ops |
| C2 | 7+11 | orphan-scripts-gate + studio-feed-dead-contract | scripts/check-orphan-scripts.mjs (new), gate wiring, dead-producer triage |
| C3 | 8 | ledger-rotation-generalize | scripts/rotate-ledger.mjs (new), build:check advisory |
| C4 | 14 | skill-cost-full-instrumentation | scripts/set-active-skill.mjs / ledger hooks |

## Group D — performance (build-touching, verify each)
| # | rank | slug | files |
|---|---|---|---|
| D1 | 10 | rum-summary-restore (foundation for D2–D5 verification) | export path root-cause + freshness ceiling |
| D2 | 5 | cls-late-injection-strips | changelog/oracle/games injection containers |
| D3 | 3 | fgm-hover-inp-presentation | ambient hover layer containment |
| D4 | 13 | ambient-loader-split | shell manifest + loader gating |
| D5 | 6 | homepage-field-lcp-critical-path | index.html inline CSS split |

Close: `npm run build` → `npm run build:check` (exit codes verified directly) → doctor → closeout.
