# Brain

## Mental model

- how this project wins: by making membership feel real and earned — not just a login screen. Points, rank, lore, and exclusive access create compounding reasons to stay.
- what matters most: identity continuity (your number, your rank, your achievements persist forever), lore depth (classified files reward exploration), and subscription value (VaultSparked feels premium, not gated)
- what tradeoffs we gladly make: complexity in the backend (Supabase RLS, Edge Functions, Stripe webhooks) is hidden entirely from the member. The frontend must feel simple and clean even when the system behind it is sophisticated.

## Working heuristics

- heuristic: all naming must use Vault / Portal vocabulary (Vault Runner, Forge Master, Vault Dispatch, Vault Command — not "dashboard", "admin", "settings panel")
- when it applies: every new feature, tab label, UI copy, and rank name

- heuristic: admin identity is checked by `username.toLowerCase() === 'vaultspark'` not by member_number
- when it applies: all admin gate logic in vault-member/index.html

- heuristic: rank thresholds and labels are canonical in `config/membership-entitlements.json` and should flow through the generated membership helpers before any browser or edge mirror is introduced
- when it applies: any rank system change, export logic, or Discord role-sync work

## Current strategic beliefs

- belief: The 9-tier rank system (Spark Initiate → The Sparked) gives enough depth to feel like a real progression without being overwhelming
- evidence: Range spans 0 to 100k+ points with exponential thresholds — early ranks are fast to hit, later ranks require sustained engagement
- confidence: high

- belief: The VaultSparked Discord role, auto-synced via Stripe webhook → is_sparked flag → DB webhook → assign-discord-role Edge Function, is the right architecture for subscription-gated Discord access
- evidence: Keeps Stripe, Supabase, and Discord decoupled with clear handoff points
- confidence: high
