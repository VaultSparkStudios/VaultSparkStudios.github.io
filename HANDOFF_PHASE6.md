# Vault Member — Phase 6+ Handoff
_Last updated: 2026-03-24 — Phases 0–10 complete + fully deployed_

---

## Quick orientation

- **Repo:** `C:\Users\p4cka\documents\development\VaultSparkStudios.github.io`
- **Live site:** https://vaultsparkstudios.com/
- **GitHub:** https://github.com/VaultSparkStudios/VaultSparkStudios.github.io
- **Vault Member portal:** `/vault-member/index.html` — the main file for all auth + dashboard work
- **Build order reference:** `VAULT_BUILD_ORDER.md` in repo root
- **Supabase project:** `fjnpzjjyhnpmunfoycrp` | URL: `https://fjnpzjjyhnpmunfoycrp.supabase.co`
- **Supabase anon key:** `sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij` (already in `assets/supabase-client.js`)

---

## What's been built (Phases 0–5)

### Phase 0 — Foundation ✅
Supabase email/password auth (invite-only, email confirm OFF). Google + Discord OAuth. `register_with_invite` RPC creates vault_member row. `get_email_by_username` RPC enables Vault Handle login. Dashboard with rank progress bar, achievements, stats, classified lore panel, Vault Dispatch prefs. Avatar selector (12), accent colour (8 swatches), bio field. Nav account dropdown.

### Phase 1 — Identity & Moments ✅
Member number (`#1`, `#2`…) auto-assigned via `before insert` trigger. Founding Member gold badge for first 100 members. Avatar glow pulse (CSS keyframe) for Vault Keeper+ ranks. Rank-up ceremony overlay with particle burst (localStorage dedup per user). Vault Member Card — 680×380 Canvas PNG download.

### Phase 2 — Points Economy ✅
`point_events` table. `award_points(p_reason, p_points, p_label, p_once_per)` SECURITY DEFINER RPC with dedup. `initPointsEconomy(member)` awards pts on dashboard load for: subscribed (25), bio set (15), avatar customised (10), game visits (10 each), DreadSpike lore read (15) — deduped via localStorage + DB. `showXpChip(pts, label)` animated floating notification. "Recent Vault Activity" feed on dashboard. Visit flags set by game/lore pages.

### Phase 3 — Referral System ✅
`invite_codes.created_by` column. `get_or_create_my_invite_code()` RPC generates `VAULT-USERNAME-XXXX`. Settings tab shows personal invite code with copy button. `register_with_invite` updated — awards referrer 100 pts + `recruiter` (1st) / `patron` (5th) achievements. `copyInviteCode()` uses clipboard API with textarea fallback.

### Phase 4 — Classified Files Library ✅
`classified_files` table (id, slug, title, classification, rank_required 0–4, universe_tag, content_html, published_at). `get_classified_files()` SECURITY DEFINER RPC returns all published files with `locked` boolean and empty `content_html` for locked ones. "Classified Archive" tab on dashboard — expandable accordion file cards. 4 seeded lore files:
- `the-cartographers` (rank 0) — The mapping team that lost temporal orientation
- `rift-seven-incident-09` (rank 1) — RIFT-SEVEN memory retrieval phenomenon
- `fault-layer-origin` (rank 2) — The Vault was discovered not built; The Fault Layer
- `sparked-initiative-memo` (rank 3) — Why The Sparked register like DreadSpike
First-read awards +20 pts via `award_points('file_read_{slug}')`. Lazy-loads on first tab open.

### Phase 6 — Activity Chronicle ✅
`get_activity_timeline(p_limit int)` RPC merges `point_events` (non-challenge, classified by reason prefix) + `challenge_completions`. Chronicle tab on dashboard — day-grouped timeline, type icons (⚡📄🎮📡🔧🤝🔑), +pts badges. "Joined the Vault" appended client-side from `vault_members.created_at`. Lazy-loaded.

