# Latest Handoff — Session 315 (2026-08-14)
## Where We Left Off

S315 implemented the complete Cloudflare analytics expansion and the founder's added Desk engagement requests. The public project report now explains its measurement boundaries; `/stats/ecosystem/` separately explores the entire Studio ecosystem; and every generated Desk illustration has its own Like/Fire/Laugh/Wow panel plus privacy-bounded live-reader and engaged-time states. Source is ready for an identity-isolated content release, while Worker-backed writes remain deliberately undeployed under the unchanged full-site identity hold.

## What shipped

- Account- and zone-level Cloudflare GraphQL ingestion across 29 active zones, provenance-bearing history, complete-day windows, bot/human separation, and a scheduled pull workflow with its GitHub secret configured.
- A divided ecosystem analytics surface with production/staging/internal partitions, 19 project states, filters, coverage denominators, and machine-readable feeds.
- Per-generated-illustration reactions and per-article live presence / visible-and-focused reading-time measurement, with short-lived hashed sessions, identifier-free persisted summaries, dedupe, rate limits, and sample suppression.
- Nightly rollups, public/agent discovery contracts, Lighthouse tiers, content-addressed assets, and rendered-pixel coverage across all seven themes and both viewports.

## Verification and release truth

Validation is green: canonical `build:check` passed 295/295 from step one (authoritative receipt: `api/build-check-diagnostics.json`; plan `d808a9610d8b1a4e18defbb4`; source `e71cc9478c5293283a4c0d8e`). Playwright/Axe passed 32/32, Worker units 42/42, the manually reviewed visual receipt 56/56, News pixel proof 42/42, public-contract health across 85 files, shell/service-worker coherency, News derivation/disclosure/allowlist checks, and repository lint across 1,993 files. Local mobile traces record `/stats/` LCP 252ms / CLS 0, `/stats/ecosystem/` LCP 228ms / CLS 0.0091, and the touched Desk article LCP 412ms / CLS 0.

## Honest dark / deployment boundary

The available analytics token reads all active zone/account analytics but lacks the separate Account Settings permission needed to inspect or activate Web Analytics Site Info for the main domain. The feed therefore reports that project metric as unobserved rather than substituting RUM or ecosystem totals. The new Worker routes are source-tested but remain outside the safe content lane; production reactions/live presence will stay unavailable until the existing Obelisk/full-Worker release hold is legitimately cleared.

## Start here next session

1. Add the narrow Cloudflare Account Settings capability, verify the main-domain Web Analytics tag, and bind that activation to a public-safe receipt.
2. Once the Worker can deploy, prove real KV/R2 writes and connect sample-gated reaction/reading aggregates to the Director's Report.
3. Build the claim-evidence relationship map and agent critique packet; then close field-vitals observed-through freshness.

---
# Latest Handoff — Session 314 (2026-08-13)
## Where We Left Off

S314 completed the full /start → /audit → /implement all → release arc. All ten ranked audit items are shipped. Source is on main; canonical Hetzner staging and Cloudflare production content are verified. Final production workflow 31739144442 is green. Live content receipt cc5d67845b37e33b2ecc6d34031051103ddf2af4e29d226d118b7f8e262bd2f7 reports exact content, release head 00eed5089, 240 promoted paths, and continuity depth 6.

## What shipped

- Public Analytica at /stats/ + /stats.json, homepage evidence cards, source dates, denominators, privacy/small-sample honesty, and agent discovery.
- Relationship-aware News art validation, honest reaction delivery states, hero-choice denominators, and a keyboard/screen-reader complete mobile modal.
- Forty-two manually reviewed, hash-bound captures across seven themes and touched desktop/mobile states.
- Positive served-surface manifest, validated discovery micro-lane, lane-aware content identity, durable release history/continuity, and 10× faster measured proof orchestration.

## Verification and release truth

Canonical build passed. The final authoritative build:check passed 295/295 from step one on the rebased tree (receipt 16cd2fe9841849b708b166cc; plan d808a9610d8b1a4e18defbb4; source 605799bc86af12761cf08cfa). That final gate caught and closed the Stats social-card and breadcrumb contracts plus three undiscoverable visual-review helpers before certifying the tree. Touched browser behavior passed 26/26 locally, 26/26 on staging, and 26/26 on production. Stats/home AA contrast passed in all seven themes. The mobile navigation focus test passed 45/45 across five repeats after the late-node inert mutation fix. Throttled local metrics: homepage LCP 972ms / CLS 0.0364; Stats LCP 840ms / CLS 0. Full npm test exceeded the 20-minute local bound and is not reported green.

