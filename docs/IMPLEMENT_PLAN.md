<!-- generated-by: /implement skill v1.0 -->
<!-- generated-at: 2026-06-11 · session 187 · source: docs/AUDIT_2026-06-11-S187.json -->

# Implement Plan — S187 (competitive-gap closure)

Sequenced for optimal efficiency, not raw priority. Backend (Supabase admin) is MISSING locally → table-creating parts are founder-gated and ship as client + migration SQL.

## Wave 0 — Dogfood the freshness guard (protects this very pass)
1. **audit-freshness-precheck** — build `scripts/check-audit-staleness.mjs` + self-test, then RUN it against every remaining candidate before building. (Already caught: manifesto + compounding promise are largely shipped.)

## Wave 1 — Tooling / build-in-public voice (scripts surface, zero page-perf risk)
2. **studio-soul-weekly-forge** — `scripts/draft-weekly-forge.mjs` (forge-ledger + TASK_BOARD DONE → SOUL-voiced draft) + build:check freshness gate + generate the overdue entry so journal/changelog are fresh again.

## Wave 2 — Client honest-dark surfaces (idle-loaded, preserve 172ms LCP)
3. **honest-traction-scoreboard** — new asset reads existing `api/public-intelligence.json`; honest-dark floor; homepage hook + loader register.
4. **cross-game-play-next** — `data/game-affinity.json` + asset + loader register + game-page hooks; /v/rum `play-next:*`.

## Wave 3 — Growth funnel (client now, backend founder-gated)
5. **studio-dispatch-optin** — client opt-in component + `supabase/migrations` SQL for `studio_dispatch`; honest-dark until table exists → PARTIAL (founder applies migration).

## Wave 4 — Minor / hygiene
6. **discord-community-promote** — promote existing Discord/Community from footer-social to a community CTA (confirmed footer-only).
7. **ignis-oracle-naming-clarity** — cross-link /ignis dashboard → Oracle ask.
8. **doctor-warning-clear** — clear stale sibling locks + advisory drift.

## Re-scoped (freshness-check caught as largely-done)
- **product-first-hero-manifesto** → manifesto (`/studio/`) + compounding promise (`/membership/`) ALREADY shipped. Only residual: homepage hero CTA ordering — fold a light tweak into Wave 4 if warranted; do not rebuild.

## Deferred (honest)
- **wishlist-momentum-proof** — needs Supabase count access (MISSING). Defer with dispatch backend.
- **flagship-product-storytelling** — 4h design+copy; next session.
- **steam-coming-soon-funnel**, **per-product-key-art** — founder-gated (commercial/design).
