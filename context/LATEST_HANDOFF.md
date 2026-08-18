# Latest Handoff — VaultSparkStudios.github.io

## Session Intent

**S319:** Run the complete `/arc`; audit and implement the strongest verified improvements, then push directly to `main` and fully deploy.

**Session 319 · 2026-08-18 · agent: claude-code (Opus 5, 1M) · full arc → staging verified 8/8 → production correctly held**

---

## Read this first

**`vaultsparkstudios.com/login` is returning HTTP 500 to real visitors.** Cloudflare error 1101 — the Worker threw an unhandled exception. Root cause is upstream and now precisely known: `obeliskgate.com/.well-known/openid-configuration` answers **200 with HTML** (its SPA catch-all shadows the discovery path), so `authorization_endpoint` is undefined and `new URL(undefined)` throws inside `startLogin`. Sign-in has been dead; every other surface is unaffected. Reported to Obelisk as Ark cargo `01K09H7FPDC44A67D990320A8B`.

Our guard is committed (provider failure now degrades to a 503 carrying `identity_provider_unavailable`, and discovery resolves before the flow record is written) but **cannot deploy**: it lives in `cloudflare/**`, the content lane hard-blocks that prefix, and the Worker lane runs the same ceremony whose browser suite tests the broken `/login`. The fix for the outage is gated behind the outage.

## What S319 shipped

The 12.3-day production dark period had a second cause nobody had filed. The hourly `uptime-probe` cron rewrote five of the thirty-one leaves inside the promotion artifact **and, in the same commit**, rewrote `api/candidate-artifact-manifest.json` and `api/release-proof.json` — the artifact and the receipt that judges it. Three different roots were observed for one unchanged source; an 8/8 ceremony was unreachable by construction. The manifest now splits into a commit-derived source set (`root`) and an observed telemetry set (`observedRoot`), and declared wall-clock stamps are canonicalised out before hashing. Proven on the real tree: the promotion root survives a cron tick unchanged.

The generalised gate written for that class immediately found a second cron (`cloudflare-analytics-pull`) writing two more hashed leaves — the point fix alone would have shipped incomplete.

Also shipped: the blast-radius-scoped hold (D-S319.2), the reproducibility gate, one declared shape for `api/build-sha.json` across its **four** producers, scheduled Desk publishing four editions daily on free self-hosted inference, the Desk homepage module, a RUN_DIRECT guard on `news-draft-edition` (its CLI ran on import and set `exitCode 2`, so every successful scheduled edition would have reported failure), Playwright browsers in the CI ceremony step that claimed to install them, and Cloudflare credentials wired to the deploy-currency probe that had been publishing `unverified` for want of an env line.

## Deploy state — exact

- `main`: all work pushed and verified 0/0 against origin.
- Staging: candidate `2f29768322`, receipt `8359c4ba5c271f1fb80ab126`, 5016/5016 files, artifact root matched, attested, chain depth 43, browser 6/6.
- **Local release ceremony: 8/8 passed.** `promotion-ready` passes as `scoped`, naming `auth/**`, `identity`, `worker:identity` as held.
- **Production: NOT promoted.** The CI ceremony re-runs the browser suite, which includes the anonymous Obelisk boundary journey; that fails because `/login` is 500. The gates are refusing correctly — a tested surface is genuinely broken.
- Production still serves baseline `9527f227`; two-vantage quorum reads trustworthy `stale` at 731 commits / 13.2 days.

No gate was weakened, no evidence fabricated, no hold hand-edited.

## Exact next move

1. **Scope the ceremony's browser evidence to the promotion blast radius.** The promotion *authority* is scoped; the *evidence suite* is not, so it still demands the held identity surface be healthy. Introduce `held` as a first-class state distinct from `skipped` (the receipt contract rejects `skipped`), and require that a held test be provably inside an active radius — never merely inconvenient.
2. Land the `/login` guard once step 1 unblocks the Worker lane, or once Obelisk serves JSON at the discovery path.
3. Add a live `/login` synthetic probe to the uptime cron. A 500 on the sign-in entry point went unnoticed long enough to be found incidentally during a deploy.
4. Then promote production and force the deploy-currency probe plus an ordinary Doctor 0.

---


## Session Intent

**S318:** Run the complete `/arc`; audit and implement the strongest verified improvements, pass the required Hetzner staging and public release gates, deploy production, then close out and push directly to `main`.

**Session 318 · 2026-08-16 · agent: Codex · full audit/implement arc → staging verified → production held honestly**

