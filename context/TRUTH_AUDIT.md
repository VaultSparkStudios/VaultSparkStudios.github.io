<!-- truth-audit-version: 1.1 -->
# Truth Audit

Overall status: green
Last reviewed: 2026-04-13
Public-safe summary:
- public-facing copy should stay aligned with actual live behavior
- pricing, availability, and access messaging should not over-promise
- sensitive internal verification notes are maintained privately
- prompts/closeout.md synced to studio-ops v2.4 (S46) — Step 7.5 replaced by Step 8.5; canonical template source is studio-ops
- tests/theme-persistence.spec.js updated (S46) to match custom picker runtime; `body[data-theme]` is the authoritative theme signal set by theme-toggle.js
- /open-source/ is now a redirect to /rights/ (S64) — all nav/footer/sitemap references updated; compliance-pages.spec.js updated to match
- gold contrast: `--gold: #7a5c00` in light mode (S65) — WCAG AA compliant (~5:1 on cream); dark panels with hardcoded bg still use `#FFC400` override; no copy changes needed
- CSP registry (S65): `scripts/csp-hash-registry.json` documents excluded pages' CSP snapshots; 404.html + offline.html explicitly acknowledge `'unsafe-inline'` debt
