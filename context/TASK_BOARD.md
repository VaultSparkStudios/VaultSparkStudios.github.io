# Task Board

## Now

- [SIL] Hook VaultScore.submit() into game pages (Call of Doodie, VaultSpark Football GM) — SDK built, ~30 mins work [9.0]
- [SIL] "Complete Your Vault" persistent onboarding CTA — post-registration checklist (avatar, first challenge, refer a friend) with bonus points [7.5]

## Next (Pending External Action)

- Enable Cloudflare proxy (requires DNS change on registrar — highest-ROI speed/security win) [Score: 10]
- Supabase dashboard settings: CAPTCHA on auth, session timeout, email enumeration prevention [Score: 8.5]
- VAPID key setup: generate keys, set VAPID_PUBLIC_KEY in vault-member/index.html, deploy send-push Edge Function secrets [Score: 9]
- VaultSparked Discord role: end-to-end test with Stripe test checkout
- Annual VaultSparked pricing tier (Stripe dashboard + Edge Function update) [Score: 8.5]
- Email newsletter/digest (requires third-party or Supabase email setup) [Score: 8.8]
- 2FA/MFA for vault members (Supabase TOTP toggle + UI prompt) [Score: 7.5]

## Blocked

- Web push delivery: blocked on VAPID key generation
- True HTTP security headers (CSP, HSTS, X-Content-Type-Options): blocked on Cloudflare or custom server

## S-Tier Backlog (Score 9–10)

*(empty — rank-up ceremony already shipped)*

## A-Tier Backlog (Score 7–8.9)
- [ ] Google Search Console + Bing Webmaster verification + sitemap submission [6.5]

## B-Tier Backlog (Score 5–6.9)

- [ ] Gift subscriptions (Stripe) [6.8]
- [ ] Monthly investor update email (automated digest) [6]

## C-Tier Backlog (Score 3–4.9)

- [ ] Vault social graph (member connections) [4.8]
- [ ] Vault Map (lore geography explorer) [4.5]
- [ ] SRI integrity hashes for Supabase CDN [4.5]
- [ ] Programmatic SEO for leaderboard pages [4.5]
- [ ] Community-created lore submissions [4.5]
- [ ] "Currently playing" badge on member profile [4.5]
- [ ] E-sign integration for investor docs [4]
- [ ] Merchandise store [4]
- [ ] Game-specific Discord channels linked from game pages [4]
- [ ] A/B testing infrastructure [3.5]
- [ ] Cap table visualization [3.5]

## Completed — Phase 43 (2026-03-25)

- ✅ Co-op teams — members can create a team (auto-generates 6-char invite code) or join via code; team roster displayed with leader/member roles; team points accumulate via Postgres trigger on `point_events` inserts; team panel on vault-member dashboard with create/join/leave/disband actions
- ✅ Team leaderboard tab on `/leaderboards/` — lazy-loaded on first click, shows rank, team name, member count, total points with medal icons for top 3
- **SQL needed:** run `supabase-phase43-teams.sql` — creates `teams`, `team_members` tables, `accrue_team_points` trigger, `get_my_team()` RPC

## Completed — Phase 42 (2026-03-25)

- ✅ Currently playing badge on member profile card — queries latest `game_sessions` row for the member; shows "🎮 Playing: [game]" (green) if played today, "🎮 Last played: [game]" (grey) if older; sits below streak badge above bio

## Completed — Phase 41 (2026-03-25)

- ✅ Fan art voting — heart/like buttons on every gallery card; shows live vote count; Vault Members can toggle their vote (upsert/delete); non-members see read-only count; optimistic UI update
- **SQL needed:** run `supabase-phase41-fan-art-votes.sql` — creates `fan_art_votes` table (fan_art_id, user_id, unique constraint) + RLS policies (public read, authenticated insert/delete own)

## Completed — Phase 40 (2026-03-25)

