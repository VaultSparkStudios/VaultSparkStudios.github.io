<!-- generated-by: /implement skill v1.0 -->
<!-- generated-at: 2026-06-11 · session 188 · source: docs/AUDIT_2026-06-11-S188.json -->

# Implement Plan — S188 (optimal-efficiency sequence)

Re-sorted from raw audit priority into ship-most-priority-per-hour order, grouped by code surface.

## Wave 1 — propagate-nav surface (one re-propagate covers both)
1. **sitewide-footer-dispatch** (🔥 · 0.5h) — lift dispatch column into `buildFooter()`
2. **discord-to-nav** (💡 · 1h) — add Community group to Studio nav dropdown

## Wave 2 — Worker RUM surface (telemetry first, gate validates it)
3. **proof-line-telemetry** (⚡ · 0.5h) — beacon + allowlist `proof-line:{shown,click}`
4. **rum-allowlist-integrity-gate** (🔥 · 1.5h) — structural sync gate (closes S186 silent-drop class)

## Wave 3 — plumbing / process
5. **audit-freshness-in-plumbing** (⚡ · 0.5h) — staleness check → build:check gate
6. **stale-board-hygiene** (⚡ · 0.33h) — drop phantom vaultsparked-proof founder-action

## Wave 4 — UX (deeper, single-page template pass)
7. **flagship-product-storytelling** (💡 · 4h → focused) — restructure highest-traffic game detail page

## Founder-gated (present, do not auto-ship)
- forge-devlog-publish · membership-orphan re-wire/delete · per-product key art
