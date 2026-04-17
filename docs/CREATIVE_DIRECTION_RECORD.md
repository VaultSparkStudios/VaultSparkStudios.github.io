# Creative Direction Record — Studio Website

This public repo now keeps only public-safe creative-direction summaries.

Boundary:
- detailed private creative direction, internal rationale, and session-by-session operating notes live in the private Studio OS / ops repository
- this file keeps only high-level public-safe direction notes

## Entries

### 2026-04-17 — Studio Pulse must be a user-facing experience, not a founder-facing analytical page (S85)

- Category: Soul / Brand / Product Framing
- Human input (verbatim): "propose a full redesign of https://vaultsparkstudios.com/studio-pulse/ - it reads like an analytical, founder-facing page. Why would a user care about that page? Users want an immersive, easy to understand, engaging experience. That's what the pulse should provide. They have no clue what an IGNIS score means, etc."
- Area affected: `/studio-pulse/`, homepage pulse teaser, public-intelligence payload shape, sealed-vault pattern used across `/games/` and `/projects/` hubs
- Required direction:
  1. Studio Pulse promises life; it must deliver a living window into the worlds being built, not a DevOps transparency receipt.
  2. Studio-OS vocabulary that users have no mental model for — IGNIS score, sessions completed, edge-function counts, Now/Next/Shipped kanban, CI-green health boxes — is actively harmful to the brand on this page and should be removed or relocated to `/ignis/`.
  3. The experience should be cinematic and easy to understand: the forge is alive, worlds are at different heat levels, sealed initiatives glow in the deep.

### 2026-04-17 — All 27 studio initiatives must be incorporated across the website, without unveiling proprietary info (S85)

- Category: Portfolio / Brand / IP Posture
- Human input (verbatim): "Make sure all 27 repos are incorporated all across the website (name could be TBD unless you think adding a name now will help in establishing trademark/IP even while they are still private/not published)"
- Area affected: `/studio-pulse/`, `/`, `/games/`, `/projects/`, site-wide footer (79 files), public-intelligence schema
- Required direction:
  1. Portfolio scale is part of the brand — "the vault is deep" — and should be visible everywhere a visitor lands.
  2. Unnamed/private projects must not be disclosed by name or by hint — the sigil/glyph treatment is the correct pattern, and the count is the signal.
  3. The Studio Owner retains full naming optionality; do not force codenames to bootstrap trademark/IP before the founder has chosen names. Preferred approach: treat the sigil-tile SEALED slot as the public presence of an unannounced project until the founder is ready to introduce it.

### 2026-04-17 — Session 84 closeout CDR review

CDR reviewed — no new entries this session. S84 was pure execution of the S80 Tier 2/3/4 backlog: 7 items shipped at quality bar with no new creative direction given by the Studio Owner beyond the two standalone `/go` commands. Honest-voice and no-fabrication posture was preserved in-kind across every new surface (/social/ honest grouping, personalized welcome honest empty state, push prompt eligibility gating, dynamic hero honest empty state, offline "sealed" framing). No canon-affecting decisions; ETERNAL tier vocabulary was correctly held as escalation-only per CLAUDE.md.

### 2026-04-16 — Website shell must be hardened to the practical "100/100" standard, not just patched (S77)

- Category: Reliability / QA / Delivery Quality
- Human input: "How to get everything to 100/100?"; "Implement the entire 100/100 plan at optimal quality"
- Area affected: shared shell asset delivery, service worker caching, homepage hero/header verification, closeout/deploy quality bar
- Required direction:
  1. The right long-term answer is not a single patch; it is a whole-system prevention+detection plan that removes mixed-version shell drift, catches homepage shell regressions early, and makes recovery obvious
  2. Shared shell assets should be treated as release artifacts with canonical versioning/fingerprinting, not mutable stable production names
  3. The homepage "VaultSpark Studios" shell is the brand anchor and must have dedicated browser regression coverage instead of relying on incidental tests
  4. The quality target is "optimal quality" end-to-end: prevention, runtime fallback, verification, and closeout discipline all need to be part of the implementation

### 2026-04-15 — Studio OS startup/status signals must reflect current reality, not stale ops metadata (S73)

- Category: Process Integrity / Operating UX
- Human input: "Complete all signals and fix flags"
- Area affected: `prompts/start.md`, startup/status signal surfaces, repo memory freshness
- Required direction:
  1. Startup/status warnings should be treated as real debt to clear, not decorative diagnostics to leave sitting in the brief
  2. Prompt/template drift must be fixed by syncing the underlying protocol, not by hand-waving the mismatch in the brief
  3. Stale status signals such as CDR freshness and IGNIS recency should be actively closed when the repo can own them in-session
  4. Cross-repo freshness signals are still valid, but if they depend on sibling Studio OS repos they should be refreshed deliberately rather than accepted as permanent warnings

### 2026-04-13 — /rights/ rename + vaultsparked standard nav restoration (S64)