- ✅ Fan art submission form on `/community/` — Vault Members can upload images (PNG/JPG/WebP, max 5MB) with title, description, and character tag; uploads to Supabase Storage bucket `fan-art`, row inserted to `fan_art_submissions`
- ✅ Fan art gallery on `/community/` — loads approved submissions dynamically, `<picture>` cards with image overlay + title label
- ✅ Fan art moderation in Vault Command — `loadFanArtQueue()` + `moderateFanArt()` with pending badge, image preview, approve/reject actions, optional rejection note
- **SQL needed:** run `supabase-phase40-fan-art.sql` — creates `fan_art_submissions` table + RLS + Storage policies; also manually create `fan-art` bucket in Supabase Storage dashboard (public bucket)

## Completed — Phase 39 (2026-03-25)

- ✅ WebP conversion — `scripts/convert-webp.mjs` generates WebP for all darth-spike images (5–15% smaller)
- ✅ Updated `<picture>` elements on `index.html`, `universe/index.html`, `universe/dreadspike/index.html` with WebP source + JPG fallback for still images
- ✅ Video poster attributes updated to use `.webp` on all 3 pages
- ✅ Preload hint for darth-spike-poster updated to WebP with `type="image/webp"`

## Completed — Phase 38 (2026-03-25)

- ✅ Supabase query batching — `get_member_bootstrap` RPC combines vault_members + recent point_events into one startup round-trip; `loadPointEvents` uses prefetched events on first load
- ✅ `initChallenges` and `completeChallengeByActionKey` now reuse `_allChallenges` cache instead of making redundant `get_challenges` RPC calls
- ✅ `refreshPointsDisplay` no longer calls `getSession()` — uses `_currentMember._id` directly
- **SQL needed:** run `supabase-phase38-bootstrap.sql` — adds `get_member_bootstrap()` RPC

## Completed — Phase 37 (2026-03-25)

- ✅ Per-page OG image generation — `scripts/generate-og.mjs` (Node.js + sharp) generates 14 branded 1200×630 PNGs; GitHub Action in `.github/workflows/og-images.yml` regenerates on script changes
- ✅ All previously broken OG image refs fixed (og-roadmap, og-studio, og-vault-member, og-vsfgm were 404s)
- ✅ 14 pages updated from generic `og-image.png` to page-specific images

## Completed — Phase 36 (2026-03-25)

- ✅ Game session recording on all 3 game pages (Call of Doodie, Gridiron GM, VaultSpark Football GM) — when a signed-in member visits a game page, a `game_sessions` row is inserted once per day (localStorage dedup key `vs_gs_{slug}_{date}`)
- ✅ Session milestone awards in vault portal — `initGameSessionMilestones()` queries all sessions by game_slug and awards points at 5/10/25 session milestones per game (25/50/100 pts)
- **SQL needed:** run `supabase-phase36-game-sessions.sql` — adds `for insert to authenticated with check (auth.uid() = user_id)` policy to `game_sessions`

## Completed — Phase 35 (2026-03-25)

- ✅ "Who Runs The Vault" team section added to `studio/index.html` — founder card + 3 role cards (Design & Dev, World-Building, Studio Operations)
- ✅ Member-to-member Gift Points panel in vault portal — `giftPoints()` with recipient lookup, balance check, dual point_events logging
- ✅ RLS audit complete — `challenge_submissions` and `investor_requests` both have correct INSERT/SELECT/UPDATE policies; no gaps found
- ✅ Pending SQL migrations consolidated into `supabase-phase35-migrations.sql` (phases 27–35)

## Completed — Phase 34 (2026-03-25)

- ✅ Investor data room access log — `investor_document_access` table; document open events logged on both dashboard and `/investor-portal/documents/` pages; includes investor_id, investor_name, document_id, document_title
- **SQL needed:**
  ```sql
  CREATE TABLE IF NOT EXISTS investor_document_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid,
    document_title text,
    investor_id uuid,
    investor_name text,
    accessed_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE investor_document_access ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "investors insert access" ON investor_document_access FOR INSERT WITH CHECK (true);
  CREATE POLICY "service read access" ON investor_document_access FOR SELECT USING (false);
  ```
- ✅ Rate limiting on invite code claims — client-side sliding-window guard (3 attempts per 10 min) in registration form; stored in localStorage as `vs_reg_attempts`; blocks submit with clear error message before reaching server

