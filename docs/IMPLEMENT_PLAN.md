<!-- generated-by: /implement skill v1.0 -->
<!-- generated-at: 2026-06-08 · Session 179 · audit: docs/AUDIT_2026-06-08.json (4 items) -->

# Implement Plan — Session 179

Sequenced for optimal Priority-per-hour (not raw descending Priority).

| Order | Slug | Tier | Axis | Effort | Why this slot |
|---|---|---|---|---|---|
| 1 | **agents-json-spine** | 🔥 | AI/SEO | 3h | Highest priority; foundational AI-discovery spine; new generator + contract gate. Ship first for momentum. |
| 2 | **meta-desc-backfill-gate** | 🔥 | SEO/UX | 2h | Adjacent surface to #1 (another `check-*.mjs` gate + build:check wiring) → context reuse. |
| 3 | **nav-aria-current** | ⚡ | UX/A11y | 1h | Touches `propagate-nav.mjs` + sitewide re-propagation; run propagation once after this. |
| 4 | **ambient-split-wave2** | ⚡ | Speed | 2h | Conditional/riskiest; isolated to ambient build + loader; verify-then-split, last. |

**Quality gates (per item):** website success bar — page changes hold Lighthouse mobile ≥90; new gates ship with `--self-test`; `npm run build:check` green end-to-end before closeout.