## Start here next session

1. Build the claim-evidence relationship map and public-safe agent critique packet.
2. Close field-vitals observed-through/stale-days truth and obtain a fresh post-S262 RUM comparison window.
3. Keep the full-site identity release held until the deferred Obelisk Passport v2 / real-provider journey is deliberately taken up.

---
# Latest Handoff — Session 313 (2026-08-12)

## What shipped and is live

The Desk no longer uses generic stick-figure templates for its published corpus. All seven stories have distinct, article-specific editorial scenes generated from their real source material, with deterministic captions and persona treatment layered at build time. /news/ now leads with the sourced-news/satire promise and art-led story cards. Every News hub/story head explicitly declares /assets/icon-32.png, /assets/icon-256.png, and /manifest.json.

Release commit c8bbef76 reached production through content-lane run 31568997720 after canonical and URL-keyed cache purges. Live probes confirmed the new description, all seven stories at HTTP 200, art and icon assets at HTTP 200, source masters at HTTP 404, and feed provenance generated_art=true / factual_evidence=false. Representative live AVIF bytes equal the candidate (SHA-256 prefix aafd7f908717).

## Verification and follow-up

News self-tests passed 133/133; the full authoritative suite passed 295/295 for the release candidate; 42 rendered states cover three routes, seven themes, desktop and mobile; staging browser metrics across six route/viewports measured LCP 32–108 ms, INP 0, CLS 0. The first post-release E2E compliance job found stale generated Vault Momentum and dependent intelligence artifacts, not a News defect. Those artifacts are refreshed in the follow-up, and pages-deploy now runs scripts/check-live-news-release.mjs whenever News is promoted so a purge/200 can never stand in for exact candidate-byte proof again.

## Start here next session

1. Keep the article-bound contract: every new story needs unique source art, three exact anchors, institutional target/setup/payoff, and scene-specific alt text.
2. Implement semantic caption/art parity scoring and a durable append-only News release receipt.
3. The unrelated full-site Obelisk real-provider hold remains unchanged; continue using the identity-isolated content lane for editorial releases.

---
# Latest Handoff — Session 312 (2026-08-11)

## What shipped

The Desk now has proof that the light formats can carry the product, not just exist in a format table. S312 added two real 2026-08-11 stories:

- Roast: `/news/2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone/`
- Signature Bit: `/news/2026-08-11/the-agent-budget-has-a-blindfold-line-item/`

Both use primary-source facts, both render through the normal generator, and both feed the News JSON, claims ledger, and stats artifacts. No prediction was bolted on for a format that does not need one.

## Verification

Full `npm run build:check` passed 295/295 with receipt `cf774febfdc668dae34a51bf`. Focused News checks passed: desk rebuild/check, generated pages, stats coherence, AI disclosure, image formats, base href resolution, and `scripts/check-news-visual-proof.mjs` across 42 route/theme/viewport captures.

CANON-053 note: the local `view_image` path failed under the Windows sandbox (`CryptUnprotectData`), so the receipt records programmatic pixel inspection rather than pretending an eyeball pass happened. The verifier checks HTTP 200, visible required text, no horizontal overflow, screenshot dimensions, and nonblank pixel variance.

## Deployment truth

Staging is updated through the identity-isolated content lane: `deploy-staging-content --baseline 9527f22714e75667a766e331b59cdd29400fe07e` verified 208 overlays and 5 safe removals on `https://website.staging.vaultsparkstudios.com`, identity untouched.

Production still must use the content-lane dispatch over the served baseline `4a72961d85791d56629f1acdea797dbe04e50bed`. Full-site promotion remains held by `real-provider-e2e-pending`; do not use that hold to ship unrelated Worker/auth code.

## Start here next session

1. Confirm production content-lane run and live-probe both new story URLs plus `/api/news-desk-feed.json`.
2. Keep the Roast/Signature Bit cadence alive; the archive now proves the formats once, not forever.
3. The unchanged auth blocker remains the Obelisk Passport v2 migration / real provider journey.