---

## S318 outcome

Seven of eight ranked audit items shipped. Release safety now has one local/CI production path, a capability-slice content gate, a staging-bound solution to the pre-deploy Doctor circularity, and hardened push subscription storage. Mobile is blocking and rendered: 235/235 runtime checks and 63/63 manually reviewed CANON-053 captures. Public/agent truth now includes coherent crawler policy, evidence-derived Desk cadence, 21 fact rows in a 37-row claim ledger, and receipt-bound status projection. Full build passed 309/309.

Canonical Hetzner staging is complete and exact:

- candidate SHA: `29be0bd8df6ff1d5e2f125ff38c864bbbc908eca`
- receipt: `8aa1f9f42262b96d5e8ea5b4`
- files: 5,007/5,007
- artifact root: candidate = staging
- browser gate: 6/6
- artifact root: `2cc840670e5a…`
- rollback snapshot: `/opt/studio/staging/website/.rollback/20260817172802`

Implementation commit `40106d3bf` was pushed directly to `main`; the final staging candidate is pushed commit `29be0bd8d`. The Worker and Cloudflare Pages production workflows both evaluated the hold successfully and skipped every deploy step. Production was not mutated. The authoritative ceremony is 7/8 and rejects only `promotion-ready` because `context/PRODUCTION_PROMOTION.json` remains hold for `real-provider-e2e-pending`. The identity receipt remains honest-dark / `productionEligible:false`, and the release-dependencies receipt names missing `obelisk-staging-registration`. Production still serves baseline `9527f227`; the fresh two-vantage observation is trustworthy `stale` at 651 commits / 12.3 days. Do not bypass or hand-edit the hold.

The remaining audit item, immutable rollback origin, is blocked by D-S303's founder-scoped provider-architecture decision. GitHub Pages still follows mutable `main`; explicit founder authorization is required before migrating it to an immutable verified generation.

## Exact next move

1. Reconcile the Obelisk staging client registration and complete the real provider journey.
2. Rebuild identity, dependency, promotion, and release-proof receipts.
3. Require ceremony 8/8 before any production command.
4. After promotion, force deploy-currency probe + ordinary Doctor=0; otherwise roll back.

**Session 317 · 2026-08-16 · agent: claude-code (Opus 5, 1M) · founder-reported bugs → 4-phase implement**

---

## What this session was

The founder reported three things on The Desk: reaction buttons failing, "Lead signal"/"Quiet signal" being incomprehensible, and no per-article statistics. Then pasted a browser console log that turned out to contain four more real defects nobody had filed. All seven are fixed, plus five gates that were green while broken.

## 1. Reactions — a deployment gap, not a client bug

`/v/desk-reaction` and `/v/desk-presence` returned 404/403. The handlers landed in `ae9efd61a` (2026-08-10); the deployed Worker was `f4cbb5e9` (2026-07-31), confirmed by `git merge-base --is-ancestor` → false.

The cause is structural and worth remembering: `cloudflare/**` is a hard-blocked `SENSITIVE` prefix in the content lane, while hash-named `assets/*.shell-*.js` promote freely. **The content lane is architecturally guaranteed to ship the caller and strand the callee.**

Deployed via the identity lane (`confirm_identity_deploy=true`), which explicitly does *not* release the `real-provider-e2e-pending` promotion hold. Verified live: 200 on GET, 204 on OPTIONS, both routes.

Two honesty defects fell out of it:
- **`worker-route-provenance` was laundering the outage.** `isVantageChallenged` returned true if *any* one route was challenge-shaped, so a single missing route condemned the whole receipt as "the observer was blocked" — while `/_health` returned 200 JSON from the same probe. A clear control now disproves a challenge, and `missing` is a first-class state that names the absent routes.
- **The client blamed the reader.** Every non-2xx printed "check your connection" for an endpoint we had never deployed.

## 2. The labels were wrong, not just unclear

`storyBadge` read `story.kind`, not `day.leadSlug`. On any day carrying two trending stories, **both printed "Lead signal"** — including the one explicitly not the lead. RSS called the same concept "The Quiet Story". Now "Today's lead" / "The quiet story", derived from the real lead, symmetric across hub/article/feed, with a legend in the formats explainer, and both fields validated.

## 3. Per-article statistics

**The view counter already existed.** `assets/rum-beacon.js` is bundled into ambient-core and has been posting per-route to `/v/rum` → R2 the whole time. No Worker change needed; data is retroactive.

