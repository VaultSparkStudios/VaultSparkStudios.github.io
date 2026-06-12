<!-- generated-by: /implement skill v1.0 -->
<!-- generated-at: 2026-06-12 · session 193 · source: docs/AUDIT_2026-06-12-S193.json -->

# Implement Plan — Session 193

Optimal-efficiency order (ships most Priority/hour; batches shell-rotating edits so `npm run build` rotates the shell ONCE at the end).

| Wave | # | Slug | Axis | Effort | Why this slot |
|---|---|---|---|---|---|
| 1 | 1 | play-first-hero-cta | ux | 1h | 🔥 isolated index.html edit; highest-impact momentum win |
| 2 | 4 | videogame-schema-enrichment | featureDepth | 1.5h | schema generator surface; independent |
| 3 | 2 | acquisition-source-breakdown | ai | 2h | RUM rollup + Worker allowlist (shared surface w/ wave 4) |
| 3 | 3 | web-share-per-game | engagement | 2h | new asset + game pages + Worker allowlist (same surface) |
| 4 | 5 | ignis-spend-measurement | tokenCost | 30m | measurement run (token items late) |
| 4 | 6 | doctor-warning-resolve | process | 1h | health probe; run last |

**Build discipline:** HTML/asset edits defer to a single `npm run build` before `build:check` to rotate the shell once (cold-cache cost lesson). Worker `RUM_UX_EVENTS` changes auto-deploy on push via `cloudflare-worker-deploy.yml`.
**Lighthouse:** mobile >=90 is CI-owned; local pass relies on build + crawl contracts.
