<!-- generated-by: scripts/compact-handoff.mjs v3.1 -->
<!-- source-hash: b7789eb8e6e2 -->
<!-- generated-at: 2026-08-16T06:19:28.414Z -->

# LATEST_HANDOFF (compact)

Session 317 · 2026-08-16 · Founder-reported bugs → 7 defects fixed + 5 broken gates repaired

Shipped

- Reactions endpoint deployment gap (404/403 → 200/204 via identity lane); `worker-route-provenance` honesty fix to stop laundering outages
- Signal labels corrected: `storyBadge` now reads `day.leadSlug` not `story.kind`; symmetric "Today's lead" / "The quiet story" across hub/article/feed
- Per-article statistics: pageload counter (no `ux` key), `averageEngagedSeconds`, `attentionRatio`, `idleBands` (coarse bands only, not wall-clock durations)
- Reader reactions aggregated from KV into committed corpus via `build-news-desk-reactions.mjs`; published to `/news/directors-report/` with `state: "reset"` on storage loss

Gates repaired

- `generate-news-pages --check` and `build-news-desk-engagement --check` lived only in unused `news:check` script; moved to CI. build:check 295→302
- `refresh-live-data.yml` staged only `api/`, discarded re-rendered article pages every run
- `clean-stale-shells` reference map covered only HTML; JS bundle reference unmarked for deletion

From console log (all real)

- Social icons 404'd on articles; depth-3 chrome re-base relative paths
- `journey-conductor.js` 404'd since S306 (predicate-loaded, unpromotable); now hash-named
- Startup brief used raw UTC vs studio calendar (−20:00 ET offset); UNMEASURED meter rendered as "CLOSEOUT ← act now"

Current state

- Both new surfaces read 0 above their floors (reactions endpoint just online, engagement has 6 pageloads vs 5-floor); pages correctly suppress until filled
- Idle bands validated end-to-end but never observed in real session yet
- `ambient-core` bundle hash rotated (one-time 66KB re-download for returning visitors)
- Stale `Link:` preload header still live; blocked by content-lane restrictions

Top blockers

- Gate for new surfaces to cross their measurement floors over days (reactions, engagement, idle bands must prove in production)
- Cloudflare `requestPath` GraphQL dimension needs introspection proof before publishing as separate labelled stat
- Full-site Pages deploy needed to update `_headers` preload (content lane blocks it)

Now-bucket

- Monitor reach/signal numbers over 3–5 days; confirm they cross floors and render real content
- Complete Reader-signal → Director's Report closure with ranked table and "You asked → Desk changed/filed" receipt
- Verify Cloudflare `requestPath` dimension availability and publish as per-article bot classification

Exit codes: build:check 302/302·0, Playwright 23/23, Worker 43/43, self-tests 53/53, probes 200/204, doctor blockingFailing 0.

Next: Wait for measurement floors to cross, then resume ranked-table rollup for director's report.
