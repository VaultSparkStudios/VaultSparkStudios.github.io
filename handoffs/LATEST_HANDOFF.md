# Latest Handoff — VaultSpark Studios Website

Last updated: 2026-03-24 (session 3)

---

## What Was Completed

### Full site redesign (session 1)
- `index.html` — complete overhaul: exclusive copy, fixed anchor scroll (`scroll-margin-top: 92px`), mobile hamburger nav, Vault Dispatch email strip, Vault Membership section with rank teaser, DreadSpike feature, multi-column footer
- `assets/style.css` — shared design system for all pages (tokens, buttons, cards, nav, footer, responsive breakpoints)
- `games/index.html` — SEO games hub with full per-game descriptions, feature lists, FAQ schema (JSON-LD)
- `universe/index.html` — DreadSpike full character feature, vault mythology section, classified characters, FAQ schema
- `studio/index.html` — manifesto, how-we-build (6-step process), studio pillars, roadmap timeline, FAQ schema
- `vault-member/index.html` — full account portal: register/login tabs, localStorage session, 5-tier Vault Rank system, 6 achievements, cross-game connections dashboard, newsletter preference toggles
- All pages share consistent nav, footer, JSON-LD structured data, canonical URLs, OG/Twitter cards

### Kit welcome sequence activated (between session 2 and 3)
- `WELCOME_SEQUENCE_ID = 2695661` set in `assets/kit.js` — new subscribers auto-enroll in 3-email Vault Dispatch onboarding sequence

### Site expansion (session 3)
- Nav updated on all pages: added **Home** (before Games) and **Contact** (after GitHub)
- Vault Dispatch copy: "Connect to the Vault's Signal" / "delivered through direct signals"
- Project tier: "Active & Live" → "Unsealed & Live"; description updated with unsealed language
- Social section: expanded to 16 platforms — added TikTok, Threads, Bluesky, Pinterest, Discord Server (`discord.gg/bgR3mSB2`), Gumroad; 4-column desktop grid
- **New `/contact/` page**: contact form with mailto handler → `founder@vaultsparkstudios.com`; sidebar with quick-reach info; no external form service required
- **New `/privacy/` page**: full privacy policy (Kit/ConvertKit, Google Analytics GA4, localStorage), cookie disclosure, trademark + copyright notices for all game titles and brand marks, fan content policy, DMCA
- Universe `/classified`: 4 new entities added (ECHO-NULL, THE ARCHIVIST, VEIN-CONSTRUCT, DESIGNATION PENDING); 6 total; 3-column desktop grid
- Studio page: contact CTA block above FAQ with "Contact The Studio →" button linking to `/contact/`
- All footers: updated footer-bottom with Privacy Policy · Contact · Vault Members + VaultSpark™ trademark notice
- `assets/style.css`: social grid 4-col desktop / 2-col tablet / 1-col mobile; textarea + form-group utility styles added

### Kit (ConvertKit) newsletter integration (session 2)
- `assets/kit.js` — full Kit integration module:
  - `subscribe(email, tagIds)` — subscribes to one or more tags
  - `removeTag(email, tagId)` — removes tag from subscriber by email
  - `syncPreferences(email, prefs)` — adds/removes tags based on dashboard toggle state
  - `subscribeToSequence(email, sequenceId)` — enrolls in welcome sequence
  - `setWelcomeSequence(id)` — configures auto-enroll on any new subscribe
  - `wireForm(formId, successId, tagIds)` — attaches Kit to a simple email form
- `index.html` — Vault Dispatch strip and footer form now POST to Kit
- `vault-member/index.html` — register with "Vault Dispatch" checkbox → subscribes to all three Kit tags; dashboard preference toggles now sync tag add/remove to Kit in real time

---

## Kit Account State

**Platform:** kit.com
**API Key:** stored in `assets/kit.js` (public/subscribe-only key — intentionally embedded)

| Tag Name | Kit ID |
|---|---|
| `studio-updates` | `17824260` |
| `lore-dispatches` | `17824261` |
| `early-vault-access` | `17824263` |

**Welcome sequence:** `WELCOME_SEQUENCE_ID = null` — not yet created. See "What To Do Next" below.

---

## Account / Member System State

- Storage: `localStorage` keys `vs_accounts_v2` (all accounts) and `vs_session_v2` (active session)
- Password: XOR hash + constant salt (demo-only — NOT production-grade, clearly noted in UI)
- Achievements defined: `joined`, `subscribed`, `visit_game`, `first_100`, `lore_read`, `social` (6 total)
- Connected games shown in dashboard: all 5 VaultSpark titles (mock data — real game data comes with backend)
- Real backend auth: planned when VPS/Docker/Postgres stack goes live (see `docs/STUDIO_BACKEND_PLAN.md`)
- When backend launches: replace `VS.register/login/getSession` calls with API calls — UI stays the same

---

## Site Architecture

