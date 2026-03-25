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
