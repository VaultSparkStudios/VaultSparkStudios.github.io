<!-- generated-by: scripts/compact-handoff.mjs v3.1 -->
<!-- source-hash: f8e00ac51e3d -->
<!-- generated-at: 2026-07-26T21:42:22.811Z -->

# LATEST_HANDOFF (compact)

SESSION 294 HANDOFF SUMMARY

Session
- Number: 294. Date: 2026-07-26.

Shipped
- Root-caused and fixed broken Franchise Architect page: wrong `<base href="/games/franchise-architect/">` in franchise-architect/{index,game,404}.html; assets live in /franchise-architect/. Broken since S284 slug rebrand.
- Browser-verified fix at 1280px/390px: 0 failed requests, 0 console errors.
- New gate check-base-href-resolution.mjs (14/14): resolves relative refs through <base>, asserts targets exist.
- Play-CTA routing implemented per founder directive: Play CTA -> liveUrl (playfranchisearchitect.com); all other links -> landing page. 20 CTAs synced to registry. New gate check-play-cta-registry-sync.mjs (16/16).
- Fixed dead Call of Doodie /call-of-doodie/ 404 link; explicitly set vaultStatus:"sparked" to preserve net-zero public diff (6 live/14 forge).
- Built content-hotfix lane in pages-deploy.yml: rebuilds production tree, overlays allowlisted content only. scripts/check-content-hotfix-gate.mjs (36/36). Deny-by-default; blocks JS/mjs/sw.js/headers/auth/member/investor/cloudflare/supabase/config.
- Dispatched hotfix (run 30220133234): /franchise-architect/ now live and styled on apex.

Current Intent
- Ship a static public-page fix without releasing the unrelated Supabase-gated production hold, via the new hotfix lane.

Now (top 3)
- Dispatch remediation hotfix including shell asset assets/nav-sheet.shell-d06b2465a0.js (fixes 404 from stale nav-sheet reference on 3 repaired pages).
- Re-probe Supabase authority; apply migration/function when ready.
- Await founder decision on content-only hotfix lane (D-S294.3).

Blockers (top 3)
- Production 143 commits / 2.3 days stale; promotion gate held on 5 credential-gated conditions.
- `gh workflow run pages-deploy.yml -f confirm_production=true` is a no-op under current hold (context/PRODUCTION_PROMOTION.json hold:true); do not offer as a lever.
- Identity interlock still reports hold; hotfix lane cannot promote the 400+ file backlog.

Human-Blocked (with age)
- Clear/accept production hold before Worker restoration: ~13.3 days open (per S293 ledger), still standing.
- Provide Supabase management/db/function authority for fjnpzjjyhnpmunfoycrp: carried since S291+ (~3 days+).

Trust Notes
- A patch-style hotfix is safe only if its transitive asset references also exist in the baseline tree; gate now enforces this.

Next session: dispatch the shell-asset remediation hotfix, then re-probe Supabase and await the founder hotfix-lane decision.
