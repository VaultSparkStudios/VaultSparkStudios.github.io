# Work Log

## 2026-04-06 — Session 36

- Fixed mobile nav blur: removed backdrop-filter from .nav-center.open (background 0.98 opacity — blur was invisible but created GPU compositing artifact making menu text blurry on mobile)
- Fixed FORGE/SPARKED/VAULTED status badge overlap on 8 project pages: badge was inside .hero-art-content (position:relative) so `position:absolute;top:1rem;left:1rem` positioned relative to the content div at the bottom, landing the badge directly on the h1; moved badge to direct child of .hero-art matching game page pattern
- Pushed: `9535d01`
- SIL: 417/500 · Velocity: 2 · Debt: →

## 2026-04-06 — Session 35

- Diagnosed Lighthouse SEO + axe-cli failures from session 34 push
- Root causes: Cloudflare AI Labyrinth rewrites robots.txt at CDN edge; vault-member intentionally noindex; "Learn More" non-descriptive link; ChromeDriver/Chrome version mismatch
- Fixed: .lighthouserc.json (robots-txt off), lighthouse.yml (vault-member removed), index.html (aria-label), accessibility.yml (browser-driver-manager)
- Pushed: `929a884`
- SIL: 401/500 · Velocity: 3 · Debt: →

## 2026-04-06 — Session 34

- Protocol restore: CLAUDE.md session aliases, AGENTS.md full Studio OS guide, prompts/start.md v2.4 (Bash lock + beacon), all context/ files restored with functional content
- S33 pending actions audited: GA4 ✗, GSC ✗, STRIPE_GIFT_PRICE_ID ✗, Web3Forms keys ✗
- GA4 G-RSGLPP4KDZ wired to all 97 HTML pages
- Committed + pushed: 107 files (97 HTML + 10 protocol)
- SIL: 391/500 · Velocity: 1 · Debt: →

This public repo no longer carries the detailed internal work log.

Public-safe note:
- internal session-by-session execution detail now lives in the private Studio OS / ops repository
- a local private backup of the pre-sanitization work log was preserved outside this repo on 2026-04-03
- 2026-04-03 closeout: public-repo sanitization follow-through completed and local Playwright credential handling was moved behind a private ignored file
