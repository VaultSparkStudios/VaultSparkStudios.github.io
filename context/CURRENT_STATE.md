# Current State — VaultSparkStudios.github.io

## Snapshot

- Date: 2026-04-06 (Session 36)
- Overall status: live · green
- Vault Status: SPARKED
- Repo posture: Studio OS protocol fully restored; GA4 wired; UI bugs fixed (mobile menu, status badges)

## What exists

### Live systems
- **Vault Member portal** (`vault-member/`) — 9-tier rank system, achievements, challenges, Discord role sync, onboarding tour, light-mode phase 2
- **VaultSparked membership** (`vaultsparked/`) — Stripe $4.99–$99.99/mo, 6 price IDs, phase progress bar, gift checkout modal (503 until STRIPE_GIFT_PRICE_ID set)
- **Investor portal** (`investor/`) — gated
- **Universe** — DreadSpike (pivoted to Novel Saga), Voidfall teaser (`/universe/voidfall/`)
- **Studio Hub** (`studio-hub/`) — synced from vaultspark-studio-hub repo
- **10 journal posts** — fireView() consent-gated
- **8 game pages** — FORGE/SPARKED/VAULTED radial glow, data-status attrs; status badges correctly positioned (direct child of .hero-art)
- **12 project pages** — status badges fixed (S36): moved outside .hero-art-content to prevent absolute-positioning overlap with h1
- **Compliance pages** — /cookies/, /accessibility/, /open-source/, /faq/, /careers/, /data-deletion/, /security/, sitemap

### Infrastructure
- **Cloudflare Worker** (`cloudflare/security-headers-worker.js`) — all 9 security headers, CSP, X-Robots-Tag: noai. Worker: `vaultspark-security-headers-production` (Version: c1fd7b80). Deployed via Wrangler.
- **Service worker** (`service-worker.js`) — CACHE_NAME: `vaultspark-20260405-d1a76ac`; STATIC_ASSETS includes `/universe/voidfall/` and `/universe/dreadspike/`
- **Mobile nav** (`assets/style.css`) — blur removed from .nav-center.open (S36); background 0.98 opaque, no compositing artifact
- **Supabase** — 16 edge functions ACTIVE; cloud-hosted at fjnpzjjyhnpmunfoycrp.supabase.co
- **Sentry** — error tracking active
- **Web push** — VAPID keys set; fully active
- **GA4** — G-RSGLPP4KDZ wired to all 97 HTML pages (S34) ✓
- **robots.txt** — 14 AI crawlers blocked; /vault-member/ disallowed
- **security.txt** — RFC 9116 compliant at /.well-known/security.txt
- **Staging** — website.staging.vaultsparkstudios.com on Hetzner (CANON-007; DNS added S49 in studio-ops)

### Studio OS (restored S34)
- `CLAUDE.md` — session aliases: start/closeout → prompts/
- `AGENTS.md` — full Studio OS agent guide
- `prompts/start.md` — v2.4 (Bash session lock + Active Session Beacon)
- `prompts/closeout.md` — v2.4
- All context/ files functional with real content
- `.claude/settings.json` — Stop hook (session lock clear + PROJECT_STATUS stamp) + PostToolUse JSON validator

### CI
- **Playwright** — compliance job (8 pages + cookie consent + data-status; always runs) + e2e job (auth tests; continues-on-error if secrets absent)
- **Lighthouse** — CI enforced
- **axe-core** — CI enforced

## Known gaps

- `STRIPE_GIFT_PRICE_ID` not set → gift checkout 503s
- Google Search Console verification placeholder (`google-site-verification-REPLACE_ME.html`) not yet replaced
- IGNIS score UNTRACKED for this project
- Per-form Web3Forms keys (all forms share single key)
- Cloudflare WAF rule (CN/RU/HK JS Challenge) — status unknown
- beacon.env not configured (Active Session Beacon inactive)