---
# Latest Handoff — Session 310 (2026-08-11)

## What is live

**The Desk's numbers are computed, not asserted.** `lib/news-stats.mjs` derives every published figure into byte-checked `api/news-desk-stats.json`, which the renderer reads — page and feed cannot disagree. Per-article and desk-wide panels, both live-probed 200. Accuracy renders **"Not yet — a record needs 4 before it means anything"** instead of a percentage off a thin sample.

**"The desk disagrees" is gone**, on the founder's flag. It was TRUE on the two stories where it appeared, and meaningless on the other three, which have a single voice. Each story now plots a stance axis showing where every voice actually stands.

**Reader reactions are live as UI** — editorial buttons plus a per-voice vote that feeds a question ORSON asks in the Director's Report. Identity-free; counts render only when the server returns them.

**Each persona now looks like itself in prose**, keyed to the register it already owns in its panel. Mobile verified in rendered pixels at 390px.

**A crude cartoon was fixed** — founder-reported, live at the time. The torso ran past the leg join leaving a hanging stroke. Invisible in the path data, obvious in the image.

## The blocker, and what the Ark inbox revealed

Reaction COUNTS are not live. The endpoint ships in the Worker, and the Worker deploy is held:

```
production-promotion-gate: allowed=false; reasons=real-provider-e2e-pending
```

Draining the Ark inbox explained why that can never clear as-is. Obelisk shipped this repo a repo-question on 2026-08-10 that had not been read: **we are on v1/hand-rolled auth and 0/43 relying parties are live on Passport v2.** Confirmed locally — there is NO "Sign in with Obelisk" control anywhere on the site; `/vault-member` is Supabase + passkey. So the five journey legs cannot be observed, because there is no Obelisk sign-in to complete.

I had recommended running `verify-provider-journey.mjs --live`. That advice was wrong and could never have worked. Reading the inbox a day earlier would have prevented it.

Separately, Obelisk's S245 answer says our staging callback IS registered and their S248 cargo reports the gate deployed — but a live probe today still returns `state=rejected · exact=redirect-not-registered`. A repo-question is with them asking which is true, and whether v2 adoption retires the v1 registration path entirely.

**Founder decision: the Passport v2 migration is deferred to its own session.** It is an auth change and a proper piece of work, and it unblocks the promotion hold, reaction counts, and the member account shell together.

## Start here next session
1. Gate that a rendered stat equals its derived source. Today the panel and feed agree by construction — one refactor from silently not agreeing.
2. Drain the Ark inbox at /start. An unread message cost the founder a wrong recommendation.
3. When scheduled: the Obelisk Passport v2 migration.

---

## Session 309 handoff (2026-08-10)

## S309 addendum (2026-08-10) — the carried items are done

**VERA, JUNO and NIB have filed.** Two stories for 2026-08-10, live-verified 200 with panels, citations and disclosure. Both built from PRIMARY sources I fetched and read, not search summaries — and the JUNO piece exists because the primary source contradicted the secondary framing: the widely-repeated "2.5 years of student work destroyed" ended as a ~24h outage with **nothing permanently lost**, after an AWS engineer found a snapshot the customer console would not show.

**Three defects surfaced shipping it, all the same shape — a claim with nothing comparing it to reality:**
1. The Director's Report rendered "1 assignment · 249 words" directly beside "Did not file" the moment VERA filed. The rule was checked in ONE direction. Fixed by scoping performance to the report's own period — not by re-writing a published verdict.
2. `motif: "gears"` does not exist; the renderer silently substituted one, and the alt text described a picture never drawn. Only screen-reader users would ever have seen that lie. Alt is now DERIVED from the register; unknown motifs are a hard error.
3. `resync-derived` was **permanently** blind to `founder-presence` — its source `context/.session-lock` is untracked, and `git diff` cannot see what git does not track. It reported success three times while leaving it stale; only the pre-push hook caught it. Untracked-sourced nodes now always rebuild.

**Evidence-graph reconciliation shipped as a RATCHET** (12/51 modeled, 39 tracked, monotonic) rather than a full closure — guessing 39 nodes' sources would make the graph confidently wrong, which is the failure mode the whole tool family exists to prevent.