### Phase 7 — Discord Role Sync ✅
`discord_id text` column on `vault_members`. `save_discord_id(p_discord_id)` RPC. Auto-saves Discord identity on OAuth return. "Connected Accounts" block in Settings tab with Connect Discord button → `signInWithOAuth` with `vs_link_discord` localStorage flag for return detection. `assign-discord-role` Edge Function triggered by DB webhook on `vault_members` UPDATE — computes rank change, calls Discord API to swap roles. Env vars: `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_ROLE_IDS` (JSON map `{"0":"roleId",...}`).

### Phase 8 — Beta Key Vault ✅
`beta_keys` table (id, game_slug, key_code, claimed_by, claimed_at, min_rank, created_at). RLS: see unclaimed keys meeting rank threshold OR own claimed keys. `claim_beta_key(p_game_slug)` RPC — `FOR UPDATE SKIP LOCKED` atomicity, checks already-claimed, returns `{ok,key_code}` or `{error}`. "Early Access" tab: cards per game slug with Claim/Copy. `BETA_GAMES` list in JS maps slugs to names+icons.

### (archive) Phase 9 — Web Push Notifications ✅
`push_subscriptions` table (endpoint UNIQUE, keys JSONB, user_id). `upsert_push_subscription` + `delete_push_subscription` RPCs. `/sw.js` service worker handles `push` + `notificationclick`. Settings: Push Notifications toggle calls `subscribePush`/`unsubscribePush` via `pushManager`. `send-push` Edge Function triggered by `classified_files` INSERT — fans out to all subscriptions via `npm:web-push`. **VAPID setup required:** run `npx web-push generate-vapid-keys`, paste public key into `VAPID_PUBLIC_KEY` const in `vault-member/index.html`, set all three keys as Edge Function secrets. Enable Realtime on `studio_pulse` in Supabase Dashboard.

### (archive) Phase 10 — Live Studio Pulse ✅
`studio_pulse` table (message, type: 'update'|'alert'|'drop', created_at). Authenticated read RLS. "Studio Pulse" full-width panel on main dashboard — initial load of last 10, Supabase Realtime `postgres_changes` INSERT subscription prepends live. Type-coloured dot indicator. Pulsing LIVE badge. Channel torn down on `showAuth()` (logout), re-subscribed on `showDashboard()`.

### Phase 5 — Vault Challenges ✅
`challenges` table + `challenge_completions` table (supports one-time / weekly / monthly dedup). `get_challenges()` RPC returns active challenges with per-user completion state. `complete_challenge(p_challenge_id)` RPC records completion + inserts point_event + updates vault_members.points. "Vault Challenges" tab with card grid. 8 seeded challenges:
- Signal Received (25 pts, subscribed)
- Game Recon (10 pts, visit any game)
- Full Recon (50 pts, visit all 3 games)
- Identity Forged (25 pts, bio + custom avatar)
- Into The Archive (30 pts, first file read)
- Weekly Signal (15 pts, weekly login — resets Monday)
- First Recruit (50 pts, referral_1)
- Vault Patron (200 pts, referral_5)
`initChallenges(member)` auto-completes eligible challenges on dashboard load. `completeChallengeByActionKey(key)` called after specific actions. `refreshPointsDisplay()` centralises pts/rank UI refresh.

---

## Database schema (current)

### Tables
```
auth.users              — Supabase managed (id, email, user_metadata)

vault_members           — id (→ auth.users), username, username_lower, points INT,
                          subscribed BOOL, prefs JSONB, achievements JSONB[],
                          bio TEXT, avatar_id TEXT, accent TEXT,
                          member_number INT, created_at TIMESTAMPTZ

invite_codes            — code TEXT PK, used BOOL, used_by (→ auth.users),
                          used_at, created_at, created_by (→ auth.users)

point_events            — id UUID PK, user_id (→ auth.users), reason TEXT,
                          label TEXT, points INT, created_at TIMESTAMPTZ

classified_files        — id UUID PK, slug TEXT UNIQUE, title, classification,
                          rank_required INT (0–4), universe_tag, content_html,
                          published_at, created_at

challenges              — id UUID PK, title, description, points INT,
                          challenge_type TEXT ('one-time'|'weekly'|'monthly'),
                          action_key TEXT, expires_at, active BOOL, created_at

challenge_completions   — id UUID PK, challenge_id (→ challenges), user_id (→ auth.users),
                          completed_at TIMESTAMPTZ
```