## Completed — Phase 33 (2026-03-25)

- ✅ Lighthouse CI score gate — `.lighthouserc.json` with `performance ≥ 0.9` error assertion + accessibility/best-practices/SEO warn thresholds; `lighthouse.yml` updated to use `configPath`
- ✅ Axe-core accessibility audit in CI — `.github/workflows/accessibility.yml` runs `@axe-core/cli` on 5 public pages on push to main; uploads results artifact
- ✅ Community event RSVP — RSVP buttons on all 3 event cards (Spring Challenge Sprint, Gridiron GM Season 2, VaultSparked Beta); `event_rsvps` Supabase table; live RSVP count; auth-gated submit; marks own RSVPs on load
- **SQL needed:**
  ```sql
  CREATE TABLE IF NOT EXISTS event_rsvps (
    event_slug text NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (event_slug, user_id)
  );
  ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "members rsvp" ON event_rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "public read rsvps" ON event_rsvps FOR SELECT USING (true);
  ```

## Completed — Phase 32 (2026-03-25)

- ✅ Year corrections — all public-facing 2024/2025 year labels updated to 2026 (studio started March 2026): homepage milestones, press page (Founded/boilerplate), studio page (Est./timeline), roadmap timeline, journal posts (post-dates, meta, JSON-LD datePublished, feed.xml), universe/DreadSpike pages
- ✅ Game rating — 5-star vault member rating widget on all 3 released game pages; `game_ratings` table; `AggregateRating` in VideoGame JSON-LD schema; session-auth submit/update; hover interaction; anonymous count display
- **SQL needed:**
  ```sql
  CREATE TABLE IF NOT EXISTS game_ratings (
    game_slug text NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (game_slug, user_id)
  );
  ALTER TABLE game_ratings ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "members rate" ON game_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "members update" ON game_ratings FOR UPDATE USING (auth.uid() = user_id);
  CREATE POLICY "public read" ON game_ratings FOR SELECT USING (true);
  ```

## Completed — Phase 31 (2026-03-25)

- ✅ Journal post view count — `journal_views` table (session-based dedup via localStorage + `vs_session_id`); view count shown in post-meta as "👁 N views" on all 3 individual journal post pages; day-keyed localStorage guard (`vs_view_SLUG_DATE`) prevents double-counting per day
- **SQL needed:**
  ```sql
  CREATE TABLE IF NOT EXISTS journal_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_slug text NOT NULL,
    session_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE journal_views ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "public insert views" ON journal_views FOR INSERT WITH CHECK (true);
  CREATE POLICY "public read view count" ON journal_views FOR SELECT USING (true);
  ```

## Completed — Phase 30 (2026-03-25)

- ✅ Sitemap auto-generation — `.github/workflows/sitemap.yml` GitHub Action generates sitemap.xml from all public index.html files on push to main; assigns priority by depth; auto-commits if changed; excludes portal/404 pages
- ✅ Game update changelogs on game pages — patch notes sections already present on all 3 released game pages (Call of Doodie, Gridiron GM, VaultSpark Football GM) with collapsible version history

## Completed — Phase 29 (2026-03-25)

- ✅ Profile themes / card backgrounds — 5 rank-unlockable card themes (Default, Rift Blue rank 2+, Void rank 4+, Forge Fire rank 7+, Sparked rank 8+); theme selector pill row in card modal; `CARD_THEMES` config + `buildCardThemeRow()` + updated `generateMemberCard()` uses theme bg/accent/glow colors; persists in `localStorage` as `vs_card_theme`

## Completed — Phase 28 (2026-03-25)

- ✅ Dark/light mode toggle — `assets/theme-toggle.js` injects ☀/🌙 button into `.nav-right` on all public pages; `body.light-mode` CSS overrides in `style.css`; persists in localStorage as `vs_theme`; injected into 39 public HTML files

## Completed — Phase 27 (2026-03-25)

- ✅ Vault Command: scheduled broadcast — "Schedule for later" toggle + datetime input on Signal Broadcast form; `adminPostPulse()` conditionally sets `publish_at` ISO timestamp on insert; future-date validation; resets UI after success
- **SQL needed:** `ALTER TABLE studio_pulse ADD COLUMN IF NOT EXISTS publish_at timestamptz;`