**The counting unit is not a row.** Most `/v/rum` objects are `ux` events (`inp:slow_interaction`, `engagement:scroll_25`, `funnel:*`). A sampled day held 4 rows of which only 2 were pageloads. Counting rows would have inflated reach ~10× on interactive routes and published it as a visitor number. A pageload is a row with **no `ux` key**; pinned by self-test.

Shipped: `pageloads`, measured `averageEngagedSeconds`, `attentionRatio` (the labelled bridge between the 220-wpm estimate and the measurement — explicitly *not* completion), and `idleBands`. All server-rendered, all suppressed below their floors.

Idle is captured as one of four **coarse bands, never a duration**, and validated against an allow-list in the Worker. A per-session wall-clock value beside engaged seconds is a materially richer behavioural fingerprint — which is exactly why D-S315.3 declined it.

## 4. Reader signals got their missing half

Reactions had been *collected* since S310 but never aggregated — counts lived only in edge KV. `build-news-desk-reactions.mjs` enumerates slugs from the **committed corpus, never `KV.list`** (listing an unbounded prefix would surface reactions for unpublished stories and grow without limit), bounded at 250 with truncation published. A cumulative counter that *drops* means storage loss, so it publishes `state: "reset"` with both numbers rather than a fabricated decline. Rendered into the existing `/news/directors-report/`.

## 5. Gates that were green while broken

- `generate-news-pages --check` and `build-news-desk-engagement --check` are real byte-drift gates that lived only in a `news:check` script **nothing called** — they had never once run in CI. **build:check 295 → 302.**
- Modeling the new feeds in the evidence graph immediately caught a third: `refresh-live-data.yml` runs `npm run build` (re-rendering the article pages) but staged only `api/`, discarding them every run.
- `clean-stale-shells` would have **deleted** the newly content-addressed `journey-conductor` — its reference map covered only HTML, and the reference lives in the JS bundle.

## 6. From the console log — all real

- **Social icons 404'd on every article.** The generator harvests chrome from a depth-1 page and pasted `../assets/` into depth-3 articles. Harvested chrome is now re-based per page.
- **`journey-conductor.js` 404'd on every page since S306** — predicate-loaded, never hash-named, unpromotable while the full-site lane is held. Its 38 siblings work only because they shipped in an earlier full deploy.
- **Startup brief** used a raw UTC date where the shared resolver uses the studio calendar (after 20:00 ET everything read a day staler), and rendered a byte heuristic as "Verdict: CLOSEOUT ← act now" when the meter was UNMEASURED.

## Verification (exit codes read directly, never through a pipe)

| Gate | Result |
|---|---|
| Canonical `build:check` | **302/302**, exit 0 |
| Playwright desk + compliance | 23/23 |
| Worker unit tests | 43/43 |
| Engagement / reactions / coherence self-tests | 24/24 · 10/10 · 9/9 |
| Live endpoint probes | 200 / 204 both routes |
| `node scripts/ops.mjs doctor` | blockingFailing 0 |

## Honest gaps — read before trusting the new surfaces

- **Both new surfaces read 0 above their floors.** Reactions: the endpoint only came back up today, so nobody has reacted. Engagement: 6 article pageloads across 4 stories against a floor of 5. The pages correctly say "not enough yet". **A correct pipeline does not manufacture readers** — expect these to fill in over days, not immediately.
- **Idle bands have never been observed end-to-end.** The client sends them and the Worker validates and stores them, but no real reader session has produced one yet. First real `idleBand` row in R2 is the proof.
- **The ambient-core bundle hash rotated**, so returning visitors re-download ~66KB once. That was the price of making `journey-conductor` promotable; it is a one-time cost, not ongoing.
- **The stale `Link:` preload header is still live** — the edge preloads `style.shell-cdd5134790.css` while the page uses a different hash. `_headers` is blocked from the content lane, so it needs a full-site Pages deploy. Untouched this session.

## Suggested next

1. Give it a few days, then confirm reach and reader signals cross their floors and render real numbers — that is the only outstanding proof for this work.
2. `Reader-signal → Director's Report closure` can now be completed properly: the rollup exists, so the ranked table can move from "not enough yet" to real content, and the public "You asked → The Desk changed/filed" receipt can reuse `build-you-asked-shipped.mjs`.
3. The Cloudflare `requestPath` GraphQL dimension would give server-side bot classification per article — verify by introspection first, and publish it as a separate labelled number, never merged into the beacon count.
