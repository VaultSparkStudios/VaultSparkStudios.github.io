# Latest Handoff
## Where We Left Off — S368 final · 2026-10-05

- Shipped (all live): /news/ full-text search + filters + shareable URLs (month-sharded index loaded on first search); full publish date+time on every Desk card and byline (`scripts/lib/news-publish-time.mjs`, ledger `data/news-desk/publish-times.json`); Desk Dispatch signup bar at the top of /news/ (#desk-dispatch) and a footer pointer that separates it from the Studio Dispatch; per-form Turnstile widget (the shared helper's single 12 s widget made signups fail); privacy/security/rights wording (D-S368.9); Eternal Credits Queue removed (ships with the next full promotion); daily digest armed by the founder (autoSend) with `BREVO_API_KEY` set.
- **Art autopilot (D-S368.10):** `scripts/desk-art-autopilot.mjs` generates, AI-reviews (Codex, strict rubric), re-rolls up to twice, ingests, pushes from a private worktree (`.cache/desk-art-staging/_wt`) and dispatches `desk-content-release.yml`. Windows task "VaultSpark Desk Art (nightly)" runs it daily at 07:45, 13:45, 19:45 and 23:45 UTC. Founder approved unattended push+deploy. **First real run not yet observed** — check `.cache/desk-art-staging/autopilot.log`.
- **Release path repaired:** desk-content-release had failed 3× ("archive file limit exceeded") because staging's baseline was stale; a full staging deploy plus content overlay re-stamped staging at main and run 37355155678 succeeded.
- Tools: `scripts/review-satire-batch.mjs`, `scripts/repair-evidence-graph.mjs` (now also diffs against the remote tip and retries report-only builders with --apply); propagate-nav skips nested checkouts.
- Visual QA receipt refreshed (84 captures). Old `.cache/desk-personas` worktree and `%TEMP%\vs-stage` removed (branch `codex/desk-release-record-final` kept).

- After that: JSON Feed carries real publish times; the autopilot live-checks published art; 46 stashes archived (`refs/stash-archive/`, restore with `git stash apply <sha>`) and the stash list cleared.

**Next:** confirm the autopilot's first scheduled publish (`.cache/desk-art-staging/autopilot.log`; first run 2026-10-06 07:45 UTC); Obelisk reply to Ark `01K44K376G48C0C29395D31FE9`; the Eternal-credits removal and other held portal changes ride the next full-site promotion; a full `npm run build:check` has not run this stretch.

## Where We Left Off — S368 continued · 2026-10-04 UTC

- Shipped: Desk banner art restored for 58 stories; two-image stories with 95 reviewed satire cartoons; hybrid AI & Synthetic Intelligence (SI) positioning with `/synthetic-intelligence/` and `/ai-vs-si/`; four-story AI→SI Desk special report; 55 garbled facts repaired; staging deploy path-list fix.
- Tests: Desk checks green (claim parity exact, AI disclosure 116 pages, article layout 101, art currency ok); csp-audit 263 files; content coherence 258 pages; footer contract; sitemap 213 routes; self-tests for every touched script. Full `npm run build:check` was not run this stretch; pushes passed the pre-push evidence-graph coherence.
- Deploy: deployed to production — Pages run 37240419736 (serving `main` incl. `70235a513`); staging content lane verified 1,146 overlays.

**Outcome:** Founder asked why Desk art stopped, then for satire cartoons (one banner + one satire image per story, caricatures of public figures allowed), then for a hybrid AI/SI studio identity plus Desk coverage of the federal AI→SI rename. All shipped and verified live. Rulings D-S368.7 and D-S368.8.

**How the Desk art loop works now:** CI publishes a procedural fallback; the nightly Windows task "VaultSpark Desk Art (nightly)" runs `node scripts/generate-news-art-codex.mjs` (banner then satire) and only stages; a human/agent reviews each image and ingests with `--reviewed <id>@<sha16>` (satire adds `+caricature|+none`). Re-rolls need the new hash. `check-desk-art-currency` alarms at 48h (banner) / 7 days (satire, stories since 2026-10-03).

**Post-closeout follow-through (same day):** the six fallback stories got per-story `visual.satireDirection` art direction plus a general prompt rule (no extra real people or look-alikes, no mascot logos, landmarks from the story's country); all six plus today's new story were reviewed and are live. New tools: `npm run desk:satire:review` (`scripts/review-satire-batch.mjs`) and `npm run repair:evidence` (`scripts/repair-evidence-graph.mjs`). Obelisk follow-up Ark `01K44K376G48C0C29395D31FE9`. The pre-closeout stash was compared file by file against main (nothing unique except two untracked Sep 30 perf traces, restored byte-exact) and dropped.

**Founder-delegated cleanups (D-S368.9, 2026-10-05):** privacy names Brevo; /security/ sign-in wording corrected to Obelisk; /rights/ Supabase label — live. "Eternal Credits Queue" section removed from the portal (credits are notOffered) — committed, but `vault-member/portal-dashboard.js` is not content-lane promotable, so it ships with the next full-site promotion (held for identity). `BREVO_API_KEY` GitHub secret set from the gateway. Today's digest (2026-10-04) rendered and reviewed: disclosure, unsubscribe, address, links all correct.

**Next:**
1. Founder: set `config/desk-dispatch.json` to `{"autoSend": true, "approvedTestIssue": "2026-10-03"}` (the agent's edit was refused by the safety classifier); the 23:30 UTC cron then sends to list 3. Sign up once at /news/ in a real browser (Turnstile stops headless browsers, as designed).
2. Watch for Obelisk's reply to Ark `01K44K376G48C0C29395D31FE9` (reopen signup + test identity → login E2E).
3. Publisher drift cascade (deferred) and QA accounts in public standings carry over.

## Where We Left Off — S368 · 2026-10-02 UTC

- Shipped: 23 of 25 audit items across 8 groups — membership truth, Season 1 repair, security, invite-led doors and registry truth, page merges and new pages, portal loop, experience and AI, The Desk.
- Tests: unit 325 pass (26 declared = executed = tracked); build:check passes all 517 steps; mobile audit 215/215; theme-matrix receipt bound to the final candidate.
- Deploy: deployed to production — Pages run 37141771070 (live build e3bcdfd0c), Worker run 37142181770, staging refreshed (342 overlays), all S368 migrations incl. column revokes, 7 edge functions

**Outcome:** Founder-requested full audit refresh (`docs/AUDIT_2026-10-02.{json,md}`, four-zone page pass) implemented in one session, plus two mid-session founder requests (Desk personas; Desk signup everywhere). Founder rulings D-S368.1–6 recorded.

**Live already (founder-authorized):** Supabase migrations `supabase-s368-{season-1-repair, ignis-meter-model-pricing, ignis-cache-privacy, caller-trust, recruiter-leaderboard, ask-vault-usage, membership-checkout-integrity}` (pre-images in `.cache/supabase-preimage-*`); edge functions ask-ignis v18, semantic-search v5 (Ask the Vault), create-checkout v27, stripe-webhook v30, create-gift-checkout v23 (410), eternal-intelligence v9, subscribe-desk-dispatch (verify 6/6). Live probes: anon cache read and weekly-score refused (42501), Season 1 active with standings, Ask the Vault cited answer / free no-answer / cache hit.

**Membership (D-S368.1):** Free / VaultSparked $4.99 / VaultSparked Eternal $29.99, monthly only; enforced perks only; gift hidden. Server refuses a second subscription (409 → billing portal), claims phase slots on payment, rejects annual.

**Found and fixed:** `award_season_xp()` referenced missing columns, so every score, session and challenge insert had been rolled back (challenge_submissions never held a row). A public read policy exposed `ignis_response_cache`. `reserve_phase_slot` and gift inserts were callable by anyone. supabase-js builders have no `.catch` (portal start-up and account deletion were silently broken).

**Next:**
1. Founder: approve a Desk Dispatch test issue (`node scripts/build-desk-dispatch-digest.mjs --test-to <you> --date <today>` once that day's pages are live), then set `config/desk-dispatch.json` `autoSend: true` + `approvedTestIssue`, and `gh secret set BREVO_API_KEY` (gateway capability `brevo`).
2. Done: column-revoke migration applied after the site deploy (anon teams.invite_code now 401).
3. Obelisk Ark `01K3SH847CF5020D9D7209EB07` (no reply): reopen signup + test identity → flip invite copy (one constant in propagate-nav + data-vs-join CTAs) and build login E2E.
4. Founder review recommended: legal hosting wording (privacy/security/rights/terms) and the "Eternal Credits Queue" heading in Eternal Dispatch.
5. Publisher drift cascade (deferred audit item); QA accounts appear in public season standings.

## Where We Left Off — S367 · 2026-10-01 UTC

**Outcome:** Founder-requested whole-site audit with a baseline test sweep, then the security-and-truth core. `docs/AUDIT_2026-10-01.{json,md}` holds 22 ranked items with statuses and execution logs; founder approved all gated areas for later sessions.

**Shipped (local, pending deploy):** canon-true statuses everywhere (Call of Doodie, PromoGrind, Velaxis are FORGE; playable FORGE games labelled "Playable Beta"); HMAC CSP nonce; edge-side compatibility token renewal; settings dead link fixed; price coherence guard; public copy sweep; derive-game-index corruption fix; mobile hero badge overlap fix; Desk presence "avg avg" fix; stale tests repaired.

**Found and routed:** Obelisk production enrolment is invite-only, so strangers cannot join; /vault-member/ now says so and Obelisk was asked via Ark to reopen. Lifecycle redefinition (FORGE includes beta; SPARKED = finished, announced, with a launch kit and posting cadence) shipped to studio-ops.

**Blocked:** real-login E2E needs an Obelisk test identity; the Sparked-renders-as-free test failure needs an authorized read of the test subscription. Homepage Lighthouse item closed on fresh evidence (three hosted passes on 2026-10-01).

**Staging (post-push):** static tree deployed (receipt `ecfa155695f022d56f48c8f6`, rollback 20261001231043). The first staging Worker upload was rejected by Cloudflare (10021: random generation at global scope in the new nonce key); nothing deployed. The key is now minted lazily inside the handler, a regression test with a negative control guards it, and staging Worker version `622f7ba7` serves keyed nonces. Staging does not apply `_redirects` (`/ranks`, `/join` also 404 there), so the settings 301 is production-only until staging parity covers redirects.

**Next:** production Worker deploy for the nonce once the promotion gate allows; observe Ark replies; continue the audit's pending items in plan order.

## Post-S366 Desk archive release · 2026-10-01 UTC

PR #134 merged as `f338ade085`; its 153-path archive release passed hosted checks and staging/production parity. The hub remains below 200 KiB and now links August, September and October archives with all 90 stories. A later scheduled publisher succeeded but its release failed on an unreachable staging commit; a recovery exposed 24 missing Desk allowlist paths, and the next recovery found an October archive absent from staging. Main fixes `584d86957`, `eb94a31aa` and `5ded8c0de` expanded the shared allowlist, use an ancestral production fallback, restage the full candidate slice, and keep held Pages runs from finalizing. The root-owned staging receiver rules were updated from the reviewed config with a rollback copy retained. Recovery workflow `36835514861` and child Pages run `36835622726` passed. Production head `285acb9eca4deca8fec78502e860063469f8aa80` matched 159/159 candidate paths, including all 153 preceding paths. The canonical hub, October archive/story and REX/MICA profiles returned 200; desktop/mobile browser smoke passed. Full-site identity/provider promotion remains held. Next: observe a successful scheduled publisher-to-release run after the fix, and add a month-rollover fixture and explicit prior-overlay set check.

## Post-S366 Desk persona release · 2026-09-30 UTC

Eight fictional correspondent profiles are live after PR #132 merged as `91116c423` and the 147-path content-only Pages deploy `36791903046` passed. Each profile has a generated portrait, vector mark, editorial voice, beat, boundary notes and a feed linked to published contributions. MICA covers creative tools, games and media and explicitly has no published reports yet. The late-night edition has 89 stories and feeds VERA's current profile. Canonical staging and the public Pages origin matched all 147 released paths exactly; REX, VERA and MICA canonical routes returned 200. The full-site identity/provider hold remains in force. The root `main` worktree had independent local changes and was not reset; this work used an isolated worktree.

Release evidence: 506 build checks, 215 mobile cases, 70 reviewed captures and hosted gates passed. The 147-path release preserved all 124 prior Desk paths. Follow up on overlay automation, profile freshness and Pages limits; full-site promotion remains held.

## Where We Left Off — S366 · 2026-09-30 UTC

**Post-closeout verification, 2026-09-30:** Scheduled Desk authoring runs `36679345071` and `36716077242` each triggered the automatic staging-first release (`36679807164`, `36716493332`), and both release runs passed. The first scheduled CI Health Monitor run `36695299391` caught a checker error: it searched one article for every fact from that UTC date, including facts belonging to other stories. Commit `ed6d294db` scopes fact receipts to the selected story. Hosted rerun `36750321612` passed live-route/Desk assurance and scheduled-workflow health. Hosted E2E and compliance passed together in `36747372651`; hosted Lighthouse `36741037407` passed all nine route tiers. The full-site production promotion hold still applies.

**Outcome:** The September 29 Robinhood HOOD Summit feature is live at `/news/2026-09-30/robinhood-hood-summit-2026-agentic-trading-analysis/` and leads the homepage. It includes the in-app agentic trading upgrade, human approval and funding controls, weekend equities plans, crypto perpetual futures, earnings contracts, Social, and a clearly hypothetical VaultSpark Studios role. The event date and UTC publication date are distinguished.

The founder approved a restricted, content-only automatic release path. Four scheduled Desk authoring slots already existed; the new `desk-content-release.yml` runs after a successful publisher, validates the Desk corpus, deploys allowlisted content to canonical staging with a forced-command key, verifies all production candidate routes byte for byte, and dispatches `pages-deploy.yml` at the pinned reviewed commit. Recovery workflow `36663473926` and production workflow `36663563135` both passed. Production metadata records 109 paths, baseline `c46f22fa36d52901e505f2a99433cef9276fbbd0`, and candidate head `dc86372c6b665cb5cf02bbb075c85fac0640c351`. Live homepage, article and art returned current content. Full-site and identity holds stayed in place.

**Next verification:** Observe the next successful scheduled News Publish run and ensure its `workflow_run` starts this release workflow; the manual recovery dispatch proved the stages but did not exercise that trigger. Monitor Desk overlay size and reset the deployed baseline through the normal reviewed release path before the archive grows too large. No local staging private key remains; the CI credential is in GitHub Actions secrets and the staging account is restricted to the Desk receiver.

**Assurance follow-up:** Daily CI Health Monitor now has a read-only surface job: 232 local HTML files, 201 live sitemap routes, eight public files, newest Desk feed/claim/article/art/homepage parity, edge liveness, and 15 Chromium journeys/theme tests. Hosted manual run `36667110751` passed both jobs. Desk automatic release adds the existing disclosure, fact, copy and stats checks plus the local crawl before staging; the skipped-plan guard now uses an explicit yes/no output. Observe the first scheduled assurance run as well as the first scheduled publisher-to-release trigger.

**Closeout gate repair:** The five most recent E2E/compliance runs were failing at `check-startup-context-budget` because a completed historical task-board block was still live. `rotate-taskboard.mjs` archived it without deleting open work; the local budget check now passes with zero rotatable blocks. Recheck the hosted gate on the pushed SHA. The latest homepage Lighthouse run measured 0.73 below the unchanged 0.76 longtail floor, so full-site promotion remains held pending fresh passing evidence. The Summit story and homepage lead are already live through the verified Desk-only release; no new production content is required from the closeout records.

**Closeout build follow-up:** The gate then found the IGNIS ROI feed's September 9 source date older than its 21-day publisher ceiling. The ledger itself has no newer usage. `generatedAt` remains the source date, while a new `rebuiltAt` records the scheduled generator's execution; the trust-feed gate now measures publisher health separately. Focused generator and trust-feed checks pass. The complete local build gate subsequently passed 505/505.

**Refreshed browser proof:** Local mobile audit passed 215/215; a new 42-capture homepage/News/Summit seven-theme desktop/mobile matrix was inspected, and receipt-ordering, visual-review and proof-surface checks pass. A scheduled publisher advanced main during closeout; the candidate was rebased and the rendered matrix was recaptured and reviewed against that tree. The mobile receipt is local and the hosted workflow generates its own. Hosted checks still need the pushed SHA.

**Gate reachability:** The ROI generator's reviewed evidence-contract hash was updated after its source change. The live surface checker and staging Desk parity now declare their actual scheduled/content-release scopes; pure self-tests are reachable in the local build gate. The census passes 254/254 build-scope checks and 325/325 self-tests. The final local full build passed **505/505** on September 30. Recheck hosted CI on the pushed SHA.
## Where We Left Off — S365 · 2026-09-29

**Session intent:** `/arc` on the public website, with direct main commits and staging-first production deployment already authorized.

The audit's three Desk items are shipped: semantic publisher-body extraction, correction and prevention of page-chrome facts, and the unchanged 0.90 article Lighthouse floor. The article now puts the story and sources before its illustration; the first mobile viewport sends no illustration request. Hosted Lighthouse local and staging passed (`36629194379`), as did E2E and compliance (`36629194109`). Local mobile 215/215 and CANON-053 visual review 168/168 passed.

Staging receipt `eb48a702c8d5cf87b330e334` is served and verified at depth 87; the settled release ceremony passed 11/11. Production content-lane workflow `36631405999` deployed 385 content-pure paths over baseline `353c8e17d98a6b75413ac01a209f51cbbcfa0b06`, with 375 other paths withheld. Live Pages metadata names head `c46f22fa36d52901e505f2a99433cef9276fbbd0`; the public article returns 200 in reader-first order. The identity and Worker identity holds remain in force and were not promoted.

Next: monitor the next three article Lighthouse runs. Fix staging-deploy continuity sequencing so a ceremony started immediately after deploy cannot read the prior summary. Real signup email delivery remains unverified and still requires explicit send authorization.

Closeout also fixed the standalone build-check entrypoint's known step-81 Oracle sanitization drift and rotated the work log at its size cap. The full build gate passed 505/505 twice before closeout. The automated late-night Desk edition landed on main after the initial content release.

The post-closeout hosted compliance run found two new edition art files missing from `data/lqip-map.json`: the Desk publisher derived the map before staging its new art, while the map generator scans Git's index. The map is regenerated, the publisher now stages art before map derivation, and its ordering guard passes. The corrected tree passed the full 505/505 local build gate and hosted E2E/compliance. A fresh Lighthouse local rerun passed after one isolated `/community/` dip.

The Desk's four scheduled slots ran successfully on 2026-09-29. Canonical staging served the late-night homepage and article through the scoped content lane; production run `36648112113` promoted 125 content-pure paths. The live homepage lead, News index, and late-night OpenAI article now match, with content head `90a79ff6a7afabf966efa8a0bd03bd2facb15314`. Future daily live updates are a release-policy decision: `confirm_content` is deliberately manual and CI has no staging deploy credential. Do not silently bypass that interlock or the identity/full-site holds.
