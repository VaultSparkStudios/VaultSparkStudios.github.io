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

## Where We Left Off

**The founder asked whether REX/MARA/DOT were the best editorial personas. The honest answer was that the cast was fine and the *structure* was the problem — so S308 fixed the structure, then answered the rest of the directive on top of it.**

S308 began mid-recovery. Triage found S307 had actually closed out cleanly (all ten surfaces written in tip commit `4da7eba13`, no session lock, clean tree, write-back currency clean), so no recovery commit was warranted and none was fabricated. The session then ran the continuous arc against the founder's mid-session directive: better personas, more engaging commentary, trending/viral sourcing, all-day cadence, and a newsletter with a Brevo send path.

## The core finding

`direction` was a single scalar in `[-2,2]` and `computeHeat` was the confidence-weighted mean pairwise distance on it. The debate axis *was* hype level, so REX (up), MARA (careful), DOT (down) were three points on one line and every story produced the same argument shape. Adding a fourth opinion about hype would have deepened the problem, not fixed it.

Two structural changes instead:

1. **A second axis.** Stances carry `horizon` (-2 immediate … +2 structural). Two personas can now agree something is enormous and still fight about *when* — the most common real disagreement in technology, previously unmodelable. `heatBreakdown()` names the shape: `split-on-worth`, `split-on-timing`, `split-on-both`, `aligned`.
2. **Epistemic diversity.** VERA has run it in production, ECHO has seen the cycle before, JUNO tracks who it lands on. None is a fourth opinion about hype; each differs in what it *knows*.

**Backward compatibility is structural, not incidental.** `horizon` defaults to 0 and the normalizing divisor stays at 4 (the 1-D maximum), so for every day written before the axis existed the metric collapses exactly to the old formula. The published 2026-08-07 heat values provably cannot move — asserted by a dedicated test and confirmed by a byte-stable ledger, carousel, claims feed, and JSON Feed under `--check`.

**REX/MARA/DOT were retained deliberately.** The prediction ledger is hash-chained and its entries reference persona ids; retiring one would orphan a verifiable public track record, which is the product's entire claim.

## What S308 shipped

- **Six-persona roster** with full voice specs (beats · lexicon · signature move · forbidden move · declared rival), plus `castForStory()` — a deterministic beat-owning anchor and its rival, so variety comes from rotation, not volume.
- **`personaForm()` — the record changes the voice.** Ledger accuracy becomes a writing directive: chastened on a cold streak, emboldened on a hot one. Gated at four resolved calls; below that the standing is `unproven` and carries no tone shift, so a small sample is reported as a small sample.
- **`EDITIONS`** (Wire 06:00 · Midday · Close · Late Night) moves the volume cap from per-day to per-edition. Legacy un-editioned days keep the original 1–3 cap; half-editioned days are rejected.
- **Trend radar** (`news-trend-radar.mjs` + `lib/news-trends.mjs`, 56 self-tests): free key-less sources clustered into corroborated topics. Corroboration outweighs engagement by design; single-source rumour, already-covered re-runs, uncastable beats, and vendor marketing are hard disqualifications, not penalties.
- **The Dispatch** — identity-free newsletter. Brevo list `3`, double-opt-in template `1`, `supabase/functions/subscribe-desk-dispatch` deployed with `verify_jwt=false` pinned in `config.toml`, CTA on the hub and every story page, plus a `/news/subscribed/` confirmation landing.

## Two bugs found by running it, not reading it

- **Corroboration was silently dead.** Every Google News RSS link is a `news.google.com` redirect, so `sourceDomain()` returned `google.com` for a hundred independent outlets and the highest-weighted signal could never fire. Fixed by recovering the true publisher from the `<source>` tag. Regression-tested both ways.
- **Vendor marketing scored as news.** Lab blogs publish customer case studies through the same feed as announcements ("How HSP GRUPPE builds AI capabilities for tax advisory" was queued at 52). Added a vendor-content disqualification.

Live queue went **7 queued → 24 queued**, with genuine multi-source corroboration (top item: 7 independent sources, 3h old) instead of single-source vendor posts.

## CANON-053 earned its keep

The theme-matrix captures are viewport-clipped at 900px, so the new CTA sat below the fold and never appeared in them — a green matrix would have proved nothing about the surface that changed. Focused component captures found a **blocking light-theme defect**: the Subscribe button used a flat `background:var(--gold)` with near-black ink, but light-theme `--gold` is `#7a5c00`, a dark amber the design system intends as *text on cream*. Dark-on-dark, under WCAG AA, invisible in source review. Fixed by reusing the sitewide `.button` gradient so button contrast is one design-system decision made once.

## Also root-fixed

The genius-list generator contradicted itself: it marked BRAND items actionable while `rationaleFor()` wrote "requires founder sign-off" into their rationale, and the gate-integrity check (which reads task *and* rationale) correctly failed. This was pre-existing debt from S307's closeout — the item was written to TASK_BOARD after S307's build check ran, so the gate never saw it. Fixed by deriving the gate from the category, so generator and validator are structurally unable to disagree.

## Verification

- `npm run build:check` — **all steps EXIT 0** (verified by exit code, not through a pipe)
- `smoke-startup-scripts` — **60/60**
- news-desk self-test — **25/25 → 52/52**
- news-trends self-test — **56/56**
- Dispatch live endpoint — **5/5** including negative controls (malformed 400, missing 400, foreign origin 403, preflight pinned, real double-opt-in dispatched)
- Visual QA — 42 hash-bound captures, `blockingDefectsOpen: 0`, inspection block records the defect found *and* fixed
- News artifacts byte-stable under `--check`; ledger chain verified (depth 1)

## Honest boundaries

- **The Dispatch confirmation contract is working, not bypassed.** The verify probe's contact correctly remained on list `[2]` and was *not* added to list 3 — Brevo attaches only after the reader clicks. That is the consent contract, not a failure.
- **The radar produces a queue, not an edition.** Turning a queued topic into a `validateDay()`-clean day is still manual. No day was auto-published, and no simulated content entered the public corpus.
- **The Obelisk release hold is untouched.** The exact stable-staging callback is still unregistered; nothing in this session moved auth, member surfaces, or identity configuration.
- **Nothing was deployed to production this session** beyond the Supabase edge function. The News page changes are committed but ride the normal release path.

## Next Session

1. Wire the radar into an authored edition: a drafting path that emits a `validateDay()`-clean day from a queued topic, applying the cast and standing directives.
2. Schedule `--scan` per edition slot and surface the queue at `/start`, so cadence is prompted rather than remembered.
3. Register `https://website.staging.vaultsparkstudios.com/auth/callback` for client `vaultsparkstudios-website` (retain the production callback), re-run `check-obelisk-redirect-readiness.mjs --require-ready`, then the staging ceremony and one founder journey.
4. Confirm the founder's Dispatch double-opt-in email arrived and the confirm link lands on `/news/subscribed/` — the one leg only a real inbox can close.
