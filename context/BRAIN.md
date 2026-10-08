# Brain — VaultSparkStudios.github.io

## Mental model

This is a generated static site with serverless capabilities (Supabase edge functions and Cloudflare Workers). GitHub is the source; Cloudflare Pages serves production. `npm run build` generates the public pages and feeds, and the full build gate checks them. A push to `main` does not imply a full-site promotion: identity/provider gates can hold it while an allowlisted static-content lane publishes a reviewed subset.

## Key systems

| System | Location | Notes |
|---|---|---|
| Vault Member portal | `vault-member/` | Auth, ranks, achievements, challenges, Discord sync |
| VaultSparked membership | `vaultsparked/` | Stripe checkout, phase progress, gift checkout |
| Universe / lore | `universe/` | DreadSpike, Voidfall teaser |
| Investor portal | `investor-portal/` | Gated content |
| Studio Hub | `studio-hub/` | Synced from vaultspark-studio-hub repo |
| Service worker | `sw.js` | Versioned static shell and offline behavior |
| Nav JS | `assets/nav-toggle.js` | Browser navigation and mobile drawer |
| Cloudflare Worker | `cloudflare/security-headers-worker.js` | Edge security and route behavior; deploy via Wrangler |
| The Desk personas | `scripts/lib/news-desk.mjs`, `scripts/generate-news-pages.mjs`, `assets/desk-personas/` | Fictional profile voices, portraits, marks and generated feeds from the published record |

## Architecture constraints

- **Generated public tree** — run `npm run build`, the full build gate (currently 530 steps) and rendered visual checks before a release; generated HTML, feeds and proof artifacts are committed. Closeout rebuilds Oracle answers before sealing candidate artifacts.
- **Public repo** — secrets never committed. All keys via Supabase secrets or Cloudflare env.
- **Cloudflare Pages** — static output uses directory routes; Worker and Supabase capabilities are deployed separately.
- **Edge functions stay cloud** — Supabase must remain cloud-hosted (per studio-ops Supabase migration guide). Edge functions cannot move to self-hosted Hetzner.
- **Hover dropdowns** — must use `@media (hover: hover)` guards; touch devices get tap behavior.
- **Scoped content release** — the Pages hotfix reconstructs a production baseline commit before overlaying named files. Include every still-live path from previous content overlays, or a new release can silently roll those paths back. The post-S366 persona release verified all 124 prior Desk paths inside its 147-path scope.

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
