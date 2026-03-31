# Decisions

Append new entries. Do not erase historical reasoning unless it is wrong.

---

### 2026-03-24 — Auth identity: username_lower check for admin

- Status: Active
- Context: Admin panel (Vault Command) needs to gate access to a single founder account. member_number was the original plan but the column didn't exist in DB when the admin panel was built and the founder hadn't registered yet.
- Decision: Check `member.username.toLowerCase() === 'vaultspark'` instead of member_number
- Alternatives considered: member_number === 1, a dedicated is_admin boolean column
- Why this was chosen: username_lower already existed, reliable, no migration needed, founder account username is a known constant
- Follow-up: If the studio ever needs multi-admin support, add an is_admin column to vault_members

---

### 2026-03-24 — 9-tier rank system (Spark Initiate → The Sparked)

- Status: Active
- Context: Original 5-tier system was too shallow for long-term engagement. The Sparked (100k+ pts) needed to be a prestige rank with no cap.
- Decision: Expand to 9 tiers with exponential thresholds [0, 250, 1000, 3000, 7500, 15000, 30000, 60000, 100000]. The Sparked tracks points infinitely beyond 100k.
- Alternatives considered: 5-tier (too few), 12-tier (too granular)
- Why this was chosen: Enough depth for multi-year engagement; thresholds front-load early rewards while making late ranks feel earned
- Follow-up: Keep VS.RANKS in vault-member/index.html and RANK_THRESHOLDS in assign-discord-role Edge Function in sync

---

### 2026-03-24 — VaultSparked Discord role via is_sparked flag

- Status: Active
- Context: Stripe webhooks and Discord role sync operate in separate systems (stripe-webhook Edge Function vs assign-discord-role Edge Function triggered by DB webhook). Needed a bridge.
- Decision: Add is_sparked boolean to vault_members. stripe-webhook sets it on subscription events. DB webhook fires assign-discord-role which reads it alongside rank to assign/remove the ⚡VaultSparked⚡ Discord role.
- Alternatives considered: Direct Discord API call from stripe-webhook (tighter coupling, no separation of concerns), separate webhook endpoint for Stripe → Discord
- Why this was chosen: Keeps Stripe, Supabase state, and Discord fully decoupled. is_sparked is the single source of truth. Any future subscription system can flip the same flag.
- Follow-up: Verify end-to-end with a Stripe test checkout

---

### 2026-03-25 — Studio OS applied additively to website repo

- Status: Active
- Context: vaultspark-studio-ops defines a project system (context/, prompts/, logs/, AGENTS.md). Website repo was built before studio-ops existed.
- Decision: Additive migration — add context/, prompts/, logs/ files without touching any existing repo structure or code
- Alternatives considered: Full repo reorganization to match studio-ops folder layout
- Why this was chosen: Non-breaking. All existing HANDOFF_PHASE6.md, VAULT_BUILD_ORDER.md, AGENTS.md content preserved. New context/ files give future sessions a fast, structured read path.
- Follow-up: Update AGENTS.md in studio-ops template to include discovery pointer in all future projects

---

### 2026-03-30 — Rank titles derive from points, not a stored `vault_members.rank_title` field

- Status: Active
- Context: Public leaderboard code, newsletter delivery, and one migration file were querying `rank_title` as if it were a stable column on `vault_members`, while the project’s base schema and portal logic treat rank as derived from points.
- Decision: Derive rank title from points anywhere the repo needs it unless a specific RPC/table explicitly materializes `rank_title` for that surface.
- Alternatives considered: Add a persistent `rank_title` column to `vault_members`, keep patching each broken query ad hoc
- Why this was chosen: Keeps rank logic aligned with the existing points-first model, avoids unnecessary schema expansion, and fixes a whole class of drift bugs in one rule.
- Follow-up: If rank logic changes again, update the shared thresholds everywhere they are mirrored (`vault-member` UI, Discord role sync, newsletters, public APIs, migrations).