```
vaultsparkstudios.com/
  /                   → index.html
  /games/             → games/index.html
  /universe/          → universe/index.html
  /studio/            → studio/index.html
  /vault-member/      → vault-member/index.html
  /contact/           → contact/index.html
  /privacy/           → privacy/index.html
  assets/
    style.css         shared design system
    kit.js            Kit newsletter integration (WELCOME_SEQUENCE_ID = 2695661)
    vaultspark-icon.png
    vaultspark-cinematic-logo.png
    darth-spike.mp4 + poster + 3 stills
    favicon.png + icon sizes
    og-image.png
  handoffs/
    LATEST_HANDOFF.md (this file)
```

Sub-page asset paths use `../assets/` (one level up from subdirectory).
Root page uses `assets/` directly.

---

## What Is Mid-Flight

### Welcome sequence not yet created
`WELCOME_SEQUENCE_ID` in `assets/kit.js` is `null`. New subscribers are tagged but not enrolled in any sequence. See below for setup instructions.

### Real game data not yet wired
Dashboard shows 5 games as "connected" but stats are all mock/static. Actual play session data, leaderboard position, and game-specific achievements wait on the backend VPS going live.

### Preference toggle sync has one edge case
If a subscriber toggled OFF `studio-updates` (removing the tag from Kit), then unsubscribing from the lore dispatch won't affect their subscriber record — they still exist in Kit, just untagged. Full suppression/unsubscribe requires backend handling.

---

## What To Do Next

### 1. Create the welcome sequence in Kit (priority: high)

Go to **kit.com → Sequences → New Sequence**. Name it `Vault Dispatch — Welcome Signal`.

Suggested 3-email structure:

**Email 1 — Immediate — "The vault is open."**
- Subject: `The vault is open. Welcome to Vault Dispatch.`
- Content: Welcome, what Vault Dispatch is, link to vaultsparkstudios.com, link to all live games, tease DreadSpike

**Email 2 — Day 3 — "A signal from the dark."**
- Subject: `A wrong transmission called him here. Meet DreadSpike.`
- Content: DreadSpike lore teaser, link to vaultsparkstudios.com/universe/, embed or link to Sora video

**Email 3 — Day 7 — "Everything live in the vault right now."**
- Subject: `Three games. Free to play. Right now.`
- Content: List Call of Doodie, Gridiron GM, VaultSpark Football GM with short descriptions and play links. CTA: create Vault Member account at vaultsparkstudios.com/vault-member/

Once created, **get the sequence ID** from the URL (e.g. `kit.com/sequences/1234567`). Then in `assets/kit.js`, change:
```js
let WELCOME_SEQUENCE_ID = null;
```
to:
```js
let WELCOME_SEQUENCE_ID = 1234567;  // your actual ID
```
Commit and push. New subscribers will auto-enroll.

### 2. Add MindFrame to the website (priority: medium)
MindFrame is listed as `incubating` in `vaultspark-studio-ops/portfolio/PROJECT_REGISTRY.json`. When it has a public presence, add a card to:
- `index.html` → "Sealed In The Vault" tier (or "In Development" depending on stage)
- `games/index.html` → appropriate section

Use the `.mindframe` CSS theme class (already defined in `assets/style.css`).

### 3. Wire VaultFront and Dunescape play buttons
Currently both link to existing sub-paths. When their backends go live, update the card CTAs in `index.html` and `games/index.html` to link to the live play URLs.

### 4. Backend launch prep for member accounts
When the VPS/Postgres stack goes live:
- Replace `VS.register()` / `VS.login()` in `vault-member/index.html` with `fetch()` calls to `https://api-member.vaultsparkstudios.com` (or equivalent)
- The `showDashboard()` function already reads from the returned member object — it just needs a real one
- Wire the dashboard "Connected Games" section to real per-game API endpoints (`api-{slug}.vaultsparkstudios.com`)

### 5. Add `gridiron-gm` to the site nav (when it has a dedicated page)
The Gridiron GM game links to `/gridiron-gm/` but that sub-path doesn't exist as a tracked subdirectory in this repo yet. When it has its own page, it will appear automatically via GitHub Pages.

---

## Important Constraints

- All sub-pages (`games/`, `universe/`, `studio/`, `vault-member/`) use `../assets/` for CSS, JS, and images
- Root `index.html` uses `assets/` (no `../`)
- The Kit API key in `assets/kit.js` is the **public API key** (not the secret). It is safe for client-side use — it can only create/update subscribers, not read account data or delete subscribers.
- Do NOT commit the Kit API secret anywhere in this repo
- Nav scroll-margin-top is 92px — if the nav height ever changes, update `[id] { scroll-margin-top }` in `assets/style.css`
- GitHub Pages serves at `vaultsparkstudios.com` via CNAME. All internal links use root-relative paths (`/games/`, `/vault-member/` etc.)
- The `.claude/` directory is not staged — it is intentionally excluded from commits
