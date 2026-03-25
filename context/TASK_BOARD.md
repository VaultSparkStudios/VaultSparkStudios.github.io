# Task Board

## Now

- Nothing active.

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

- [ ] Game-specific challenge + point triggers (Football GM → Vault points) [8]
- [ ] VaultSparked perks landing page (/vaultsparked/) [7.8] — public conversion page for the subscription, shareable
- [ ] Custom 404 page with rank theme + useful links [7.8] — GitHub Pages supports /404.html natively
- [ ] Game screenshots + trailer embed on game pages [7.5]
- [ ] Dynamic OG image generation per page [7.5]
- [ ] GDPR: export your data + delete account flows [7.5]
- [ ] Challenge submission history view (when each challenge was completed, in Challenges tab) [7.5]
- [ ] Sticky "Join the Vault" CTA bar on public pages for logged-out visitors [7.5]
- [ ] Vault Command: challenge completion analytics (completion rate, most popular categories, zero-completion challenges) [7.5]
- [ ] Preconnect / DNS-prefetch hints for Supabase CDN + analytics [7.5] — 3-line Lighthouse win
- [ ] Lazy-load image audit (add loading="lazy" to all below-fold images) [7.5]
- [ ] security.txt (/.well-known/security.txt) [7] — < 10 lines, signals security maturity
- [ ] Password change + email change in Settings [7]
- [ ] Supabase query batching in portal (consolidate sequential SELECTs into RPCs) [7]
- [ ] Public changelog page (/changelog/ — what shipped each phase, written for members) [7]
- [ ] Google Search Console + Bing Webmaster verification + sitemap submission [6.5]
- [ ] WebP/AVIF image audit + conversion [6.5]
- [ ] Graceful degradation on Supabase failure (offline states, error UI) [6.5]
- [ ] Profile themes / card backgrounds (rank-based unlockable styles) [6.5]

## B-Tier Backlog (Score 5–6.9)

- [ ] Annual membership anniversary reward (auto-grant XP + badge on 1-year vault anniversary) [6.8]
- [ ] Weekly XP recap in notification center (Monday digest: XP earned, pts to next rank) [6.8]
- [ ] Login calendar heatmap (GitHub-style activity calendar on dashboard) [6.8]
- [ ] Gift subscriptions (Stripe) [6.8]
- [ ] Member-to-member point gifting [6.5]
- [ ] Fan art submission form (upload → Supabase Storage → moderation queue in Vault Command) [6.5]
- [ ] Vault Command: scheduled broadcast (set Signal Broadcast to publish at future time) [6.5]
- [ ] Co-op / team challenges [6.5]
- [ ] Dark/light mode toggle [6.5]
- [ ] Investor portal: KPI trend sparklines (30/60/90-day MRR + member growth) [6.5]
- [ ] Sitemap auto-generation (GitHub Action) [6.5]
- [ ] Vault Command: member export CSV (username, email, rank, points, joined date) [6.3]
- [ ] Referral code QR generator (client-side QR for member's /join/?ref= URL) [6.3]
- [ ] Investor portal "Ask a question" form (contact form → Edge Function → founder email) [6.3]
- [ ] Game update changelogs on game pages [6.3]
- [ ] Journal post view count (journal_views table, deduplicated, shown on cards) [6]
- [ ] Team/about page expansion [6]
- [ ] Fan art voting / gallery contests [6]
- [ ] Multi-admin support (is_admin column) [6]
- [ ] Login activity log [6]
- [ ] RLS policy audit (investor_requests + challenge_submissions) [6]
- [ ] Game rating (star ratings from vault members + AggregateRating schema) [6]
- [ ] Axe-core accessibility audit in CI [6]
- [ ] Investor data room access log [6]
- [ ] Community event RSVP [6]
- [ ] Member spotlight widget on dashboard [6]
- [ ] Games hub filtering/sorting (by genre, status, platform) [6]
- [ ] Monthly investor update email (automated digest) [6]
- [ ] Rank comparison ("You are X pts behind [member]") [5.5]
- [ ] New members this week ticker on /community/ [5.5]
- [ ] Rate limiting on invite code claims [5.5]
- [ ] Audit log for admin actions (broadcasts, key drops, file uploads) [5.5]
- [ ] Lighthouse CI score gate (fail build if performance < 90) [5.5]

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
