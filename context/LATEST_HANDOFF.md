# Latest Handoff — VaultSparkStudios.github.io

Last updated: 2026-06-08 (Session 182)

Session Intent: Unplanned — opened on a founder-reported production outage. **Outcome: site restored + recurrence closed, then full 9-axis audit (23 items) + /implement shipped 7. Site healthy (6/6 smoke), Worker deploys green; `build:check` not green locally (non-deterministic gates, audit #23).**

## Where We Left Off (Session 182)
- **Recovered a full production outage.** Apex hung (0 bytes) while `pages.dev` origin was healthy — the Worker fetched its own apex route post-Pages-migration and self-looped. Fixed: `originFetch` rewrites the primary fetch to the Pages origin by hostname (`PRIMARY_ORIGIN`); deployed via `--env production` (the prior bare `wrangler deploy` never updated the routed Worker); added `scripts/smoke-live.mjs` post-deploy liveness gate + auto-rollback to last-known-good. Site verified 6/6 smoke.
- **Full audit:** `docs/AUDIT_2026-06-08-S182.{json,md}` — 23 items, combined Priority 407.7, via 3 sub-agents. Two frontiers: (1) reliability blind spots the ~100 gates missed; (2) a rich paid-member economy with almost nothing bridging it to the anonymous funnel. Supply-chain + secret scans clean.
- **/implement shipped 7/23:** auto-rollback · smoke JSON-validity assertion · `/v/rum` per-IP rate-limit (live) · edge-fn error redaction · odds env-CORS · −1.18 MB dead ambient bundles + corpus-aware orphan gate (fixed a false positive that flagged 18-20-page-referenced hashes for `git rm`) · −8 dead scripts.
- **Needs your action:** `supabase functions deploy create-checkout stripe-webhook assign-discord-role odds` to make the edge-fn security fixes live; set `ODDS_ALLOWED_ORIGINS` to the PromoGrind origin to activate strict CORS.
- **Honest caveat:** `build:check` is not green locally — non-deterministic `--check` gates (ignis-search-index, oracle feed) drift the instant `npm run build` runs. Logged as audit #23; not chased with live-data churn.
- **Next session:** deploy the edge-fn fixes; add Worker unit tests (#14); make the non-deterministic gates deterministic (#23) so the green/red signal is trustworthy; consider a non-datacenter uptime probe (#10). Then the funnel cluster (feedback-loop-closure #1) when ready for product work.

<details><summary>Where We Left Off (Session 181)</summary>

## Where We Left Off (Session 181)
- Shipped: 2 focused improvements — AI discovery public health + task-board runway hygiene.
- Tests: focused gates passed (`build-ai-discovery-health --self-test`, `build-ai-discovery-health --check`, `check-stale-open-tasks --self-test`, `check-stale-open-tasks --check`, `check-ai-discovery-spine --self-test`, `check-ai-discovery-spine`), then `npm run build` and `npm run build:check` passed end-to-end (108-page crawl · 0 status failures · 0 blocking-script findings).
- **AI discovery is now publicly legible.** `scripts/build-ai-discovery-health.mjs` publishes `api/ai-discovery-health.json` from the same validators as the AI-spine gate. Current artifact is `healthy`: 13 public projects, 8 manifest shards, 8 llms shards, header discovery on, no dead internal URLs. `/status/` now renders an "AI discovery spine" tile from that artifact.
- **The board is harder to confuse.** `check-stale-open-tasks.mjs` now flags duplicate active `Now` sections and duplicate current `Human Action Required` blocks. `TASK_BOARD.md` has one S181 runway and one current founder-action section; older runway/founder sections are preserved as historical instead of being left active.
- Honest notes: mobile Lighthouse >=90 is covered by `.github/workflows/lighthouse.yml` after push; there is no repo-local Lighthouse command without downloading tooling, so local verification used the repo's crawl/build contracts. The known advisory signals remain: `assets/vaultsparked-proof.js` is still founder yes/no; `api/field-win.json` is honest-dark until post samples confirm; TT enforce waits for the ~2026-06-12 re-probe.
- Next session: watch post-push Lighthouse/CI; run TT re-probe when due; verify first low-churn uptime publish commit; check field-win/geo-vitals evidence; optionally address the now-explicit board-size advisory with `rotate-taskboard.mjs` if the founder wants more token savings.

</details>

<details><summary>Where We Left Off (Session 180)</summary>

## Where We Left Off (Session 180)
- Shipped: 2 focused improvements — AI manifest discovery header + ambient-split wave 3.
- Tests: focused gates passed (`check-ai-discovery-spine --self-test`, `check-ai-discovery-spine`, ambient coverage, ambient placement, bundle drift, SW coherency), then `npm run build:check` passed end-to-end (108-page crawl · 0 status failures · 0 blocking-script findings).
- **AI discovery is now push-based.** `/agents.json` already existed from S179; S180 made it discoverable from generated response headers (`Link: </agents.json>; rel=alternate; type="application/json"`) and added a gate so that header cannot disappear without failing the AI-spine check.
- **Cold JS got smaller again.** `intent-flight-director.js` and `ignis-answer-engine.js` now load only on their real routes/hooks through `ambient-loader`; the feature bundle dropped 45.4KB→35.2KB. Conversion/info-finding routes keep the pathfinder and static Ask IGNIS behavior; other pages stop parsing them.
- Honest notes: `api/field-win.json` is still honest-dark with 0 confirmed wins; RUM has 35 samples and `/` needs 40 more before strict field quoting. TT enforce still waits on the evidence-led re-probe around 2026-06-12. Founder yes/no items remain: `assets/vaultsparked-proof.js` delete and nav-sheet real-device verification.
- Next session: TT re-probe · field-win/geo-vitals evidence confirmation · uptime low-churn commit verification · optional HTML `<link>` manifest discovery · proof-driven ambient candidate pass if the remaining 7 candidates can be tied to route/hook evidence.

</details>

<details><summary>Where We Left Off (Session 179)</summary>

## Where We Left Off (Session 179)
- Shipped: 4 improvements across 4 groups — AI-discovery (`/agents.json` + spine gate), SEO (meta-description floor gate), a11y (nav `aria-current`), speed (ambient-split wave 2). Plus a build refresh.
- Tests: build:check green end-to-end (108-page crawl · 0 status failures · 0 blocking-script findings) · 2 new self-tested gates (ai-discovery-spine 10/10, meta-desc 8/8).
- Deploy: pending (committed to main; GitHub Pages auto-deploys on push — push happens in autopilot).
- **The studio now ships `/agents.json`.** CANON-011's sitemap standard names it and `build-llms-full-shards.mjs` advertised the pairing, but it was never delivered. `build-agents-json.mjs` generates it from `ecosystem-state.json`; `check-ai-discovery-spine.mjs` (10-case self-test) keeps it consistent with llms.txt. Building the gate surfaced + fixed pre-existing phantom shards in llms.txt and a stale call-of-doodie URL — the AI spine is now honest end-to-end.
- **Item 2 was honestly re-scoped.** The audit's "17 missing meta descriptions" came from a buggy `grep -Lq`; every indexable page already has one. The real, durable deliverable is the floor gate (hard-fail missing/empty) — and building it caught + fixed an apostrophe-truncation bug in my own parser.
- **A11y + speed:** nav active link now announces `aria-current="page"` (was 0 occurrences) across 90 pages; 4 route-scoped widgets left the always-parsed feature bundle for predicate loading, dropping it 58.7KB→45.4KB (−23%) with byte-identical behavior.
- Next session (S180): TT enforce re-probe now due (~06-12) · confirm field-win lights up + uptime publish committed a real history row · geo-vitals non-US · 2 SIL items (AI-spine wave2 discovery header, ambient wave3 + dead-widget sweep) · founder: vaultsparked-proof yes/no + nav-sheet device verify.

</details>

<details><summary>Where We Left Off (Session 178)</summary>

## Where We Left Off (Session 178)
- **The first-party uptime probe now publishes — it was measuring availability and throwing it away.** At /start the probe's first scheduled run on S177's two-signal code came back green (40s @ 01:39Z), but `api/uptime.json` was never committed and `/status/`'s "Uptime · History" tile had nothing to render. The probe now writes `api/uptime.json` (live + 30-day `rollup`) and appends `data/uptime-history.ndjson`; `uptime-probe.yml` commits them low-churn (only on a new hour / state-change / incident, `[skip ci]`); `/status/` shows a self-measured availability % + live incidents; `check-uptime-contract.mjs` (7/7) guards the contract. This closed the open green-confirm carry by making greenness legible.
- **The alarm now proves itself, and two scripts were made import-safe.** `probe-uptime.mjs --simulate-failure` exercises the full down→email path and prints the exact alert without paging the founder (PASS). Building the contract gate surfaced a real bug — importing the probe fired a live network probe — so both the probe and the new taskboard rotator now gate their side-effects on direct invocation.
- **The measurement machine publishes its own wins.** `build-field-win-proof.mjs` → `api/field-win.json` carries only confirmed deploy verdicts; a `/status/` "Biggest measured win" tile auto-lights the moment the origin-migration LCP drop (1588 vs 9489, −83%) confirms, and stays honestly dark while it's pending (0 confirmed today).
- **Returning visitors finally see momentum.** `assets/returning-visitor-digest.js` renders a dismissible "since your last visit, N things shipped" strip from the public Forge Ledger + a localStorage baseline (≥2-ship threshold), idle-loaded via the ambient predicate loader; offline Playwright proof 3/3; cost-neutral.
- **Two efficiency wins:** `vault-genome-strip.js` left the always-loaded feature bundle for predicate loading (28→27 ambient sources, shell re-propagated), and `rotate-taskboard.mjs` shrank `TASK_BOARD.md` 365KB → 130KB (−63%) by archiving sessions older than the last 3 — every future read is cheaper.
- Verification: `npm run build:check` exit 0 end-to-end (108 pages, 0 failures); new self-tests green (uptime-contract 7/7, field-win 6/6, rotate 7/7); digest spec 3/3.
- Next session (S179): TT enforce re-probe now due (~06-12) · confirm `api/field-win.json` lights up + the uptime publish committed a real history row · geo-vitals non-US · founder: vaultsparked-proof yes/no + nav-sheet device verify.

</details>

## Where We Left Off (Session 177)
- **The "site is down" alarm was a false alarm — and the lesson is now canon.** S176's first-party uptime probe failed on its first cron run and emailed "5 routes failing." Live forensics (curl + `wrangler tail` + CF Pages API) proved `vaultsparkstudios.com` **HTML navigation is bot-challenged at the Cloudflare edge**: datacenter/CI/curl clients are intercepted *before the Worker* (hang/403); real residential browsers solve the JS clearance and get 200. The Pages origin serves 200, the Worker is alive (scanner + JSON requests reach it), deploy `171c7bd0` is healthy. **The site was up the whole time.** Captured in DECISIONS 2026-06-07 + agent memory so the next agent doesn't burn a session re-diagnosing it.
- **Probe rewritten to measure real availability, not bot-gauntlet-passing.** `scripts/probe-uptime.mjs` (schemaVersion 2.0): two honest signals a datacenter client can read — Pages-origin content availability (unchallenged) + a production JSON liveness path (DNS+CF+Worker chain). The custom-domain HTML status is kept as a *non-alerting informational* field. Alerts fire only on real origin/liveness failure. Run 4m14s → ~2s; self-test 10/10; exit 0 only on `up`.
- **Worker hardened against the more common real outage — an origin hang.** `originFetch` now bounds the idempotent primary + fallback fetch with `AbortSignal.timeout(8s)`. S176's DR/failover only fired on a clean 5xx; a hang would block the Worker until the edge wall-clock limit. Now a hang fast-fails into the pages.dev failover → DR cache. Deployed `--env production` (version `bb9a734d`, the S175 lesson held — single clean deploy); post-deploy verified scanner-403 + JSON-200 + probe `overall=up`.
- Verification: `npm run build:check` green end-to-end (108-page crawl, 0 failures); generated artifacts (llms-full-shards, oracle ecosystem-state) re-settled.
- Next session (S178): TT enforce re-probe ~06-12 · origin-migration field verdict once ≥5 post-deploy samples/side · confirm the next uptime-probe run goes green on the new code · geo-vitals non-US · founder: vaultsparked-proof yes/no + nav-sheet device verify.

## Where We Left Off (Session 176)
- Session Intent (S176): Full goal-chain `/start → /audit → /implement → /closeout`. **Outcome: 9/9 audit items shipped, all gates green (108 pages, 0 failures), Worker DR layer live-verified in production. The audit was seeded mid-session by a founder live dev-console dump.**
## Where We Left Off (Session 176)
- **The "Loading…" bug was a pipeline bug, not a widget bug.** `extract-inline-styles.mjs` rebuilt its style.css block from only the current run's finds — one run after the HTML kept its `vsx-` classes, 241/253 rules vanished while every page still referenced them. The retired now-playing bar losing `display:none` was the visible tip; the hero letters + 124 homepage utilities were uncovered too. The extractor is now **cumulative + coverage-invariant** (recovered 252 rules → shell `850d887c62`, 330/330 sitewide coverage); the dead `#nowPlayingBar` is deleted; and `check-placeholder-orphans.mjs` (in build:check) makes any future placeholder-forever a build failure.
- **Browser-level 503s are now invisible to visitors.** S175's failover only covered single-origin failure; the Worker now keeps a 7-day disaster-recovery HTML copy and serves it stale on double-5xx (deployed --env production bf71b2db, prod 200 verified). The S175 `--env production` lesson held — single clean deploy.
- **TT burndown wave 2 + observability.** Default-policy migration bridge (`assets/tt-default-policy.js`, first in ambient-core, allowlist-pinned createScriptURL) covers ~167 legacy sinks at one chokepoint; 6 founder-named sinks fixed directly. First-party uptime probe (`probe-uptime.mjs` + `uptime-probe.yml` */30, Resend) replaces the MISSING uptimerobot credential. `_headers` preloads pruned 5→2.
- **Process hygiene that bit this session, fixed.** `pull-rum-summary.mjs` now skips local rewrite when CI committed the summary <24h ago (the UU conflict that opened /start). SIL integrity reconciled (S173/S174 processQuality 101→100; 998→997 / 997→996) + new `check-sil-integrity.mjs` gate + Ark reply to studio-ops.
- **Self-healing drift-preflight:** founder-presence is now autofix — its "drift" is just time passing during a long gate (live-state mirror), never an authoring error.
- Verification: `npm run build:check` green every wave (108-page crawl, 0 failures); Worker live-verified 200.
- Next session (S177): TT enforce re-probe ~06-12 (sinks burned down) · origin-migration field verdict once ≥5 post-deploy samples/side · verify first uptime-probe cron run · geo-vitals non-US confirmation · founder: vaultsparked-proof yes/no + nav-sheet device verify.
## Where We Left Off (Session 175)
- **Production origin = Cloudflare Pages.** Edge-served HTML attacks the field TTFB bottleneck (p75 1.3s) structurally. GH Pages remains the warm rollback (restore 4 A records + www CNAME — verified working during the incident). `pages-deploy.yml` deploys every push in ~27s + purges the zone.
- **Incident, honestly:** first flip 522'd ~2-3min (Pages domain must be `active` before DNS lands — chicken-and-egg). Rolled back fast; the security Worker now carries permanent `originFetch` failover (5xx → pages.dev), so future cutovers are zero-downtime by construction.
- **Worker deploy trap fixed:** `[env.production]` holds the routes — bare `wrangler deploy` hits an unused top-level worker and *prints success*. Three deploys (TT intake fix, failover, edge window) were silently dead until `7c805a3f`. Rule in DECISIONS: always `--env production`, verify via `wrangler deployments list`. TT soak clock restarted late 06-05; re-probe ~06-12.
- **Shell split shipped:** ambient-core 44KB (stable hash) + ambient-feature 62KB. Feature edits stop invalidating every visitor's cache. `propagate-nav.mjs` chains `extract-inline-styles.mjs` (nav template was re-seeding inline-style debt).
- **gtag fully gone (founder-approved):** 97 pages stripped, CSP cleaned; first-party analytics from the unsampled RUM beacon → `api/analytics-summary.json`. Plus `api/geo-vitals.json` (real per-country vitals — US:106/GB:3), regression emails via Resend after nightly rum:pull, and `/status/` Live Signals tiles.
- Verification: gate green (108 pages, 0 failures) · ambient integrity spec 4/4 · live prod serves split shell, no gtag, clean CSP, analytics JSON · pages-deploy 27s green.
- Next session: read the 2026-06-05 field-verdict boundary (S173 critical path + S175 origin move) once ≥5 post-deploy samples/side land — expect IMPROVED · TT re-probe ~06-12 · geo-vitals check for non-US confirmation · founder: vaultsparked-proof yes/no + device verify.