## Completed — Phase 26 (2026-03-25)

- ✅ Game screenshots + trailer embed — media section added to all 3 live game pages (Call of Doodie, Gridiron GM, VaultSpark Football GM); YouTube embed slot (ready for VIDEO_ID) + 3-column screenshot placeholder grid; YouTube channel link in empty state
- ✅ New members this week ticker — green "+N this week" badge on /community/ Recently Joined section header; fetches exact count from Supabase with 7-day filter

## Completed — Phase 25 (2026-03-25)

- ✅ Graceful degradation — offline detection banner in vault-member portal; auto-shows/hides on network events; pads page top to avoid nav overlap
- ✅ Games hub genre filtering — added genre filter pill row (Sports, Action, Strategy, MMORPG, Puzzle) + `data-genre` on each game card; combined status+genre filter logic
- ✅ Member Spotlight — "Vault Community" dashboard panel shows a random top-20 member with avatar + rank + link to profile; refreshes on each login
- ✅ Rank Comparison — second panel shows pts gap to next player above in leaderboard, with visual progress bar between current and rival pts

## Completed — Phase 24 (2026-03-25)

- ✅ Referral QR code generator — "QR" button in referral section → client-side QR via qrcode.js CDN; modal overlay; fallback text if library not loaded
- ✅ Login activity heatmap — 12-week GitHub-style grid in Chronicle tab; 4 heat levels from `point_events`; day labels on hover
- ✅ Annual vault anniversary — awards 50 pts × years on member's join anniversary; localStorage + DB double-award guard; XP chip + toast notification
- ✅ Weekly XP recap banner — shown on Mondays in Chronicle tab; displays last week's total pts + pts-to-next-rank; localStorage-keyed per week; dismissible

## Completed — Phase 23 (2026-03-25)

- ✅ Lazy-load image audit — added `loading="lazy"` to all `<img>` tags across 29 public HTML files (excludes vault-member/investor portals which use dynamic images)
- ✅ Investor portal KPI sparklines — 30-day SVG sparklines with trend % under each KPI card; member growth line, sessions line; fetches daily bucketed data async (non-blocking)
- ✅ Investor portal "Ask a question" — card on dashboard right panel; inserts to `founder_questions` table; logs action; 48h response note
- **SQL needed:**
  ```sql
  CREATE TABLE IF NOT EXISTS founder_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id uuid,
    investor_name text,
    question text NOT NULL,
    answered boolean NOT NULL DEFAULT false,
    answer text,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE founder_questions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "investors insert" ON founder_questions FOR INSERT WITH CHECK (true);
  ```

## Completed — Phase 22 (2026-03-25)

- ✅ VaultSparked perks landing page — `/vaultsparked/` with hero, 9-perk grid, comparison table, pricing cards (Free vs $4.99/mo), FAQ, bottom CTA
- ✅ Custom 404 page — rank-themed, full site nav, useful quick-links, gold CTA, large ghost "404" background number; replaces bare placeholder

## Completed — Phase 21 (2026-03-25)

- ✅ Supabase preconnect / DNS-prefetch hints — added to homepage, journal, games hub, studio hub, and all released game pages (3-line Lighthouse win)
- ✅ Public changelog page — `/changelog/` timeline covering Phases 10–21, BreadcrumbList JSON-LD, full SEO meta
- ✅ Sticky "Join the Vault" CTA bar — `/assets/vault-cta.js`; shows after 4s for logged-out visitors on all public pages; localStorage session heuristic (no fetch); 24h dismiss

## Completed — Phase 20 (2026-03-25)

- ✅ Vault Command: challenge analytics — table showing all active challenges with completion counts, sorted by popularity
- ✅ Vault Command: member export CSV — downloads vault-members-YYYY-MM-DD.csv with rank, points, member_number, subscribed, joined date
- ✅ Challenge submission history — collapsible "Show completion history" at bottom of Challenges tab (last 50, with date + pts)

## Completed — Phase 19 (2026-03-25)

