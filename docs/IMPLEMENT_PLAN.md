<!-- generated-by: /implement skill v1.0 -->
<!-- generated-at: 2026-06-05 · session: 175 -->
<!-- source: docs/AUDIT_2026-06-05-S175.json (founder-directed speed arc) -->

# Implement Plan — Speed Arc (S175)

Founder approvals on file: DNS auto-flip when parity green · gtag full replacement.

| Seq | Slug | Why this position |
|---|---|---|
| 1 | cf-pages-origin-migration | Foundation — biggest TTFB/LCP lever; everything downstream benefits |
| 2 | edge-html-cache | Same Worker surface; compounds with new origin |
| 3 | early-hints-103 | Same zone/Worker surface, tiny |
| 4 | shell-stable-core-split | Build surface; ends deploy-time cache nuking before the analytics sitewide edit rotates hashes once more |
| 5 | edge-analytics-replace-gtag | Sitewide page edit + Worker; benefits from #4 (last big rotation) |
| 6 | lcp-fast-path | Page polish after the dust settles |
| 7 | regression-email-alerts | Observability; uses field-verdict engine |
| 8 | multi-geo-synthetic | Observability; standalone workflow |
| 9 | status-page | Trust surface; reads artifacts produced above |
