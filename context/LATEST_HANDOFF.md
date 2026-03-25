# Latest Handoff

Last updated: 2026-03-25

This is the authoritative active handoff file for the project.
For full phase history (Phases 0–10), read `HANDOFF_PHASE6.md`.

## What was completed (as of 2026-03-25 — Phase 11 session)

### Feature brainstorm + scoring
- Brainstormed 42 improvements across all dimensions (growth, retention, monetisation, UX, SEO, security, devex)
- Scored by impact (1–10 scale: business value × user value / effort)
- Full scored list committed to `context/TASK_BOARD.md` in S/A/B/C tiers

### Phase 11 — Top 20 features shipped (commit d1c8794, +2,147 lines)

**Vault Member Portal (`vault-member/index.html`):**
- Daily login bonus + streak system: awards 10 XP on first login each day; increments `streak_count`; milestone bonuses at 7 (50pts) / 30 (200pts) / 60 (500pts) / 100 (100pts) days; "🔥 N day streak" pill on dashboard
- 5-step onboarding tour: dark backdrop + spotlight cutout + floating card; triggers for new members (points === 0, no localStorage flag); steps cover dashboard, challenges, archive, settings
- In-portal notification center: 🔔 bell icon in nav; dropdown fetches last 10 Studio Pulse items + rank-up events; realtime subscription pushes new inserts; unread badge keyed to `notifications_last_read` localStorage timestamp
- Challenge categories + filter pills: All / Daily / Weekly / Lore / Game / Social / One-Time; `expires_at` countdown badges ("Expires in Xd Xh"), greyed expired state
- Achievement progress bars: `progress_max` column; gradient fill bars for multi-step achievements; current/max counter derived client-side from loaded data
- Social sharing of member card: "Share Rank ⚡" button → Web Share API with image blob → Twitter/X intent fallback; "Copy Link 📋" copies `/join/?ref=username` to clipboard

**Homepage (`index.html`):**
- Live member count: "Join X vault members" with pulsing green dot; fetched via `VSPublic.from('vault_members').headCount()`

**Sentry error tracking:**
- Added to `index.html`, `vault-member/index.html`, `investor-portal/index.html`
- Uses `SENTRY_DSN_PLACEHOLDER` — user must replace with real DSN from sentry.io

**New page — `/join/` referral landing:**
- Reads `?ref=username`; fetches referrer's rank/avatar from Supabase; shows personalised hero ("PlayerX [Rank] invited you")
- All 9 rank badge colour classes; live member count pill; 3-benefit panel; CTA → `/vault-member/#register`
- Graceful fallback when no ref param or fetch fails
- noindex, OG/Twitter tags, Sentry included

**Leaderboard (`leaderboards/index.html`):**
- Game-specific tabs: Global | Football GM | Call of Doodie
- Lazy-fetches `point_events` filtered by game keyword on first tab click
- Empty state with game CTA links; existing period/sort filters preserved for Global tab

**Public member profile (`member/index.html`):**
- Pinned achievements (up to 3, with emoji + name)
- Recent activity feed (last 5 point events with relative timestamps)
- Founding member badge (⚡ for member_number ≤ 100)
- Rank glow on badge for rank index ≥ 3
- Share profile button (copies URL, "Copied!" toast)

**Journal (`journal/index.html`):**
- Emoji reactions: 🔥 Fire | ❤️ Love | 🎮 Gaming | ⚡ Sparked
- Counts fetched on load; optimistic toggle on click; auth-gated writes (prompts sign-in if logged out); rolls back on failure
- Session resolved from localStorage Supabase v2 key

### SQL migrations (committed, not yet run)
- `supabase-phase11.sql` — streak columns, challenge category/expires_at, achievement progress_max; idempotent
- `supabase-journal-reactions.sql` — `journal_reactions` table with RLS (anyone reads, auth writes/deletes own)

## What is mid-flight

- Nothing in code. Two SQL files need running + Sentry DSN needs replacing.

## What to do next (in order)

1. **Run SQL** — `supabase-phase11.sql` then `supabase-journal-reactions.sql` in Supabase SQL editor
2. **Sentry DSN** — search `SENTRY_DSN_PLACEHOLDER` in index.html, vault-member/index.html, investor-portal/index.html → replace with real DSN from sentry.io
3. **Push** — `git push` to deploy
4. **Cloudflare proxy** — DNS change on registrar; highest-ROI speed/security win
5. **Supabase dashboard** — CAPTCHA on auth, session timeout, email enumeration prevention (Settings → Auth)
6. **VAPID keys** — generate + set VAPID_PUBLIC_KEY in vault-member/index.html + Edge Function secrets → activates web push
7. **Annual VaultSparked pricing** — add to Stripe + update Edge Function

## B-tier backlog (next session candidates)

- Gift subscriptions (Stripe) [6.8]
- Bookmark classified files [6.5]
- Dark/light mode toggle [6.5]
- Investor portal KPI trend charts [6.5]
- Sitemap auto-generation (GitHub Action) [6.5]
- Game update changelogs on game pages [6.3]
- Multi-admin support (is_admin column — SQL already drafted) [6]
- RLS policy audit (investor_requests + challenge_submissions) [6]

## Constraints

- Supabase anon key is browser-safe and intentionally public — do not rotate
- Discord role IDs are fixed: see HANDOFF_PHASE6.md for the full ID list
- Admin check is `username.toLowerCase() === 'vaultspark'` — do not change without migrating code
- STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are Edge Function secrets — never commit them
- `assets/supabase-public.js` is for anonymous read-only public pages only (not auth/write flows)
- Supabase CDN pinned to `@2.49.1/dist/umd/supabase.min.js` in investor portal pages

## Read these first next session

1. `context/CURRENT_STATE.md`
2. `context/TASK_BOARD.md`
3. `context/LATEST_HANDOFF.md` (this file)
4. `HANDOFF_PHASE6.md` (if deep phase/schema context needed)
