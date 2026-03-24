# Latest Handoff — VaultSpark Studios Website

Last updated: 2026-03-24 (session 5)

---

## What Was Completed

### Sessions 1–4 (see CODEX_HANDOFF_2026-03-12.md for full history)
Full site redesign, shared design system, all core pages, Kit newsletter integration, PWA manifest, sitemap/robots, Gridiron GM marketing page, roadmap page, journal, press, contact, privacy, games catalog with filter tabs, projects catalog with filter tabs, Studio OS surfaced publicly.

### Session 5 — copy/naming/UX cleanup + Studio OS architecture decision
- **Gridiron GM reframed** as a front-office management sim (not live football game): updated meta description, OG tags, body copy ("watch games simulate", "You call the shots from the front office; the field runs itself"), feature list, and games/index.html card + FAQ
- **"Football GM Beta" → "VaultSpark Football GM"** renamed sitewide across all 14 pages (nav dropdowns, footers, FAQs, JSON-LD, keywords, all copy)
- **Filter bar spacing fixed** on `/games/` and `/projects/` catalog pages: `#catalog-heading` now has `margin-bottom: 2rem`, filter bar has `margin: 0 0 3rem`
- **VaultSpark Football GM confirmed** as a separate repo (`VaultSparkStudios/vaultspark-football-gm`) — the `/vaultspark-football-gm/` directory in this repo is a deployed game build and must not be modified here
- **New website URL architecture decided**: game landing pages move to `/games/{slug}/`, project landing pages move to `/projects/{slug}/`; game/project catalog cards get dual CTAs (Play Now + More Info / View App + More Info); all landing pages include a GitHub activity stream pulling from the game/project repo via the public GitHub API

---

## Current Site Architecture

```
vaultsparkstudios.com/
  /                         → index.html (home)
  /games/                   → games/index.html (catalog — dual-CTA cards)
  /games/{slug}/            → games/{slug}/index.html (game landing page — PLANNED, not yet built)
  /projects/                → projects/index.html (catalog — dual-CTA cards)
  /projects/{slug}/         → projects/{slug}/index.html (project landing page — PLANNED)
  /universe/                → universe/index.html
  /universe/dreadspike/     → universe/dreadspike/index.html
  /studio/                  → studio/index.html
  /vault-member/            → vault-member/index.html
  /contact/                 → contact/index.html
  /privacy/                 → privacy/index.html
  /roadmap/                 → roadmap/index.html
  /journal/                 → journal/index.html
  /press/                   → press/index.html
  /call-of-doodie/          → call-of-doodie/index.html (WILL BECOME meta-refresh → /games/call-of-doodie/)
  /gridiron-gm/             → gridiron-gm/index.html (WILL BECOME meta-refresh → /games/gridiron-gm/)
  /vaultspark-football-gm/  → deployed game (separate repo — DO NOT MODIFY)
  /vaultfront/              → vaultfront/index.html (in-dev placeholder)
  assets/style.css          shared design system
  assets/kit.js             Kit newsletter integration (WELCOME_SEQUENCE_ID = 2695661)
  sitemap.xml
  robots.txt
  manifest.json
```

### Game deploy URLs vs landing page URLs
| Role | Pattern | Example |
|---|---|---|
| Game deploy (from game repo) | `/{slug}/` | `/vaultspark-football-gm/` |
| Studio landing page | `/games/{slug}/` | `/games/vaultspark-football-gm/` |
| Project landing page | `/projects/{slug}/` | `/projects/promogrind/` |

---

## Games Catalog

All games live in `games/index.html`. Filter by `data-status`: `live`, `beta`, `dev`, `concept`.

| Game | Status | Deploy URL | Landing page (target) |
|---|---|---|---|
| Call of Doodie | live | `/call-of-doodie/` | `/games/call-of-doodie/` |
| Gridiron GM | live | `/gridiron-gm/game.html` | `/games/gridiron-gm/` |
| VaultSpark Football GM | beta | `/vaultspark-football-gm/` (sep. repo) | `/games/vaultspark-football-gm/` |
| VaultFront | dev | `/vaultfront/` | `/games/vaultfront/` |
| Dunescape | dev | (not yet deployed) | `/games/dunescape/` |
| MindFrame | concept | — | `/games/mindframe/` |
| Project ??? | concept | — | `/games/project-unknown/` |

## Projects Catalog

All projects in `projects/index.html`. Filter by `data-status`: `tools`, `dev`, `studio`.

| Project | Status | Direct URL | Landing page (target) |
|---|---|---|---|
| PromoGrind | tools/live | `/promogrind/` | `/projects/promogrind/` |
| Vault Pipeline | studio | `/roadmap/` | `/projects/vault-pipeline/` |
| Signal Log | studio | `/journal/` | `/projects/signal-log/` |
| VaultFront | dev | `/vaultfront/` | `/projects/vaultfront/` |
| Vault Member Portal | dev | `/vault-member/` | `/projects/vault-member/` |

---

## GitHub Activity Stream (planned feature)

Each game/project landing page will pull recent activity from the public GitHub API and render it in a "Recent Updates" section. Implementation:

- **Endpoint**: `https://api.github.com/repos/VaultSparkStudios/{repo}/commits?per_page=5`
- **Auth**: none required for public repos (60 req/hr rate limit — fine for page loads)
- **Fallback**: if fetch fails or rate-limited, show a static "View on GitHub →" link
- **Display**: commit message + relative date (e.g. "2 days ago")
- **Asset path note**: landing pages at `/games/{slug}/` use `../../assets/` (two levels up)

GitHub repo slugs per game:
| Game | Repo |
|---|---|
| Call of Doodie | `call-of-doodie` |
| Gridiron GM | `gridiron-gm` |
| VaultSpark Football GM | `vaultspark-football-gm` |
| VaultFront | `vaultfront` |
| Dunescape | `dunescape` |