### RPCs (all SECURITY DEFINER)
- `register_with_invite(p_invite_code, p_username, p_subscribe)` → jsonb
- `get_email_by_username(p_username)` → text
- `award_points(p_reason, p_points, p_label, p_once_per)` → jsonb `{ok,points}|{skipped}|{error}`
- `get_or_create_my_invite_code()` → text
- `get_classified_files()` → table (id, slug, title, classification, rank_required, universe_tag, content_html, published_at, locked)
- `get_challenges()` → table (id, title, description, points, challenge_type, action_key, expires_at, completed, completed_at)
- `complete_challenge(p_challenge_id)` → jsonb `{ok,points,title}|{skipped}|{error}`
- `get_member_stats(p_user_id)` → (calc_count, ledger_count) — used by PromoGrind integration

---

## Vault Member portal structure (`vault-member/index.html`)

### VS object (module-level)
```js
VS.RANKS          — array of {name, min, max, color, badgeClass}
VS.ACHIEVEMENT_DEFS — array of {id, icon, name, desc}
VS.AVATARS        — 12 avatar options {id, emoji, bg, label}
VS.ACCENT_COLORS  — 8 accent swatches {color, label}
VS.getRank(pts)        → rank object
VS.getNextRank(pts)    → next rank or null
VS.getRankProgress(pts) → 0–100
VS.getAvatar(id)       → avatar object
VS.logout()            async
VS.savePrefs()         async — updates prefs/subscribed
VS.showCardModal()     — generates canvas card + shows modal
VS.downloadCard()      — canvas → PNG download
VS.saveSettings()      async — updates bio, avatar_id, accent
```

### Key standalone functions
```js
showAuth()              — shows login/register view
showDashboard(member)   — populates full dashboard, triggers all loaders
buildMember(user, row)  — maps Supabase user + vault_members row → member object
applyAvatar(id, accent) — updates avatar emoji/bg + nav mini + progress fill
switchDashTab(which)    — toggles tabs/panes; lazy-loads archive on first open
closeNavDropdown()
buildAvatarGrid(selectedId)
buildColorPalette(selectedColor)
checkRankUp(member)        — localStorage rank dedup → showRankCeremony
showRankCeremony(rank)     — overlay + particles
dismissCeremony()
dismissCardModal()
generateMemberCard(member) — Canvas 680×380 PNG
rrect(ctx,x,y,w,h,r)       — rounded rect helper
showXpChip(pts, label)     — animated floating +XP chip (2.4s CSS animation)
initPointsEconomy(member)  — awards eligible points on load (Phase 2)
loadPointEvents()          — renders activity feed (Phase 2)
formatTimeAgo(date)        — "2h ago", "3d ago" etc.
loadInviteCode()           — fetches/displays personal invite code (Phase 3)
copyInviteCode()           — clipboard copy (Phase 3)
loadClassifiedArchive()    — fetches files, renders accordion cards (Phase 4)
buildFileCard(f, isRead)   — returns HTML string for one file card (Phase 4)
readFile(card, slug, title) — awards pts + triggers challenge completion (Phase 4)
loadChallenges()           — fetches + renders challenges grid (Phase 5)
buildChallengeCard(ch)     — returns HTML string for one challenge card (Phase 5)
initChallenges(member)     — auto-completes eligible challenges (Phase 5)
completeChallengeByActionKey(key) — completes challenge by action_key (Phase 5)
refreshPointsDisplay()     — re-fetches pts from DB, updates all pts/rank UI elements
```

### Dashboard tabs (4 total)
1. `dashboard` — Connected Games, Vault Stats, Recent Activity, Achievements, Studio Pipeline, Classified Lore, Vault Dispatch Prefs
2. `archive` — Classified Archive (Phase 4)
3. `challenges` — Vault Challenges (Phase 5)
4. `settings` — Avatar, Accent, Bio, Account Info, Invite Code

