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

---

### 2026-03-31 — VaultSparked public pricing canon is $24.99/month until explicitly changed

- Status: Active
- Context: The public VaultSparked landing surface and checkout-related docs drifted, and the founder clarified during Session 17 that the intended tier price is `$24.99`.
- Decision: Treat `$24.99/month` as the public-facing canonical VaultSparked price across website copy and operator-facing checkout references until the founder explicitly changes it again.
- Alternatives considered: Preserve the older `$4.99` landing-page language, hide price copy from the public page, or defer the correction until Stripe production setup
- Why this was chosen: Public pricing is a founder-controlled promise surface. Leaving drift here would create avoidable trust and launch confusion.
- Follow-up: Verify the eventual Stripe product/price IDs match this canon before production billing is enabled.

---

### 2026-03-31 — Service worker should cache only anonymous Supabase REST reads

- Status: Active
- Context: The service worker had been caching all `GET` requests to `supabase.co`, which risked serving stale or user-specific API responses too broadly.
- Decision: Limit service-worker caching to unauthenticated Supabase `/rest/v1/` GET requests only, and skip authenticated/auth/storage traffic.
- Alternatives considered: Keep caching all Supabase GETs, disable Supabase caching entirely, or rely solely on short TTL without request scoping
- Why this was chosen: It preserves the useful public-read performance win while removing the highest-risk cross-user/auth-state caching behavior.
- Follow-up: Browser-verify anonymous leaderboard/member-directory reads and authenticated portal flows after the next deploy.

---

### 2026-03-31 — Membership entitlements flow from one canonical repo config

- Status: Active
- Context: Membership promises, pricing, and plan checks had drifted across public copy, portal UI, and edge functions. VaultSparked and legacy PromoGrind Pro were being treated interchangeably in some code paths.
- Decision: Make `config/membership-entitlements.json` the repo source of truth for plan aliases, pricing, rank thresholds, feature entitlements, and per-project access posture, then generate browser + edge helpers from it.
- Alternatives considered: Keep patching plan logic ad hoc in each file, move all entitlements directly into SQL first, or collapse all paid access under a single generic subscription check
- Why this was chosen: It gives the repo a single configurable entitlement model immediately, reduces drift across browser and edge code, and keeps the access rules editable without scattering hardcoded strings and plan aliases everywhere.
- Follow-up: Apply the new phase52 SQL migration and keep future gated surfaces reading from the generated helpers instead of introducing new local plan checks.

---

### 2026-03-31 — VaultSparked and PromoGrind Pro are separate plans with explicit overlap

- Status: Active
- Context: The prior implementation let legacy `pro` behave like VaultSparked in portal identity checks, which blurred studio-wide premium perks with PromoGrind-only paid access.
- Decision: Treat `vault_sparked` as the only Sparked identity plan; treat `promogrind_pro` as a product-specific paid plan; allow VaultSparked to satisfy PromoGrind live-tools entitlements, but never let PromoGrind Pro grant Sparked badge/role/theme identity.
- Alternatives considered: Keep `pro` as a synonym for VaultSparked, rename VaultSparked to the single paid plan, or split all products into unrelated subscriptions with no shared premium overlap
- Why this was chosen: It preserves a clean studio-wide premium identity while still honoring the existing product-specific paid path and making the overlap explicit rather than accidental.
- Follow-up: Browser-verify free vs VaultSparked vs PromoGrind Pro behavior once the new SQL and edge-function deploy are live.

---

### 2026-03-31 — Apply phase52 via direct linked SQL instead of repairing legacy migration history during live rollout

- Status: Active
- Context: The production database was reachable, but `supabase db push --include-all` refused to run because the repo still uses older non-timestamp migration filenames while the remote Supabase migration history is timestamp-based.
- Decision: For the live rollout, apply `supabase-phase52-membership-entitlements.sql` directly with `supabase db query --linked -f ...` after fixing the migration to drop the legacy `get_classified_files()` signature before recreating it.
- Alternatives considered: Repair remote migration history in place, rename/fetch/rebuild the full local migration tree before deployment, or leave production on the old entitlement behavior
- Why this was chosen: It safely landed the required production schema change without taking on a risky migration-history repair in the same live change window.
- Follow-up: Normalize the repo’s Supabase migration-history strategy before the next substantial remote schema push so future production applies can use the standard migration path again.

---

### 2026-03-31 — Dedicated Playwright entitlement accounts should be provisioned through an operator script, not the invite-only public flow

- Status: Active
- Context: The authenticated entitlement test lane needed one free member and one VaultSparked member, but the existing public registration path depends on invite codes and email confirmation, while Sparked state normally arrives through Stripe webhooks.
- Decision: Add a service-role operator script that directly provisions dedicated test auth users, ensures `vault_members` rows, seeds free vs Sparked subscription state, and writes `.env.playwright.local` for Playwright.
- Alternatives considered: Keep using manual signup + invite-code flow, hand-edit the database each time, or wait for a future Stripe test harness before creating any dedicated browser accounts
- Why this was chosen: It gives the repo a repeatable, auditable, local-first path to create the exact browser-test state needed without abusing the public invite flow or relying on ad hoc production edits every session.
- Follow-up: Run the script with dedicated test emails and a service-role key, then extend the authenticated Playwright spec to assert free vs Sparked entitlement differences explicitly.

---

### 2026-03-31 — Authenticated browser tests should use admin-generated magic-link sessions under CAPTCHA hardening

- Status: Active
- Context: Supabase auth hardening is now active, and the previous Playwright helper depended on the password-grant endpoint, which fails with `captcha verification process failed` in production.
- Decision: For local authenticated browser verification, use the service-role key to generate a magic-link session, verify it through the Auth API, and then apply that session via the browser client instead of attempting password-grant login.
- Alternatives considered: Disable CAPTCHA for tests, solve Turnstile in browser automation, or keep using password grant and accept skipped/broken authenticated checks
- Why this was chosen: It preserves the production security posture while still allowing reliable local authenticated verification using operator-controlled test accounts.
- Follow-up: Keep the helper local/operator-only, and extend the authenticated spec to compare free vs Sparked states explicitly.

---

### 2026-03-31 — Remove stale last_seen write from get_member_bootstrap()

- Status: Active
- Context: Valid authenticated members were being pushed back into auth/complete-profile UI because `get_member_bootstrap()` updated `vault_members.last_seen`, but the deployed table no longer has that column.
- Decision: Remove the `last_seen` update from `get_member_bootstrap()`, capture the fix in `supabase-phase53-bootstrap-fix.sql`, and apply it directly to production.
- Alternatives considered: Add `last_seen` back to the table, ignore the bug and work around it only in tests, or patch the portal to bypass bootstrap failures silently
- Why this was chosen: The bug was real production breakage for valid sessions. The correct fix is to remove the stale schema assumption from the RPC.
- Follow-up: Keep auth/bootstrap contract audits in scope when future schema cleanup removes or renames portal-facing columns.