---

## Vault Member Account System

- Storage: `localStorage` keys `vs_accounts_v2` (all accounts) and `vs_session_v2` (active session)
- Rank system: Spark Initiate → Vault Runner → Forge Guard → Vault Keeper → The Sparked
- Achievements: 6 defined (joined, subscribed, visit_game, first_100, lore_read, social)
- Password: XOR hash + constant salt (demo-only — NOT production-grade)
- Real backend planned when VPS/Docker/Postgres stack goes live (`docs/STUDIO_BACKEND_PLAN.md`)
- `VS.exportForBackend()` returns migration-ready JSON for real auth API

## Kit Newsletter State

- Platform: kit.com | Public API key in `assets/kit.js` (safe for client-side)
- Welcome sequence ID: `2695661` (active — 3-email Vault Dispatch onboarding)
- Tags: `studio-updates` (17824260), `lore-dispatches` (17824261), `early-vault-access` (17824263)

---

## What Is Mid-Flight

### Game/Project landing pages not yet built
Architecture decided (session 5). Landing pages at `/games/{slug}/` and `/projects/{slug}/` have not been created yet. Old paths (`/call-of-doodie/`, `/gridiron-gm/`) still serve as the live landing pages until new ones are built and redirects are in place.

### Catalog cards still use single-CTA pattern
`games/index.html` and `projects/index.html` cards still have one primary CTA each. Dual-CTA update (Play Now + More Info) is planned alongside landing page build.

### Gridiron GM game.html doesn't exist yet
`/gridiron-gm/index.html` "Play Now" links to `game.html` which is a 404. Game files need to be added to `/gridiron-gm/` when ready.

### Welcome sequence already active
`WELCOME_SEQUENCE_ID = 2695661` — active and enrolling new subscribers. No action needed.

### Real game data not wired
Dashboard shows 5 games as "connected" but stats are mock/static. Waits on backend VPS.

---

## What To Do Next

### 1. Build game landing pages at /games/{slug}/ (priority: high)
Create `games/{slug}/index.html` for all 7 games. Structure per game page:
- Hero (same `.hero-art .{slug-class}` gradient treatment from shared CSS)
- Feature block (description, feature list, genre tags)
- Side panel (stat grid, game info block, Vault Member CTA)
- **GitHub Activity Stream section** — `fetch('https://api.github.com/repos/VaultSparkStudios/{repo}/commits?per_page=5')` rendered as a "Recent Updates" list with graceful fallback
- Asset path: `../../assets/style.css` (two levels up from `/games/{slug}/`)
- "Play Now" button links to the game deploy URL (`/{slug}/`)

Landing pages needed:
- `games/call-of-doodie/index.html` (migrate from `/call-of-doodie/`)
- `games/gridiron-gm/index.html` (migrate from `/gridiron-gm/`)
- `games/vaultspark-football-gm/index.html` (new — do NOT touch `/vaultspark-football-gm/` dir)
- `games/vaultfront/index.html`
- `games/dunescape/index.html`
- `games/mindframe/index.html`
- `games/project-unknown/index.html`

### 2. Build project landing pages at /projects/{slug}/ (priority: high)
Same structure. Primary CTA varies: "View App", "View Platform", "View Pipeline" depending on project type.

### 3. Update /games/ and /projects/ catalog cards (priority: high)
Each card gets two CTAs:
- Games: `Play Now` → deploy URL + `More Info` → `/games/{slug}/`
- Projects: variable (`View App` / `View Platform` / `View Pipeline`) → direct URL + `More Info` → `/projects/{slug}/`

### 4. Add meta-refresh redirects at old game paths
Replace `/call-of-doodie/index.html` and `/gridiron-gm/index.html` with redirect pages:
```html
<meta http-equiv="refresh" content="0; url=/games/call-of-doodie/" />
<link rel="canonical" href="https://vaultsparkstudios.com/games/call-of-doodie/" />
```

### 5. Update all nav dropdown + footer links sitewide
- Nav: `/call-of-doodie/` → `/games/call-of-doodie/`
- Nav: `/gridiron-gm/` → `/games/gridiron-gm/`
- Nav: `/vaultspark-football-gm/` → `/games/vaultspark-football-gm/`
- All footers: mirror same changes

### 6. Update sitemap.xml
Add all `/games/{slug}/` and `/projects/{slug}/` URLs. Keep old paths until redirects are confirmed working.

### 7. Set up Web3Forms for contact page
Find `value="YOUR_WEB3FORMS_ACCESS_KEY"` in `contact/index.html` and replace with real key from web3forms.com.

### 8. Backend launch prep for member accounts
Replace `VS.register()` / `VS.login()` in `vault-member/index.html` with `fetch()` calls to `https://api-member.vaultsparkstudios.com` when VPS is live.

---

## Important Constraints

- `/vaultspark-football-gm/` dir = deployed game from separate repo — NEVER modify files inside it
- Asset paths: root pages use `assets/`, one-level sub-pages use `../assets/`, two-level sub-pages (`/games/{slug}/`) use `../../assets/`
- GitHub API rate limit: 60 req/hr unauthenticated — always include a graceful fallback in the stream widget
- GitHub Pages has no server-side redirects — use `<meta http-equiv="refresh">` + canonical link for URL migrations
- Nav scroll-margin-top is 92px — if nav height changes, update `[id] { scroll-margin-top }` in `assets/style.css`
- Kit API key in `assets/kit.js` is the public subscribe-only key — safe for client-side, never commit the secret
- All internal links use root-relative paths (`/games/`, `/vault-member/`, etc.)
- `.claude/` directory is intentionally excluded from commits