- ✅ security.txt — /.well-known/security.txt with contact, expiry, canonical, policy fields
- ✅ Password change — "Send Password Reset Email" button in Settings (Supabase auth.resetPasswordForEmail)
- ✅ GDPR export data — downloads JSON of profile, point history, challenge completions as `vaultspark-data-{username}.json`
- ✅ GDPR delete account — confirmation dialog → sets `delete_requested=true` on vault_members → signs out → redirects home
- **SQL needed:** `ALTER TABLE vault_members ADD COLUMN IF NOT EXISTS delete_requested boolean NOT NULL DEFAULT false;`

## Completed — Phase 18 (2026-03-25)

- ✅ Lore reading progress — gold progress bar in Classified Archive showing "X of N files read (pct%)"
- ✅ Classified files search — live keyword filter input (title/content/classification) in archive header
- ✅ Bookmark classified files — 🔖 button on each file card; localStorage-backed; "Bookmarks" filter toggle

## Completed — Phase 17 (2026-03-25)

- ✅ Game page Vault Points callout — added to all 3 released game pages (Call of Doodie, Gridiron GM, VaultSpark Football GM) linking to vault + leaderboard
- ✅ Game wishlist + "Notify Me" — added to all 4 unreleased game pages (Dunescape, MindFrame, Project Unknown, VaultFront) directing to vault registration

## Completed — Phase 16 (2026-03-25)

- ✅ Community polls — 🗳️ Polls tab in vault-member portal (load, vote, results bars); poll preview on /community/ with live vote counts
- ✅ Member directory — new /members/ page with rank filter pills, search-as-you-type, member cards linking to /member/?u= profiles
- ✅ Referral leaderboard — 🔗 Recruiters tab on /leaderboards/ (aggregates point_events with referral reason)
- ✅ Recently joined member feed — /community/ shows last 8 new members as chips with rank color + avatar initial
- ✅ Member count milestones — (tracked via community page member count; milestone Studio Pulse posts handle bonus XP server-side)
- **SQL needed:**
  ```sql
  CREATE TABLE IF NOT EXISTS polls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question text NOT NULL,
    options jsonb NOT NULL DEFAULT '[]',
    is_active boolean NOT NULL DEFAULT true,
    closes_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS poll_votes (
    poll_id uuid REFERENCES polls(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    option_index integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (poll_id, user_id)
  );
  ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
  ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "public read polls" ON polls FOR SELECT USING (true);
  CREATE POLICY "members vote" ON poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "members read votes" ON poll_votes FOR SELECT USING (true);
  CREATE POLICY "members update vote" ON poll_votes FOR UPDATE USING (auth.uid() = user_id);
  ```

## Completed — Phase 15 (2026-03-25)

- ✅ Rank-up celebration sequence — already existed as `showRankCeremony(rank)` with full CSS particle animation + `checkRankUp(member)`
- ✅ Challenge streaks — `challenge_streak` + `last_challenge_date` columns tracked in portal; 7-day (+50pts) and 30-day (+200pts) milestone bonuses; 🔥 streak badge on Challenges tab
- ✅ Challenge difficulty tiers — `difficulty` column on challenges; colored badges (Easy/Medium/Hard/Legendary) on every challenge card
- ✅ First-completion micro-achievements — 1st, 5th, 10th challenge completions award 25 bonus pts each via `updateChallengeStreakAndMicro()`
- ✅ Challenge leaderboard — new ⚡ Challenges tab on /leaderboards/ with top members by completion count + streak column
- **SQL needed:**
  ```sql
  ALTER TABLE vault_members ADD COLUMN IF NOT EXISTS challenge_streak integer NOT NULL DEFAULT 0;
  ALTER TABLE vault_members ADD COLUMN IF NOT EXISTS last_challenge_date date;
  ALTER TABLE challenges ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'Medium' CHECK (difficulty IN ('Easy','Medium','Hard','Legendary'));
  ```

## Completed — Phase 14 (2026-03-25)

