<!-- generated-by: /implement skill v1.0 -->
<!-- generated-at: 2026-06-08 · Session 180 · audit: docs/AUDIT_2026-06-08-S180.json (2 items) -->

# Implement Plan — Session 180

Sequenced for optimal Priority-per-hour (not raw descending Priority).

| Order | Slug | Tier | Axis | Effort | Why this slot |
|---|---|---|---|---|---|
| 1 | **ai-manifest-discovery-header** | fire | AI/SEO | 45m | Foundation first: makes S179's `/agents.json` discoverable from response headers and adds a gate so it cannot drift dark. |
| 2 | **ambient-split-wave3** | high | Speed/UX | 1h | Same code surface as S179's split work; move two proven route/hook-scoped engines out of the always-parsed feature bundle, then rebuild shell assets once. |

**Quality gates (per item):** website success bar — each item names the conversion or info-finding outcome; new gates ship with `--self-test`; focused gates green before closeout; `npm run build:check` green end-to-end before final closeout.