**Open founder call:** `check-studio-content-posture` flagged JUNO's "one person" as solo-bet framing. I reworded rather than exempt `/news/` from a founder-set posture rule. Exempting third-party editorial remains yours to decide.

---

## Deployment truth (2026-08-10)

**The Director's Report is LIVE.** `/news/directors-report/` — ORSON ranks all seven writers, explains his assignments, gives every one of them something to work on including rank 1, and takes the blame for two of the three who filed nothing. Verified by direct probe, not by CI conclusion: page 200, bespoke share card 200 / 96KB, and the page's `og:image` resolves to that card. Production still honestly retains baseline SHA `4a72961d` — content partition, not a full-site release.

**It first shipped with the GENERIC share card, and I called that deploy verified.** True of what I probed (status, HTML); narrower than what I claimed. Three things had to line up: `generate-news-pages` hardcoded `/assets/og-image.png`; the `build-og-cards` auto-promoter that would have rescued it reads `og:title` to pick a headline and the Desk's `chromeHead` deliberately emits none, so it skips every news page in silence; and the probe never looked at the card. The Desk now renders its own via `rasterizeDirectorsCard()`. The FIRST fix passed every gate while publishing "THE DESK · THE DISPATCH · No account required · double opt-in" over a performance review, with the headline clipped to "Three writers carried the week. Three did not" — the opposite of what ORSON wrote. Only rendered pixels caught it (CANON-053).

**`scripts/resync-derived.mjs` — the repairer for a class the repo could detect but never cure.** A conflict list shows COLLISIONS, not DEPENDENTS: this rebase's 32 conflicts were all generated files, and regenerating the two named in the list got the push rejected twice more by `candidate-artifact-manifest` and `release-proof`, which never conflicted at all. Replay flags 10 of 17 dirty. Proven in production — the next rebase → resync → push landed first try. Its first run invoked `deploy-staging.mjs`, attempting a real staging deploy to repair a rebase, and was stopped only by an unrelated failing check; `sideEffecting` + reason are now declared on the graph with a mutation-tested structural guard.

**Start here next session:**
1. **Get VERA, JUNO and NIB actually writing.** Three of seven have filed nothing and ORSON has committed to fixing it on a live public page — "a story that is not about a model release… and VERA on something operational."
2. **Reconcile the evidence graph against every `--check`'d artifact.** The repairer covers 17 nodes; the repo byte-checks more. `proof-aware-projects` and `cta-readiness` both drifted this session where it could not help. Build the structural gate rather than adding nodes as they break — it changes what `check-publish-cascade-coverage` demands of every cron, so it needs its own verified pass.
3. Founder-only, unchanged: click the Dispatch confirmation email (list still 0 confirmed); register the staging Obelisk callback.

---

## Session 308 handoff (2026-08-08)

## Deployment truth (2026-08-08 — supersedes the pre-deployment snapshot below)

**The editorial engine v2 and The Dispatch are LIVE on production.** `09cba82c5` is on `main`; content-lane run `31272775770` promoted 215 paths. Verified by direct probe rather than by CI conclusion: `/news/` serves the Dispatch CTA, the "Six minds" copy and VERA/ECHO/JUNO; `/news/subscribed/` went 404 → 200. Production honestly retains baseline SHA `4a72961d` because this was a content partition, not a full-site release.

Three things the deployment exposed, all recorded rather than smoothed over:

1. **The push races the crons, every time.** Two rebases were needed; all 31 conflicts across both were generated artifacts (`api/`, `data/`, `feed/`) with **zero authored files**. Resolving is not enough — regenerating from merged source afterwards changed **49 files**, so a resolve-only push would have published derived artifacts describing pre-merge code.
2. **The first content-lane dispatch failed**, and the cause was real: `api/deploy-currency.json` carries `deployedSha: null` / `state: unobserved` because the production probe is Cloudflare-challenge-bound, so the lane could not compute its diff range. Re-dispatched with the baseline read from production's own `/api/build-sha.json`. That is what `baseline_sha` is for, but needing it by hand is a gap — filed as `[S308→S309][RELEASE/P1]`.
3. **The Dispatch has zero confirmed subscribers.** The verification probe returned 200 and the contact correctly stayed OFF list 3, because Brevo attaches only after the reader clicks. Founder action: click the confirmation email in `founder@vaultsparkstudios.com`. No agent can close that leg.