### Member object shape
```js
{
  _id, username, points, subscribed, prefs, achievements,
  createdAt, email, bio, avatar_id, accent, member_number
}
```

### Achievement IDs (current)
`joined`, `subscribed`, `visit_game`, `first_100`, `lore_read`, `social`,
`recruiter`, `patron`, `profile_complete`

### Rank system
| Index | Name | Min | Max |
|---|---|---|---|
| 0 | Spark Initiate | 0 | 99 |
| 1 | Vault Runner | 100 | 499 |
| 2 | Forge Guard | 500 | 1999 |
| 3 | Vault Keeper | 2000 | 9999 |
| 4 | The Sparked | 10000 | ∞ |

### Points earn triggers (all deduped)
| Reason key | Pts | Trigger |
|---|---|---|
| `subscribed` | 25 | member.subscribed |
| `bio_set` | 15 | member.bio set |
| `avatar_customized` | 10 | avatar_id ≠ 'spark' |
| `game_visit_cod` | 10 | localStorage `vs_visited_cod` |
| `game_visit_gridiron` | 10 | localStorage `vs_visited_gm` |
| `game_visit_vsfgm` | 10 | localStorage `vs_visited_vsfgm` |
| `lore_read_dreadspike` | 15 | localStorage `vs_visited_dreadspike` |
| `file_read_{slug}` | 20 | readFile() called per file |
| `challenge_{id}` | varies | complete_challenge RPC |
| `referral_{userId}` | 100 | register_with_invite (server-side) |

### SQL migration files in repo root
- `supabase-setup.sql` — Phase 0 (initial schema)
- `supabase-phase2-3.sql` — Phase 2/3
- `supabase-phase4-5.sql` — Phase 4/5

---

## Deployment state (as of 2026-03-24)

All phases fully deployed and live. No pending setup steps remain.

- **SQL migrations:** all applied (phases 4-5, 6, 7-8, 9-10)
- **Edge Functions deployed:** `assign-discord-role`, `send-push` (+ existing: `create-checkout`, `stripe-webhook`, `odds`)
- **Secrets set:** VAPID (3 keys on `send-push`), Discord bot token + guild ID + role IDs (on `assign-discord-role`)
- **DB triggers live:** `on_classified_file_insert` → `send-push`, `on_vault_member_update` → `assign-discord-role`
- **Realtime:** `studio_pulse` added to `supabase_realtime` publication
- **VAPID public key:** hardcoded in `vault-member/index.html`
- **Discord:** bot invited to server, 5 rank roles created (IDs mapped rank 0–4)
- **Supabase CLI:** linked to project `fjnpzjjyhnpmunfoycrp` via access token

## Pending phases

_All phases 0–10 are complete and deployed. No further phases are currently planned._

### (archive) Phase 6 — Activity Chronicle
Personal timeline of everything in the member's account — reverse-chron, grouped by type.

**New tab:** "Chronicle" on dashboard

**Data sources (all existing — no new tables needed):**
- `point_events` (already queryable) — points earned with label + timestamp
- `vault_members.created_at` — "Joined the Vault"
- `vault_members.achievements` — achievement unlock dates (currently no timestamp stored — consider adding)
- `challenge_completions` — challenge completions with timestamp
- `classified_files` read via point_events (`file_read_*` reason)

**Implementation notes:**
- Query `point_events` ordered by `created_at desc` limit 50
- Query `challenge_completions` for user ordered by `completed_at desc`
- Merge into a unified timeline array sorted by date
- Render with type-specific icons and formatting
- Group by day (show date dividers)
- "Joined" is always the last item

**Suggested RPC: `get_activity_timeline(p_limit int)`**
Returns unified rows: `{type, label, points, occurred_at}` from point_events + challenge_completions merged and sorted.

---

### (archive) Phase 7 — Discord Role Sync
**Schema addition needed:**
```sql
alter table public.vault_members
  add column if not exists discord_id text;
```