- Category: Information Architecture / Brand Integrity / UX
- Human input: (1) "Should the Technology & Rights area link to an /open-source/ page or something else?"; (2) "Fix both and complete all recommendation items and hit list items"; (3) shared VaultSparkedError1.png screenshot showing broken nav
- Area affected: `open-source/index.html` → `rights/index.html`; `vaultsparked/index.html`; `scripts/propagate-nav.mjs`; 77 pages via propagation
- Required direction:
  1. A proprietary-content page at `/open-source/` is architecturally misleading — the page explicitly says VaultSpark does NOT open source its work; the URL contradicts the content; canonical URL must reflect the content (`/rights/`)
  2. `/open-source/` becomes a redirect (meta refresh + JS replace; noindex) — no 301 possible on GitHub Pages static hosting
  3. Vaultsparked nav was broken because `propagate-nav.mjs` SKIP_DIRS contains `vaultsparked` — future nav fixes will never automatically propagate there; any nav changes must be applied manually to vaultsparked when propagated elsewhere
  4. Custom `.site-nav / .nav-links / .nav-actions` classes in vaultsparked were orphaned (never defined in any CSS) — the only correct fix is to replace with the standard `<header class="site-header">` template used everywhere else
  5. Hamburger menu on vaultsparked was silently non-functional because `nav-toggle.js` was never added to the page — critical omission caught and fixed

### 2026-04-13 — Homepage hero: remove logo image, forge wordmark animation, immersive identity-first design (S62)

- Category: Visual Design / UX / Brand Identity
- Human input: (1) "The top of the new website looks weird with the logo first before the main VaultSpark Studios title. Is there really nothing custom you can design for the homepage that is fully immersive to the user (perhaps removing the logo from that area and putting it elsewhere like in small icon format in the header and footer)"; (2) "Brainstorm the most immersive homepage ideas and score all options"; (3) "Implement A+B as a hybrid at highest quality — also pay close attention to the mobile design and make it desktop/tablet/smartphone (iphone/android) responsive"
- Area affected: `index.html` (hero section CSS + HTML)
- Required direction:
  1. Cinematic logo image (`vaultspark-cinematic-logo.webp`) must not appear in the hero — it reads as "logo first, then the name" which feels weird and backwards
  2. Logo icon (`vaultspark-icon.webp`) in the nav header is the correct placement — small icon format only
  3. The studio name itself (VaultSpark Studios as large type) is the hero identity — no image dependency
  4. The homepage hero must be genuinely immersive — the forge ignition concept (name "burns in" from a spark) and the vault door concept (vignette chamber spatial depth) were scored and selected
  5. Full responsive is non-negotiable: desktop, tablet, iPhone, Android all explicitly tested via clamp() and breakpoints at 768/640/480/360px
  6. The forge metaphor (fire meets steel, spark splits the forge) is the correct identity expression — it is the studio's own language and should be the foundational design principle for the hero

### 2026-04-13 — Homepage hero visual identity: no circles, must feel structurally different (S59–S60)

- Category: Visual Design / UX
- Human input: (1) "The homepage looks exactly the same as before?" (S59); (2) "the Homepage feels the exact same besides a weird background circular addition" (S60); (3) implied: the hero redesign must feel structurally different, not just adjusted in color/glow
- Area affected: `index.html` (page-specific `<style>` block, hero HTML)
- Required direction:
  1. Circular/ring visual elements (energy arcs, body radial blobs) are rejected — they read as "weird" and don't feel like a deliberate brand choice
  2. Glow and atmospheric effects must be diffuse (blur-filtered, no hard circle outlines) to feel cinematic rather than geometric
  3. Color and glow adjustments alone are NOT sufficient to constitute a "redesign" — a genuinely different homepage will require structural layout changes, not just CSS treatment
  4. Gold accent on "Is Sparked." heading is directionally correct and should be maintained

### 2026-04-12 — Genesis Vault Member badge naming + studio account exclusion (S56)

- Category: Brand / Legal / Community
- Human input: (1) "Founder is not what it should be called — that is confusing and I want no legal confusion either"; (2) "remove my accounts from the first 100 but add the same badge to them"; (3) Asked for name options, scored Genesis vs Pioneer, chose Genesis.
- Area affected: `supabase/migrations/`, `assets/images/badges/`, `vault-member/portal.js`, `vaultsparked/index.html`
- Required direction:
  1. Badge must not use "Founding" or "Founder" in its name — creates legal ambiguity; the standard is an evocative brand name with no ownership connotation
  2. Studio owner test accounts must not consume public member slots — the 100 slots are explicitly for public members; studio accounts hold the badge separately and are hardcoded as excluded in the award function
  3. Genesis chosen over Pioneer — Genesis is more distinctive, community-flex worthy, and brand-native; Pioneer is too generic and used widely across gaming platforms

### 2026-04-08 — Theme selector tile grid direction (S52)

- Category: UX / Visual Quality / Interaction Design
- Human input: "The theme picker is still the same old dropdown box that looks stale and unoriginal. It should use a theme selector like usemindframe.com does"
- Area affected: `assets/style.css`, `assets/theme-toggle.js`
- Required direction:
  1. Theme selector must not look like a dropdown list — it must feel visually distinctive and modern
  2. Reference target: usemindframe.com style — large visual tiles showing the actual theme colour, not a list of text options with small swatches
  3. Each option should be immediately visually identifiable by its colour, not just its label