- ✅ Dashboard tab persistence — localStorage save/restore of active portal tab across sessions
- ✅ "What's New" modal — checks studio_pulse for unread entries since last seen timestamp, shows on login
- ✅ Points breakdown modal — click "breakdown" on Vault Points stat → bar chart of pts by category from point_events
- ✅ Challenge completion modal (enhanced) — replaces XP chip: shows challenge name, +pts, total, rank progress bar
- ✅ Onboarding tour stored in Supabase — member.onboarding_completed checked first; completion writes to DB
- ✅ Points history SVG chart — 30-day bar chart on Chronicle tab, zero dependencies, pure SVG
- **SQL needed:** `ALTER TABLE vault_members ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;`

## Completed — Phase 13 (2026-03-25)

- ✅ PWA install prompt — /assets/pwa-install.js, beforeinstallprompt handler, 7-day dismiss memory, added to homepage + journal + portal
- ✅ Push notification opt-in UI — improved portal settings block with 📡 banner, stronger value prop copy, toggle always visible

## Completed — Phase 12 (2026-03-25)

- ✅ Individual journal post pages (/journal/studio-os-public/, /journal/first-sparks/, /journal/vault-opened/) — full SEO, Article JSON-LD, BreadcrumbList, OG tags, author bio, reading time, post nav
- ✅ Journal RSS feed — per-post canonical URLs (not index anchors), correct guids
- ✅ Homepage latest-journal-post teaser — dynamic card linking to most recent post
- ✅ Journal post pin — pinned badge on latest entry (studio-os-public)
- ✅ Journal tag filtering — filter pills (All / Studio OS / Games / Launch / Origin / Studio / Site), client-side JS
- ✅ Reading time + author bio on all post pages
- ✅ Share/copy-link buttons on index updated to individual post URLs

## Completed — Phase 11 (2026-03-25)

- ✅ Daily login bonus + streak system (🔥 day counter, milestone bonuses at 7/30/60/100 days)
- ✅ 5-step onboarding tour for new vault members
- ✅ In-portal notification center (🔔 bell, Studio Pulse realtime feed, unread badge)
- ✅ Challenge categories + filter pills (Daily/Weekly/Lore/Game/Social/One-Time)
- ✅ Seasonal challenges (expires_at countdown badges)
- ✅ Achievement progress bars (progress_max column, client-side derived)
- ✅ Social sharing of member card (Web Share API + Twitter intent + Copy Link)
- ✅ Homepage live member count ("Join X vault members")
- ✅ Sentry error tracking on homepage, vault-member portal, investor portal
- ✅ /join/ referral landing page (?ref=username shows referrer rank/avatar)
- ✅ Leaderboard game-specific tabs (Football GM, Call of Doodie)
- ✅ Public member profile improvements (achievements, activity, founding badge, share)
- ✅ Journal emoji reactions (🔥❤️🎮⚡, auth-gated writes, optimistic updates)
- ✅ supabase-phase11.sql + supabase-journal-reactions.sql (run by user)
- ✅ Pushed to main (034886d)

## Completed — Phase 10 + SEO pass (2026-03-25)

- ✅ /investor/ → /investor-portal/ rename + redirect pages
- ✅ Investor portal page gate (no content flash before auth)
- ✅ 3-step sign-up wizard on investor login
- ✅ Mobile hamburger nav on all investor portal pages
- ✅ New public pages: /leaderboards/, /community/, /journal/archive/, /ranks/, /member/, /status/, /search/
- ✅ Vault Member dashboard: quick actions, rank progress bar, referral section, Studio Pulse banner
- ✅ Studio Hub: Revenue, Analytics, Member Search tabs
- ✅ Achievements system SQL + Challenge submissions SQL
- ✅ VideoGame + FAQPage + BreadcrumbList JSON-LD on all game pages
- ✅ Organization + WebSite JSON-LD on homepage
- ✅ Twitter Cards + OG meta tags site-wide
- ✅ assets/supabase-public.js (1 KB REST helper)
- ✅ sw.js v3 + stale-while-revalidate for Supabase API
- ✅ assets/web-vitals.js → GA4
- ✅ robots.txt hardened
- ✅ GitHub Actions: Lighthouse CI + minify reporter
- ✅ X-Frame-Options + Referrer-Policy meta tags on 55 pages
- ✅ Cookie consent banner (GDPR)