**Flow:**
1. "Connect Discord" button in Settings tab
2. `supabase.auth.signInWithOAuth({ provider: 'discord', options: { scopes: 'identify guilds.members.read' } })`
3. On OAuth callback: store `discord_id` in vault_members
4. Supabase Edge Function: on rank-up (triggered by `vault_members` update), calls Discord API to assign role
5. Roles: one per rank (create in Discord server first, store role IDs in Edge Function env)

**Note:** Requires Supabase Edge Functions (Deno). Discord OAuth must be enabled in Supabase Auth providers. Discord application must be set up at discord.com/developers.

---

### (archive) Phase 8 — Beta Key Vault
**New table:**
```sql
create table public.beta_keys (
  id         uuid primary key default gen_random_uuid(),
  game_slug  text not null,
  key_code   text unique not null,
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz,
  min_rank   integer default 0,
  created_at timestamptz default now()
);
alter table public.beta_keys enable row level security;
create policy "members see claimable or own keys"
  on public.beta_keys for select
  using (
    claimed_by = auth.uid()
    or (
      claimed_by is null
      and min_rank <= (select case when points>=10000 then 4 when points>=2000 then 3 when points>=500 then 2 when points>=100 then 1 else 0 end from vault_members where id = auth.uid())
    )
  );
```

**RPC: `claim_beta_key(p_game_slug text)`** — atomically claims first available key for the slug that meets the member's rank.

**Frontend:** New panel or tab "Early Access" — lists claimable keys per game with one-click claim + copy.

---

### (archive) Phase 9 — Web Push Notifications
1. Register Service Worker (`/sw.js`) on dashboard load
2. Request push permission on opt-in toggle in Settings
3. Store `PushSubscription` JSON in new `push_subscriptions` table
4. Supabase Edge Function: triggered by `classified_files` insert (Postgres webhook), sends push via Web Push Protocol
5. Settings toggle: "Vault Dispatch Push Notifications"

**New table:**
```sql
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  endpoint   text unique not null,
  keys       jsonb not null,
  created_at timestamptz default now()
);
```

---

### (archive) Phase 10 — Live Studio Pulse
Real-time curated activity stream.

**New table:**
```sql
create table public.studio_pulse (
  id         uuid primary key default gen_random_uuid(),
  message    text not null,
  type       text default 'update', -- 'update' | 'alert' | 'drop'
  created_at timestamptz default now()
);
alter table public.studio_pulse enable row level security;
create policy "authenticated read pulse" on public.studio_pulse for select to authenticated using (true);
```

**Frontend:** Supabase Realtime subscription on `studio_pulse`. Replace or augment the GitHub commit stream on the dashboard. LIVE pulsing dot indicator. Manually posted by studio or automated via Edge Function on GitHub deploy webhook.

---

## Design patterns to follow

- **All new SQL** → new file `supabase-phase{N}.sql` in repo root, run manually in Supabase SQL Editor
- **All new RPCs** → SECURITY DEFINER, `set search_path = public`
- **New dashboard sections** → new `.dash-tab` + `.dash-pane` pair following existing pattern
- **CSS** → add to `<style>` block in `vault-member/index.html` before `@media (max-width: 860px)` breakpoint
- **New point awards** → always go through `award_points` RPC (handles dedup server-side)
- **Points/rank UI refresh** → always call `refreshPointsDisplay()` after awarding pts
- **Loading states** → set `innerHTML = '<div style="color:var(--dim);">Loading…</div>'` before async fetch
- **Error states** → silent fail (catch → set innerHTML to "Could not load" message)
- **Never commit** `supabase-setup.sql` changes to existing tables without testing

## Kit (ConvertKit) newsletter
Platform: kit.com | `assets/kit.js` public API
Tags: studio-updates (17824260), lore-dispatches (17824261), early-vault-access (17824263)
Welcome sequence: 2695661

## VSGate (cross-domain redirect)
`assets/supabase-client.js` — `VAULT_GATED_APPS` registry gates PromoGrind and future tools.
After login, `VSGate.redirect(session)` sends tokens in URL hash to the waiting app.
Gated apps registered: `promogrind`, `promogrind_local` (5173), `promogrind_local2` (5174)