---

### 2026-03-30 — Theme system upgraded from binary toggle to curated picker

- Status: Active
- Context: Light mode was broken because the shared shell still contained dark-only cascade assumptions, and the user explicitly wanted multiple curated theme options while keeping dark as the favorite/default posture.
- Decision: Replace the binary dark/light toggle with a persistent theme picker and drive the site shell from shared theme variables that support `dark`, `light`, `ambient`, `warm`, `cool`, `lava`, and `high-contrast`.
- Alternatives considered: Only patch light mode and keep the binary toggle, add many page-local theme overrides, or expose an uncurated larger theme list
- Why this was chosen: Fixes the regression at the root, keeps theme logic centralized, and gives the user requested variety without diluting the site’s dark-first identity.
- Follow-up: Add browser-level persistence coverage and move remaining page-specific dark inline surfaces onto shared theme tokens where appropriate.

---

### 2026-03-31 — Public website repo should keep only public-safe operational docs

- Status: Active
- Context: A public scan surfaced legacy root-level docs and generated local Supabase metadata that were not live secrets, but still exposed internal operating detail or environment-specific local state.
- Decision: Keep compatibility filenames where needed, but reduce them to public-safe stubs/pointers and remove generated local metadata (`supabase/.temp/`) from version control.
- Alternatives considered: Leave the files as-is, delete them outright, or move the entire operational history into a private repo in one large pass
- Why this was chosen: It improves public repo hygiene immediately without breaking references or requiring a large repo restructure in one session.
- Follow-up: Continue a public/private boundary audit on remaining legacy root docs and secret-adjacent operator notes.

---

### 2026-03-31 — Homepage cards should derive surfaces from shared theme tokens

- Status: Active
- Context: After the shell-level theme fix, the homepage still had several prominent cards hardcoded to dark gradients and dark panel colors, especially in light mode.
- Decision: Move homepage card surfaces onto reusable classes backed by `--panel`, `--panel-strong`, and `--line` instead of page-local dark colors.
- Alternatives considered: Keep patching only light mode with overrides, or leave the homepage cards intentionally dark as contrast accents
- Why this was chosen: It resolves the visible mismatch directly, keeps the theme system coherent, and creates reusable page-level surface patterns for later parity passes.
- Follow-up: Continue the parity audit on portal and secondary-page cards that may still be using dark-only surfaces.

---

### 2026-03-31 — Theme persistence should be dual-layer: local first, account-backed when signed in

- Status: Active
- Context: The new theme system already persisted locally, but the user explicitly wanted theme choice to survive on the current device and also follow a Vault Member account across devices before public launch.
- Decision: Store the selected site theme in both `localStorage` (`vs_theme`) and, when authenticated, `vault_members.prefs.site_theme`. Current-device local preference wins immediately; account theme hydrates devices that do not already have a local override.
- Alternatives considered: Local-only persistence, account-only persistence, or forcing the account value to override every device on sign-in
- Why this was chosen: It preserves fast device-specific UX, supports cross-device restore for members, and avoids surprising people by overwriting an existing local preference every time they sign in.
- Follow-up: Add browser-level verification for local/account precedence and new-device hydration.

---

### 2026-03-31 — Rights and privacy notices should live in legal surfaces, not sprayed across product pages

- Status: Active
- Context: The site already had a basic footer notice, and the user asked about stronger copyright/trademark protection notes plus a more complete privacy policy.
- Decision: Keep the lightweight footer notice, but expand the legal pages with clearer copyright, trademark, fan-content, data-storage, and no-implied-license language instead of adding heavy warning copy throughout the site UI.
- Alternatives considered: Add warning banners across the site, leave the minimal footer notice only, or bury all IP language solely in Terms of Service
- Why this was chosen: It strengthens public notice and legal clarity without cluttering the product experience or making the site feel hostile.
- Follow-up: Run a legal copy consistency pass across press-kit and other public-facing legal references.
