<!-- generated-by: /implement skill v1.0 -->
<!-- generated-at: 2026-06-29 · session 237 · source: docs/AUDIT_2026-06-29.json -->

# Implement Plan — AUDIT_2026-06-29 S237

Sequenced for optimal efficiency: close verified crawler/schema defects first, then harden proof freshness, then verify stale hit-list carries without adding churn.

## Wave 1 — Structured Data
- **videogame-schema-field-completeness** — shipped. Root-fixed `scripts/enrich-videogame-schema.mjs`, patched individual game pages plus `/games/`, verified `check-videogame-schema` clean.

## Wave 2 — Social Cards
- **duplicate-og-card-overrides** — shipped. Added duplicate-card overrides to `scripts/build-og-cards.mjs`, generated seven page-specific PNGs, verified `check-og-images` clean.

## Wave 3 — Trust Freshness
- **trust-feed-blockdays-expansion** — shipped. Expanded `check-trust-feed-freshness` from four to eleven public proof feeds with feed-specific hard ceilings.

## Wave 4 — Honest Rejections / Deferrals
- **workflow-cache-dependency-lint** — verified existing. The live gate already generalizes setup-node `cache:` manager tokens and reports zero workflow findings.
- **inp-root-fix** — data-blocked. `data/inp-breakdown.json` still has zero samples; no fabricated root cause.
- **founder-gated-public-vocabulary** — deferred. Public naming/founder-voice changes require founder decision.
- **worker-agent-ua-policy-deploy** — deferred. Production Worker deploy remains a separate production action, not a silent source-arc claim.

Final verification: `npm run build` EXIT 0 and `npm run build:check` EXIT 0.