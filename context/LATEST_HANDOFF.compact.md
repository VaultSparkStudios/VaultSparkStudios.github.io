<!-- generated-by: scripts/compact-handoff.mjs v3.1 -->
<!-- source-hash: 36bdd3c084ba -->
<!-- generated-at: 2026-06-29T19:58:17.802Z -->

# LATEST_HANDOFF (compact)

SESSION: 236

SHIPPED (S236)
- Project pages entity schema via enrich-projects-schema.mjs (CollectionPage/Blog/WebApplication/SoftwareApplication on 4 pages); --check gated.
- Membership value calculator v2: PERK_GROUPS, animated tier bars, 12-month SVG trajectory, recommendTier(), RUM beacon value-calc:compute.
- LQIP coverage: 7 new leaderboard OG assets (208 total).
- Schema additions: Product Offers on /membership/, ItemList on /vaultsparked/, CollectionPage on /pathways/, WebApplication+SearchAction on /oracle/, WebApplication on /nervous-system/, Organization+sameAs on /press/, WebPage on /community/.
- check-schema-coverage.mjs gate: 16 pages whitelisted, @graph unwrap, allowNavOnly; wired into check-proof-surface.mjs.
- Data refresh: llms-full shards, oracle feed, build-sha.

TESTS/DEPLOY
- build:check EXIT 0; check-schema-coverage 16/16; check-proof-surface EXIT 0; check-deploy-tip passed.
- Pushed origin/main, deploy-trigger tip 2013546d (7 commits).

INTENT
- Saturate Unified Genius List via full /arc; close schema dead-zone class. Achieved.

NOW (top 3)
1. INP root-fix — only after data/inp-breakdown.json has real route samples.
2. Unique OG cards for duplicated social images.
3. VideoGame JSON-LD field completeness pass on individual game pages.

BLOCKERS (top 3)
1. INP root-fix data-blocked: data/inp-breakdown.json has zero route samples (Worker fix deployed S233; awaiting field traffic).
2. Advisory build warnings: VideoGame JSON-LD missing offers/applicationCategory/operatingSystem on some game pages.
3. Advisory: protocol-script absences, orphan shell assets.

HUMAN-BLOCKED (founder-gated, age ~3 sessions since S233)
- Forge-Window rename (108 pages).
- Changelog publish (founder voice).
- Push-first notification (0 subs).

NEXT SESSION: /start → re-check post-push CI, then begin INP root-fix only if inp-breakdown.json has real samples, else proceed to OG cards / VideoGame schema completeness.