- Why it matters: the prior "premium picker" (S44–S46) was still a vertical dropdown list with small swatches — the user flagged it as stale; the standard is now a tile/grid layout where colour is the primary UI signal

### 2026-04-07 — Mobile nav redesign + premium theme selector direction (S44)

- Category: UX / Visual Quality / Interaction Design
- Human input: "mobile website menu is broken - fix this and diagnose why that was happening. It is blurry when I hit it and clicking the pages doesn't work - redesign nav for optimal user experience. Also see the 5 screenshots in your local folder in order to fix the light mode theme issues. Also make sure that the theme selected is the one that stays across entire site and becomes the default (it should not switch between pages) - make the theme selector more premium/polished"
- Area affected: `assets/style.css`, `assets/theme-toggle.js`, `scripts/propagate-nav.mjs`, all 72 HTML pages
- Required direction:
  1. Mobile nav must be fully functional and styled (no blur, no click interference); the blur root cause must be diagnosed not papered over
  2. Theme selection must persist without any flash or reset between page navigations — this is a hard UX requirement
  3. The theme selector must look premium — not a bare browser `<select>` element; color swatches and polished interactions expected
  4. Mobile nav UX must be redesigned with optimal experience in mind — not just patched
- Why it matters: user has flagged mobile nav blur twice (S36, now S44) and discovered the true root cause was different each time; the standard is zero blur, zero click failures, zero theme flash on any page load

### 2026-04-06 — Light mode must be refined, readable, and first-class (S40)

- Category: UX / Visual Quality
- Human input: "fix the visual light mode theme as much of the text is unreadable (gray or white or invisiible on the white background) - make it a much more refined and improved light visual theme"
- Area affected: `assets/style.css`, `assets/theme-toggle.js`
- Required direction: light mode must be a premium designed variant, not a compromised fallback; text and supporting UI must remain readable on pale backgrounds across the public site
- Why it matters: the user explicitly raised broad readability failure, so future theme work must protect contrast and overall polish in light mode as a first-class experience

### 2026-04-06 — Status badge and mobile menu UX standards (S36)

- Category: UX / Visual Quality
- Human input: "the mobile menu brings up a blurry menu now that I can't see" + "make sure the FORGE/SPARKED/VAULTED tags on each project/game/tool page is not conflicting with the project/game header name"
- Area affected: `assets/style.css`, all `projects/*/index.html`
- Required direction: mobile nav must be fully readable (no blur artifacts); status badges must be visually separated from project/game titles — never overlapping
- Why it matters: two user-visible bugs discovered in same session; both are ongoing quality standards — any future badge or nav change must respect these constraints

### 2026-04-06 — Studio OS protocol utilization directive

- Category: Direction + Assignment
- Human input: "go to documents/development/studio-ops and follow all protocol information and update this file folder to start utilizing it"
- Area affected: CLAUDE.md, AGENTS.md, prompts/, all context/ files
- Required direction: fully adopt studio-ops Studio OS protocols in this repo — session aliases, start/closeout prompts, SIL tracking, context files with real content
- Why it matters: `start` was not triggering the full startup brief because CLAUDE.md had no session alias rule; the entire Studio OS integration was missing after the sanitization pass

### 2026-04-06 — GA4 measurement ID provided

- Category: Feature assignment
- Human input: provided measurement ID `G-RSGLPP4KDZ`
- Area affected: all 97 HTML pages
- Required direction: wire GA4 gtag snippet across all pages
- Why it matters: GA4 was wired in CSP but no script loaded; analytics were completely inactive

### 2026-04-03 — Public repo sanitization directive

- Category: Direction + Assignment
- Human input: "Yes do that and make sure it wont break any connections or ruin anything" and "Also do that for all public repos - sanitization pass"
- Area affected: public repository hygiene, tracked Studio OS files, local-tooling files, public/private documentation boundary
- Required direction: sanitize public repos so deployable code remains intact while proprietary or operator-only material is removed, stubbed, or moved to private storage
- Why it matters: the public website repo should remain safe to expose without leaking internal operating detail

## 2026-04-16 — Session 82 (no new entries)

CDR reviewed — no new creative direction this session. User invoked `/start` → `/go` with the directive "Implement all genius hit list items at highest/optimal quality", which is a general quality directive already captured in existing entries. All S82 work was execution against the S80 master-audit plan and S81 carry-forward; no new soul/brand/canon/scope guidance.

## 2026-04-16 — Session 83 (no new entries)

CDR reviewed — no new creative direction this session. User invoked `/start` → `/go` with the directive "update memory and task board with all items/ideas and implement all items at the highest/optimal quality", which is the same general quality directive already captured in prior entries. All S83 work was execution against the 10-item S83 Genius Hit List (synthesized in the same session from existing audit/TASK_BOARD state); no new SOUL/brand/canon/scope guidance. Only implicit direction encoded this session: *prefer honest empty states over fabricated content* — but this is already canonical (annual-Stripe honesty gate, FORGE/SPARKED transparency, existing trust-depth posture) and needs no new CDR entry.
