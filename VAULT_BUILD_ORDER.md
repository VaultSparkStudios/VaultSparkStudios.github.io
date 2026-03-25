# Vault Member — Build Order

## ✅ Phase 0 — Foundation (Done)
- Supabase auth (invite-only, email/password)
- Vault Member dashboard (rank, achievements, stats, lore)
- Avatar selector (12 universe icons)
- Accent colour picker (8 palette swatches)
- Bio field (160 chars, shown on profile card)
- Nav account dropdown (avatar + handle + chevron)
- Dashboard tabs (Dashboard / Profile & Settings)

## ✅ Phase 1 — Identity & Moments (Done)
- Member number (`#1`, `#2`, …) auto-assigned on registration
- Founding Member badge for first 100 members (permanent, on card + profile)
- Avatar glow pulse for Vault Keeper + The Sparked tier
- Rank-up ceremony overlay (animated, fires once per rank crossing)
- Vault Member Card — Canvas PNG download (avatar, rank, number, branding)

SQL required:
```sql
alter table public.vault_members
  add column if not exists member_number integer;

with ordered as (
  select id, row_number() over (order by created_at asc) as n from vault_members
)
update vault_members v set member_number = o.n from ordered o where v.id = o.id;

create or replace function assign_member_number()
returns trigger language plpgsql as $$
begin
  if new.member_number is null then
    new.member_number := (select coalesce(max(member_number),0)+1 from public.vault_members);
  end if;
  return new;
end; $$;

drop trigger if exists assign_member_number_tg on public.vault_members;
create trigger assign_member_number_tg
  before insert on public.vault_members
  for each row execute function assign_member_number();
```

---

## ✅ Phase 2 — Points Economy (Done)
Make Vault Points earnable through real actions.

**New table: `point_events`**
```sql
create table public.point_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  reason     text not null,       -- 'lore_read', 'game_visit', 'anniversary', etc.
  points     integer not null,
  created_at timestamptz default now()
);
alter table public.point_events enable row level security;
create policy "users read own events" on point_events for select using (auth.uid() = user_id);
```

