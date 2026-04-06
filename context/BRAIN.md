# Brain — VaultSparkStudios.github.io

## Mental model

This is a static site with serverless backend capabilities (Supabase edge functions + Cloudflare Worker). GitHub Pages auto-deploys on every push to `main`. There is no build step — raw HTML/CSS/JS.

## Key systems

| System | Location | Notes |
|---|---|---|
| Vault Member portal | `vault-member/` | Auth, ranks, achievements, challenges, Discord sync |
| VaultSparked membership | `vaultsparked/` | Stripe checkout, phase progress, gift checkout |
| Universe / lore | `universe/` | DreadSpike, Voidfall teaser |
| Investor portal | `investor/` | Gated content |
| Studio Hub | `studio-hub/` | Synced from vaultspark-studio-hub repo |
| Service worker | `service-worker.js` | Pre-caches STATIC_ASSETS; bump CACHE_NAME on each release |
| Nav JS | `assets/nav-toggle.js` | Must be in STATIC_ASSETS for SW to pre-cache |
| Cloudflare Worker | `cloudflare/worker.js` | All 9 security headers; deploy via Wrangler |

## Architecture constraints

- **No build step** — all JS/CSS is vanilla or loaded via CDN. No bundler.
- **Public repo** — secrets never committed. All keys via Supabase secrets or Cloudflare env.
- **GitHub Pages** — no server-side rendering, no dynamic routes. All routing is directory-based.
- **Edge functions stay cloud** — Supabase must remain cloud-hosted (per studio-ops Supabase migration guide). Edge functions cannot move to self-hosted Hetzner.
- **Hover dropdowns** — must use `@media (hover: hover)` guards; touch devices get tap behavior.
- **SW pre-cache rule** — any nav JS added must also be in `STATIC_ASSETS` in `service-worker.js`.

## Heuristics

- When propagating changes across many files (nav, footer, etc.) — always use a script or Bash glob loop, not manual edits
- Bump `CACHE_NAME` in `service-worker.js` on every release that changes cached assets
- CANON-007: staging before production. Use `website.staging.vaultsparkstudios.com` to test before pushing to main
- Test auth flows in private browsing — session state can mask bugs

## Key IDs / config (non-secret)

- Supabase URL: `https://fjnpzjjyhnpmunfoycrp.supabase.co`
- Cloudflare Worker: `vaultspark-security-headers-production`
- Sentry DSN (browser-safe, public): in `assets/sentry.js`
- SW cache name pattern: `vaultspark-YYYYMMDD-{short-hash}`
