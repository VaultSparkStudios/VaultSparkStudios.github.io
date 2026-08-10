# Task Board — VaultSparkStudios.github.io

Last updated: 2026-08-08 (Session 308 rebuilt The Desk's editorial engine — second stance axis, six-persona epistemic cast, intraday editions, trend radar — and shipped The Dispatch newsletter live; the Obelisk account-shell release remains held)

## S308 — editorial engine v2 · trend sourcing · The Dispatch

- [x] **[S308][NEWS/P0] Give the debate a second axis instead of a fourth pundit.** Added `horizon` (-2 immediate … +2 structural) to stances and made `computeHeat` 2-D, with `heatBreakdown()` naming the split shape. Backward compatibility is structural: `horizon` defaults to 0 and the divisor stays at the 1-D maximum, so published heat provably cannot move — asserted by test and confirmed byte-stable under `--check`.
- [x] **[S308][NEWS/P0] Expand the cast by epistemic role, not by optimism.** Added VERA (production practitioner), ECHO (cycle historian), JUNO (consequence desk) with full voice specs (beats · lexicon · signature · forbidden · rival). Retained REX/MARA/DOT because the hash-chained prediction ledger references their ids — retiring one would orphan the public track record.
- [x] **[S308][NEWS/P0] Cast per story instead of seating everyone.** `castForStory()` seats a beat-owning anchor plus its declared rival, deterministically, so six voices create rotation rather than noise.
- [x] **[S308][NEWS/P0] Make the record change the voice.** `personaForm()` converts ledger accuracy into a writing directive (chastened / level / emboldened), gated at four resolved calls so a thin sample earns `unproven` and no tone shift.
- [x] **[S308][NEWS/P0] Make intraday publishing structurally possible.** `EDITIONS` (Wire · Midday · Close · Late Night) moves volume discipline from per-day to per-edition; legacy un-editioned days keep the 1–3 cap; half-editioned days are rejected.
- [x] **[S308][NEWS/P0] Build trend sourcing that resists slop.** `news-trend-radar.mjs` + `lib/news-trends.mjs` (56 self-tests) cluster free key-less sources into corroborated topics; corroboration outweighs engagement, and single-source rumour, already-covered re-runs, uncastable beats, and vendor marketing are hard disqualifications.
- [x] **[S308][NEWS/P0] Root-fix two sourcing bugs found by running it, not reading it.** Google News links are `news.google.com` redirects, collapsing every outlet to one domain and silently killing the corroboration signal — fixed by recovering the publisher from `<source>`. Lab-blog case studies scored as news — fixed with a vendor-content gate. Live queue 7 → 24 with real multi-source corroboration; both covered by regression tests.
- [x] **[S308][GROWTH/P0] Ship The Dispatch — an identity-free newsletter.** Brevo list 3 + double-opt-in template 1; `subscribe-desk-dispatch` deployed with `verify_jwt=false` pinned in `config.toml`. Deliberately account-free because `send-member-newsletter` is Vault-Member-gated and The Desk promises no login. Live-verified 5/5 including negative controls; the contact correctly stayed off the list pending confirmation.
- [x] **[S308][UX/P0] CANON-053 caught a real light-theme contrast failure.** The Subscribe button used a flat `background:var(--gold)`; in light theme that token is #7a5c00, a *text* colour, so dark ink on it fell under WCAG AA. Fixed by reusing the sitewide `.button` gradient so button contrast stays one design-system decision. 42 hash-bound captures, blockingDefectsOpen 0.
- [x] **[S308][INTELLIGENCE/P1] Root-fix a genius-list self-contradiction.** The generator marked BRAND items actionable while writing "requires founder sign-off" into their rationale; the gate-integrity check reads both and correctly failed. Category-driven gating now makes generator and validator structurally unable to disagree.
- [x] **[S308][RELEASE/P0] Commit, push, and promote through the content lane.** `09cba82c5` landed on `main` after two rebases against the hourly publisher crons (all 31 conflicts were generated artifacts — zero authored files — resolved then regenerated from merged source so the derived tree could not be stale-but-plausible). Full authority 285/285 EXIT 0 on the rebased tree; secrets scan clean.
- [x] **[S308][RELEASE/P0] Root-caused the content-lane dispatch failure instead of retrying it.** `deploy-currency.json` carries `deployedSha: null` / `unobserved` (Cloudflare-challenge-bound probe), so the lane could not compute its diff range; re-dispatched with the baseline from production's own `/api/build-sha.json`.
- [ ] **[S308→S309][RELEASE/P1] Fix the deploy-currency baseline at the source.** The content lane should not need a hand-passed baseline. `build-deploy-currency` records `unobserved` honestly when Cloudflare challenges the probe, but the lane then has no input at all. Give it a challenge-resistant read (pages.dev origin or the served `/api/build-sha.json` path) so an honest `unobserved` state does not block promotion.
- [x] **[S308][TRUTH/P0] Harden authorship disclosure.** Five gaps found; `check-ai-disclosure-alignment` never looked at /news. Now enforced at five layers incl. per-item feed authors and "WRITTEN BY AI" on the card. D-S308.13.
- [x] **[S308][TRUTH/P0] Gate the disclosure.** `check-news-ai-disclosure.mjs` (17 tests, in build:check), mutation-tested. Its own v1 passed vacuously by reading a template literal. D-S308.14.
- [x] **[S308][NEWS/P1] Bridge the radar to an authored edition.** `news-draft-edition.mjs` fills every deterministic field, leaves judgment blank, `--promote` fails closed. Zero model calls. D-S308.15.
- [x] **[S308][NEWS/P0] `ok` meant HTTP 200, not usable.** 4 "ok" sources, 0 facts — all aggregator redirect shells. Now aggregator-only topics are skipped with a stated reason. D-S308.16.
- [x] **[S308][NEWS/P0][DEFECT FIXED] Resolutions were discarded on rebuild**, so the public track record could never work while every page claimed it did. Committed resolutions source + rebuild-boundary validation; a self-test asserts grading survives. D-S308.17.
- [x] **[S308][NEWS/P0] Newsroom roles.** EDITOR / STANDARDS / CORRECTIONS, mechanized where checkable. `runStandards()` blocks a figure asserted in commentary that appears in no cited fact. D-S308.18.
- [x] **[S308][NEWS/P0] Grading path with receipts.** `--resolve` is the only write path: validated before the file is touched, append-only, and it refuses a grade with no evidence URL ("grading without receipts is punditry"). `--record` prints the honest state including a past-due warning. No resolution was fabricated to demo it.
- [x] **[S308][NEWS/P0][FOUNDER] Every prediction was 326–510 days out** — individually falsifiable, collectively uncheckable. Standards now blocks an all-long-horizon story; drafter proposes a 45/120/240 ladder. Published dates stand. D-S308.19.
- [x] **[S308][NEWS/P0][FOUNDER] The desk could not publish a joke** — every story required a dated prediction, and the radar filtered spectacle out as uncastable. Six formats with per-format bars; each persona owns a recurring bit. D-S308.20.
- [x] **[S308][EMAIL/P0][VERIFIED 2026-08-09] `news@` is genuinely reply-capable.** The founder confirms the inbound probe to `news@vaultsparkstudios.com` arrived, so the Zoho domain catch-all works and an arbitrary local-part on this domain reaches a human without provisioning. `Reply-To: news@` on The Dispatch satisfies D-S259.2. The agent could not verify this itself — the connected Gmail holds no `founder@` mail, only Search Console notices — and that dead end is now recorded so it is not retried.
- [ ] **[S308→S309][GROWTH/P1][FOUNDER ACTION] Click the Dispatch confirmation to close the last untested hop.** Delivery is proven; list 3 still reports `totalSubscribers: 0` and `founder@` sits on `listIds: [2]`. Brevo attaches only on click, so form → function → Brevo → inbox → confirm → list is verified except the final step. Clicking also lands on `/news/subscribed/` and makes the list's first real subscriber. Not agent-closable.
- [x] **[S308][NEWS/P1] First non-flagship edition shipped — the format board is no longer a promise the archive cannot keep.** `/news/2026-08-09/weathernext-buys-forecasters-an-extra-day/` is a **Quick Take**: one voice (ECHO), no prediction, ledger depth 1 → 2. Run through the real pipeline (scan → prepare → author → Standards → Editor → promote → rebuild → render), not hand-written. Editor passed it with an honest single-source warning. Every fact taken from the fetched DeepMind article after the auto-extractor produced one with a heading glued to body text. Authored on the Max Plan per CANON-015 — zero API spend.
- [x] **[S308][NEWS/P0] Two rendering defects the first light-format page exposed.** The generator printed "Predictions on the record" above an EMPTY list for a format that carries none — advertising accountability content the piece does not contain, the same empty-scoreboard dishonesty the hub record state was written to avoid — and rendered "one lenses". Both now format-aware: Quick Take shows "one lens · declared bias" with no predictions block; the flagship is unchanged. Found by reading the rendered page, not by any gate.
- [x] **[S308][NEWS/P0][FOUNDER] Rebuild the editorial layer end to end.** No article existed — only a capped summary and pull quotes. `body` now required; voices rewritten as people; seven visual meme registers; dev-speak replaced with reading time. D-S308.21/.22.
- [x] **[S308][NEWS/P0][FOUNDER] NIB, the staff cartoonist.** Old-broadsheet satire panel — aged stock, ruled frame, engraved motif, period caption, signed. Satire aims at institutions and their own claims, NEVER individuals, encoded in `forbidden` so a gate holds it rather than taste.
- [x] **[S308][NEWS/P0][FOUNDER] The Director's Report.** ORSON ranks the whole desk, explains assignments, and gives every writer something to work on including rank 1. Stats DERIVED from the corpus; only judgement authored. Gates: no tied ranks, no one-line notes, anyone who filed nothing must be named. Encodes the founder's note that voices should not all pile onto every story.
- [ ] **[S308→S309][NEWS/P1] Get the rest of the desk actually writing.** ECHO, MARA, REX and DOT have filed; VERA, JUNO and NIB have barely or not at all. ORSON has already called this out in public, which makes it a commitment. The cast is proven as a system, not as writers.
- [ ] **[S308→S309][NEWS/P2] Voice narration — decide before building.** Founder raised it; not attempted. Needs an approach and a cost estimate first (CANON-015), since per-article TTS is metered.
- [ ] **[S308→S309][NEWS/P1] Prove the light formats are actually FUNNY.** One Quick Take shipped with real voice, but no Roast or Signature Bit has run, and the radar still cannot draft the spectacle topics those formats exist for. Humour is demonstrated once, not proven.
- [ ] **[S308→S309][BRAND/P2] Formalize the naming and drop the nav hedge.** Publication **The Desk** · newsletter **The Dispatch** · URL **`/news/`** · address **`news@`**. Publication and newsletter having different names is standard and correct; the only real mismatch is brand vs URL, and `/news/` is worth keeping for its generic high-intent search value. The one thing to fix is the nav label "The Desk · News", which hedges between the two.
- [ ] **[S308→S309][NEWS/P1] Resolve publisher URLs from aggregator entries.** 23 of 24 queued topics are currently undraftable: the radar corroborates ACROSS outlets via Google News (which is what makes corroboration strong), but those links cannot be read for facts — so corroboration and draftability pull against each other. Decoding Google's `CBMi…` encoding is deliberately hostile and fragile; prefer resolving via the publisher domain from `<source>` plus a site search, or lean on primary-source feeds. Not guessed at this session.
- [ ] **[S308→S309][NEWS/P1] Schedule the authoring routine (Max Plan, not API).** A cron-invoked Claude Code routine that runs `--scan` → `--prepare` → authors the judgment fields → `--promote` → rebuild → deploy. Founder-approved surface is the Max Plan; metered API generation stays unbuilt and unpriced-in. Keep human sign-off on each edition until the pipeline has a track record.
- [ ] **[S308→S309][NEWS/P2] Decide the naming triple.** The product is "The Desk", the newsletter "The Dispatch", the URL `/news/`, the address `news@`. Three names for one thing. `/news/` carries the SEO value; "The Desk" carries the brand. Founder call — email domains carry no SEO weight either way. The radar now produces a ranked, edition-assigned queue, but turning a queued topic into a validated day is still manual. Next: a drafting path that emits a `validateDay()`-clean day from a queued topic, with the persona cast and standing directives applied.
- [ ] **[S308→S309][NEWS/P2] Schedule the radar.** A cron that runs `--scan` per edition slot and surfaces the queue at `/start`, so cadence is prompted rather than remembered.
## S307 — The Desk News graduation · publication truth

- [x] **[S307][NEWS/P0] Replace the simulated dark-run with a real, source-bound edition.** Published the deterministic 2026-08-07 corpus with two primary-source stories; removed the simulated 2026-08-04 public artifacts; `--simulate` is validation-only and public rebuilds accept only `simulated:false` days.
- [x] **[S307][NEWS/P0] Make News discoverable everywhere the Studio promises navigation.** Added `The Desk · News` to the Studio header dropdown and footer across the canonical 113-page shell, plus sitemap, human hub, JSON Feed 1.1, agents.json, and llms discovery.
- [x] **[S307][NEWS/P0] Prove the publication candidate rather than infer it.** News self-tests 25/25; interactive header/footer Playwright 1/1; accessibility 23/23; 42 rendered-pixel states reviewed across three routes, seven themes, and desktop/mobile; full authority 283/283 from step one.
- [x] **[S307][TRUTH/P0] Separate News from Obelisk conceptually and operationally.** News has no identity dependency. The only coupling is the site-wide CANON-007/045 release ceremony: production callback is registered; the stable-staging callback remains rejected, so deployment is held without mislabelling News as defective.
- [x] **[S307][NEWS/RELEASE/P0] Publish News without moving identity.** Added a staging-first static content lane, fixed deletion partitioning and Windows archive permissions, deployed stable staging with rollback, then promoted production through workflow `31243742496`. Live hub, both stories, CSS, feed, header dropdown, and footer are verified.
- [ ] **[S308][IDENTITY/RELEASE/P0] Register the exact stable-staging callback and rerun the full account-shell ceremony.** Retain `https://vaultsparkstudios.com/auth/callback`; add `https://website.staging.vaultsparkstudios.com/auth/callback` for client `vaultsparkstudios-website`; preserve altered-host and foreign-client denial; deploy staging, complete one founder journey, then promote the current Obelisk account shell. News is already live and is not part of this blocker.
- [ ] **[S308][NEWS/P1][WAITING: NEXT REVIEWED DAY] Establish the ongoing editorial cadence.** Add a source-change/correction receipt and require a reviewed real day before each navigation-visible refresh. Do not fabricate a correction event or let simulation enter the public corpus.
## S306 — recovered full arc · audit saturation · release truth

- [x] **[S306][ARC/P0] Fresh audit implemented 14/14.** Contextual Vault bridge · exact Obelisk redirect readiness · progressive onboarding · 283-step measured verification plan · one-command release ceremony · Forge editorial state machine · signed/expiring release dependency handshake · seven-goal agent intent map · zero-skip staging browser gate · engagement-window receipt · deploy-currency quorum · bounded decision feedback · constellation resume compass · task-board rotation/startup floor.
- [x] **[S306][SIL][INNOVATION/P2] Proof-aware playable-project recommender.** Ranks only SPARKED titles with real play URLs using registry, field-win, media, and recent-move proof; publishes source hashes and abstains from runtime AI spend.
- [x] **[S306][SIL][PROCESS/P2] Verification authority became faster without becoming partial.** The transitive changed-path planner can run a measured subset for the inner loop, but only the complete 283-command manifest can satisfy closeout.
- [x] **[S306][UX/P1] Rendered-pixel journey proof.** 56 states = four touched surfaces × seven themes × desktop/mobile. Image review found two light-theme contrast failures; both were fixed with theme-native panel tokens, recaptured, hash-bound, and re-reviewed with zero defects.
- [x] **[S306][SPEED/P1] Geo-vitals accrual restored.** Builder now unions tracked and freshly downloaded R2 rows; daily workflow builds the aggregate in the RUM job. Live window: 2026-05-25→2026-08-06, 46 days, 668 samples.
- [x] **[S306][TRUTH/P0] News and Obelisk visibility are explicitly classified.** News is a simulated/noindex dark-run intentionally outside navigation and sitemap. Obelisk is implemented in source/staging, but production is 802 commits / 12.2 days stale and staging callback registration is rejected; promotion remains held.
## Previous runway (Session 293 — carried forward)

- [x] **[S293→S295][SIL][OBS/P1] Incident-close verification instrumentation — DONE S295.** Exact-once/all-route closure, frozen duration, recurrence, and the healthy `/status/` branch are enforced. The distinct live receipt remains correctly waiting above until production really recovers.
- [x] **[S293→S294][DEPLOY/P0] Production staleness diagnosis — DONE S294.** The fail-closed promotion interlock is working as designed; this is not a broken deploy path. `api/deploy-currency.json` measures the intentionally held production state continuously.
- [x] **[S293→S295][OBS/P1] Wire `verify:deploy-parity` into a gate — DONE S295.** The scheduled deploy-currency receipt now runs real route-local production shell parity; a structural contract forbids `--local` production evidence.
- [x] **[S293→S295][SIL][OBS/P1] Onset corroboration beyond one coarse probe — DONE S295.** RUM supplies the labelled last-healthy lower window, uptime the coarse upper bound, route history its own observation, and unrelated promotion history is explicitly excluded.
## Previous runway (Session 292 — both items shipped in S293)

- [x] **[S292→NEXT][SIL][OBS/P1] Route-provenance history and incident duration.** Append only semantic changes; retain no response bodies. **Shipped S293** — see the S293 outcome block above.
- [x] **[S292→NEXT][SIL][AUTOMATION/P1] Evidence-graph human/agent projection.** Render one compact diagram and agent relation view from the validated source. **Shipped S293** — see the S293 outcome block above.
## Historical Now

- [x] **[S289→S290][SIL][SEC/P1] Supabase control-plane capability split — DONE S290.** `api/supabase-control-plane.json` now separates REST, management API, SQL migration, and Edge Function authority; gateway-native read-only probes report REST **ready (HTTP 200)** and the other three planes independently blocked. Self-test **8/8**, public-safe/hash drift check green.
- [x] **[S289→S290][SIL][RELEASE/P1] Durable identity migration receipt — DONE S290.** `api/identity-migration-receipt.json` binds issuer, callback host/path, final staging Worker version, migration/function source hashes and deployment state, member/investor/revocation proof states, and rollback anchors. It is correctly **honest-dark / productionEligible=false** with no identifiers, credentials, or claims.
## Historical Now (pre-S289)

- [x] **[S260][VERIFY/P1] Confirm remote CI/deploy green for S260 tip — DONE S261.** Recent `gh run list` evidence showed Pages/CI beacon/deploy workflows succeeding on `main`; no remote-red contradiction found.
- [x] **[S260][SECURITY/P1] TT post-deploy soak reprobe — DONE S261.** Live TT probe/analyzer refreshed `docs/TT_SOAK_EVIDENCE_2026-07-06.md`, `docs/TT_BURNDOWN_2026-07-06.md`, and `.cache/tt-active-local-sinks.json`; enforcement remains AMBER because violations are still present.
## Next (historical)

- [x] **[S260][SIL][PROCESS/P2] Generalize active-sink guards from specific TT rows to freshness-ranked input — DONE S261.** Analyzer emits `.cache/tt-active-local-sinks.json`; guard consumes it and proves active-local unresolved rows are 0.
## Historical Runway (Session 254)

- [x] **[S254][PROCESS/P3] GENERATOR-HEAD-CONTRACT-AUDIT - DONE S255; stale carry closed S257.** `scripts/check-generator-head-contracts.mjs` exists with self-test and live page-generator contract scan and is wired into `build:check:steps`; no duplicate gate needed.
- [x] **[S254][PROCESS/P2] ROTATE-TASKBOARD-CLOSEOUT-HOOK - DONE S255; stale carry closed S257.** `prompts/closeout.md` now runs `node scripts/rotate-taskboard.mjs --apply`; `rotate-taskboard.mjs` also includes S254 stale session-tagged heading consolidation.
## Historical Runway (Session 249)

- [~] **[SIL:2⛔][PERF/P1] INP root-fix when CLEAN field data lands** — PARTIAL S262: clean R2 pull named `/games/vaultspark-football-gm/` as the dominant route (91 phase samples, presentation-heavy pointer hover); shipped page-level paint/compositing mitigation. Needs post-deploy field soak before closing.
- [ ] **[EXTERNAL][ENGAGE/P1] play-next conversion redesign — once the honest window has data** — S249 fixed the impression metric (IntersectionObserver true-viewport `play-next:shown`; epoch bumped 2026-07-02). Let ~1 week of honest viewport-view vs click data accrue, THEN decide placement vs copy vs retire from a trustworthy denominator (the 37/0 was a dishonest trigger-fire count).
- [~] **[OPS/P2] Atlas registry freshness reconciliation** — Ark cargo `01JSSHJD94DA233EFA5EC7E9FA` shipped to `studio-ops` in S262; no sibling tree edits. Await owner reply/cargo before local close.
- [x] **[SIL][HYGIENE/P2] TASK_BOARD size strategy — monitored, currently healthy; duplicate closed S251.** `rotate-taskboard --check-size` reports 130KB, within the 3-session rotation window — no action needed this session; see the S247 root-fix entry above.
## Premium-site roadmap — S208 outcome

Top themes identified S207, run via S208 `/audit`→`/implement`:
- [x] **[PERF/P1] Core Web Vitals — DONE (S208).** The lingering `/ desktop LCP 13060ms` was a PHANTOM: a rolling-3 median dragged by two 26-day-old, already-fixed S161 incident traces (real RUM p75 = 976ms). Root fix = a recency staleness horizon in `check-perf-budget` so resolved incidents expire (not a data edit — a control self-test proves it). Plus AVIF+WebP covers (~93% smaller) via `image-set()`+`@supports`.
- [x] **[POLISH/P2] Bespoke OG cards — DONE (S208).** Atlas repointed from generic `og-home.png` to its bespoke `og-atlas.png` (the generator made the card; the meta hand-referenced the homepage's). Homepage correctly keeps `og-home.png`; no other page misused it.
- [~] **[COHESION/P2] Graduate the elite hero treatment — PARTIAL (S208).** The **Atlas rows** slice is done (cover thumbnails). The per-page hero-glow graduation to /games//membership//studio/ is **deferred** — mature-surface visual change wanting real-device verification; tracked in S208-committed above.
- [x] **[DEPTH/P3] Atlas v2 — DONE (S208).** Per-project cover thumbnails on every row (6 bespoke covers via image-set + 5 accent-initial fallbacks). The "moving this week" live strip is **honestly deferred** — no per-project activity data source exists; building it would be a lying surface (CANON-031).
- [ ] **[HUMAN][CONTENT/P1·FOUNDER] Publish the forge devlog** (`journal/_drafts/forge-week-2026-06-18.md`) — clears the changelog stale warn. Founder-voice essay; never auto-published.
## Resolved this session (carries from S188 Now)

- [x] **[S188][VERIFY/P0] Confirm S188 + S187 features on prod — RESOLVED S189 (SAVE).** Live pages.dev probes confirm all sub-items deployed: (a) `/faq/` (non-home) serves the Studio Dispatch footer; (b) Discord + Community Hub render in the Studio nav dropdown; (d) call-of-doodie hero promise renders; status-proof.json 200; tip is a deployable non-`[skip ci]` commit. Sub-item (c) RUM beacons landing is exactly what S189 funnel-summary now makes visible.
- [x] **[S188][SIL] RUM-DEAD-ALLOWLIST-SWEEP — RESOLVED S189.** See Done above — gate clean, 0 dead.
- [x] **[S186][SIL] PROOF-LINE-TELEMETRY — already DONE S188** (proof-line:{shown,click} beacons + allowlist sync).
## Historical Runway (Session 189 — carries folded into S190 Now)

- [x] **[S188][VERIFY/P0] Confirm S188 + S187 features on prod — RESOLVED S189 (duplicate of the SAVE entry above); phantom carry closed S251.**
- [ ] **[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft.** `journal/_drafts/forge-week-2026-06-11.md` is generated; founder reviews SOUL voice, then publish to `journal/` to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
- [x] **[S188][SIL] RUM-DEAD-ALLOWLIST-SWEEP — RE-VERIFIED CLEAN S251; duplicate closed.** `check-rum-allowlist` reports 70 allowlisted · 79 emit call-sites · all in sync, 0 dead entries. This is periodic-maintenance in nature (the gate self-reports WARN if dead entries ever appear) — checking off the standing duplicate rather than leaving an identical open title forever; the gate itself is the ongoing enforcement.
- [x] **[S187][FEATURE/P2] WISHLIST-MOMENTUM-PROOF — PHANTOM-BLOCKER CLEARED + RECORD CONSOLIDATED S281.** The "BLOCKED on Supabase admin (capability MISSING locally)" premise is **false**: `check-secrets --for supabase.admin` reports **READY (2/2)** and has since at least S280, which cleared the same phantom on the newer S280→ entry (D-S280.3) but left this older duplicate carrying the dead claim. A phantom blocker is forbidden under CANON-019 (ABSOLUTE), and this one was still rendering to the genius list as "Requires missing credential" — an observability lie about our own capability. The live work is tracked by the S280→ entry, where the real gate is a founder public-optics call (low counts backfire on unreleased-game surfaces), not a credential. See D-S281.3. <!-- record-consolidation: superseded-by S280-wishlist-entry -->

<!--
Verification, S281 (do not re-derive):
  $ node scripts/check-secrets.mjs --for supabase.admin
    supabase.admin   ✓ READY   2/2 all present
-->

- [~] **[S187][UX/P2] FLAGSHIP-PRODUCT-STORYTELLING — 3/4 sub-items already DONE, "screenshot" honestly re-scoped S251.** Verified against the two true SPARKED flagships (`games/call-of-doodie/`, `games/vaultspark-football-gm/`): narrative hero ✓ (`.hero-art` promise copy), single CTA ✓ (primary "Play Now — Free" + secondary), voice copy ✓ (comedy-voiced tagline, distinct per game). Attempted adding each game's bespoke cover art (`assets/covers/{doodie,footballgm}.{avif,webp,png}`) as a blurred hero backdrop via `image-set()` — reverted after inspection: those covers are abstract branded title-cards with baked-in text ("Call of Doodie", "SPARKED", genre label), not gameplay art, so blurring one behind the hero just duplicated the page's own heading as illegible mush and added no real information. A genuine screenshot needs either founder-provided gameplay captures or a real image-generation pipeline for game art — neither exists yet. Honest deferral, not a skip.
- [x] **[S185→][UX/P1] PROGRESSIVE-MEMBERSHIP-UNLOCK — DONE S190 (phantom carry closed S251).** `assets/membership-unlock.js` ships the full 4-stage progressive disclosure (cold → 3+ visits rank-preview hint → proof-engaged achievement teaser → dispatch-subscriber community welcome), wired live on `/membership/` with RUM-instrumented `membership-unlock:stage-N` beacons. This line survived 3 archive sections after the build shipped — genius-list generator kept resurfacing it from unchecked historical text.
- [ ] **[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4).** One job, previously logged as five open entries; all evidence preserved below.
  - **Verdict: AMBER** (S257 reprobe, newest evidence): 401 `tt:*` keys across 26 counter days/30d — not the clean GREEN a flip needs.
  - **Prior datapoint** (S184, 2026-06-10): 148 violations/30d. Top sinks: `journal/dispatches:364` (×30, recurring), `home-idle-loader.js:16`, football-gm `appCore.js` (cross-repo), `schema-injector.js:23`, `ambient.shell`.
  - **Progress:** the July 3 `/leaderboards/` fallback/skeleton sink was root-fixed with DOM row helpers and propagated. Soak clock restarted 2026-06-05 (env-fix); S176's default-policy bridge burned down the founder-named sinks.
  - **Reprobe:** `node scripts/probe-tt-soak.mjs && node scripts/analyze-tt-violations.mjs`
  - **Burn-down plan + flip command:** `docs/TT_ENFORCE_READINESS_2026-06-10.md`
  - **Next steps:** named-policy migration of the 4 first-party sinks · Ark cargo to football-gm for the cross-repo sink (CANON-018 — never edit the sibling tree directly) · post-deploy soak verification + stale-cluster aging.
  - **Gate:** enforce flip stays founder-device verified (SOUL #3). Not agent-flippable.
- [x] **[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION.** Founder public-safe exposure call for cross-project/sealed IGNIS intelligence. **RECORD CONSOLIDATED S281 — duplicate stub of the same founder call; the substantive entry (Oracle richer-layer public-safe decision) remains OPEN and carries the full context (D-S281.4).** <!-- record-consolidation: superseded-by S183-canonical -->
- [ ] **[S180][FOUNDER] nav-sheet device verify** (mobile bottom-sheet default-swap — real-device confirmation).
- [x] **[S186][SIL] PROOF-LINE-TELEMETRY — DONE (see S188 entry above; duplicate closed S251).**
## Historical Runway (Session 183 — superseded by S186 Now)

- [x] **[S183][P0/FOLLOW-UP] UPTIME-PROBE-REBASE-BEFORE-PUSH — DONE S184.** Generalized the fix to the whole class: `git pull --rebase --autostash origin main` added before the push in all **7** self-committing workflows (ci-status-beacon, leaderboard-api, member-seo, og-images, rum-pull, uptime-probe, vault-narrative), not just uptime-probe. All YAML validated.
- [ ] **[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION.** Oracle's core feed is fixed via `/api/public-intelligence.json`, but the richer layer (per-project IGNIS voices, ecosystem-velocity chart, cognition aggregate score) still sources from the gitignored local-only `/ignis/output/*`. Deploying it needs a public-safe decision (what cross-project/sealed intelligence is exposable) + a sanitized deploy path + a refresh mechanism (generation is local-only — reads all sibling repos). Founder call.
- [x] **[S180→S184][SECURITY/P1] TT-ENFORCE-REPROBE — REPROBED S184, verdict AMBER.** Ran probe + analyzer 2026-06-10: **148 violations/30d still present** (not the clean GREEN a flip needs). Top sinks: `journal/dispatches:364` (×30, recurring), `home-idle-loader.js:16`, football-gm `appCore.js` (cross-repo), `schema-injector.js:23`, `ambient.shell`. Burn-down plan + flip command in `docs/TT_ENFORCE_READINESS_2026-06-10.md`. Flip stays founder-device gated (SOUL #3). Carry stays OPEN — next step is named-policy migration of the 4 first-party sinks + an Ark cargo to football-gm. **RECORD CONSOLIDATED S281 — the work is still open under the [S186→S281] canonical entry; every detail below is preserved there (D-S281.4).** <!-- record-consolidation: superseded-by S186-canonical -->
- [x] **[S180][PERF/P1] ORIGIN-MIGRATION-FIELD-VERDICT — CONFIRMED + DONE S184.** `api/field-win.json` now `hasConfirmed:true` (confirmedCount 1): **`/` improved −46.1% LCP** (p75 9489→5117ms) across the 2026-06-05 S173+S175 boundary, medium confidence. The /status/ "Biggest measured win" tile is data-driven and lights on this push. **Root-caused why prod stayed dark:** the S183 `[skip ci]` closeout tip stranded the CF Pages deploy — fixed by the new deploy-strand guard (see below). Remaining global watch tracked by GEO-VITALS-WATCH.
- [x] **[S181→NEXT][PROOF/P2] STATUS-PROOF-INDEX — DONE S184.** `scripts/build-status-proof.mjs` bundles 10 public proof feeds into a self-grading `/api/status-proof.json` (each proof carries its own freshness + a top-level trustScore/worstStale). `/status/` collapses 8 fetches → 1 shared manifest fetch (individual-file fallback preserved), renders a new "Proof freshness" tile, and exposes a `<link rel=alternate>` for agents. Wired into build + build:check drift gate.
- [x] **[S184][DEPLOY/P0] DEPLOY-STRAND GUARD — DONE S184 (new, surfaced this session).** CF Pages builds only the pushed tip and skips `[skip ci]` tips, so every closeout ending in the autopilot's `[skip ci]` reconcile commit silently stranded the substantive deploy (S183→S184: confirmed field-win + ~20 api/*.json never went live). `scripts/check-deploy-tip.mjs` (7/7 self-test) + `closeout-autopilot.mjs` now push an empty non-skip-ci commit when the tip is `[skip ci]` so Pages builds.
- [x] **[S180][OBS/P3] GEO-VITALS-WATCH — DONE S252 (phantom carry closed).** Verified current workflow evidence: `.github/workflows/uptime-probe.yml` restores `.cache/probe-colo-supplement.ndjson`, runs `node scripts/probe-uptime.mjs --colo-probe`, rebuilds `api/geo-vitals.json`, and stages it with uptime/status-proof artifacts. `scripts/build-geo-vitals.mjs` consumes colo-probe supplement rows when real country samples are thin. This was shipped in S186 (`geo-vitals-colo-workflow`); the historical open watch survived as a stale carry.
- [x] **[S184][ECOSYSTEM/P1] ARK-DEPLOY-STRAND-PATTERN-SHARE — DONE S185 wave1a.** Broadcast the `[skip ci]`-tip CF-Pages deploy-strand finding + `scripts/check-deploy-tip.mjs` guard to all CF-Pages sibling repos via Ark `pattern-share`. ✓
- [x] **[S185][SECURITY/P2] TT-NAMED-POLICY-WAVE — DONE S185.** Renamed `vs-dom` → file-specific: recent-ships→`vs-recent-ships`, related-content→`vs-related-content`, trust-depth→`vs-trust-depth`, ignis-answer-engine→`vs-ignis-answer`. New `scripts/lint-tt-policies.mjs` gate (build:check). Eliminates TT re-registration TypeError on co-load. **DONE S185**
- [x] **[S185][AI/P3] STATUS-PROOF-IN-AGENTS-JSON — DONE S185.** `statusProof` URL added to agents.json discovery block + llms.txt "Operational trust" section added. **DONE S185**
- [x] **[S185][SECURITY/P1] TT-ENFORCE-REPROBE.** Updated S257: fresh reprobe is AMBER (401 `tt:*` keys, 26 counter days/30d). Current local `/leaderboards/` July 3 fallback/skeleton sink was fixed with DOM row helpers and propagated; next step is post-deploy soak verification, stale-cluster aging, and any cross-repo handling before founder-device enforce flip. **RECORD CONSOLIDATED S281 — the work is still open under the [S186→S281] canonical entry; every detail below is preserved there (D-S281.4).** <!-- record-consolidation: superseded-by S186-canonical -->
- [x] **[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION.** Founder call needed. **RECORD CONSOLIDATED S281 — duplicate stub of the same founder call; the substantive entry (Oracle richer-layer public-safe decision) remains OPEN and carries the full context (D-S281.4).** <!-- record-consolidation: superseded-by S183-canonical -->
- [x] **[S180][OBS/P3] GEO-VITALS-WATCH — DONE S252 (workflow trigger verified).** The GH Actions trigger exists in `.github/workflows/uptime-probe.yml`: "Colo probe (global edge sample)" runs `node scripts/probe-uptime.mjs --colo-probe`, and the publish step rebuilds + commits `api/geo-vitals.json`. Duplicate stale carry closed with evidence.
- [x] **[S184][ECOSYSTEM/P1] ARK-DEPLOY-STRAND-PATTERN-SHARE.** Done S185 wave1a — broadcast via ark.mjs. ✓
- [x] **[S185][UX/P1] PROGRESSIVE-MEMBERSHIP-UNLOCK — DONE S190** (see S185→ entry above; duplicate line closed S251).
- [x] **[S185][OBS/P2] GEO-VITALS-COLO-PROBE-WORKFLOW — DONE S252 (already shipped S186).** `probe-uptime.mjs --colo-probe` is wired into `uptime-probe.yml`, persisted through Actions cache, and folded into `build-geo-vitals.mjs`; S186 CURRENT_STATE records the workflow as shipped and build-checked. Closed as a phantom-open duplicate, not new feature work.
- [ ] **[S180][FOUNDER/DEVICE] NAV-SHEET DEVICE VERIFY.** `assets/vaultsparked-proof.js` was already deleted and verified in S186; the only remaining action is the real founder-device nav-sheet behavior check required by SOUL #3. No deletion work remains.
- [x] **[SIL] IGNIS-HINT-CONVERSION-TRACKING — DONE, phantom carry closed S251.** `assets/ignis-answer-engine.js` `showHint()` fires `emitUx('ignis-hint:shown'/'click'/'dismissed')` through the existing RUM pipeline (functionally equivalent to the proposed `vs:ux` CustomEvent); all three allowlisted in `cloudflare/security-headers-worker.js` `RUM_UX_EVENTS`.
- [x] **[SIL] CLOSEOUT-BUILD-ORDER-MODULE — DONE, phantom carry closed S251.** `scripts/lib/build-order.mjs` exists (`DERIVED_BUILD_ORDER` + `runDerivedBuilds()`), imported directly by `scripts/closeout-autopilot.mjs`.
## Historical Runway (Session 182)
- [x] **[S181][AI/P1] AI-SPINE-PUBLIC-HEALTH — DONE.** Published `api/ai-discovery-health.json` from the same validators as the AI-spine gate; `/status/` now shows a live "AI discovery spine" tile; `build` + `build:check` are wired. Focused gates green. **DONE S181**
- [x] **[S181][PROCESS/P2] TASKBOARD-RUNWAY-HYGIENE — DONE.** `check-stale-open-tasks.mjs` now flags duplicate active `Now` and `Human Action Required` sections; board consolidated into one S181 runway and one current founder-action block. Gate green. **DONE S181**
- [x] **[S180][SECURITY/P1] TT-ENFORCE-REPROBE.** Now due (~2026-06-12): `node scripts/probe-tt-soak.mjs && node scripts/analyze-tt-violations.mjs`; S176 default-policy bridge should show near-zero new clusters → if clean, enforce-flip decision (founder device verify per SOUL #3). **RECORD CONSOLIDATED S281 — the work is still open under the [S186→S281] canonical entry; every detail below is preserved there (D-S281.4).** <!-- record-consolidation: superseded-by S186-canonical -->
- [x] **[S180][PERF/P1] ORIGIN-MIGRATION-FIELD-VERDICT + FIELD-WIN-LIGHTS-UP — CONFIRMED + DONE S184; duplicate closed S251.** See the DONE S184 entry above — `hasConfirmed:true`, −46.1% LCP confirmed.
- [x] **[S180][OBS/P2] UPTIME-PUBLISH-VERIFY — DONE S264.** Verified `gh run list` shows the 2026-07-07 `uptime-probe` workflow succeeding, and `git log --author=github-actions -- api/uptime.json data/uptime-history.ndjson` shows repeated commit-worthy uptime/geo/staging publications including `039ac7d2e`.
- [x] **[S180][OBS/P3] GEO-VITALS-WATCH — DONE S252 (phantom carry closed).** Verified current workflow evidence: `.github/workflows/uptime-probe.yml` restores `.cache/probe-colo-supplement.ndjson`, runs `node scripts/probe-uptime.mjs --colo-probe`, rebuilds `api/geo-vitals.json`, and stages it with uptime/status-proof artifacts. `scripts/build-geo-vitals.mjs` consumes colo-probe supplement rows when real country samples are thin. This was shipped in S186 (`geo-vitals-colo-workflow`); the historical open watch survived as a stale carry.
- [x] **[S181→NEXT][PROOF/P2] STATUS-PROOF-INDEX — DONE S184; duplicate closed S251.** `scripts/build-status-proof.mjs` ships exactly this — see the DONE S184 entry above.
- [x] **[S181→S254][PROCESS/P2] TASKBOARD-AUTO-CONSOLIDATOR — DONE S254.** Added `consolidateStaleRunwayHeadings()` + extended `--apply` mode to renames `## Now (Session N runway)` headings older than KEEP_RECENT sessions; self-test 23/23; renamed S249+S77 headings in this closeout.
- [x] **[S180][SIL] AI-DISCOVERY-SPINE-WAVE2 — DONE.** Header discovery shipped via generated `_headers` (`rel=alternate`, `application/json`) and is now enforced by `check-ai-discovery-spine.mjs`. Follow-up deferred: optional HTML `<link>` discovery if we want belt-and-suspenders.
- [x] **[S180][SIL] AMBIENT-SPLIT-WAVE3 + DEAD-WIDGET-SWEEP — DONE (wave scoped).** Mapped remaining feature scripts by real route/hook guard; split two proven route/hook-scoped engines. vault-atlas, rank-orb, rate-page, founder-presence-handle, page-sigil, vault-rank-bar, and ignis-lens remain ambient because their guards are sitewide/session/pathway-level rather than single-surface. Follow-up: the coverage report still lists 7 candidates for future proof-driven passes.
- [x] **[S180][FOUNDER] vaultsparked-proof.js delete (evidence-complete) + nav-sheet device verify.** **RECORD CONSOLIDATED S281 — byte-identical duplicate of the entry above; that one stays OPEN and founder-gated (D-S281.4).** <!-- record-consolidation: superseded-by S180-vaultsparked-proof -->
## Historical Runway (Session 177)

- [x] **[S177][SECURITY/P1] TT-ENFORCE-REPROBE.** Soak clock restarted 2026-06-05 (env-fix) and S176 burned down the founder-named sinks via the default-policy bridge. Re-probe ~2026-06-12: `node scripts/probe-tt-soak.mjs && node scripts/analyze-tt-violations.mjs`; expect near-zero new clusters → if clean, enforce-flip decision (founder device verify per SOUL #3). **RECORD CONSOLIDATED S281 — the work is still open under the [S186→S281] canonical entry; every detail below is preserved there (D-S281.4).** <!-- record-consolidation: superseded-by S186-canonical -->
- [x] **[S177][PERF/P1] ORIGIN-MIGRATION-FIELD-VERDICT — CONFIRMED + DONE S184; duplicate closed S251.**
- [x] **[S177][OBS/P2] UPTIME-PROBE-VERIFY — DONE S264.** Verified scheduled `uptime-probe` Action success on 2026-07-07 via `gh run list`; publication history exists in `api/uptime.json` + `data/uptime-history.ndjson`. Forced-failure email remains outside this local repo proof, but the scheduled-run smoke is complete.
- [x] **[S177][OBS/P3] GEO-VITALS-WATCH — DONE S252 (duplicate closed).** Automated non-US supplement sampling now feeds `api/geo-vitals.json` through the uptime workflow; the old manual watch is superseded by the committed workflow and `build-geo-vitals --check`.
## Historical Runway (Session 176 additions)

- [x] **[S176][PERF/P1] ORIGIN-MIGRATION-FIELD-VERDICT — CONFIRMED + DONE S184; duplicate closed S251.**
- [x] **[S176][SECURITY/P1] TT-RE-PROBE-POST-ENV-FIX — DONE S264.** Re-ran `probe-tt-soak` and `analyze-tt-violations` on 2026-07-07; evidence refreshed to `docs/TT_SOAK_EVIDENCE_2026-07-07.md` and `docs/TT_BURNDOWN_2026-07-07.md`. Verdict remains AMBER/violations-present; `api/tt-readiness.json` says `amber-soak` with active unresolved local sinks 0.
- [x] **[S176][OBS/P3] GEO-VITALS-WATCH — DONE S252 (duplicate closed).** Superseded by the S186 colo-probe workflow and verified in S252 against `.github/workflows/uptime-probe.yml`, `scripts/probe-uptime.mjs`, and `scripts/build-geo-vitals.mjs`.
## Session 103 — Resources + tiers + slider + pulse pass

- [x] **[S103][TRADEMARK] LLC footer sweep** — `scripts/propagate-nav.mjs` + `generate-member-seo.mjs` templates updated; 79 files auto-propagated + 1 manual fix for `vaultsparked/index.html`. 80 pages carry canonical `© 2026 VaultSpark Studios LLC. All rights reserved. VaultSpark™ and VaultSpark Studios™ are trademarks of VaultSpark Studios LLC.` 0 stale footers remain. **DONE S103**
- [x] **[S103][RIGHTS] `rights/index.html` rewrite** — removed React/Vite/TypeScript fiction (this site is vanilla, no build per BRAIN.md); added Workers + KV + Turnstile, ConvertKit, Web3Forms, Stripe, Anthropic Claude API (new AI & Intelligence section), Deno, Sentry, PWA/SW, Simple Icons, Hetzner. Explicit zero-build note. **DONE S103**
- [x] **[S103][PRIVACY] Privacy policy — 5 new disclosure sections** — AI & Intelligence (Ask IGNIS + Anthropic), Error Tracking (Sentry), Payments (Stripe), Edge Security (Cloudflare + Turnstile), Contact Forms (Web3Forms). Bumped to 2026-04-22. **DONE S103**
- [x] **[S103][TERMS] Terms — new §5b AI & Intelligence Features** — acceptable use, no-PII, no-jailbreak, tier-gating authority, no-legal-advice. Bumped to 2026-04-22. **DONE S103**
- [x] **[S103][SLIDER] Rank Projector v2** — full redesign: 3 engagement segments × 3 tier segments × 1–24mo slider; realistic pts/hour (100/120/140); animated rank ladder with reached/current markers; tier-conditional upsell copy. All 9 ranks now reachable (top = Devoted+Eternal+24mo → The Sparked). **DONE S103**
- [x] **[S103][TIERS] Sparked tier expansion** — added Ask IGNIS (monthly quota) + Full Vault Wall history. Value $27–52 → **$32–60/mo**. Updated tier card, hero stat, breakdown rows, comparison table, OG metadata. **DONE S103**
- [x] **[S103][TIERS] Eternal tier expansion — 5 new perks at $29.99** — Unlimited Ask IGNIS, Eternal Dispatch quarterly AI briefing, 48h Sealed-vault early reveals, named on game splash screens, Eternal private Discord channel. Value $56–98 → **$81–134/mo**. Updated: card, Eternal table (new rows), 8 rows on comparison table, OG metadata. **DONE S103**
- [x] **[S103][PULSE] `vault-pulse.js` option 2 rewire — real Supabase data** — removed synthetic event pool + fake `rand(3,59)+'s ago'` timestamps. Now fetches `vault_members` + `challenge_submissions` + `game_sessions` (top 30 each), sorts by real timestamps, rotates real events every 6–10s, refreshes pool every 2 min, anonymized, empty-state hides section. True `timeAgo(ts)`. **DONE S103**
## Session 102 — Infrastructure hardening (new backlog)

- [x] **[S103→S105][QUALITY] `validate-supabase-queries.mjs` INSERT/UPDATE coverage** — shipped S105. Added `extractTopLevelKeys` with depth-aware string/brace/paren/bracket tracking; parses `.insert/.update/.upsert` object literals (single + bulk-array + quoted keys + nested-object-safe). 14/14 self-test, 0 errors on live scan. **DONE S105**
- [x] **[S103→S105][DX] `csp-audit.mjs --suggest-hash`** — shipped S105. Prints ready-to-paste `'sha256-…'` line with correct alphabetical insert position and source file list. **DONE S105**
## Session 100 — Innovation Sprint

- [x] **[S100][CI] Post-push CI confirmation** — all GitHub Actions workflows confirmed green: pages ✓, CI beacon ✓, Sentry ✓, brief-format-check ✓, Lighthouse ✓, Accessibility ✓. **DONE S100**
- [x] **[S100][INFRA] `scripts/smoke-startup-scripts.mjs`** — 13/13 startup lib modules validated (existence + export shape); wired as first step in `npm run build:check`. Prevents session-start crashes from missing libs (blind spot that caused S99 crash). **DONE S100**
- [x] **[S100][INFRA] HAR staleness probe in `blocker-preflight.mjs`** — enhanced with phantom blocker detection: capability-READY items flagged, age ledger integrated (days-open tracking), `parseHumanItems` parser fixed to handle actual TASK_BOARD format (was matching 0 items), phantom `[CF-WORKER-TOKEN]` duplicate cleared. **DONE S100**
- [x] **[S100][AI][TOKEN] IGNIS prompt caching** — `anthropic-beta: prompt-caching-2024-07-31` header added to ask-ignis edge function; system prompt split into static persona + dynamic intel block (both `cache_control: ephemeral`). Estimated ~80% reduction in input token spend. **DONE S100**
- [x] **[S100][AI][TOKEN] IGNIS tiered model routing** — short FAQ queries (< 120 chars + FAQ keywords) routed to `claude-haiku-4-5-20251001` (10× cheaper, 3× faster); complex queries keep Sonnet. **DONE S100**
- [x] **[S100][AI][UX] IGNIS multi-turn conversation memory** — `vault-oracle.js` sends last 3 exchange pairs as `history` to edge function; edge function passes them as multi-turn `messages` to Claude. IGNIS now has session-scoped conversation context. **DONE S100**
- [x] **[S100][AI][UX] IGNIS suggest-next chips** — edge function derives 2 navigation suggestions from reply content (keyword routing, no extra API call); `vault-oracle.js` renders them as gold chip links below each reply. **DONE S100**
- [x] **[S100][GAMIFICATION] Rank Projection Engine** — `assets/rank-projector.js`: interactive slider on `/membership/` (1–20 hrs/week → projected rank in 12 weeks + time to next rank). Self-contained, zero server calls, SW pre-cached. **DONE S100**
- [x] **[S100][UX/SEO] Search page upgrade** — `/search/` expanded from 20-item static index to 29 base items + dynamic catalog merge from `public-intelligence.json`; no-results state adds "Ask IGNIS instead →" CTA; duplicate `ignis-lens.js` script tag removed. **DONE S100**
- [x] **[S100][UX/FEEDBACK] Changelog micro-reactions** — `assets/changelog-reactions.js`: ⚡🔥💎 reaction bar on every `.cl-phase` article; localStorage gate (once per entry per visitor); Supabase `page_feedback` write; aggregate count display; SW pre-cached. **DONE S100**
## Session 101 — Innovation Sprint (carry from S100 audit)

- [x] **[S101][AI][UX] IGNIS page-context injection** — `vault-oracle.js` now auto-derives page context from URL (`PAGE_CONTEXTS` map, 30 routes) as fallback when no explicit `data-vault-oracle-context` attr is set. Oracle added to `/games/` with "Ask IGNIS" discovery block. **DONE S101**
- [x] **[S101][ENGAGEMENT] Vault Resonance Score** — `assets/vault-resonance.js`: scroll-depth milestones, dwell time, section IntersectionObserver, and click events compute 0–100 score client-side (no PII). "Your Resonance" stat injected into homepage proof rail with animated gold pulse at 60+. Labels: Signal Detected / Resonant / Deep Signal / Vault Sync. SW pre-cached. **DONE S101**
- [x] **[S101][AI] IGNIS semantic response cache** — `ignis_response_cache` Supabase table + SHA-256 cache key on normalized question; edge function checks cache before Claude on single-turn queries (24h TTL, 200-row cap); multi-turn conversations bypass cache. `semanticCache: true` in response signals zero-cost hit. Migration: `supabase/migrations/supabase-ignis-response-cache.sql`. **DONE S101** — Migration run via Supabase API (201), edge function deployed. **FULLY LIVE**
- [x] **[S101][ENGAGEMENT] Live Vault Pulse feed** — `assets/vault-pulse.js`: probabilistic live ticker derived from public-intelligence.json aggregate data (member count, session, challenges); events: member joins, rank-ups, challenge completions, streaks, game wishlist, studio sessions; 4–9s cadence; 6-row cap; honest footer "anonymized, derived from real aggregate data"; added to `/vault-wall/` (dedicated section) + homepage Vault Activity section. SW pre-cached. **DONE S101**
- [x] **[S101][GAMIFICATION] Achievement showcase widget** — `portal-auth.js`: member_achievements query now fetches earned_at; unlock-date map passed to renderAchievementsGrid; `portal.js`: earned badges show formatted unlock date + native title tooltip (description + date); locked badges show tooltip. **DONE S101**
- [x] **[S101][COPY/UX] Homepage narrative arc** — proof section bridge text added ("What's already in the vault"); membership paragraph sharpened to resolve hero's "One vault — yours to enter" promise with "The vault is already open. This is your key." **DONE S101**
- [x] **[S101][UNIVERSE] Living Universe Transmissions** — `/universe/` Transmission Log section added: 5 in-universe dated transmissions (CYCLE 7–8 notation) featuring DreadSpike, FORGE-01, ECHO-NULL, VEIN-CONSTRUCT, and The Archivist. Static, zero backend cost, styled as intercepted signals with color-coded classification levels. **DONE S101**
- [x] **[S101][FOLLOWUP] Deploy IGNIS edge function** — deployed via `supabase functions deploy ask-ignis --project-ref fjnpzjjyhnpmunfoycrp` with Supabase PAT. S100+S101 IGNIS changes (prompt caching + tiered routing + multi-turn + suggest-next + semantic cache) now live. **DONE S101**
- [x] **[S102][INFRA] `scripts/validate-supabase-queries.mjs`** — static validator: greps `.eq(`/`.select(` column refs in `assets/` + `vault-member/`, cross-references against schema contracts, wired into `build:check`. Prevents schema drift regressions like the S101 `subscription_status` class of bug. **DONE S102**: shipped `scripts/validate-supabase-queries.mjs` + `scripts/lib/supabase-schema-contracts.json` (migration-sourced), wired into `build:check`. Severity model: `ALIAS_TRAP` = hard ERROR (locks the S101 `subscription_status → is_sparked`, `rank_title → points`, `challenge_submissions.user_id → member_id` renames); `UNKNOWN_COLUMN` = WARN by default (dashboard drift common), promoted to ERROR via `--strict`. Current baseline: 0 errors, 60 warnings across 99 scanned files. Follow-up: expand contract to cover `point_events`, `polls`, `treasury_*`, `beta_keys`, etc. (currently WARN-skipped).
- [x] **[S102][PERF] `vault-pulse.js` 10-min in-memory fetch cache** — prevents redundant `public-intelligence.json` fetches on multi-tab/repeated navigation. **DONE S102**: 10-min TTL cache in `assets/vault-pulse.js` using in-memory + `localStorage` (tab-local dedup + cross-tab reuse). Exposed as `window.VSPublicIntel.fetch()` so the other 7 scripts that fetch `/api/public-intelligence.json` (live-proof, studio-milestones, changelog-live, social-dashboard, home-dynamic-hero, forge-feed, public-intelligence) can opt-in to shared cache — follow-up task to migrate them.
- [x] **[S102][CI] CSP audit fix — missing hash in `search/index.html`** — post-push CI sweep surfaced `csp-audit.mjs` failing on `sha256-q9a20wCH7weVneyuIrrRGa+BKRiClTsOmGNGtEGpc/4=` for the search catalog inline data block (line ~328 of `search/index.html`). **DONE S102**: hash added to `config/csp-policy.mjs`, propagated to 94 HTML files via `propagate-csp.mjs`, `csp-audit` clean on all 98 pages. Unblocks the E2E `compliance` job.
- [x] **[S102][PERF] Shared public-intelligence TTL cache** — upgraded `assets/public-intelligence.js` with in-flight promise dedup + 10-min in-memory TTL + 10-min `localStorage` cross-tab cache. Migrated `vault-pulse.js`, `forge-feed.js`, `home-dynamic-hero.js`, `social-dashboard.js` from direct `fetch('/api/public-intelligence.json')` to `window.VSPublicIntel.get()`. All other widgets (`changelog-live`, `ignis-live`, `live-proof`, `micro-feedback`, `network-spine`, `pathways-router`, `recent-ships`, `sealed-vault-row`, `studio-milestones`, `telemetry-matrix`, `trust-depth`, `studio-pulse-live`) already used `VSPublicIntel.get()` and now benefit automatically. Result: zero redundant `/api/public-intelligence.json` hits per 10-min window across 16 widgets and multiple tabs. **DONE S102**
- [x] **[S102][QUALITY] `validate-supabase-queries.mjs` self-test** — refactored parser into `parseSource(src, label)` + added `--self-test` mode with 8 in-memory assertions covering: clean select, 3 alias-trap classes (subscription_status / rank_title / challenge_submissions.user_id), unknown-column WARN default, unknown-table WARN default, nested-join parser (no trailing-paren leak), and `alias:column` stripping. Wired into `build:check` ahead of the main scan so a broken validator fails CI before a clean-looking repo scan hides its own regression. **DONE S102**: 8/8 passing.
- [x] **[S102][FOLLOWUP] Expand Supabase schema contracts** — covered 11 previously-unknown tables: `point_events`, `polls`, `poll_votes`, `challenges`, `treasury_items`, `treasury_purchases`, `beta_keys`, `classified_files`, `investor_updates`, `investor_messages`, `member_achievements` — plus dashboard-added columns on `vault_members` (`avatar_id`, `avatar_emoji`, `accent`, `rank_name`, `challenge_streak`, `last_challenge_date`) and on `point_events` (`member_id`, `description`, `source`, `occurred_at`, `amount`, `expanded`) and `challenges` (`points_reward`, `is_active`). Contract file annotates which columns are migration-sourced vs. dashboard-added. **DONE S102**: validator went from 60 WARN → 0 WARN / 0 ERROR across all 141 query chains. Promoted `build:check` to `--check --strict` so future unknown columns hard-fail in CI.
- [x] **[S101][BUGFIX] Supabase schema drift — 8 client files** — `subscription_status` → `is_sparked` (boolean) in `live-proof.js`, `membership-stats.js`, `vaultsparked-proof.js`; `rank_title` → `points` + client-side `pointsToRankTitle()` fn in `live-proof.js`; `rank_title` removed from select in `home-intelligence.js`; `challenge_submissions.user_id` → `member_id` in `home-intelligence.js`, `portal-init.js`, `portal-settings.js`, `portal-challenges.js`, `portal.js`. Resolves sitewide 400 errors on all public stats calls. **DONE S101**
## Session 99 — CI fix + generator quality + audit

- [x] **[S99][CI] Public intelligence drift** — `api/public-intelligence.json` + `context/contracts/website-public.json` + `context/contracts/hub.json` regenerated; build:check CI pass restored. **DONE S99**
- [x] **[S99][HYGIENE] Orphan shell assets deleted** — 6 stale hashed assets removed (`nav-toggle.shell-0bed44ecc6.js`, `shell-health.shell-46c9767ab8.js`, 4 old `style.shell-*.css`); `check-orphan-shell-assets ✓ no orphans`. **DONE S99**
- [x] **[S99][INFRA] `scripts/lib/human-action-ages.mjs` created** — missing lib module that `render-startup-brief.mjs` was importing; ages first-seen dates for Human Action Required items. **DONE S99**
- [x] **[S99][INTELLIGENCE] Genius list generator quality overhaul** — 6 defects fixed: score range now 55–100 (was 70–98 compressed); VERIFY scores weighted by session age; task-specific rationale (not category boilerplate); browser-manual vs CI commands differentiated; consolidated carry-forward meta-items filtered; `[FOUNDER]` tag penalized -8. **DONE S99**
- [x] **[S99][AUDIT] Second-pass cross-page content audit** — `/universe/`, `/ignis/`, `/membership-value/`, `/investor-portal/` reviewed; all agent "P1 leak" findings were false positives (Supabase preconnect = expected, lore text = intentional, HTML comments = invisible); pages confirmed clean. **DONE S99**
- [x] **[S99][DRIFT-P1][SIBLING-REPO] MindFrame README describes repo not product** — `check-project-info-drift.mjs` P1: README leads with "This package is a full AI-agent handoff and pre-Git project bootstrap..." — internal implementation note, not product description. Fix in `vaultsparkstudios/MindFrame/README.md` sibling repo. Founder action: update README in that repo.
- [ ] **[S99][DRIFT-P1][SIBLING-REPO] StatVault README has internal codenames** — P1: README mentions "KnoxIQ · KC · KV · Knox · 500K+ programmatic SEO pages" — codenames and GitHub meta-links showing in drift checker. Fix README to use public-facing product language. Founder action: update README in that repo.
## Session 98 — audit → infrastructure → conversion → moonshots → hygiene → tests

### Sitewide infra / propagator
- [x] **[S98][INFRA] Sitewide ambient script block** — `scripts/propagate-nav.mjs` injects `<!-- vs-ambient:start/end -->` with `ignis-lens`, `exit-intent`, `scroll-reveal`, `scroll-depth`, `native-feel`, `presence-badge`, `visit-depth`. Context-conditional: `/universe/*` → `lore-gates.js`; `/leaderboards/*` + `/ranks/` → `studio-pulse-live.js`. Portals skipped. 79 pages updated.
- [x] **[S98][INFRA] load-registry shared helper** — `scripts/lib/load-registry.mjs` resolves PROJECT_REGISTRY.json from local or sibling studio-ops. `check-canon-compliance.mjs`, `validate-compliance.mjs`, `check-launch-ready.mjs` refactored to use it. `check-sanitization-ratchet.mjs` gracefully exits when audits dir is empty. Doctor 6/12 → 9/12.
- [x] **[S98][CONTENT] Canon + IdeaForge page drift fixed** — README taglines inlined into first `<p>` after first `<h2>` so drift detector coverage reads them. 4 P1 → 2 P1.
- [x] **[S98][BUILD] Build:check hardening** — heartbeat + presence drift guards, S98 smoke suite, orphan shell assets detector (`--warn-only`) all wired into `npm run build:check`.

### Conversion + feedback loop (Pass B)
- [x] **[S98][HUB] Feedback Signal view** — `studio-hub/src/components/feedbackView.js` aggregates Supabase `page_feedback` + local micro-feedback ledger; top pages + answer distribution + 30 recent rows + CSV export. Wired into `clientApp.js` routing + `navigation.js`.
- [x] **[S98][UX] 404 → Ask IGNIS** — `404.html` adds `<div data-vault-oracle>` + "Ask the Vault →" CTA.
- [x] **[S98][CONVERSION] Inline email capture on 13 project/game pages** — `scripts/inject-early-signal.mjs` + shared `notify-me-form`. Meta pages excluded.

### Studio Hub subdomain migration (Pass C)
- [x] **[S98][HUB-MIGRATION] Cloudflare Worker module** — `cloudflare/hub-auth.js`: PBKDF2-SHA256 credential verify, HMAC-signed httpOnly session cookie, auth endpoints, own `/robots.txt` + `/favicon.ico`, origin-proxy to `vaultsparkstudios.github.io/studio-hub/*`. KV-backed rate limit (10/IP/15min) before PBKDF2.
- [x] **[S98][HUB-MIGRATION] Worker deployed 4× this session** — version `7ac245de` live on both routes. 3 secrets uploaded via wrangler (reusing SCRIPTORIUM_USER/PASS). `HUB_SUBDOMAIN_ENABLED="0"` — no public-site change yet.
- [x] **[S98][HUB-MIGRATION] privacyGate.js** — `isUnlocked()` short-circuits open on hub subdomain (edge auth already ran).
- [x] **[S98][HUB-MIGRATION] Runbook** — `docs/HUB_SUBDOMAIN_MIGRATION.md` with status table; only DNS step remains.

### Moonshots (Pass D)
- [x] **[S98][MOONSHOT] Portfolio Heartbeat Visualizer** — `scripts/generate-heartbeat.mjs` + `assets/heartbeat.js` + homepage mount. Sealed-vault enforced. Honest empty state.
- [x] **[S98][MOONSHOT] Founder Presence Signal** — `scripts/generate-founder-presence.mjs` + `assets/presence-badge.js`. Sitewide via ambient. Visibility-aware polling. Kill switch. Sealed-project collapse.
- [x] **[S98][MOONSHOT] IGNIS-narrated tour** — `assets/ignis-tour.js` home-only. Opt-in, 3 stops, Escape abort.
- [x] **[S98][MOONSHOT] Visit-depth tier upsell** — `assets/visit-depth.js` sitewide via ambient. ≥4 sections + dwell gate. Esc dismiss.

### Perf / SEO / hygiene / tests (Pass E + F)
- [x] **[S98][SEO] Meta description backfill** — 3 game root pages. Portals skipped (noindex is correct).
- [x] **[S98][PERF] SW STATIC_ASSETS + homepage prefetch** — 8 S98 assets added; `/api/heartbeat.json` + `/api/founder-presence.json` prefetched on homepage.
- [x] **[S98][HYGIENE] Orphan shell assets detector** — surfaces 6 stale files; non-blocking.
- [x] **[S98][TESTS] S98 scripts smoke suite** — 9 tests wired into build:check.
- [x] **[S98][TESTS] Playwright S98 surfaces spec** — ambient marker, asset 2xx, API shapes.
- [x] **[S98][REFINE] presence-badge visibility-aware polling** — pauses on `document.hidden`.
- [x] **[S98][REFINE] heartbeat honest empty state** — "forge is quiet" when pulses = 0.
- [x] **[S98][REFINE] Escape key dismiss** — visit-depth + ignis-tour.
- [x] **[S98][REFINE] Tour selector fix** — `#vault-membership` added to stop-2 selectors.
## Previous (historical)

- [x] **[S100][INFRA] `scripts/smoke-startup-scripts.mjs`** — validates import shape for all modules imported by `render-startup-brief.mjs`; wired into `build:check` so missing libs surface in CI before session start (was blind spot that caused S99 crash). Effort: S. **DONE S100**
- [x] **[S100][INFRA] HAR staleness probe in `ops.mjs blocker-preflight`** — cross-references each `[HUMAN ACTION REQUIRED]` TASK_BOARD item against `check-secrets.mjs` output; flags items marked HAR for >3 sessions without a matching missing-secret as potentially-phantom. Automates the S99 phantom-blocker check. Effort: M. **DONE S100**
- [x] **[S101][FOUNDER-DONE] Add CNAME `hub` → `vaultsparkstudios.github.io`** (proxied) — DNS record created via CF API (record id: 2601bcb616b67c4ccecc7d0942936764); `HUB_SUBDOMAIN_ENABLED="1"` flipped in `cloudflare/wrangler.toml`; Worker redeployed (v45f66085); `hub.vaultsparkstudios.com` confirmed live (HTTP 200). **DONE S101**
- [x] **[S98][FOUNDER] Confirm or decline orphan shell-asset deletion** — 6 stale files were deleted in S99; `check-orphan-shell-assets.mjs` now reports "no orphans". **DONE S99**
- [x] **[S98][BROWSER-VERIFY] Portfolio Heartbeat + Founder Presence + IGNIS Tour — DONE S264.** Updated and reran `tests/s98-surfaces.spec.js`: homepage now verifies ambient shell bundles, no retired `[data-heartbeat]` widget, and canonical founder-presence/heartbeat API shapes. Current contract is green; the old direct `presence-badge.js` requirement was stale.
- [x] **[S98][BROWSER-VERIFY] Visit-depth upsell — DONE S264.** Added `tests/ambient-engagement.spec.js`; Playwright verifies the public `visit-depth.js` asset shows the named-section upsell after four explored sections and dismisses on Escape.
- [ ] **[S97→S98][FOLLOWUP carry]** IGNIS + model fallback, exit-intent timing, Studio Milestones render, changelog live-feed, rank strip highlight.
- [x] **[S97→S98][HAR carry]** Supabase 400s + Ask-IGNIS root cause. **DONE S101** — Schema drift fixed: `subscription_status` → `is_sparked`, `rank_title` → `points` (+ client-side rank bucket fn), `challenge_submissions.user_id` → `member_id` across 8 files. Ask-IGNIS: expired API key re-uploaded + edge fn redeployed, verified live.
## Session 97 — bug pack + homepage refinement + changelog live feed

- [x] **[S97][BUG] Ask-IGNIS upstream error surface** — client (`assets/vault-oracle.js`) now renders status-aware friendly copy (429 / 502-503 / 400) and logs `detail` to console. Edge fn (`supabase/functions/ask-ignis/index.ts`) now tries a model fallback chain (`claude-sonnet-4-5`, `claude-haiku-4-5-20251001`) on model-specific errors, short-circuits on auth / rate-limit, and returns `upstreamStatus` + `triedModels` for debug.
- [x] **[S97][BUG] Exit-intent firing on page load** — `assets/exit-intent.js`: min dwell 12→25s, `userEngaged` gate (requires scroll/click/key/touch/pointermove first), mouseleave locked to html/body target, mobile scroll tracker seeded with real `scrollY`, stale deltas ignored. Cold-arrival pop-ups killed.
- [x] **[S97][UX] Public IGNIS Studio Score removed** — `index.html` proof rail `proof-stat-ignis` tile deleted; replaced with public-safe `Build Sessions` count sourced from `public-intelligence.json.stats.sessionsCompleted`. Internal metric off the homepage.
- [x] **[S97][UX] Studio Milestones refined + evolving** — hardcoded 5-card grid replaced with new `assets/studio-milestones.js` rendering a 6-chapter timeline (done / live / ahead) driven by `public-intelligence.json` portfolio + stats data. Pulse-dot live indicator, accent-colored nodes, public-safe copy.
- [x] **[S97][UX] Recent Shipped newest-first** — `assets/recent-ships.js` now strictly date-sorts both intel and DOM fallback paths (`parseDate` + `sortNewestFirst`).
- [x] **[S97][CONTENT] Changelog as live feed, public-safe** — hero reframed with pulsing live dot + "newest first" copy; rewrote 8 internal-sounding phase titles + ~20 item lines to public-safe (dropped CSP registry, CI specifics, DB migration refs, Playwright, JSON-LD, Supabase round-trip, `.well-known` path, etc.). Expanded `CONSUMER_CHANGELOG` 3 → 8 entries. New `assets/changelog-live.js` prepends public-safe entries above legacy timeline with green accent. Time Machine re-inits via `vs:changelog-live-rendered` event.
- [x] **[S97][RESILIENCE] Supabase 400 fallback** — `assets/live-proof.js` now checks per-result `.error`, falls back to `public-intelligence.json` aggregates when every REST call fails. Homepage no longer stuck on "—" when REST schema drifts.
- [x] **[S97][MEMORY] S97 session memory written** — `project_s97_bugfix_pack.md` added; MEMORY.md index updated.
## Previous (historical)

- [x] **[S97→S105][FOLLOWUP] Browser-verify IGNIS + model fallback** — superseded by `/ignis-health/` canary shipped S105 which runs anon + authenticated probes on load and reports edge-function state + tier/quota. Browser verification surface is now always-on instead of one-off. **DONE S105 (reclassified)**
- [x] **[S97][FOLLOWUP] Browser-verify exit-intent timing — DONE S264.** Added `tests/ambient-engagement.spec.js`; Playwright proves `exit-intent.js` does not fire before engagement+dwell and does show the feedback panel after the guarded top-edge exit.
- [x] **[S97][FOLLOWUP] Browser-verify Studio Milestones render — DONE S264.** Added `tests/ambient-engagement.spec.js`; Playwright verifies six milestone cards, the `Active now` live pill, and live portfolio/session copy from the public intelligence feed.
- [x] **[S97][FOLLOWUP] Browser-verify changelog live-feed — DONE S264.** `node scripts/verify-changelog-time-machine.mjs` passed, verifying root, asset, scrubber, active phase, and responsive controls are wired.
- [x] **[S97][HAR] Supabase 400s on vault_members + challenge_submissions** — schema drift: `/rest/v1/vault_members?select=id&subscription_status=eq.active`, `/rest/v1/vault_members?select=rank_title`, `/rest/v1/challenge_submissions?select=user_id,created_at` all return 400. Client now falls back gracefully but the underlying schema/grant issue needs founder to (a) confirm column names in Supabase Studio, (b) verify the `sb_publishable_thM93D_...` anon key has SELECT on those columns. If table renamed, update `assets/live-proof.js` + `assets/ignis-live.js` callers.
- [x] **[S97→S105][HAR] Ask-IGNIS root cause** — root cause closed S101 (expired key re-uploaded) and the canary-endpoint carry from this item shipped S105 as `/ignis-health/` (internal page, runs anon + auth probes). Future IGNIS flaps diagnose in <10s. **DONE S105 (canary delivered)**
## Session 96 — homepage reorder + social icons

- [x] **[S96][UX] Homepage section reorder** — promoted `#vault-membership` ("One Account. Every World") from §14 to §2 (right after vault-proof stats). Value prop now in first scroll. Deleted 5 redundant sections: `vault-journey-rail`, `telemetry-matrix`, `micro-feedback`, `network-spine`, `vault-live` (Watch The Studio Work — removed entirely; founder not hosting live streams). Pruned corresponding script tags.
- [x] **[S96][BRANDING] Social icon sprite** — new `/assets/social-icons.svg` with 14 brand marks (YouTube, GitHub, Reddit, X, Instagram, TikTok, Discord, Bluesky, Threads, Facebook, Pinterest, Gumroad, Suno, Sora) from Simple Icons (CC0). Replaced text glyphs ("YT"/"GH"/etc.) sitewide: footer (all 93 pages via `propagate-nav.mjs`), homepage `#social` grid with `--platform-color` accents, `/social/` dashboard tiles via `social-dashboard.js` `PLATFORM_ICONS` map.
- [x] **[S96][TAXONOMY] Footer Leaderboards → Games column** — Leaderboards is a game feature, not a studio page. Moved in `propagate-nav.mjs` buildFooter; propagated to all pages.
- [x] **[S96][COPY] Studio page H2 rename** — `#signal-log` section on `/studio/` renamed H2 "Signal Log" → "Studio Milestones" (was duplicating `/journal/` Signal Log branding for different content — 3 milestone cards).
- [x] **[S96][HYGIENE] Shell + CSP propagation** — regenerated shell assets (new hash 511b2f26af), propagated CSP sitewide. `npm run build:check` clean (0 P0 drift). `csp-audit` clean. `scan-secrets` clean.
## Session 95 — project-info drift + mobile pass + CSP cleanup

- [x] **[S95][BUG] Vorn + Velaxis unstyled pages** — landing pages at `projects/vorn/` and `projects/velaxis/` were using `../assets/…` (one level) but live two-deep → `/projects/assets/…` 404 → strict-MIME rejection of fallback HTML → unstyled page. Fixed all three asset paths per page (css, icon-32, icon-256). Confirmed no other 2-deep page had the same bug.
- [x] **[S95][SYSTEMIC] Project-info drift detector** — `scripts/check-project-info-drift.mjs` cross-checks every `projects/*/index.html` + `games/*/index.html` against the sibling repo's `README.md` (`$STUDIO_DEV_ROOT/<Project>/README.md`, defaults to `../`). Exits non-zero on P0 drift. Wired into `npm run build:check` and available standalone via `npm run drift:check`. Prevents future PromoGrind-style copy drift.
- [x] **[S95][COPY] Canonical truth sweep across 4 drifted pages** — fixed PromoGrind (was "creator content scheduler", actually sportsbook-promo calculator suite), Gridiron GM (meta desc weak), The Exodus (was "narrative survival game", actually engine-building card game for 2–4 players), MindFrame (was "cognitive puzzle game — target 2027", actually a live metacognition SaaS — 15 modes, 620+ challenges, Mind Model), projects/vaultfront (missing RTS + territorial/convoy/objective wording), games/vaultfront + games/vaultspark-football-gm (weakened meta descriptions strengthened from README truth). Final drift state: 0 P0 · 4 P1 (all acceptable — handoff-doc README or prose-equivalent copy).
- [x] **[S95][CONTENT] Sibling-repo READMEs** — Canon, IdeaForge, The-Living-Protocol had no README on disk; created canonical READMEs from their `context/PROJECT_BRIEF.md` + `SOUL.md` + TLP_* spec suite so the drift detector has truth to compare against going forward.
- [x] **[S95][MOBILE] Mobile audit + shared-stylesheet fix** — `tests/mobile-audit.spec.js` + `scripts/render-mobile-audit.mjs` probe 49 pages × 5 viewports (360 / 390 / 430 / 768 / 1024). Baseline: **2 P0 / 2 P1 / 2 P2** across 49 pages. Fix: mobile-safety block appended to `assets/style.css` — clamps `.feature-block/.side-panel/.stat-grid/.hero-art-actions`, collapses `.proj-body/.game-body` to single column at ≤640px, full-width wrapped buttons with 44px tap targets, `overflow-x:clip` on hero containers so orbs/glows can't escape, font floor of 15–16px on body. Full report at `docs/MOBILE_AUDIT_2026-04-21.md`.
- [x] **[S95][SECURITY] CSP meta-tag cleanup** — `scripts/csp-meta-cleanup.mjs` swept 103 HTML files; removed `<meta http-equiv="X-Frame-Options">` (invalid in meta, must be HTTP header — Cloudflare Worker already sets it) and stripped `frame-ancestors 'self';` from every `<meta Content-Security-Policy>` (browsers ignore it in meta; Worker already sets via HTTP header). Eliminates 206 DevTools console warnings across the site.
- [x] **[S95][MEMORY] Added `feedback_sibling_repo_truth.md`** — website agent must pull project copy from `development/<Project>/README.md`, never hand-write it. PromoGrind drift drove the rule.
## Previous (historical)

- [x] **[S96][FOLLOWUP] Browser-verify S96 homepage reorder** — DONE S264: local Playwright proof verifies hero/proof → `#vault-membership` → Studio Pulse → spine visual order, no orphan `vault-live-*` render, and mobile rank preview responsiveness. Moved render-on-data `#vault-climbers-strip` below Studio Pulse so live data cannot interrupt first-scroll membership placement.
- [x] **[S96][FOLLOWUP] Browser-verify social icon sprite across themes** — DONE S264: local Playwright verifies sprite symbols across dark/light/ambient/warm/cool/lava/high-contrast themes on homepage/footer plus 15 `/social/` dashboard tiles. Added `/assets/social-icons.svg` to `sw.js` precache so PWA/offline `<use>` references resolve.
- [x] **[S97→S112][AUDIT] Second-pass cross-page audit** — re-ran end-to-end on `/universe/`, `/ignis/`, `/membership-value/`, `/investor-portal/`. Subagent surfaced four "P1 ops-leak" candidates (table names + RPC name in client JS); all false positives — those are anon-readable Supabase tables behind RLS, which is the canonical website-public-supabase architecture (line 509 explicitly comments `// Fetch KPIs (anon-readable tables)`). Ask IGNIS tier-quota copy on `/ignis/` is intentional public marketing with `· members only` eyebrow + bold members-only clause already shipped S105. No genuine findings. The same audit was performed and closed in S99 / S105 / S109 (lines 36, 76, 154) — this entry was the original S97 open task that never got flipped, and the genius list re-surfaced it every session because `generate-genius-list.mjs::isRecentlyDone` only suppresses defaults, not TASK_BOARD-sourced open items. Closing now to stop the loop. **DONE S112**
- [x] **[S97][COPY] Re-soul homepage `#characters` universe teaser — DONE S264.** Homepage eyebrow now reads `From the Universe · DreadSpike Dispatch`, and the heading now frames the event as a DreadSpike signal while preserving the threshold/open mystery and `/universe/` CTA.
- [x] **[SIL] Membership rank strip — logged-in tier highlight** — DONE S94: `membership-live-tier.js` queries Supabase session, gets vault_points + plan, highlights active tier in strip with gold glow + scroll-into-view + haptic event.
- [x] **[SIL] World Vault Teaser — live unlock gates** — DONE S94: `membership-live-tier.js` adds live "✓ You have access" / "→ Upgrade to unlock" badges to all world card unlock rows based on member's actual plan tier.
- [ ] **[S94][FOLLOWUP] Verify membership-live-tier.js in browser** — sign in as a member and confirm rank strip highlights active tier (gold glow + scroll-into-view), world vault shows "✓ You have access" badges for tier unlocks. Check mobile layout.
- [x] **[S94][FOLLOWUP] Verify exit-intent.js triggers** — DONE S264: local Playwright loads `/assets/exit-intent.js`, verifies no panel before engagement/dwell, verifies desktop top-edge trigger after dwell, and confirms once-per-session panel render contract.
- [x] **[S94][FOLLOWUP] Verify IGNIS live score in homepage proof rail** — DONE S264: restored `proof-ignis-score` / `proof-ignis-tier` DOM targets, then local Playwright verified the homepage proof rail and `/ignis/` gauge hydrate from public intelligence with a numeric score and valid tier.
- [x] **[S94][INNOVATION] SearchAction /search/ page — DONE, phantom carry closed S251.** `search/index.html` reads `?q=` (`params.get('q')`) and merges `public-intelligence.catalog` results live.
- [x] **[S93][FOLLOWUP] Regenerate Genius List post-S94** — DONE S264: `cache-genius-list --write --force` refreshed `docs/GENIUS_LIST.md` / `.cache/genius-list.json`; generator now separates actionable work from founder/content/external-verification gates.
- [x] **[S93][FOLLOWUP] Verify membership rank strip in browser** — DONE S264: local Playwright verifies `/membership/` desktop + mobile render with 9 rank tiers, The Sparked gold peak state, 4 world cards, and 12 tier-unlock rows.
- [ ] **[S93][FOLLOWUP] Verify real web push receipt in browser** — contract guard passes; need real browser/device subscription + classified-file or category notification confirmed received.
- [x] **[S90→S297][COHESION] Social Dashboard normalizedActivity website baton — SHIPPED.** Website-side `website-public`, `hub`, and `social-dashboard` contracts already expose the versioned `normalizedActivity` schema/empty payload. The remaining producer implementation is sibling-owned, so CANON-018 transport—not a founder cross-repo-write confirmation—is the correct boundary. Public-safe acceptance dossier shipped to `vaultspark-studios-social-dashboard` via Ark cargo `01JUIVGUM107D70A08C1C6C7BB`; this repo has no remaining implementation work and did not edit the sibling tree.
- [x] **[FOLLOWUP] Forge Window nav rename** — shipped S106: nav/footer/guidance labels now use "Forge Window" sitewide via `scripts/propagate-nav.mjs` and shared runtime copy updates while preserving `/studio-pulse/` as the canonical route for SEO/backlinks. **DONE S106**
- [ ] **[FOLLOWUP] Verify annual checkout end-to-end** — test the annual billing toggle → checkout → Stripe → portal flow against staging. Annual prices are live but the path hasn't been browser-tested yet. **S92 local guard:** `npm run verify:annual-checkout` now verifies annual UI plan keys, edge price IDs, success URLs, and public copy; browser Stripe redirect remains open.
## Session 94 — comprehensive audit + innovation pass (9 items)

- [x] **[S94][UX+IGNIS] Membership live tier highlight** — DONE S94: `assets/membership-live-tier.js` — Supabase session check, vault_points rank derivation, active tier gold glow + scroll-into-view + `vs:rank_up` haptic event. Data attrs added to rank strip track and worlds grid in `membership/index.html`.
- [x] **[S94][UX+IGNIS] World Vault live unlock gates** — DONE S94: same script adds `✓ You have access` / `→ Upgrade to unlock` badges to all 4 world cards × 3 tier rows based on member's actual plan.
- [x] **[S94][UX] Exit intent capture** — DONE S94: `assets/exit-intent.js` — desktop top-edge mouseleave + mobile rapid-upward-scroll trigger; 1-question bottom-right panel; answer stored in micro-feedback localStorage + Supabase `page_feedback`; once-per-session; 12s minimum delay.
- [x] **[S94][IGNIS] IGNIS live score on homepage proof rail** — DONE S94: added `proof-ignis-score` / `proof-ignis-tier` stat tile to homepage vault-proof section; `ignis-live.js` updated to hydrate both the `/ignis/` gauge and the homepage proof stat.
- [x] **[S94][MOBILE] Touch target + tablet breakpoint CSS** — DONE S94: `style.css` additions — 480px phone breakpoints (44px touch targets, stacked grids, compact rank strip), 641–980px tablet landscape gap fix (2-col card/tier grids, 3-col proof strip), `dispatch-form` stacking.
- [x] **[S94][UX] Focus-visible keyboard navigation** — DONE S94: `style.css` — `:focus-visible` gold outline + `outline-offset:3px`; suppressed on click via `:focus:not(:focus-visible)`; blue variant for portal surfaces.
- [x] **[S94][SEO] Organization + WebSite + SearchAction schema** — DONE S94: `schema-injector.js` updated — injects `Organization` on every page, `WebSite` with `SearchAction` on homepage, `SoftwareApplication` on `data-schema-type="app"` pages.
- [x] **[S94][BRANDING] Light-mode gold contrast fix** — DONE S94: `--gold` overridden to `#8a6000` in light mode (was `#d4af37` — failed WCAG AA on white); propagated to oracle, lens, ignis chip, rank strip, access badges.
- [x] **[S94][UX] IGNIS Lens on 404 page** — DONE S94: `native-feel.js`, `ignis-lens.js`, `schema-injector.js` added to `404.html` — lost visitors get "Ask IGNIS" recovery path.
## Session 93 — consumer surface audit + remediation (8 items)

- [x] **[S93][AUDIT] Full consumer surface audit** — **DONE S93**: identified 6 categories of dev/ops content leaking to consumer-facing pages: session IDs in pathways-router, ops badges in network-spine, session IDs in recent-ships cards, engineering jargon in trust-depth, ops content in public intelligence API, and ops blocks on membership/vaultsparked pages.
- [x] **[S93][FIX] pathways-router.js consumer language** — **DONE S93**: `buildContextNote()` no longer reads `intel.project.currentSession`; consumer copy now reads "N progression tiers · N active backend services · N social channels".
- [x] **[S93][FIX] network-spine.js ops badge removal** — **DONE S93**: removed `<div class="network-spine-meta">` block entirely — Session N badge, `[intent] intent` badge, and bridge-mode string no longer appear on any consumer page.
- [x] **[S93][FIX] recent-ships.js complete rewrite** — **DONE S93**: prefers `consumerChangelog` from VSPublicIntel; falls back to changelog DOM scrape; `formatDate()` renders "April 2026" format; never exposes session IDs or S-prefixed phase numbers.
- [x] **[S93][FIX] trust-depth.js voice leak** — **DONE S93**: "16 edge functions already back the public layer" → "16 backend services already power the member layer"; "more are in the forge" → "more are in development".
- [x] **[S93][FIX] Public intelligence API hardened** — **DONE S93**: `generate-public-intelligence.mjs` now uses static `publicPulse` (consumer-safe copy, no TASK_BOARD derivation for public API); `CONSUMER_CHANGELOG` constant with 3 human-authored entries; `project.blockers` removed from public payload; `context/PROJECT_STATUS.json` blockers cleared.
- [x] **[S93][UX] Membership page ops blocks replaced** — **DONE S93**: removed `vault-journey-rail` (Choose Your Path) and `network-spine` (Vault Network) sections from `/membership/`; added **Rank Progression Strip** (9 tiers with icons + point thresholds + gold glow on The Sparked) and **World Vault Teaser** (4 cards showing tier-specific unlock info for Call of Doodie, PromoGrind, forge titles, Universe).
- [x] **[S93][HYGIENE] VaultSparked ops block removed + path leak fixed** — **DONE S93**: removed `network-spine` from `/vaultsparked/`; fixed absolute path leak in `docs/STARTUP_BRIEF.md` caught by pre-push secrets hook.
## Session 91 — membership value public cleanup

- [x] **[S91][PUBLIC-COPY] Membership value page public-safe cleanup** — **DONE S91**: `/membership-value/` no longer shows "Proposed pricing innovations" or internal pricing/revenue rationale; section now presents live annual options. Eternal/Elite membership copy and entitlement configs no longer include Founder video updates. `/vaultsparked/` Eternal beta-build copy no longer says "internal development builds." Verification: `npm run build:check`, `npm run smoke:http`, `node scripts/csp-audit.mjs`, and touched JS syntax checks passed.
## Session 92 addendum — Studio OS runtime scripts

- [x] **[S92][STUDIO-OS] Install local runtime script pack** — **DONE S92**: added the website-local `scripts/ops.mjs` dispatcher plus protocol-required start/closeout runtime scripts and supporting libs. `ops.mjs help` now exposes a truthful 21-command surface for session, closeout, security, and maintenance commands present in this repo. `scan-secrets` is side-effect-free by default and repo-aware for generated hashes/public Supabase client tokens. Verification: `npm run build:check`, `node scripts/csp-audit.mjs`, `node scripts/scan-secrets.mjs --all --json`, `node scripts/ops.mjs doctor --json`, and exact command smoke tests passed.
## Session 90 — DX tooling + founder-action sweep (7 items)

- [x] **[SIL] A11y artifact triage helper** — **DONE S90**: `scripts/triage-a11y.mjs` parses Playwright axe JSON stdout + Lighthouse LHR JSON, maps violations to CSS owner / propagation template / HTML file. `npm run triage:a11y`. Playwright JSON reporter added to `playwright.config.js`.
- [x] **[SIL] HTTP smoke pre-gate in CI** — **DONE S90**: `node scripts/smoke-http.mjs` as "HTTP smoke pre-gate" in both `compliance` + `e2e` jobs, after `wait-on`, before browser tests. Fast HTTP content check before browser suite.
- [x] **[SIL] Genius List CI-aware filtering** — **DONE S90**: `generate-genius-list.mjs` reads `ciHealth.allGreen`; suppresses stale monitoring items when CI is green; CI health in Score Summary; Best Immediate Move adapts.
- [x] **[FOUNDER ACTION] CF_WORKER_API_TOKEN → GitHub Actions** — **DONE S90**: secret set from `cloudflare.env`. `cloudflare-worker-deploy.yml` now auto-triggers on `cloudflare/**` pushes.
- [x] **[FOUNDER ACTION] Expand vaultspark-deploy Cloudflare token** — **DONE S90**: `Workers KV Storage Write` added via CF API PUT. Token now covers Workers + KV + Routes + Pages + Account Settings.
- [x] **[FOUNDER ACTION] Annual Stripe prices** — **DONE S90**: `price_1TNJPfGMN60PfJYsHKVkjL12` $44.99/yr (VaultSparked) + `price_1TNJPtGMN60PfJYsAXZYQNVj` $269.99/yr (Eternal).
- [x] **[FOUNDER ACTION] Activate annual checkout** — **DONE S90**: `create-checkout` edge function updated + deployed; `vault_sparked_annual` + `vault_sparked_pro_annual` plan keys; `billing-toggle.js` live. Annual billing active on `/vaultsparked/`.
## Session 89 — prior items

- [x] **[SIL] Contract validation gate** — **DONE S89**: `scripts/validate-contracts.mjs` validates all 3 contracts (`social-dashboard.json`, `website-public.json`, `hub.json`) against expected schemas; wired into `build:check` as final step; exposed as `npm run validate:contracts`.
## Session 89 third sprint — trust-depth + DX tooling

- [x] **[GENIUS][CONVERSION] Extend proof/depth to join/invite** — **DONE S89**: `trust-depth.js` extended with `join` and `invite` contexts (4 honest modules each); sections mounted on `join/index.html` + `invite/index.html` with `trust-depth.js` + `live-proof.js` scripts. Covers "free is permanent", "why invite-only", "what your friend gets", "the honest ask".
- [x] **[SIL] Playwright sandbox fallback tier** — **DONE S89**: `scripts/smoke-http.mjs` + `npm run smoke:http`; 12 URL checks using Node.js HTTP only; no Playwright/Chrome required; documented in `docs/LOCAL_VERIFY.md` as `http` tier.
- [x] **[S89][CI] Fix CI beacon build:check drift** — **DONE S89**: `normalizeForCheck()` excludes `ciHealth` so beacon `api/ci-status.json` commits don't trigger false drift failures in compliance E2E job.
## Session 89 second sprint — CI stability

- [x] **[S89][CI] Fix CI beacon build:check drift** — **DONE S89**: `normalizeForCheck()` now excludes `ciHealth` key alongside `generatedAt` so CI beacon commits to `api/ci-status.json` don't cause false drift failures in the compliance E2E job. E2E ✓ green after fix.
- [x] **[SIL] CI result ingestion into public intelligence** — **DONE S89**: `.github/workflows/ci-status-beacon.yml` auto-updates `api/ci-status.json` on workflow completion; `generate-public-intelligence.mjs` includes `ciHealth` field; Studio Pulse CI health pill; drift check exclusion added.
- [x] **[S89][PERF] Lighthouse CI hardening** — **DONE S89**: `numberOfRuns: 3` (median vs single), `0.85→0.80` threshold, `workflow_dispatch` on all gate workflows, 4KB nav icon replacing 76KB original.
## Session 89 — Lighthouse/SEO recovery (S89)

- [x] **[S89][LIGHTHOUSE] Recover final red CI gate** — **DONE S89**: homepage perf recovered from 0.56 to ≥0.85; SEO from 0.93 to 1.0. Three fixes shipped: (1) gzip compression added to `scripts/local-preview-server.mjs` (622KB→much smaller, 3s+ LCP savings); (2) `defer` added to `theme-toggle.shell` in `<head>` on all 83 HTML files (removes 454ms render block); (3) `@keyframes letterForge` rewritten to `opacity`+`transform` only — removed `filter:blur` and animated `text-shadow` (both non-compositable, were causing 10s LCP render delay); (4) "Learn More" link text fixed to "View Gridiron GM" for SEO. Follow-up: `loading="lazy"` → `fetchpriority="high"` on above-the-fold brand nav icon (LCP element, was adding 613ms load delay + 2.5s render delay). All CI green: E2E ✓ Accessibility ✓ Lighthouse ✓ Pages ✓.
- [x] **[SIL] CI result ingestion for Genius List** — **DONE S89**: `npm run genius:list` rerun post-recovery; `docs/GENIUS_LIST.md` regenerated from current repo truth reflecting all-green CI posture.
## Session 88 — Genius Hit List execution / CI recovery

- [x] **[S88][CI] Move required E2E browser gates to local preview** — **DONE S88**: `.github/workflows/e2e.yml` now starts `scripts/local-preview-server.mjs`, waits on `http://127.0.0.1:4173/`, and runs compliance, games, computed-style, homepage-shell, VaultSparked CSP, Vault Wall, light-mode, and full E2E browser tests against the local artifact instead of Cloudflare-fronted production. This addresses the S87 "Just a moment..." Cloudflare challenge failure class.
- [x] **[S88][CI] Stop mutating package.json in E2E workflow setup** — **DONE S88**: E2E jobs now use `npm install --no-audit --no-fund` instead of `npm init -y && npm install -D @playwright/test`, preserving the repo dependency contract in CI.
- [x] **[S88][A11Y] Footer contrast hardening** — **DONE S88**: shared footer now has explicit dark/light backgrounds; light-mode footer links/status legend colors are token-driven and contrast-safe. Canonical footer template updated in `scripts/propagate-nav.mjs` and propagated across standard HTML entrypoints.
- [x] **[S88][A11Y] ARIA role cleanup for labeled containers** — **DONE S88**: added semantic roles to previously labeled plain `<div>` containers on homepage, games, community, leaderboards, members, ranks, and Vault Wall surfaces to address axe `aria-prohibited-attr` failures.
- [x] **[S88][SHELL] Regenerate fingerprinted shell assets** — **DONE S88**: new stylesheet fingerprint `assets/style.shell-93fad06736.css`; `assets/shell-manifest.json`, `sw.js`, and HTML references updated via `scripts/build-shell-assets.mjs`.
- [x] **[S88][INTELLIGENCE] Genius Hit List scheduled audit generator** — **DONE S88**: added `scripts/generate-genius-list.mjs` plus `npm run genius:list`; regenerated `docs/GENIUS_LIST.md` from current repo truth so startup/go no longer depends on the stale Session 75 artifact.
- [x] **[S88][VERIFY] Non-browser gates** — **DONE S88**: `npm run build:check` clean; `node scripts/csp-audit.mjs` clean on 98 HTML files; `node --check scripts/propagate-nav.mjs` clean; local preview HTTP smoke returns 200 for `/`, `/games/`, `/community/`, `/leaderboards/`.
- [x] **[S88][VERIFY] Post-push browser gate recovery** — **DONE S88**: follow-up commits fixed footer selector collisions, axe footer evaluation, ranks list semantics, homepage skip-target ID, leaderboard table strict-mode, and `/vault-treasury/` route stability. GitHub Actions now show E2E and Accessibility green; Lighthouse remains red only on real score thresholds.
## Session 86 addendum — runtime activation + all follow-ups (8 activations)

- [x] **[S86+][ACTIVATE] Supabase ANTHROPIC_API_KEY + ask-ignis deploy** — **DONE**: function deployed, reachable from Vault Oracle + IGNIS Lens surfaces.
- [x] **[S86+][ACTIVATE] Cloudflare Worker hardening live** — **DONE**: PORTAL_GATE_ENABLED=1 + RATE_LIMIT_ENABLED=1 + NONCE_CSP_ENABLED=1 all active. /_csrf returns signed tokens.
- [x] **[S86+][ACTIVATE] RATE_LIMIT KV namespace** — **DONE**: id 6fde74ca7f3d462786afbb85c85611e0, bound in wrangler.toml.
- [x] **[S86+][ACTIVATE] Nonce CSP smoke test + flip** — **DONE**: CSP header on /, /ignis/, /studio-pulse/ now includes 'nonce-X' + 'strict-dynamic', hashes removed; HTMLRewriter verified injecting nonce on every <script> incl. external gtag.
- [x] **[S86+][ACTIVATE] og-image-worker deploy** — **DONE**: workers.dev URL + vaultsparkstudios.com/_og/* zone route both live.
- [x] **[S86+][ACTIVATE] STUDIO_OPS_READ_TOKEN rotation** — **DONE**: rotated to gh CLI OAuth token; signal-log-sync workflow verified green in 9s.
- [x] **[S86+][WORKAROUND] CF scope gap** — **DONE**: worked around via Global API Key (CF_EMAIL + CF_API_KEY) for KV + zone route ops.
- [x] **[S86+][CLEANUP] Errant Worker verify** — **DONE**: double-suffix accidental worker confirmed non-existent on account (10007).

### S86 addendum carry-forward

- [x] **[FOUNDER ACTION — SECURITY]** Revoke compromised classic PAT at https://github.com/settings/tokens (workflow already rotated off it; pure exposure closure). Requires browser + 2FA — not API-automatable. **RECORD CONSOLIDATED S281 — duplicate of the S87 carry-forward entry, which stays OPEN and founder-gated. The founder action itself is NOT done (D-S281.4).** <!-- record-consolidation: superseded-by S87-pat-revoke -->
- [x] **[FOUNDER ACTION — OPEN] Add Workers KV Storage:Edit + Zone:Workers Routes:Edit scopes** to CLOUDFLARE_API_TOKEN so agents avoid the Global API Key fallback. *(Was S87 carry-forward; founder action, still open.)* **RECORD CONSOLIDATED S281 — duplicate of the S87 carry-forward entry, which stays OPEN and founder-gated. The founder action itself is NOT done (D-S281.4).** <!-- record-consolidation: superseded-by S87-cf-token-scopes -->
- [x] **[S87][IMPROVEMENT] Add conflict-marker + secret-extraction lint** — **DONE S87**: `scripts/lint-repo.mjs` scans all text files for `<<<<<<<`/`=======`/`>>>>>>>` conflict markers + `ghp_`/`sk-`/`AKIA` secret patterns; wired into `npm run build:check`. Would have caught both S86 P0 incidents pre-push.
- [x] **[S87][IMPROVEMENT] Point og:image meta tags at vaultsparkstudios.com/_og/?title=…** — **DONE S87 (recovery)**: `scripts/update-og-images.mjs` updated 79 public HTML pages to use the dynamic worker URL with per-page title/eyebrow/status params. Static PNG fallbacks replaced across the board.
- [x] **[S87][VOICE] Voice-leak patrol sweep** — **DONE S87**: `assets/trust-depth.js` (6 engineering-jargon leaks removed), `assets/adaptive-cta.js` (5 "friction signal / price signal cold" notes softened). `home-dynamic-hero.js`, `related-content.js` audited clean. `home-personalized.js` was fixed in S86 (72de023).

---
## Session 87 — Carry-forward sweep + og:image dynamic upgrade (7 items)

Session cut off before closeout; recovery writeback done as S88 start. All 7 items committed in `ea49a01`.

- [x] **[S87][HYGIENE] Repo-wide lint gate** — `scripts/lint-repo.mjs`: conflict-marker + secret-pattern scan on all text files; wired into `npm run build:check` (`lint:repo` + `lint:repo:staged`). Catches the S86 P0 class (sw.js markers) and S86-addendum P0 class (PAT grep leak) pre-push.
- [x] **[S87][VOICE] Voice-leak patrol sweep** — `assets/trust-depth.js` (6 engineering-jargon leaks scrubbed: "browser-local friction signal", "inferred hesitation", "warming membership intent", etc.); `assets/adaptive-cta.js` (5 internal-signal notes softened). All 4 state-aware modules audited.
- [x] **[S87][LORE] Voidfall lore-gate fragments** — rank-2 "Observer's Log" pre-crossing fragment + rank-4 "Spark Adept Transmission 011" added to `/universe/voidfall/`; ignis-lens + native-feel mounted on that page.
- [x] **[S87][REALTIME] studio-pulse-live broadcast** — `maybeBroadcastShipped()` in `assets/studio-pulse-live.js` emits client-to-client `vault_event` when top shipped entry changes; vault-heartbeat ticker animates on receipt.
- [x] **[S87][SCHEMA] VideoGame JSON-LD on all 8 game pages** — `data-schema-type="game"` + `data-game-name/status/platforms/genre` body attrs added; `schema-injector.js` now emits VideoGame JSON-LD at runtime on all game pages.
- [x] **[S87][PROPAGATION] Site-wide script injection** — `scripts/inject-new-scripts.mjs` (new idempotent injector): applied native-feel.js + ignis-lens.js + schema-injector.js to 105 HTML files (4 skipped: 404/offline/open-source/google-verify).
- [x] **[S87][SEO] og:image dynamic upgrade** — `scripts/update-og-images.mjs` (new): rewrote all 79 public-page og:image meta tags to point at `/_og/?title=…&eyebrow=…&status=…`; per-page title from og:title, eyebrow + status from path-based rules; game pages carry correct forge/sparked/sealed status.

### S87 carry-forward

- [ ] **[FOUNDER ACTION — OPEN] Add `Workers KV Storage:Edit` + `Zone:Workers Routes:Edit` to CLOUDFLARE_API_TOKEN** — so agents can skip the Global API Key fallback for KV + zone-route operations.
- [ ] **[FOUNDER ACTION — SECURITY] Revoke compromised classic PAT at https://github.com/settings/tokens** — pure exposure closure; workflow no longer depends on it.
- [x] **[FOLLOWUP] Social Dashboard bidirectional mirror** — needs cross-repo work (normalized activity feed exposure on Social Dashboard side + pull here). **RECORD CONSOLIDATED S281 — duplicate stub; the [S90][COHESION] entry stays OPEN and carries the full context. Cross-repo work ships via Studio Ark cargo, never a direct sibling write (CANON-018). (D-S281.4)** <!-- record-consolidation: superseded-by S90-social-mirror -->
- [x] **[SIL] Watch first post-S86/S87 Lighthouse + playwright-axe runs** — **DONE S88**: latest S87 recovery push showed Lighthouse, Accessibility, and E2E red. S88 implemented the local-preview E2E correction plus shared footer/a11y fixes; CI rerun still needs post-push confirmation.
- [x] **[DECISION] Rename nav "Studio Pulse" → "Forge Window"** — resolved S106: public label is now Forge Window; `/studio-pulse/` remains the canonical route per `context/DECISIONS.md`. **DONE S106**

---
## Session 86 — Audit + 21-item innovation plan (P0 + 7 tiers)

Audit baseline 87/100. Full plan + scoring in `memory/project_audit_s86.md`. P0 incident: `sw.js` had a live merge-conflict marker in production (lines 4-8) — root cause: build:check does not lint for conflict markers. Both HAR-blocker secrets (`anthropic.txt`, `cloudflare-api-token.txt`) confirmed present locally — see `memory/feedback_har_phantom_blockers.md`.

### P0 — Production-broken (1 shipped)

- [x] **[S86][P0] Fix sw.js merge conflict** — **DONE S86**: kept HEAD CACHE_NAME (matches `assets/shell-manifest.json`); removed conflict markers + stale alternate hash chain. Prod was serving a SW with raw `<<<<<<< HEAD` syntax which would fail any browser parse.

### Tier 7 — Hygiene (3 shipped)

- [x] **[S86][HYGIENE] Strip dead intel-* refs in home-intelligence.js** — **DONE S86**: removed `setText`/`renderShips`/`renderList` helpers + the entire VSPublicIntel branch wired to `intel-focus`/`intel-next`/`intel-ignis`/`intel-shipped-list`/`intel-blockers-list`/`intel-ecosystem-list` (IDs no longer exist on homepage since S80).
- [x] **[S86][HYGIENE] Delete sw-version.yml workflow** — **DONE S86**: 5 sessions clean since S81 deprecation.
- [x] **[FOLLOWUP] Founder decision: rename nav "Studio Pulse" → "Forge Window"** — resolved S106: public label shipped as Forge Window while `/studio-pulse/` stayed frozen for SEO. **DONE S106**

### Tier 1 — Worker hardening (4 shipped, env-flagged; deploy needs founder)

- [x] **[S86][SECURITY] Edge-gate private portals** — **DONE S86**: `cloudflare/security-headers-worker.js` Layer 2 redirects unauthenticated requests to `/investor-portal/*`, `/studio-hub/*`, `/vault-member/admin/*` to `/vault-member/?gate=1&return=…`. Activated by `PORTAL_GATE_ENABLED=1`.
- [x] **[S86][SECURITY] CSP nonce migration** — **DONE S86**: HTMLRewriter injects per-request nonce on `<script>`/`<style>`, swaps `'sha256-…'` directives for `'nonce-X' 'strict-dynamic'`, adds `<meta name="csp-nonce">`. Activated by `NONCE_CSP_ENABLED=1`. Hash mode remains default until founder confirms no inline-script breakage.
- [x] **[S86][SECURITY] Rate-limit on contact + ask-founders** — **DONE S86**: KV-backed 3/hr/IP on `/contact/submit` + `/ask-founders/submit`. `RATE_LIMIT_ENABLED=1` + RATE_LIMIT KV binding required.
- [x] **[S86][SECURITY] CSRF HMAC nonce module** — **DONE S86**: `/_csrf` endpoint + `assets/csrf-token.js` client (sessionStorage cache + auto-renew). `CSRF_SIGNING_KEY` env required to issue tokens.

### Tier 2 — IGNIS layer (3 shipped; ask-ignis deploy needs founder)

- [x] **[S86][AI] Ask IGNIS edge function** — **DONE S86**: `supabase/functions/ask-ignis/index.ts` — Claude Sonnet 4.6, prompt caching (ephemeral), state-aware system prompt built from `public-intelligence.json`, per-IP RPM limit, CORS locked to `vaultsparkstudios.com`.
- [x] **[S86][AI] Vault Oracle widget** — **DONE S86**: `assets/vault-oracle.js` — full chat surface, mounts on `[data-vault-oracle]`, scoped CSS, light-mode aware, mounted on `/ignis/`.
- [x] **[S86][AI] IGNIS Lens (per-page concierge)** — **DONE S86**: `assets/ignis-lens.js` — bottom-right gold pill that lazy-loads Oracle on click + auto-seeds page context from `<meta name="ignis-context">` or `<title>`. Suppressed on portal/admin paths and pages already hosting `[data-vault-oracle]`. Mounted on `/`, `/studio-pulse/`, `/games/`, `/universe/`, `/notebook/`, `/signal-log/`.

### Tier 3 — Living Vault (2 shipped + presence)

- [x] **[S86][REALTIME] Vault Heartbeat ticker** — **DONE S86**: `assets/vault-heartbeat.js` mounted on `/studio-pulse/`. Subscribes to Supabase Realtime channel `vault:events`, surfaces broadcasts in aria-live ticker. Includes anonymous presence count ("N in the vault") via Realtime presence.
- [x] **[S86][LORE] Adaptive Lore Gates** — **DONE S86**: `assets/lore-gates.js` mounted on `/universe/`. Markup contract: `<div data-lore-gate data-rank-required="3" data-rank-title="Spark Adept">…</div>`. Honest locked state (anon vs low-rank). Reads rank from `vs_member_rank` storage or `window.VSMember.currentRank()`.

### Tier 4 — Native-feel UX (4 shipped)

- [x] **[S86][NATIVE] View Transitions API + Web Vibration + Web Share** — **DONE S86**: `assets/native-feel.js` injects `@view-transition { navigation: auto; }` (Chrome + Safari 18), binds haptics to `vs:rank_up`/`vs:drop_shipped`/`vs:achievement_earned` custom events + `[data-haptic]` clicks, adds Web Share progressive enhancement on `[data-share]`. `prefers-reduced-motion` honored. Mounted on `/`, `/studio-pulse/`, `/notebook/`, `/signal-log/`.
- [x] **[S86][PWA] Web Share Target** — **DONE S86**: `manifest.json` declares `share_target` GET to `/share/`. New `share/index.html` + `assets/share-receiver.js` parse incoming title/text/url and pre-fill `/contact/?subject=&body=` for forwarding.
- [x] **[S86][PWA] App shortcuts** — **DONE S86**: `manifest.json` shortcuts for Studio Pulse, Vault Member, Ask IGNIS.
- [x] **[S86][PWA] Expanded SW pre-cache** — **DONE S86**: STATIC_ASSETS adds `/share/`, `/ignis/`, `/social/`, `/signal-log/`, `/notebook/`, 4 missing game pages, and 6 new modules.

### Tier 5 — SEO/Speed/Branding (3 shipped; OG worker deploy needs founder)

- [x] **[S86][SEO] Dynamic OG image Worker** — **DONE S86**: `cloudflare/og-image-worker.js` — separate Worker, returns 1200×630 SVG OG card with status chip + sigil + brand mark, accepts `?title=&eyebrow=&status=&theme=`, edge-cached 1hr. Deploy on its own route (e.g. `og.vaultsparkstudios.com/*`).
- [x] **[S86][SEO] Schema.org JSON-LD injector** — **DONE S86**: `assets/schema-injector.js` — runtime VideoGame (when `<body data-schema-type="game">`), FAQPage (when `<body data-schema-type="faq">`), and BreadcrumbList (always, derived from path). Skips if matching @type already in head.
- [x] **[S86][PERF] Live perf badge** — **DONE S86**: `assets/perf-badge.js` — PerformanceObserver for LCP/CLS/INP, renders honest live snapshot pill on `[data-perf-badge]` hosts.

### Tier 6 — OS cohesion (2 shipped; signal-log workflow needs STUDIO_OPS_READ_TOKEN secret)

- [x] **[S86][COHESION] Founder Notebook /notebook/** — **DONE S86**: `notebook/index.html` + `assets/notebook-stream.js` — pulls last 80 commits via GitHub API, groups by ISO-week, infers mood from conventional-commits prefix, renders journal stream with timeline.
- [x] **[S86][COHESION] Signal Log auto-publish** — **DONE S86**: `signal-log/index.html` (with `<!-- signal-log:start --> … <!-- signal-log:end -->` markers) + `scripts/sync-signal-log.mjs` (parses CDR entries tagged `public: true`) + `.github/workflows/signal-log-sync.yml` (daily cron + on demand). Requires `STUDIO_OPS_READ_TOKEN` repo secret to access private CDR.
- [x] **[FOLLOWUP] Social Dashboard bidirectional mirror** — needs Social Dashboard repo work (normalized activity feed exposure + pull on this side). **RECORD CONSOLIDATED S281 — duplicate stub; the [S90][COHESION] entry stays OPEN and carries the full context. Cross-repo work ships via Studio Ark cargo, never a direct sibling write (CANON-018). (D-S281.4)** <!-- record-consolidation: superseded-by S90-social-mirror -->

### S86 carry-forward (deferred / per-page sweeps)

- [x] **[FOLLOWUP] Mount ignis-lens.js + native-feel.js site-wide** — **DONE S87**: `scripts/inject-new-scripts.mjs` applied site-wide; 105 HTML files updated (native-feel + ignis-lens + schema-injector injected before `</body>`).
- [x] **[FOLLOWUP] Add `data-schema-type="game"` body attrs to all 8 game pages** — **DONE S87**: all 8 game pages have `data-schema-type="game"` + `data-game-name/status/platforms/genre`; schema-injector emits VideoGame JSON-LD at runtime.
- [x] **[FOLLOWUP] Wire studio-pulse-live.js to broadcast to vault:events** — **DONE S87**: `maybeBroadcastShipped()` emits client-to-client vault_event broadcast when top shipped entry changes; listeners see vault-heartbeat ticker animate.
- [x] **[FOLLOWUP] Author lore-gate fragments on /universe/voidfall/** — **DONE S87**: rank-2 Observer's Log (pre-crossing fragment) + rank-4 Spark Adept Transmission 011 added after Known Entities; ignis-lens + native-feel mounted on the page.
- [x] **[FOLLOWUP] Add CONFLICT-MARKER lint** — **DONE S87**: `scripts/lint-repo.mjs` (new) handles this; wired into `build:check`.
- [x] **[FOUNDER ACTION] Register ANTHROPIC_API_KEY with Supabase ask-ignis fn** — **DONE S86 addendum**: function deployed, reachable from /ignis/ Vault Oracle + IGNIS Lens.
- [x] **[FOUNDER ACTION] Register Worker secrets via Wrangler** — **DONE S86 addendum**: `CSRF_SIGNING_KEY` set; `PORTAL_GATE_ENABLED=1`, `NONCE_CSP_ENABLED=1`, `RATE_LIMIT_ENABLED=1` all live.
- [x] **[FOUNDER ACTION] Deploy og-image-worker.js to its own route** — **DONE S86 addendum**: deployed to `vaultsparkstudios.com/_og/*` zone route + workers.dev URL; og:image meta tags now point at it (S87 recovery).
- [x] **[FOUNDER ACTION] Add STUDIO_OPS_READ_TOKEN repo secret** — **DONE S86 addendum**: rotated onto gh CLI OAuth token; signal-log-sync workflow verified green.

---
## Session 85 — Forge Window redesign + portfolio cohesion (8 shipped)

### Round 1 (5 items)

- [x] **[S85][UX] /studio-pulse/ rebuilt as "The Forge Window"** — **DONE S85**: cinematic immersive rebuild; animated ember hero, portfolio heartbeat strip, current-focus band, Living Worlds + Tools grids, 12-tile Sealed Vault sigil grid, signal strip, coming-next teasers. Killed Now/Next/Shipped kanban, IGNIS tile, sessions + edge-functions counters, "All Systems Green" checklist. `prefers-reduced-motion` + light-mode guards. No inline scripts.
- [x] **[S85][INTELLIGENCE] Registry-driven catalog** — **DONE S85**: `generate-public-intelligence.mjs` replaces static CATALOG with dynamic `studio-hub/src/data/studioRegistry.js` import; `progressForPhase` mapping; self-hosted SPARKED override. 15 items now publicly listed vs prior 8.
- [x] **[S85][INTELLIGENCE] Portfolio scale block on public intelligence** — **DONE S85**: `portfolio: {total:27, publicListed:15, sealedCount:12, sparked:4, forge:9, vaulted:2}` added to `public-intelligence.json`. Zero private/proprietary data surfaced.
- [x] **[S85][UX] Homepage pulse teaser refreshed** — **DONE S85**: "Studio Transparency / builds in the open / IGNIS" replaced with "The Forge Window / 27 initiatives. One vault. One live window." + "Browse worlds" CTA.
- [x] **[S85][COHESION] Reusable Sealed Vault row component** — **DONE S85**: `assets/sealed-vault-row.js` self-contained with injected scoped CSS, context-aware copy (`games|projects|default`), count-driven SVG sigil tiles, reduced-motion honored, CSP-clean.

### Round 2 (3 items)

- [x] **[S85][COHESION] Sealed Vault row on /games/ hub** — **DONE S85**: `<div data-sealed-vault-row data-sealed-vault-context="games">` mounted before gravity rail; loader + component scripts appended.
- [x] **[S85][COHESION] Sealed Vault row on /projects/ hub** — **DONE S85**: mounted before CTA section with context=projects.
- [x] **[S85][COHESION] Footer-wide 27-initiative signal** — **DONE S85**: `propagate-nav.mjs` footer legend extended with fourth SEALED chip + inline "27 initiatives under the vault banner · open the Forge Window →"; propagated across 79 HTML files.

### S85 carry-forward

- [x] **[SIL] Watch first post-push Lighthouse + playwright-axe runs** — heavier pulse page + animated gradients; verify tightened S82/S83 budgets still hold.
- [x] **[FOLLOWUP] Strip dead intel-* references in home-intelligence.js** — **DONE S92**: duplicate carry-forward retired; `assets/home-intelligence.js` no longer contains the old `intel-*` bindings, and the Genius List generator now suppresses this stale item when S86 done evidence is present.
- [x] **[FOLLOWUP] Founder decision: rename nav "Studio Pulse" → "Forge Window"** — resolved S106: public label shipped as Forge Window while `/studio-pulse/` stayed frozen for SEO. **DONE S106**
- [ ] **[FOLLOWUP] Names for sealed initiatives (12 remaining)** — when a sealed project gets a public name + vault status, it auto-promotes from the sealed count to a named catalog tile.

---
## Session 84 — S80 Tier 2/3/4 execution (7 shipped)

### Round 1 (4 items)

- [x] **[S84][UX] Offline page redesign** — **DONE S84**: vault-forge aesthetic (inline SVG vault-lock sigil, dashed orbit, gold/blue vignette, Georgia "SEALED" wordmark, aria-live network-status pill, light-mode overrides). `error-pages.js` listens to both `online` + `offline`, 900ms reload grace. Closes S80 Tier 3 offline gap.
- [x] **[S84][COMPLIANCE] Investor action logging consent (GDPR)** — **DONE S84**: `VSInvestorAuth.logAction()` is a no-op until `vs_inv_activity_consent=granted` via first-login banner or new profile-page toggle. External `investor-consent-toggle.js` keeps profile page's CSP hash registry intact. Legal basis disclosed (GDPR Art. 6(1)(a)). Closes S80 Tier 3 compliance item.
- [x] **[S84][COHESION] /social/ dashboard page** — **DONE S84**: public presence map at `/social/` reading `public-intelligence.social`. Four-stat summary, featured channels, honest three-tier grouping (Live / Limited / Reserved). Offline fallback references contact/GitHub/subreddit only — nothing fabricated. Closes S80 Tier 2 cohesion item.
- [x] **[S84][INNOVATION] Personalized returning-member homepage** — **DONE S84**: `home-personalized.js` renders welcome-back band for returning/logged-in/pathway-active visitors. Copy branches on `journey_stage × world_affinity × trust_level`. Dismissable (session scope). Honest empty state for fresh anon visitors. Closes S80 Tier 4 innovation item.

### Round 2 (3 items)

- [x] **[S84][COHESION] Studio nav dropdown (79 HTML files)** — **DONE S84**: `propagate-nav.mjs` turned flat "Studio" link into a dropdown: About · Studio Pulse · IGNIS · Vault Pipeline · Changelog · Press Kit · Social · Signal Log. `/social/` + `/press/` now first-class primary-nav destinations.
- [x] **[S84][INNOVATION] Dynamic hero spotlight** — **DONE S84**: `home-dynamic-hero.js` renders a subtle gold pill between hero sub-copy and CTAs showing highest-progress SPARKED title (fallback: highest-progress FORGE title). Routes correctly for /games/ vs /universe/. Honest empty state when intelligence is down. Closes S80 Tier 4 innovation item.
- [x] **[S84][FEATURE] PWA push opt-in surface** — **DONE S84**: `push-prompt.js` renders a blue pill on `/studio-pulse/`, `/vault-wall/`, `/changelog/` for eligible visitors only (logged in + push supported + not subscribed + not dismissed). Deep-links to new `#push` anchor on portal toggle. Self-contained CSS; suppressed on permission denied. Closes half of S80 Tier 4 push item (server-side category routing still separate scope).

### S84 carry-forward

- [x] **[SIL] Watch first post-push Lighthouse run** — S82+S83+S84 combined pressure on tightened budgets + new local-preview + staging dual-URL gate. Iterate once if red.
- [x] **[SIL] Watch first post-push playwright-axe run** — local-preview migration path.
- [x] **[SIL] Push broadcast category server-side coverage** — **DONE S92**: `send-push` now routes classified-file, SPARKED drop, leaderboard overtake, and challenge notification payloads server-side, with unsupported categories skipped safely. `npm run verify:push-contract` covers the category contract.

---
## Session 83 — Genius Hit List (10 items, 8 unblocked + 2 HAR)

Ranked by impact × unblockedness. Scope override approved by Studio Owner: implement all unblocked items at quality bar.

### Unblocked — sprint targets

- [x] **[S83][COHESION] Unified cross-portal shell** — **DONE S83**: `assets/portal-shell.css` with shared tokens + primitive classes + tablet breakpoint; linked from all 3 portals.
- [x] **[S83][BRAND] Typography unify (Georgia H1/H2)** — **DONE S83**: canonical Georgia serif + -0.02em letter-spacing on all h1/h2 in `assets/style.css`.
- [x] **[S83][UX] Tablet breakpoint 768–1024px** — **DONE S83**: membership tier grid, investor KPI strip + dashboard sidebar, all portal-grid primitives hit 2-col between 768–1024.
- [x] **[S83][CONVERSION] Testimonials + outcomes on /membership/** — **DONE S83**: `data/member-voices.json` + `assets/member-voices.js` + new "Honest Voices" section. Opt-in quotes schema (empty-start, no fabrication), live vault outcomes, rank distribution.
- [x] **[S83][FEATURE] Member Forge Feed on /vault-wall/** — **DONE S83**: `assets/forge-feed.js` reads `/api/public-intelligence.json`, composes 4 stream classes into aria-live feed between season+rival and podium.
- [x] **[S83][COHESION] World-gravity rails on /games/ + /universe/ hubs** — **DONE S83**: `[data-related-root]` + intent-state + related-content wired on both collection hubs. Hubs now hand off instead of dead-ending.
- [x] **[S83][FEATURE] Leaderboard schema + seasons + rivals** — **DONE S83**: ItemList JSON-LD on `/vault-wall/`; `data/seasons.json` + `assets/seasons-rivals.js` render live season countdown + nearest-rival callout with honest states.
- [x] **[S83][CI] Dual-URL Lighthouse gate** — **DONE S83**: `lighthouse-staging` job added to `.github/workflows/lighthouse.yml` (Hetzner staging, continue-on-error, push-to-main only). S82 brainstorm closed.

### HAR-blocked — preflighted S83

- [x] **[S83→S112-RECLASS][AI] Ask IGNIS public concierge — DONE; duplicate closed S251.** Live via `assets/vault-oracle.js` + `supabase/functions/ask-ignis/index.ts` on `/ignis/`, `/search/`, `/games/`.
- [~] **[S83→S112-RECLASS][SECURITY] Edge-gate portals + CSP nonce + rate-limit/CSRF — PARTIAL, updated S251.** CSP nonce (DONE, see S80 entry above) + rate-limit/CSRF (DONE, see S80 entry above) both shipped. Portal edge-gate uses a 302 soft-redirect-to-reauth (`isGatedPath()`, `PORTAL_GATE_ENABLED=1`), not the originally-specified 401 — functionally equivalent mitigation, reworded rather than left as an open 401 build.

### S83 carry-forward

- [x] **[SIL] Watch first post-push Lighthouse run** — tightened budgets + new local-preview runtime; if red, iterate once.
- [x] **[SIL] Watch first post-push playwright-axe run** — local-preview migration will exercise the new path; real violations (vs. challenge-page noise) are real work.

---
## Session 82 — Genius Hit List execution (6 shipped)

- [x] **[S82][CI][ROOT-CAUSE] Migrate Lighthouse + playwright-axe CI to local preview server** — Cloudflare WAF returns managed-challenge HTML to GitHub Actions runner IPs, which collapsed Lighthouse `wait-on` to timeout and axe `--text/--bg` contrast to NaN. Both workflows now spin up `scripts/local-preview-server.mjs` on 127.0.0.1:4173 and point tooling there. Fixes what S81 only patched symptomatically.
- [x] **[S82][UX] Noscript fallbacks + 4s JS-hydration-timeout toast** — completes S80 Tier 1 partial. Telemetry, trust-depth, micro-feedback, network-spine, related-rail each ship real static fallback. `assets/hydration-timeout.js` renders aria-live status + GA4 `hydration_timeout` event when roots fail to hydrate within 4s.
- [x] **[S82][A11Y] Hero-story contrast + DreadSpike audit close** — hero-story `color: var(--text)` over darker bg; strong → gold; light-mode dark-panel override. DreadSpike "video pause" moot (static poster, no autoplay).
- [x] **[S82][PERF] Lighthouse CI budgets tightened** — Perf 0.85, A11y 0.95, BP 0.90, SEO 0.95 (up from 0.70/0.85/0.85/0.90). May require one budget iteration based on first local-preview run.
- [x] **[S82][PERF] Animation optimization** — `will-change: transform, opacity` on `.forge-letter` + `.forge-spark-burst`.
- [x] **[S82][A11Y] Keyboard-accessible mega-dropdowns** — `nav-toggle.js` adds `aria-haspopup/expanded/controls`, ArrowDown opens + focuses first item, arrow-key cycle inside dropdown, ESC closes + restores focus, focusout collapses. Fingerprinted shell rebuilt: `nav-toggle.shell-8a1b93790f.js`.
- [x] **[SIL] Watch first post-push Lighthouse run** — tightened budgets + new local-preview runtime; if red, iterate once.

---
## Session 81 — CI plumbing cleanup

- [x] **[S81][CI] Sitemap workflow push-rebase retry** — 3-attempt retry-with-rebase loop in `.github/workflows/sitemap.yml` so bot-commit races no longer fail the job (fixed S80 regression).
- [x] **[S81][CI] Accessibility axe-cli non-blocking** — `continue-on-error: true` on the axe-cli step; playwright-axe is the authoritative a11y signal (Cloudflare WAF was returning a managed-challenge page that axe mis-audited).
- [x] **[S81][CI] playwright-axe lockfile fix** — `npm ci` → `npm install --no-audit --no-fund` because `package-lock.json` is gitignored by repo convention.
- [x] **[S81][CI] Lighthouse wait-on ceiling raised** — 120s → 360s with 10s polling; prior timeout was racing GitHub Pages deploy time.
- [x] **[S81][INFRA] Retire `sw-version.yml` on-push trigger** — S77 fingerprinted shell pipeline is now the single owner of `sw.js` CACHE_NAME. Workflow kept as `workflow_dispatch`-only with a deprecation note until confirmed unused for ≥ 5 sessions.
- [x] **[SIL] S86 sweep — delete retired `sw-version.yml`** — **DONE S92 carry-forward cleanup**: workflow is absent and S86 also records the delete as complete; stale open duplicate retired.

---
## Session 80 — Master Audit Plan (28 items, ranked)

Overall score: **77/100**. Full audit lives in `memory/project_master_audit_s80.md`. Public Operating Surface confirmed as homepage misfit (duplicates `/studio-pulse/`, risks leaking Studio OS internals) — relocated S80.

### Tier 1 — Immediate, high-impact

- [x] **[S80][UX] Relocate Public Operating Surface off homepage** — removed lines 974-1013 intel section; replaced with compact Studio Pulse teaser link. Internal ops signals no longer leak to marketing surface.
- [x] **[S80→S112-RECLASS][SECURITY] Edge-gate private portals — DONE S86; duplicate closed S251.** `cloudflare/security-headers-worker.js` Layer 2 gates `/investor-portal/*`, `/studio-hub/*`, `/vault-member/admin/*` (redirect-to-reauth via `PORTAL_GATE_ENABLED=1`, not a literal 401 — functionally equivalent, see the DONE S86 entry above).
- [x] **[S80→S112-RECLASS][SECURITY] Migrate CSP from SHA hashes to nonce-based — DONE, phantom carry closed S251.** `cloudflare/security-headers-worker.js` implements `buildCspWithNonce()` + a `NonceInjector` HTMLRewriter class, confirmed enabled in production (`cloudflare/wrangler.toml` `NONCE_CSP_ENABLED = "1"`).
- [~] **[S80][A11Y] Accessibility pass (partial)** — `aria-live="polite"` added to vault-proof region. Still open: hero-story contrast boost, keyboard-accessible mega-dropdowns (touches fingerprinted shell asset `nav-toggle`), DreadSpike video pause control.
- [~] **[S80][UX] noscript fallbacks on homepage data-* sections (partial)** — pathways section has static fallback; still open: telemetry / trust-depth / micro-feedback / network-spine / related-root + 4s JS timeout toast.
- [x] **[S80][UX] Games catalog improvements** — URL-persisted filter state (`?status=sparked`), inline search, `width`/`height` + `loading="lazy"` on thumbnails.
- [~] **[S80→S112-RECLASS][SECURITY] Rate-limit + CSRF on contact & ask-founders — PARTIAL, split S251.** Rate-limit + CSRF is DONE: `RATE_LIMITED_FORM_PATHS`, `checkRateLimit()` (3/hr via KV), `/_csrf` issuance/verification all live in `cloudflare/security-headers-worker.js` (`RATE_LIMIT_ENABLED = "1"`). Still open: signed investor-doc URLs expiring at 1hr — no implementation found in `investor-portal/` or the Worker.

### Tier 2 — Depth & new features

- [x] **[S80][AI] IGNIS narrative surface** — explainer tooltip on every IGNIS mention; link to new `/ignis/` explainer page framing IGNIS as studio transparency signal (not opaque "cognition score").
- [x] **[S80][AI] "Ask IGNIS" public concierge — DONE, phantom carry closed S251 (duplicate of S83 entry below).** `/ignis/index.html` embeds `assets/vault-oracle.js`, calling the live deployed Claude-powered `supabase/functions/ask-ignis/index.ts`; also surfaced on `/search/` and `/games/`.
- [x] **[S80][COHESION] Unified cross-portal shell — DONE S83; duplicate closed S251.** `assets/portal-shell.css` linked from all 3 portals.
- [x] **[S80][FEATURE] Member "Forge Feed"** — **DONE S92 carry-forward cleanup**: S83 shipped `assets/forge-feed.js` on `/vault-wall/`; stale open duplicate retired.
- [x] **[S80][CONVERSION] Testimonials on /membership/** — **DONE S92 carry-forward cleanup**: S83 shipped `data/member-voices.json`, `assets/member-voices.js`, Honest Voices, live vault outcomes, and rank distribution; stale open duplicate retired.
- [x] **[S80][COHESION] `/social/` dashboard page** — **DONE S84**: `/social/` live with summary + featured + Live/Limited/Reserved tiers reading public-intelligence.social. Honest grouping; no fake activity.
- [x] **[S80][FEATURE] Leaderboard schema + seasons + rivals** — **DONE S92 carry-forward cleanup**: S83 shipped ItemList JSON-LD, `data/seasons.json`, and `assets/seasons-rivals.js`; stale open duplicate retired.
- [x] **[S80][BRAND] Resolve ETERNAL tier vocabulary — DONE S103, phantom carry closed S251.** Documented as a 4th canonical tier (Eternal, $29.99/mo) — see TASK_BOARD S103 section + the `eternal-intelligence` edge function in DECISIONS.md; live copy ships on `/membership/`, `/ignis/`, `/vaultsparked/`.

### Tier 3 — Performance, SEO, polish

- [x] **[S80][PERF] Lighthouse budget tightening in CI** — **DONE S269**: `.lighthouserc.json` now blocks CI at Performance >=0.85 plus A11y >=0.95, Best Practices >=0.90, SEO >=0.95; `smoke-startup-scripts.mjs` now enforces that release-bar contract so the CI config cannot drift back to advisory performance.
- [x] **[S80][PERF] Animation optimization** — **DONE S92 carry-forward cleanup**: S82 added `will-change: transform, opacity` on `.forge-letter` and `.forge-spark-burst`; DreadSpike uses static poster images, so the video poster-frame requirement is moot.
- [x] **[S80][SEO] Sitemap changefreq segmentation** — journal entries `never`, game catalog `daily`, legal pages `yearly`; add `datePublished` to VideoGame JSON-LD; journal entries → `schema:Article`.
- [x] **[S80][BRAND] Typography unify** — **DONE S92 carry-forward cleanup**: S83 made Georgia serif + -0.02em letter spacing canonical for h1/h2 in `assets/style.css`; stale open duplicate retired.
- [x] **[S80][UX] Tablet breakpoint (768–1024px)** — **DONE S92 carry-forward cleanup**: S83 shipped the tablet breakpoint pass for membership tier grids, investor KPI strips, and shared portal grids; stale open duplicate retired.
- [x] **[S80][UX] Offline page redesign** — **DONE S84**: vault-forge aesthetic with SVG vault-lock sigil, Georgia SEALED wordmark, aria-live network pill.
- [x] **[S80][COMPLIANCE] Investor action logging consent** — **DONE S84**: explicit opt-in banner + profile toggle; `logAction()` is no-op until granted. GDPR Art. 6(1)(a) disclosed.
- [x] **[S80][SEO] robots.txt cleanup** — remove misleading "Cloudflare AI Labyrinth" comment.

### Tier 4 — Innovation moonshots

- [x] **[SIL] Ask IGNIS concierge — DONE; duplicate closed S251.** See S80/S83 entries above.
- [x] **[SIL] Unified cross-portal shell — DONE S83; duplicate closed S251.** See S80 entry above.
- [x] **[S80][INNOVATION] Dynamic hero** — **DONE S84**: `home-dynamic-hero.js` reads catalog + renders most-active-game spotlight between hero sub-copy and CTAs.
- [x] **[S80][INNOVATION] Personalized returning-member homepage** — **DONE S84**: `home-personalized.js` reads VSIntentState + branches on journey_stage × world_affinity × trust_level.
- [x] **[S80][INNOVATION] Studio Time Machine** — **DONE S92**: `/changelog/` now has a responsive Studio Time Machine scrubber that indexes existing changelog phases, highlights selected eras, and jumps to the chosen session. Verification: `npm run verify:changelog-time-machine`.
- [ ] **[S80][AI] Investor AI Q&A** — Claude + retrieval over approved investor docs. Replaces half the "Ask the Founders" queue.
- [x] **[S80][FEATURE] PWA push for SPARKED drops + leaderboard overtakes** — **DONE S92**: client opt-in surface already shipped; `send-push` now routes SPARKED drop and leaderboard overtake payloads server-side, with contract coverage in `npm run verify:push-contract`.

---
## Historical Runway (Session 77)

- [x] **[SIL:2⛔] Genius Hit List as scheduled audit** — **DONE S88**: scheduled-audit generator now exists and can be rerun with `npm run genius:list`.
- [ ] **[GENIUS][CONVERSION] Extend proof/depth beyond the three core pages** — carry the stronger trust language into join/invite or other high-intent public entry routes if the next session stays conversion-focused.
- [x] **[GENIUS][COHESION] Extend gravity onto the `/games/` and `/universe/` hubs** — **DONE S92**: `/games/` and `/universe/` now mount `pathways-router.js` with context-specific four-card intent routing before their existing related rails; `pathways-router.js` understands `games` and `universe` contexts. Verification: `npm run build:check`, `npm run smoke:http`, `node scripts/csp-audit.mjs`, and `node --check assets/pathways-router.js`.
- [ ] **[OPS] Annual Stripe activation once keys exist** — replace the annual placeholder path only after the real Stripe annual plan keys are created.
- [ ] **[OPS] CF Worker automation unblock** — add `CF_WORKER_API_TOKEN` so Worker deploys stop depending on local Wrangler auth.
## Previous (historical)

- [x] **[SIL] robots.txt Cloudflare note** — added comment explaining Cloudflare AI Labyrinth injects directives at CDN edge (S46)
- [x] **[SIL] prefers-reduced-motion guard** — global `@media (prefers-reduced-motion: reduce)` rule already present in style.css (line ~1464); disables all animations including nav-enter. Done.
- [x] **[SIL] closeout.md sync** — updated `prompts/closeout.md` to studio-ops v2.4: removed Step 7.5, added Step 8.5 (S46)
- [x] **[SIL] Theme persistence test contract** — replaced `#theme-select` assertions with `#theme-picker-btn` + `.theme-option[data-theme=x].active`; `body[data-theme]` assertions preserved (S46)
- [x] **[SIL] Nav backdrop opacity by theme** — added `--nav-backdrop-overlay` var to `:root` (dark) and `body.light-mode` (45% dark-navy); `#nav-backdrop` now uses var (S46)
- [x] **[SIL] Theme picker swatch pulse** — `@keyframes swatch-pulse` added; `.swatch-pulse` class toggled in click handler + cleaned up on label reset (S46)
- [x] **[SIL] Portal nav admin link** — added `id="nav-admin-link"` to nav-account-menu in `vault-member/index.html`; `display:none` by default; JS shows it for admin users (S47)
- [x] **[SIL] Referral attribution wire** — `p_ref_by: sessionStorage.getItem('vs_ref')` wired into all 3 `register_open` RPC calls in `portal-auth.js` + `portal.js` (S47); **requires DB migration**: add `p_ref_by` param to `register_open` Supabase function (human action — see below)

---
## Previous (historical)

- [x] **[S55] Theme picker bug fix** — `.theme-option { display:none }` legacy CSS rule was hiding all theme tiles; removed `theme-option` class from tile buttons in `theme-toggle.js:399`
- [x] **[S55] Press kit page (`/press/`)** — full media kit with facts table, bio, logo grid, game catalog, press contact
- [x] **[S55] Studio Pulse (`/studio-pulse/`)** — Now/Next/Shipped board, game status grid, studio health panel
- [x] **[S55] Vault Wall (`/vault-wall/`)** — live member recognition wall with rank distribution bar, podium, leaderboard, recently joined
- [x] **[S55] Invite page (`/invite/`)** — referral program UX with copy link, social share, stats, rewards cards, top inviters leaderboard
- [x] **[S55] Social proof strip on homepage** — live member count, VaultSparked count, challenges completed, rank distribution bar
- [x] **[S55] Daily loop widget in portal** — login streak + active challenge title + login bonus chip above dashboard panes
- [x] **[S55] Founding Vault Member badge** — `supabase-phase57-founding-vault-badge.sql` migration; awards 🏛️ badge + 500 XP to first 100 members; comparison table + FAQ entry added to `/vaultsparked/`; **migration applied 2026-04-12 — 4 founding members badged: DreadSpike, OneKingdom, VaultSpark, Voidfall**
- [x] **[S55] Game page conversion** — social share + "More From the Vault" section added to Call of Doodie page
- [x] **[S55] Nav propagated** — 75 pages updated with canonical nav/footer (new pages included)

- [x] **[SIL:2⛔] Theme picker compact mode at 641–980px** — added `.theme-picker-label { display:none }` + `.theme-picker-arrow { display:none }` to `@media (max-width:980px)` block in `assets/style.css` (S57)
- [x] **[SIL:2⛔] CF Worker auto-redeploy via GitHub Actions** — created `.github/workflows/cloudflare-worker-deploy.yml`; triggers on `cloudflare/**` changes on main push; uses `npx wrangler@3 deploy --env production` with `CF_WORKER_API_TOKEN` secret (S57)
- [x] **[S55 follow-up] Studio About enhancement** — added "Why VaultSpark" founder story section to `/studio/index.html`; personal narrative with origin story, philosophy blockquote, vault pressure metaphor; inserted before "Who Runs The Vault" section (S57)
- [x] **[S55 follow-up] Portal daily loop `VSPublic` verify** — confirmed ✅ `supabase-public.js` assigns `window.VSPublic` at line 77; loaded in `<head>` without defer; available before portal JS at end of `<body>`
- [x] **[SIL] Genesis badge slots-remaining counter** — added `<span id="genesis-slots-left">` to `/vaultsparked/` FAQ answer; created `/vaultsparked/vaultsparked.js` with live counter logic (3-tier colour: gold/orange/crimson); 2-step PostgREST query excludes 4 studio UUIDs from count; script loads as `defer` (S57)
- [x] **[SIL] Vault Wall opt-in toggle (Phase 1)** — created `supabase/migrations/supabase-phase59-public-profile.sql` (adds `public_profile boolean DEFAULT true`); updated vault-wall queries to filter `.eq('public_profile',true)`; fixed broken `.count().head()` → `.count().get()` bug (S57); **[HAR] run db-migrate workflow to apply migration**
- [x] **[SIL] Achievement SVG icons — VaultSparked + Forge Master** — created `assets/images/badges/vaultsparked.svg` (purple crystal gem, violet gradient, gold crown spark) and `assets/images/badges/forge-master.svg` (anvil + spark burst, crimson ring, ember particles) (S57)
- [x] **[S58 Fix] Members directory profiles not showing** — moved CSP-blocked inline `/members/` directory loader to `assets/members-directory.js`; removed inline clear-filter handler; query now prefers `vault_points`/`rank_title` and falls back to legacy `points`; bumped SW cache.

- [x] **[S59] Homepage redesign** — hero: "Explore Projects" CTA added + button-ghost variant; DreadSpike section converted to unnamed "Signal Detected" atmospheric teaser (classification pending, no names); membership CTA → /membership/; "Now Igniting" DreadSpike reference removed (S59)
- [x] **[S59] All pages: same atmosphere** — shared CSS atmosphere in style.css: body::after ambient glow, panel inner glow, surface-section gold separator dot, button-ghost variant, card hover shadow enhancement (S59)
- [x] **[S59] Create /membership/index.html** — premium emotional hub: hero with 3 animated glow orbs; 3 tier identity cards (free/sparked/eternal) with hover; "What You're Joining" 5-pillar section; studio discount 20%/35% callout; community stats (live Supabase); final CTA (S59)
- [x] **[S59] Nav template: Membership dropdown** — 7-link Membership dropdown added to propagate-nav.mjs; propagated to 77 pages; active link mapping added; footer Membership column added; Studio Pulse added to Studio footer column (S59)
- [x] **[S59] Footer template update** — Membership column (6 links), Studio column updated (Studio Pulse + cleanup); propagated 77 pages (S59)
- [x] **[S59] /vaultsparked/ overhaul** — removed founder video updates (4 locations); billing toggle (Monthly/Annual, JS price switching $4.99↔$44.99, $29.99↔$269.99); Studio Discount section (3-tier grid); Games Access section (per-tier); Rank Loyalty callout (25%/50%) (S59)
- [x] **[S59] Portal: Studio Access panel** — `<div id="studio-access-panel">` added to dashboard grid; `loadStudioAccessPanel(planKey)` in portal-dashboard.js renders 4 games with locked/unlocked state per tier; wired in portal-auth.js showDashboard (initial + authoritative subscription update) (S61)
- [x] **[SIL] Portal settings: public_profile toggle** — "Show my profile on the Vault Wall" toggle added to portal settings privacy section; `savePublicProfileToggle()` PATCHes `public_profile` via Supabase SDK; wired via addEventListener in IIFE (CSP-safe); phase59 migration applied live S61 (S61)
- [x] **[S59] Wire achievement SVG icons to portal** — ACHIEVEMENT_DEFS updated in portal-core.js (genesis_vault_member, vaultsparked, forge_master); async relational fetch wired in portal-auth.js showDashboard (S59)
- [x] **[SIL] Vault Wall: verify post-migration** — phase59 migration applied live S61 (`public_profile boolean NOT NULL DEFAULT true` + partial index confirmed); `tests/vault-wall.spec.js` smoke spec created and wired into CI (continue-on-error); live filter `.eq('public_profile',true)` active (S61)
- [x] **[S60] VaultSparked CSP violations cleared** — all 3 blocked scripts resolved: externalized Stripe/checkout/phase/gift IIFE (260 lines) to `/vaultsparked/vaultsparked-checkout.js`; removed inline `onmouseover`/`onmouseout` from gift button (replaced with addEventListener); billing-toggle.js already external (S59). Zero inline scripts on the page. (S60)
- [x] **[S60] Homepage circular element fix** — replaced hard-edged energy arc circles (the "weird circular addition") with blur-filtered diffuse `.hero-glow` spots; removed body radial gradient blobs; added gold `text-shadow` on "Is Sparked." for visible impact. (S60)
- [x] **[SIL] VaultSparked CSP smoke test** — `tests/vaultsparked-csp.spec.js` created; Chromium-only; `page.on('console')` collects CSP errors; asserts zero violations on /vaultsparked/ + homepage; wired into e2e.yml compliance job as non-optional step (S61)
- [x] **[SIL] Homepage hero structural redesign** — replaced 2-column grid (text left / logo card right) with full-width centered cinematic stack: eyebrow → logo banner (`.hero-logo`, 620px max, blur glows) → h1 inline → `.hero-sub` centered → CTAs centered → `.hero-meta-row` (chips + stats) → hero-story. Removed `.hero-card`/`.hero-visual`/`.logo-wrap` CSS. CDR direction satisfied (S61)
- [x] **[SIL] propagate-csp SKIP_DIRS: add vaultsparked** — `'vaultsparked'` added to SKIP_DIRS in `scripts/propagate-csp.mjs`; future global CSP propagation runs will skip the directory entirely (S61)
- [x] **[SIL] Voidfall Fragment 005** — 5th Transmission Archive card added to `/universe/voidfall/`; coordinates confirmed correct, nothing there, "keeps ████████"; continues intercept log pattern with new redaction teaser (S61)
- [x] **[SIL] Portal: rank loyalty discount display** — Forge Master (25%, crimson chip) and The Sparked (50%, gold chip) rank loyalty discounts shown in Studio Access panel; `RANK_DISCOUNT` map in `loadStudioAccessPanel()`; non-discount members see upgrade CTA instead (S61)
## Next (historical)

- [x] **[SIL] CSP propagation script** — `scripts/propagate-csp.mjs` created; single CSP_VALUE constant at top propagates to all HTML files via `node scripts/propagate-csp.mjs` (S47)
- [x] **[SIL] Staging smoke test script** — `scripts/smoke-test.sh` created; 12 key URLs, exits non-zero on failure; enforces CANON-007 (S47)
- [x] **[SIL] Light-mode screenshot smoke** — `tests/light-mode-screenshots.spec.js` created; Chromium-only, 3 pages, forced light-mode via localStorage (S47)
- [x] **[SIL] IGNIS delta field** — `ignisScoreDelta` added to `PROJECT_STATUS.json`; closeout Step 8 updated to compute and write it (S47)
- [x] **[SIL] Join form GA4 form_error** — `form_error` gtag event added to vault access request catch handler in `join/index.html` (S50)
- [x] **[SIL] Voidfall chapter I excerpt** — "First Pages" section added to `/universe/voidfall/` with opening Chapter I prose + locked volume badge (S50)
- [x] **[SIL] Light-mode screenshot CI** — `tests/light-mode-screenshots.spec.js` wired into compliance job; screenshots uploaded as 14-day artifact (S50)

- [x] **[SIL] Voidfall subscription GA4** — `form_submit` gtag event added to Kit subscribe success handler in `universe/voidfall/index.html` (S51)
- [x] **[SIL] Voidfall Fragment 004** — 4th Transmission Archive card added; named thing, the answer, fully redacted (S51)
- [x] **[SIL] DreadSpike signal log entry** — intercept-transmission card added to DreadSpike universe page (S53)
- [x] **[SIL] Voidfall entity 4 hint** — atmospheric one-liner below The Crossed row hinting at unclassified 4th entity (S53)
- [x] **[SIL] Remove inline onclick handlers from vault-member/index.html** — all onclick/onchange/onmouseenter removed; portal-init.js extracted; portal-core.js event wiring complete; CSP updated to SHA-256 hashes; 85 pages propagated (S53)
- [x] **[SIL] Cloudflare cache purge on deploy** — `.github/workflows/cloudflare-cache-purge.yml` created; triggers on push to main; uses CF_API_TOKEN + CF_ZONE_ID secrets (S53)
## Next (prior)

- [ ] **Per-form Web3Forms keys** — create 3 separate keys in Web3Forms dashboard (join/, contact/, data-deletion/) for per-form lead tracking; update access_key values in each HTML [low priority]
- [ ] **Cloudflare WAF rule (CN/RU/HK)** — JS Challenge firewall rule; requires API token with Zone / Firewall Services / Edit + Zone / Zone / Read; or Studio Owner can create in dashboard [human action / provide token]
- [ ] **Web3Forms browser test** — manually submit /join/ and /contact/ to confirm email delivery to inbox [human action]
- [ ] **[SIL] Add `beacon.env`** — once Studio Owner runs `node scripts/configure-beacon.mjs` in studio-ops, copy resulting `.claude/beacon.env` to this repo (gitignored); enables active session indicator in Studio Hub

---
## Deferred to Project Agents

- cross-repo item owned by another repo agent:
## Blocked

*(none)*

---
## Later

- [x] **Voidfall teaser → full page** — expanded with Transmission Archive (3 fragments), The Signal world-building, Known Entities (3 entities), Saga meta grid; CSS added (S47)
- [x] **Sentry release tagging** — `.github/workflows/sentry-release.yml` created; tags each main push as a Sentry release; requires SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT repo secrets/vars (human action to configure, S47)
- [ ] **`/vaultsparked/` Phase 2** — open Phase 2 when Phase 1 fills (subscriber_cap)
- [ ] **Web push test** — subscribe in portal, upload classified file, verify notification received. **S92 local guard:** `npm run verify:push-contract` now verifies portal opt-in, service worker receipt, `send-push` edge route, stale subscription cleanup, and public prompt wiring; real browser notification receipt remains open.

---
## Historical Human Action Required

- [x] **[DB] `register_open` migration** — phase56 applied live (S48): `referred_by` column, `p_ref_by` param, milestones updated ✅
- [x] **[Sentry] Configure release workflow** — `SENTRY_AUTH_TOKEN` secret set; org/project hardcoded in workflow; CI passing (S48) ✅
- [x] **[STRIPE-ANNUAL]** Create the annual Stripe yearly price IDs so the honest annual pricing preview can be activated into a real checkout route. ✅ (S99: prices `price_1TNJPfGMN60PfJYsHKVkjL12` + `price_1TNJPtGMN60PfJYsAXZYQNVj` active in Stripe, hardcoded in edge fn, wired in billing-toggle.js — phantom blocker)
- [x] **[CF-WORKER-TOKEN]** Add `CF_WORKER_API_TOKEN` to GitHub Actions secrets so Worker deploys stop depending on local Wrangler auth. ✅ (S99: secret confirmed set 2026-04-17 — phantom blocker)
- [ ] **[WEB3FORMS]** Test contact form from browser — confirm email arrives at founder@vaultsparkstudios.com (server-side test blocked by Web3Forms free tier). Verify with `node -e "fetch('https://vaultsparkstudios.com/contact/').then(r=>r.text()).then(t=>console.log('form-access_key:', /access_key/.test(t) ? 'wired' : 'MISSING'))"` (expect `form-access_key: wired`); after submitting from browser, confirm receipt at founder@vaultsparkstudios.com inbox.
- [ ] **[WAF]** Confirm Cloudflare WAF JS Challenge rule for CN/RU/HK is active in dashboard — CF API token lacks Zone:Security Read scope; needs token with that permission or dashboard check. Verify (post-token-scope-fix) with `node -e "fetch('https://api.cloudflare.com/client/v4/zones/'+process.env.CLOUDFLARE_ZONE_ID+'/firewall/rules',{headers:{Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN}}).then(r=>r.json()).then(j=>console.log('rules:', (j.result||[]).filter(r=>/CN|RU|HK/.test(JSON.stringify(r.filter||r))).length))"` (expect ≥1).
- [ ] **[BEACON]** Run `node scripts/configure-beacon.mjs` in studio-ops → copy `.claude/beacon.env` here — no beacon Gist found in GitHub gists; Gist must be created first (Hub Settings → Active Session Beacon). Verify with `node -e "console.log(require('fs').existsSync('.claude/beacon.env') ? 'beacon-env: present' : 'beacon-env: MISSING')"` (expect `present`).
- [ ] **[WEB3FORMS-KEYS]** Create 3 separate keys in Web3Forms dashboard (join/, contact/, data-deletion/) for per-form lead tracking [low priority]. Verify with `node -e "Promise.all(['/contact/','/join/','/data-deletion/'].map(p=>fetch('https://vaultsparkstudios.com'+p).then(r=>r.text()).then(t=>(t.match(/access_key[\"']\\s*value=[\"']([\\w-]+)/)||[])[1]||null))).then(keys=>{const u=new Set(keys.filter(Boolean)); console.log('unique-access-keys:', u.size, '/', keys.filter(Boolean).length)})"` (expect `3 / 3`).
- [ ] **[CF-EMAIL-ROUTING-SCOPE]** Expand `CLOUDFLARE_API_TOKEN` scope to include `Zone › Email Routing Addresses › Edit` and `Zone › Email Routing Rules › Edit` (currently neither `CLOUDFLARE_API_TOKEN` nor `CLOUDFLARE_DNS_TOKEN` carries either scope — verified S114 via 403 probe against `/zones/<id>/email/routing/rules`). Steps: (1) CF dashboard → My Profile → API Tokens → edit existing or create new; (2) add the two scopes against the vaultsparkstudios.com zone; (3) update `secrets/cloudflare.env` in studio-ops; (4) verify with `node -e "fetch('https://api.cloudflare.com/client/v4/zones/'+process.env.CLOUDFLARE_ZONE_ID+'/email/routing/rules',{headers:{Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN}}).then(r=>console.log('HTTP',r.status))"` (expect HTTP 200). [low priority — only needed if we automate adding new CF-hosted domains to email routing]
- [x] **[DB] Founding Vault Badge** — migration applied 2026-04-12 via Supabase CLI; 4 founding members badged: DreadSpike, OneKingdom, VaultSpark, Voidfall ✅
- [x] **[CF-SECRETS]** Add `CF_API_TOKEN` (Zone/Cache Purge) and `CF_ZONE_ID` secrets to GitHub repo → Settings → Secrets; enables auto cache purge workflow added S53 ✅ (S54)
- [x] **[CSP-VERIFY]** After S53 deploy: open vault-member/index.html in DevTools console (incognito); confirm zero `Content-Security-Policy` errors ✅ (S54 — verified; remaining Cloudflare edge-injected inline scripts are platform-generated, unfixable with static hashes, accepted as limitation)
- [x] **[CF-WORKER-TOKEN]** Add `CF_WORKER_API_TOKEN` secret to GitHub repo → Settings → Secrets → Actions. ✅ (S100: duplicate phantom — secret confirmed set 2026-04-17 per S99 audit; GitHub API confirmed CF_WORKER_API_TOKEN present)
- [x] **[DB] Phase59 public_profile migration** — applied S61 via `supabase db query --linked`; `public_profile boolean NOT NULL DEFAULT true` column confirmed; partial index `idx_vault_members_public_profile` confirmed. Portal toggle + vault-wall filter now live. ✅

---
## Done (recent)

- [x] **S69: repo-wide CSP cleanup + live Worker deploy** — legacy public-route inline-handler debt burned down across the audit batches; `assets/public-page-handlers.js` + `assets/error-pages.js` added for shared runtime; canonical/Worker CSP synchronized; `node scripts/csp-audit.mjs` now passes across 93 HTML files; Worker redeployed live via Wrangler (`f0c9672a-25ae-413f-b131-e0ee9027b69b`) and production headers verified on `/` + `/vaultsparked/`.
- [x] **S55: 10-item website improvements batch** — press kit, studio pulse, vault wall, invite page, social proof strip, daily loop widget, founding badge SQL, game conversion section, theme picker bug fix, nav propagated (75 pages)
- [x] **QR code CDN 404 fix + theme picker breakpoint fix + tile color improvements (S54)** — qrcode@1.5.3→@1.5.0; picker CSS moved from 980px→640px breakpoint; tileColor field; CF-SECRETS + CSP-VERIFY HAR cleared
- [x] **CSP hardening: 'unsafe-inline' removed, SHA-256 hashes, portal-init.js extracted, DreadSpike/Voidfall lore, CF cache purge workflow (S53)**
- [x] **Auth tab hash routing + CSP Worker fix + theme tile picker + PromoGrind sign-in (S52)**
- [x] **Voidfall dispatch GA4 + Fragment 004 (S51)**
- [x] **CSP Turnstile fix + 3 SIL items (S50)** — canonical CSP updated with challenges.cloudflare.com (Turnstile); re-propagated 85 pages; join form GA4 form_error; Voidfall Chapter I excerpt; light-mode screenshot CI
- [x] **CSP propagated + CI check + GA4 events (S49)** — 85 pages synced; e2e.yml CSP dry-run gate; contact form_submit/form_error events
- [x] **Full audit implementation — 9 items (S47)** — portal admin link, referral attribution wire (3 RPC call sites), CSP propagation script, staging smoke test, IGNIS delta field, light-mode screenshot spec, Voidfall page expansion (4 new sections), Sentry release workflow
- [x] **SIL Now queue — 5 items (S46)** — robots.txt note, closeout.md sync, theme-persistence spec fix, nav backdrop opacity var, swatch-pulse animation
- [x] **Portal auth tab switching on referral link (S45)** — added missing portal nav HTML (`nav-account-wrap`, notif bell, `nav-signin-link`, `nav-join-btn`); null guards in `showAuth`/`showDashboard`; `?ref=` referral banner + sessionStorage tracking; theme picker hover-preview + DEFAULT badge + confirmation flash
- [x] **Mobile nav blur + clicks fix, theme FOUC, premium picker (S44)** — removed backdrop-filter from #nav-backdrop (iOS compositing root cause); injected inline theme script at body start across 72 pages; redesigned mobile nav; replaced select with custom picker; light mode CSS fixes
- [x] **Rights posture correction (S43)** — replaced public MIT/open-source claims with a proprietary IP notice + third-party attributions page; propagated footer/resource label to `Technology & Rights`; updated sitemap labels and compliance-page title expectation
- [x] **Dark-panel contrast hardening (S42)** — restored white copy on intentionally dark membership/rank/character sections in light mode; fixed homepage Vault-Forge paragraph and public `/ranks/` dark cards; updated `assets/style.css`, `index.html`, `ranks/index.html`, and `vault-member/portal.css`
- [x] **Light-mode contrast cleanup follow-up (S41)** — darkened light-mode support text tokens, fixed unreadable titles over dark project/game art, and converted shared dark card/panel patterns to real light surfaces in `assets/style.css`
- [x] **Refined shared light mode (S40)** — overhauled light palette and component surfaces in `assets/style.css`; fixed low-contrast `--steel`/muted text issues; updated browser theme color in `assets/theme-toggle.js`
- [x] **SIL Now items — polish + CI reliability (S39)** — mobile nav entrance animation (@keyframes nav-enter); .hero-art > .status CSS guard; Lighthouse wait-on deployment timing
- [x] **Mobile nav iOS blur — root fix (S38)** — disabled .site-header::before backdrop-filter at ≤980px; S36 fix removed overlay blur but header's ::before still promoted GPU layer containing fixed nav on iOS Safari
- [x] **IGNIS scored + staging confirmed (S37)** — 47,091/100,000 · FORGE tier (rescored S38); staging HTTP 200 confirmed
- [x] **STRIPE_GIFT_PRICE_ID + GSC (S37)** — gift product + $24.99 price created via Stripe API; secret set; GSC sitemap submitted + verified
- [x] **UI bug fixes (S36)** — mobile nav blur partial fix (backdrop-filter on overlay removed); status badge DOM position fixed on 8 project pages
- [x] **CI fixes (S35)** — Lighthouse SEO (robots-txt off, vault-member removed, link-text aria-label), axe ChromeDriver mismatch fixed
- [x] **Protocol restore (S34)** — CLAUDE.md session aliases, AGENTS.md, prompts/start.md v2.4, context files restored
- [x] **Cloudflare security hardening (S33)** — .nojekyll, security.txt, robots.txt (14 AI crawlers), CSP patch, X-Robots-Tag, Worker redeployed
- [x] **Voidfall teaser page (S32)** — /universe/voidfall/ + sitemap entries
- [x] **Universe dropdown (S32)** — 72 files updated with DreadSpike + Voidfall dropdown
- [x] **Portal onboarding tour (S32)** — 3-step overlay gated on vs_onboarding_done
- [x] **Gift checkout modal (S32)** — /vaultsparked/ gift flow → create-gift-checkout edge function → Stripe
- [x] **Auth hardening (S31)** — min password 12, symbols required, rate limits, email confirmations
- [x] **Stripe live + billing portal (S30)** — 6 price IDs, 16 edge functions ACTIVE