**New RPC: `award_points(p_reason, p_points)`**
- Inserts into `point_events`
- Updates `vault_members.points`
- Checks dedup (can't earn same reason twice per day/ever depending on type)

**Earn triggers:**
| Action | Points | Dedup |
|---|---|---|
| Visit lore page (`/universe/dreadspike/`) | 15 | Once ever |
| Visit any game landing page | 5 | Once per game |
| Subscribe to Vault Dispatch | 25 | Once ever |
| 30-day anniversary | 50 | Once per year |
| Referral (someone uses your code) | 100 | Per referral |
| Read new classified file | 20 | Once per file |
| Complete a weekly challenge | varies | Per challenge |

**Frontend changes:**
- `point_events` feed visible in stats panel ("Recent Activity")
- Award points on page load for eligible actions via `award_points` RPC
- Animated +XP chip floats up from avatar when points are earned

---

## ✅ Phase 3 — Referral System (Done)
Every member gets their own invite code to gift.

**Schema changes:**
```sql
alter table public.invite_codes
  add column if not exists created_by uuid references auth.users(id);
```

**Flow:**
1. On first login, generate a personal invite code: `VAULT-{username_upper}-{random4}`
2. Store in `invite_codes` with `created_by = user_id`
3. Display in Settings tab: "Your Invite Code" with copy button
4. When someone registers with that code, award referrer 100 pts + "Recruiter" achievement

**Achievements to add:**
- `recruiter` — Invited your first member
- `patron` — Invited 5 members

---

## 🔜 Phase 4 — Classified Files Library
Rank-gated expanding lore vault. Current single DreadSpike block becomes a structured archive.

**New table: `classified_files`**
```sql
create table public.classified_files (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  classification text not null,  -- 'EYES ONLY', 'RESTRICTED', etc.
  rank_required integer not null default 0,  -- min RANKS index (0=all, 3=Vault Keeper+)
  universe_tag text,             -- 'dreadspike', 'dunescape', etc.
  content_html text not null,
  published_at timestamptz,
  created_at   timestamptz default now()
);
alter table public.classified_files enable row level security;
create policy "members read eligible files"
  on classified_files for select
  using (
    auth.uid() in (select id from vault_members where points >= 0)
    and rank_required <= (
      select case
        when points >= 10000 then 4
        when points >= 2000  then 3
        when points >= 500   then 2
        when points >= 100   then 1
        else 0 end
      from vault_members where id = auth.uid()
    )
  );
```

**Frontend:**
- "Classified Archive" tab on dashboard
- Files listed with lock icon if not yet unlocked
- Locked files show rank required to unlock
- Reading a file awards points (via `award_points`)

---

## 🔜 Phase 5 — Vault Challenges
Weekly/monthly tasks for bonus points.

**New table: `challenges`**
```sql
create table public.challenges (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  points      integer not null,
  challenge_type text not null, -- 'weekly', 'monthly', 'one-time'
  action_key  text not null,   -- 'visit_game', 'read_lore', 'share', etc.
  expires_at  timestamptz,
  active      boolean default true
);

create table public.challenge_completions (
  challenge_id uuid references challenges(id),
  user_id      uuid references auth.users(id),
  completed_at timestamptz default now(),
  primary key (challenge_id, user_id)
);
```

**Frontend:**
- "Vault Challenges" panel on dashboard
- Active challenges listed with point reward and expiry countdown
- Completion tracked server-side via RPC
- Completed challenges show checkmark + points earned

---

## 🔜 Phase 6 — Activity Chronicle
Personal timeline of everything that happened in the member's account.

- Point events feed (from Phase 2 `point_events` table)
- Milestone moments: joined, rank-ups, achievements, files read
- Timeline format, reverse chronological
- "Your Vault History" tab or section in dashboard

---

## 🔜 Phase 7 — Discord Role Sync
Link Vault Rank to Discord roles.

**Flow:**
1. "Connect Discord" button in Settings
2. OAuth flow to Discord (Supabase supports Discord OAuth)
3. On connect: store `discord_id` in vault_members
4. Supabase Edge Function checks rank and calls Discord API to assign role
5. Re-syncs on rank-up

**Schema:**
```sql
alter table public.vault_members
  add column if not exists discord_id text;
```

---

## 🔜 Phase 8 — Beta Key Vault
Distribute early access keys directly through the dashboard.

**New table: `beta_keys`**
```sql
create table public.beta_keys (
  id          uuid primary key default gen_random_uuid(),
  game_slug   text not null,
  key_code    text unique not null,
  claimed_by  uuid references auth.users(id),
  claimed_at  timestamptz,
  min_rank    integer default 0,  -- rank index required
  created_at  timestamptz default now()
);
```

**Frontend:**
- "Early Access" section on dashboard
- Keys appear automatically when member qualifies
- One-click claim with copy-to-clipboard
- Claimed keys greyed out with timestamp

---

## 🔜 Phase 9 — Web Push Notifications
Opt-in browser push for new files, rank-ups, and drops.

- Service Worker registration
- Push subscription stored in Supabase (`push_subscriptions` table)
- Supabase Edge Function sends push on new `classified_files` insert
- Settings toggle: "Vault Dispatch Push Notifications"

---

## 🔜 Phase 10 — Live Studio Pulse
Real-time curated activity stream via Supabase Realtime.

**New table: `studio_pulse`**
```sql
create table public.studio_pulse (
  id         uuid primary key default gen_random_uuid(),
  message    text not null,
  type       text default 'update', -- 'update', 'alert', 'drop'
  created_at timestamptz default now()
);
```

**Frontend:**
- Supabase Realtime subscription on `studio_pulse`
- Live feed replaces or augments the GitHub commit stream
- Manually posted by studio (or automated via Edge Function on deploy)
- "LIVE" indicator dot pulses when new items arrive

---

## Profile Polish Backlog (no priority order)
- Custom profile card backgrounds (unlockable at rank thresholds, stored as CSS class)
- Animated avatars at The Sparked tier (CSS keyframe on the emoji)
- "Days in the Vault" milestone badges: 30d, 90d, 180d, 1yr
- Member number leaderboard page (opt-in, top-ranked The Sparked members)
- Profile share URL: `/vault-member/profile/{username}` (public read-only view)
