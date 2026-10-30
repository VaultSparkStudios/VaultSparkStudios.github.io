<!-- Earlier decision blocks preserved verbatim in context/archive/DECISIONS_before_S397_closeout.md. -->

> Older entries through S402 live verbatim in `context/archive/DECISIONS_S1-S402.md` (exact pre-rotation snapshot). Recent complete entries follow.

## D-S352.1 — A publisher's derived page is modeled in the graph, not fixed in one workflow

**Decision:** the stale sitemap was fixed by adding `sitemap <- news/` to `config/evidence-graph.json` and letting `check-publish-cascade-coverage` name every publisher that strands it, not by adding one line to `news-publish.yml`. The gate was run against the unedited workflows first, and it named four.

**Why:** a one-line fix would have repaired the publisher that was seen and left three unseen ones (`refresh-live-data`, `rum-pull`, `vault-narrative`) able to strand the same file. The cascade gate reported "all closed" only because the graph had no edge to check. Modeling the edge makes every current and future publisher answer to it.

## D-S352.2 — Generated paths come from the evidence graph, with two exclusions

**Decision:** `check-writeback-currency` treats a path as generated when it matches the existing receipt patterns, is under `.cache/`, or is a non-HTML, non-`sharedOutput` evidence-graph output. An unreadable graph yields an empty set.

**Why:** the regex list is a second copy of knowledge the graph already holds, and it went stale the way copies do (S320 subject lists, now S352 paths). HTML pages and shared outputs are excluded because a person also edits them; counting `index.html` as generated would hide real homepage work. If the graph fails to load, the check reports debt rather than hiding it.

## D-S352.3 — The edge sampler is routed through an existing cron by proposal, not shipped dark

**Decision:** the website does not yet ship a sampler RPC entrypoint. An Ark `agent-handoff` asks studio-ops to invoke the sampler from `studio-ops-cron`'s existing `*/30` trigger via a service binding. This repo ships its half only when studio-ops accepts.

**Why:** the cron cap was recorded as founder-only (retire another project's cron, or pay). A third option, reusing a trigger that already exists, needs no billing and no new slot, but it crosses into another repo, so under CANON-018 it goes as cargo. Shipping the entrypoint now would add Worker surface nothing calls, and would force a `cloudflare:workers` import shim into the node-run unit tests with nothing gained.

## D-S353.1 — A publisher that preserves instead of publishing must read red

**Decision:** `generate-vault-narrative.mjs` still preserves the previous dispatch when inference is down or an answer is rejected, and still exits 0 so the refreshed feeds commit. A new final step, `--check-fresh`, runs after the commit and fails the workflow once the newest dispatch is older than 48h.

**Why:** from 2026-08-27 to 2026-09-09 every run rejected the model's answer, kept the 2026-08-26 dispatch, and reported success. Nobody could see it: the run was green, `/journal/dispatches/` quietly stopped growing, and the homepage widget self-hides past 72h. Preserving is the right fallback for visitors and the wrong signal for operators; the check separates the two without losing the commit.

## D-S353.2 — The grounding prompt and its validator read one vocabulary

**Decision:** `groundingAnchors()` produces the anchor list the prompt shows and the only phrases the validator accepts: catalog names, heatmap names, pulse item titles and the session label. Counts are checked for correctness, in digits or words, not just spotted.

**Why:** the validator accepted catalog names the prompt never listed, digit strings the brand voice writes as words, and a shipped list that is empty. A live rerun on 2026-09-14 had three truthful answers rejected (they named Session 352, Studio Pulse and the real counts). A first cut of the count check then read "Session 352 sealed" as 352 sealed projects; the lookbehind for session and build labels came from that live answer, not from theory.

## D-S353.3 — Coverage gates measure the universe the runner executes, not the one the steps string lists

**Decision:** `check-evidence-graph-coverage` now also parses the generator `--check` entries inside `check-proof-surface.mjs`. The baseline was raised once, from 0 to 20, to record debt that already existed, and may only fall from here. `check-workflow-runtime-dependencies` likewise follows derived-build profiles and `npm run` into local imports, per job.

**Why:** both S353 CI failures and the S352 sitemap strand passed a gate that measured a subset: "67/67 modeled" excluded 25 proof-surface checks, and the install gate never asked whether a job needed packages at all. Raising a ratchet baseline normally signals a regression; here it is the first honest reading, and the negative control against the old baseline named all 20 generators. `resync-derived` keeps its prior boundary because the widening is opt-in.

## D-S354.1 — Analytics delivery is verified in a real browser before any CSP or injection change

**Decision:** no Worker beacon injection and no `connect-src` change. Cloudflare's automatic setup already delivers the beacon correctly. `/privacy/` now discloses Cloudflare Web Analytics, which had been running on every page without mention.

**Why:** the first diagnosis was wrong twice, and both parts were coded before they were disproved. (1) "No beacon in served HTML" came from a request without a browser `Accept: text/html` header; with one, every page carries exactly one nonce-bound beacon. (2) "`connect-src` blocks the reports" assumed the beacon posts to `cloudflareinsights.com`; its own source sends a config that carries `version` to same-origin `/cdn-cgi/rum`, which `'self'` allows. A real Chromium visit confirmed it: beacon 200, no CSP violations, report POST 204. Both edits were reverted before any build or deploy. The Worker injection would have double-counted every visit.

**Settled by evidence:** four headless test visits appeared in GraphQL within minutes, flagged bot=1, so reporting and ingestion work. Before them the site had no rows for seven days while other sites had up to 493: a real absence of reported browser visits, not a defect. An earlier "zero for every site" reading was a parser bug in my probe, not the query.

## D-S354.2 — An empty scan set is reported as "nothing scanned", never "clean"

**Decision:** `scan-secrets` prints "Nothing to scan — 0 files … (not a clean result)" when its file set is empty and reports `filesScanned` in JSON. Exit stays 0 by default; `--require-files` exits 3.

**Why:** in S353 "✓ Clean — 0 findings" printed over an empty index and nearly counted as a pre-commit pass. The exit code is unchanged because the closeout autopilot calls the scanner in states where nothing staged is normal; the wording is what lied.

## D-S354.3 — `release-dependencies` is a graph node, and `release-proof` declares it as a source

**Decision:** `api/release-dependencies.json` is modeled from its generator's real inputs, and the edge `build-release-proof` already read is declared. Weekly Maintenance now rebuilds and stages the release proof in the same commit.

**Why:** with the edge added and no workflow changed, the cascade gate named Weekly Maintenance, which committed a fresh dependency receipt while leaving the proof built from it stale. The coverage baseline falls 20 → 19.

## D-S355.1 — Only a run that can deploy may cancel the Pages run in flight

**Decision:** `pages-deploy.yml` sets `cancel-in-progress` to true only for a `workflow_dispatch` with `confirm_production` or `confirm_content` set, read via `github.event.inputs`. Push, schedule and input-less publisher dispatches queue instead.

**Why:** in S354 refresh-live-data dispatched this workflow with no inputs, the run took "Promotion held" and deployed nothing, and `cancel-in-progress: true` let it kill confirmed promotion `34824034218`. GitHub's docs confirm expressions are allowed and that queued runs replace older pending ones; they do not say what `inputs` is on push, so the expression avoids relying on it.

## D-S355.2 — A publisher that stages an evidence-graph source must push with --resync

**Decision:** `check-publisher-resync` fails any `[skip ci]` workflow whose `git add` covers a graph source without `publish-push.sh --resync`; three publishers were fixed.

**Why:** the cascade gate checks a workflow rebuilds and stages what it derives, not that it re-derives after the push-time rebase. A full resync run was measured to need no npm packages (38 rebuilt nodes, 19 swept generators), so no install step was added.

## D-S355.3 — Founder presence is verified against its own sources, not against live sessions elsewhere

**Decision:** `generate-founder-presence --check` validates the committed payload's shape, invariants and a `sourceDigest` over this repo's generator, slug library and project registry. `--check-live` keeps the strict regenerate-and-compare.

**Why:** the payload mirrors the freshest session in any repo via studio-ops' ACTIVE_SESSIONS.json, so the old check failed build:check and the pre-push hook whenever another repo started or ended a session (twice in S354). Liveness is refreshed by publishers; the gate's job is to catch code or registry drift, which the digest still does.

## D-S355.4 — Renderer and verifier share one HTML escape

**Decision:** `scripts/lib/news-html.mjs` exports the escape the Desk renderer already used; the renderer aliases it and `check-news-claim-parity` uses it. Generated pages are byte-identical.

**Why:** the gate escaped `& < >` while the renderer also escaped `"`, so a quoted fact read as absent and a cleanly authored edition was refused (run `34786386279`). The other Desk refusal (`34814843409`, a visual anchor not in the corpus, then cadence) was a correct gate and is unchanged.

## D-S355.5 — Deferred with reasons

**Decision:** not done this session: mounting the narrative on `/journal/` (UI change, own receipt cycle), staging Worker observability (Worker deploy plus a CANON-029 free-tier check), Desk readable-source breadth, the S336 surfaces' visual review, the Trusted Types load-order hoist (own session), `/atlas/` retirement (site-wide nav and footer), and 19 unmodeled generators (ongoing).

**Why:** each either changes rendered pages, needing its own visual-receipt cycle, or touches a production surface whose risk deserves a dedicated release. Batching them into a gate-and-CI-only release would have made every receipt invalid at once.

## D-S356.1 — Desk illustrations are generated on the founder's ChatGPT plan, locally, never from a billed API key

**Decision:** `scripts/generate-news-art-codex.mjs` runs Codex CLI (ChatGPT login) on this machine to generate each story's illustration; `scripts/ingest-news-art.mjs` accepts an image only when its id AND pixel hash were operator-reviewed, then rebinds the receipt and rebuilds that story. CI keeps publishing with a text-free procedural placeholder, labelled "Illustration pending", when no real art exists yet.

**Why:** the publisher never had an image model — every drawn image between 2026-08-07 and 08-23 came from a hand-run interactive session, and when those stopped, 25 consecutive stories shipped the diagram card. The founder's ChatGPT plan covers generation; an API key in Actions would be new recurring spend (CANON-015/029). Preflight refuses API-key login and any non-OpenAI provider, and requires a sandbox backend that actually confines (the configured Windows backend failed to start and ran unconfined).

## D-S356.2 — Desk comments are open to everyone, automatically filtered, with members featured

**Decision:** anyone may comment on a Desk article without an account. A deterministic filter publishes, holds or rejects; borderline text is held, never auto-published. Signed-in Vault members are badged, sorted first and may be featured. Reports auto-hold at three. Raw rows are service-role only; the public view exposes no ip_hash, user_id or filter fields.

**Why:** founder decision, 2026-09-14. Open participation is the point of an experimental public newsroom; identity-free reactions already set that precedent. No paid AI moderation: a curated, testable filter plus a human queue is cheaper, auditable and does not add a per-comment vendor call.

## D-S356.3 — Publishing every day is enforced by evidence, not by cron

**Decision:** the late-night slot fails red when no non-simulated edition exists for that slot's own date; the novelty window is 7 days; a follow-up may publish only under a dated slug with a source the original did not cite, and never twice in a day; facts may quote a publisher's own feed summary when that publisher blocks the fetcher, labelled as feed text.

**Why:** four slots a day against a 14-day novelty window starved supply — 110 topics were unreachable because only aggregator links existed. "Success" also hid missed days: most steps are allowed to fail, so a whole empty day stayed green until the next morning. Sources widened by 20 verified feeds instead of loosening any standards rule.

## D-S356.4 — The member newsletter ships through Brevo, with a working unsubscribe and a postal address

**Decision:** sender `news@vaultsparkstudios.com` via Brevo (D-S259.2), one-click unsubscribe (RFC 8058) plus a confirmation page served from vaultsparkstudios.com through a Worker proxy, and the studio's postal address in every issue. A real send refuses while the unsubscribe base is not browser-ready.

**Why:** the function existed but was never deployed — every monthly run since April failed with 404 and an empty secret. Supabase rewrites HTML to plain text on its default host, so the visible unsubscribe link would have been dead. CAN-SPAM requires a physical address in commercial email; the founder supplied it.

## D-S356.5 — Public numbers come from the registry, and placeholders say so

**Decision:** the portfolio total is derived from the project registry (26) instead of a hardcoded 27; Studio Pulse picks its "right now in the forge" project by most recent real activity and marks projects resting or dormant; a truncated commit window is published as `partial`, never as `ok`; a content-lane promotion counts as reconciled only with matched, fresh shell parity.

**Why:** the 27 was a hand-kept literal with no project behind it; Solara showed as actively forged for 93 days because ranking used a static progress number; a one-page GitHub fetch published a large undercount as healthy; and a lane-head-only match could mark a stranded deploy verified, resetting the alarm streak.

## D-S356.6 — Founder presence is removed from the website, permanently

**Decision:** every founder-presence surface is deleted: api/founder-presence.json, its generator, the sitewide presence badge, the wordmark handle, the favicon pulse, the hero-ticker tile, the Studio Pulse tile, the Atlas dot, the edge SWR entry, the evidence-graph node, and every regeneration vector (build step, pre-push autofix, closeout autopilot, cron). Session-timing copy is removed from public-intelligence, the studio timeline and Studio Pulse, and per-project work-recency (lastUpdated/staleDays) is no longer published in api/ecosystem-state.json or rendered on /oracle/. A guard test (tests/founder-presence-absent.unit.spec.js) fails the build if any of it returns.

**Why:** founder directive, S356: "Remove all founder presence info from website. No idea why it was ever there to begin with. It is a threat." Forensics: the feature was agent-invented at S98 (2026-04-22) as a "moonshot" in an agent-authored decision log and extended across ~12 sessions by agent-scored audit items — one justified it as a "subtle ambient parasocial cue". No founder request exists in either repo, and studio-ops had already ruled it out at S341 (D-S341.5) without this repo being told. Measured exposure: 30 revisions carried live:true between 2026-07-03 and 2026-09-14 (~41.2 hours of published presence, longest single window 9h34m), naming seven projects with exact start timestamps; one production promotion (a4a40a84a) is proven to have served it. CANON-028 passed throughout because it was scoped to names and emails — an activity feed contains neither. The privacy engineering that did exist protected unannounced project names, never the person.

## D-S356.7 — Public counts come from the registry, and unannounced work is described as sealed, not vaulted

**Decision:** the portfolio total is registry-derived (26: 8 sparked, 16 forge, 2 vaulted); the press kit sentence is generator-owned; the drift gate now matches "projects" as well as "initiatives"; and press copy says 6 initiatives are unannounced sealed silhouettes instead of "12 additional initiatives are vaulted".

**Why:** the 27 was a hand-kept literal with no 27th project behind it, and 141 pages carried it. The gate missed the membership page for months because its pattern was noun-locked. "Vaulted" means paused or archived on this site, so using it for unannounced work was wrong on the site's own terms, not merely numerically stale.

## D-S357.1 — Shell parity must be bound to the tree it measured, and must expire

`api/deploy-currency.json` published `content-current` over a 67.7h content backlog. Shell parity is a comparison between two operands, but the receipt recorded only `actual` (production) as evidence; `expected` (the prober's own `index.html`) carried no binding to the tree it came from, so a CI reading survived being rebased into a tree it had never seen.

**Decided:** a parity verdict carries `expectedFrom`, a hash of the operand it was measured against, and is downgraded to `superseded` when the local tree no longer matches. The binding is recovered retroactively by hashing `expected[]`, because the operand was always in the receipt and nobody compared it. Separately, `matched` expires after `SHELL_PARITY_MAX_AGE_HOURS`; an aged snapshot is not a measurement, and an unknown age counts as aged.

**Rejected:** widening `OBSERVATION_MAX_AGE_HOURS`. That clock is reset by a successful build-sha sub-probe, so it can never bound the parity reading — which is exactly how the false green survived.

## D-S357.2 — The content lane cannot update an unhashed client script, so client JS is fingerprinted

`check-content-lane-purity` classifies an unhashed `.js` as "sensitive, executable, or unrecognised type" and holds it; only fingerprinted shell assets are promotable. This is correct — executable code should not ride a content lane — but it means a plain client script never changes except on a full deploy. Measured on staging: 27 of 171 unhashed client scripts were serving pre-S356 bytes, including two that still called a privacy endpoint S356 deleted.

**Decided:** client scripts that ship behaviour are fingerprinted through `build-shell-assets`, and loader-embedded references are content-addressed through `CONTENT_ADDRESSED_PREDICATE_SRCS` at bundle-build time. The remaining 25 are on the task board; each rotation needs its own receipt cycle, so they are not swept in at once.

**Rejected:** relaxing the lane's purity rule to let unhashed `.js` through. The rule is the safety property; the naming was the defect.

## D-S357.3 — A public surface fed from git subjects filters structurally, and fails closed

`/changelog/` was about to publish raw commit subjects to visitors under "You asked → we shipped", including one carrying a candidate hash. A denylist of developer vocabulary was out-vocabularied twice within the hour — once by a perf commit, once by the commit that installed the denylist.

**Decided:** filter on structure first — the commit's touched files (`visitorFacing`, already computed by `build-commit-map` and never read by this surface) and its conventional-commit type. Prose filtering stays as a third pass. All three fail closed, and an illegible line is dropped rather than rewritten, because rewriting an internal subject into reader prose would fabricate the claim the surface exists to evidence. The box rendering empty is the honest outcome.

**Recorded as the real fix, not done here:** source the shipped lines from `data/consumer-changelog.json`, which is reader prose by construction, so no filter has to guess.

## D-S357.4 — Production promotion deferred to the founder

S356 + S357 are ready: build:check 499/499, staging serving the exact candidate with zero failed responses, both ceremony browser gates green. The Worker deploy and the `pages-deploy` `confirm_content` dispatch were both refused by the agent session's permission policy.

**Decided:** do not work around the denial. The release is handed to the founder with the exact two commands, in order, and the verification steps — recorded in `LATEST_HANDOFF.md`. Production continues to serve `e65eca737` from 2026-09-14 until then, and no surface claims otherwise.

## D-S358.1 — Every client script a page or served loader reaches is fingerprinted; the drift gate counts reachability, not mention

Production measured 19 lane-held scripts still loaded while serving pre-S356 bytes. Two of the 19 were false alarms: `studio-now` and `journey-conductor` were already content-addressed, but the gate read the UNBUNDLED `ambient-loader.js` source, which still names the plain path, while the served bundle names the fingerprint.

**Decided:** (1) the remaining 17 join `build-shell-assets` (five loader-only ones also join `CONTENT_ADDRESSED_PREDICATE_SRCS`; `trust-depth` is rewritten inside `home-idle-loader` through a generalised nested-reference table, hashed children-first). (2) `check-lane-held-asset-drift` resolves references transitively from page tags through served scripts, so a source file matters only when something served reaches it. Self-test 13/13 with a negative control for the unserved-loader case. Result on the rebuilt tree: drift that matters 19 → 0. The purity rule is untouched — the naming was the defect, never the rule.

## D-S358.2 — "You asked → we shipped" reads only founder-declared links from the reader changelog

Within a day of S357's three-layer firewall, a git subject ("rebind the mobile proof without re-running the 215-cell audit") was on the feed: `rebind` is not `\bbind\b`. That is the third time a vocabulary filter was out-vocabularied.

**Decided:** `build-ship-receipts` no longer reads git. Shipped lines come from `data/consumer-changelog.json`, and an entry answers a feedback theme only when its `answers` array names that theme — set via `answers:` in the draft frontmatter at founder approval (`publish-changelog-draft`, validated). No keyword inference: guessing "this is what you asked for" would fabricate the claim the surface exists to evidence. No entry is tagged yet, so the box is honest-dark until the founder tags one; that is a board item, not a defect. The field keeps the name `shippedCommits` so no fingerprinted client rotates for a rename.

## D-S358.3 — The /changelog/ loop section stops querying a table that was never meant to exist

`vault_feedback` returns PGRST205 (no such table), and the Q2 decision on feedback is that raw feedback stays browser-local and never reaches a server table. The runtime fetch could only ever 404. **Decided:** remove it and its permanent "Aggregating…" note; make the stats static and true (3 loops, latest May 22; the never-populated turnaround stat removed); drop session codes from the entry meta; and remove the entry describing the founder-presence underline, a feature retired for privacy in S356 that the page still presented as live.

## D-S358.4 — The homepage ticker and the returning-visitor strip read the reader changelog

Found by looking at the rendered homepage during the CANON-053 pass, not by a gate: the hero showed "Latest from the forge · Shipped run the lane-drift measurement inside t…", and the feed behind it held "Refined record the three board items worked." (scope `S357`). `api/recent-ships.json` was a projection of the commit-derived narrative; `returning-signal-strip.js` rendered the same sentences to returning visitors as "New:".

**Decided:** `recent-ships.json` is now projected from `data/consumer-changelog.json` (newest founder-approved titles, no sha or scope), and the strip reads it instead of the narrative. The strip is fingerprinted so the change can ride the content lane. `api/changelog-narrative.json` itself is left commit-derived for now: `notify-changelog-subscribers` keys subscriber mail off its latest sha, and changing that is a mail-side decision, not a surface fix — it is recorded on the board.

## D-S359.1 — "You asked" counts readers who asked, never commits

`build-ship-receipts` rendered `feedbackSignals` from `build-feedback-provenance`'s theme counts, which are the number of COMMITS keyword-classified into a theme ("a correlation surface, not a per-ticket link", in that script's own header). So three homepage commits read as three readers asking. **Decided:** receipts exist only for themes the k-anonymous decision sampler has qualified (threshold 5), with the reader count; below the threshold the box is honest-dark. None qualifies today (observed total 0), which supersedes the S358 "founder: tag an entry" item — there is no reader ask to answer yet. `answers:` keys are validated against `READER_THEME_KEYS`, bound by self-test to the sampler's own theme map.

## D-S359.2 — The narrative feed and the subscriber push read the reader changelog

`api/changelog-narrative.json` was the last public feed built from commit subjects, and `notify-changelog-subscribers` would have pushed `entry.sentence` ("Refined record the three board items worked.") to web-push subscribers. **Decided:** the narrative is built from `data/consumer-changelog.json` (one entry per approved entry; `sentence` is the approved title, nothing composed), entries carry a git-free `id` (sha256 of date|title), and the notifier keys its sentinel on that id and refuses a feed without ids. The internal draft tool bounds its git log by the newest published entry's date. The narrative `--check` now compares content, not just entry count. The notifier was dry-run only; no push was sent.

## D-S359.3 — Status hues on /games/ become theme classes

Inline `style="color:#…"` on the three hero status labels meant no theme could reach them; light mode measured 1.47 / 1.90 / 2.22:1. **Decided:** modifier classes with the same hues in dark themes and darker same-family variants in light mode (5.22 / 6.45 / 6.55:1, measured from rendered pixels with the text hidden to sample the real background). `/membership/` "See The Value", flagged from a thumbnail in S358, measured 4.61:1 and is not a defect.

## D-S359.4 — A Supabase restart is a founder action this session

The project's DB is unreachable even from Supabase's control plane (readonly probe: connection timeout; disk util 500; no upgrade running). A restart through the Management API is the remedy; the agent's attempt was refused by the session permission policy and was not worked around. The exact command is in LATEST_HANDOFF.

## D-S360.1 — /status/ only reports a service up when the answer came from the service

The REST probes accepted any 401/403 as proof of life. The Supabase gateway answers 401 in about 50ms with no database behind it (measured S360 while the DB was unreachable), so a rejected-key response could paint a dead database green. **Decided:** a probe passes on a 2xx, or on a 401/403 whose body carries a Postgres SQLSTATE `code` (the refusal came from the database). The overall banner stays "Checking services… (n of 7)" until every check has reported, and when all five Supabase-backed checks fail together it says the provider is out and the website is up. It is derived from results, never hard-coded.

## D-S360.2 — An embed paints only with its own colours

`api/leaderboard/v1/widget.js` sets a fixed `#0a0a0a` background and read `--muted`/`--dim` from whatever page embeds it; our light theme defines those as dark slate (1.9 / 2.6:1). **Decided:** the widget carries literal colours only (`#a8b4d0` 9.5:1, `#8b9bc9` ~7:1), enforced by `tests/shell-assets.unit.spec.js`. Any future embed follows the same rule, because host tokens are designed for the host's background, not the embed's.

## D-S360.3 — Two open board items closed as already fixed, with evidence

The Oracle/IGNIS light chip (S356 P1) was fixed in S357 (opaque ground, 7.11:1), and the drift-preflight scope item (S356 P2) was resolved in S357 by making the tool compute and print its own denominator. Both were still open on the board, and both are closed with the file references, not re-worked.

## D-S360.4 — The Supabase restart stays a founder action

Re-probed at S360 start: db/rest/auth UNHEALTHY and every anon call times out. The Management API restart was attempted again and refused by the permission classifier ("Modify Shared Resources"). It was not worked around. The command is unchanged in LATEST_HANDOFF.

## D-S360.5 — The task-board rotator reads the current heading form and never archives open work

`check-startup-context-budget` failed at 42,217 of 42,000 tokens and named `rotate-taskboard.mjs` as its repair, which reported "nothing to rotate". Since S357 finished blocks are headed `## Closed — S<n>` / `## Previous — S<n>`, a form the rotator did not recognise, so the gate's own repair could not act. Separately, `rotate()` would archive any session-tagged block older than the window even if it held open `- [ ]` tasks. **Decided:** the S357+ form is recognised (the live `## Open — S<n>` block never is), and a block with an open item is never archived. Self-test 28/28 including both properties. Rotation moved 4 closed blocks (152 KB → 142 KB), the open-item count was 69 before and after, and the budget is back to about 39,600 tokens.

## D-S361.1 — The service-worker precache is de-duplicated at source, at install and by test

Found while checking what the new /status/ offline row would claim: on production, a real `navigator.serviceWorker.register('/sw.js')` went `redundant` every time. Reproduced in a page: `cache.addAll(STATIC_ASSETS)` → `InvalidStateError: duplicate requests (notify-me.js, scroll-depth.js, scroll-reveal.js)`; the de-duplicated list → `ok`. **Decided:** remove the duplicates, install from `[...new Set(STATIC_ASSETS)]`, and assert no duplicates in `tests/shell-assets.unit.spec.js` (fails against the old file). Local install now reaches `activated`.

## D-S361.2 — A browser capability is not a service

The /status/ Service Worker row fed the overall verdict, so a private window read "Partial Outage". **Decided:** it is informational ("Notifications & Offline (this browser)"), with the true reason. The worker is registered only by the Vault portal and the notification opt-in, never on a plain visit, so the copy says exactly that.


## D-S362.1 — The cron staleness probe reads a cron line that carries a comment, and adds the rates

`check-scheduled-workflow-staleness.mjs` anchored its cron pattern at end-of-line, so every `- cron: '0 6 * * 1'   # Every Monday` matched nothing — 11 cron lines in 9 of this repo's workflows. Those workflows fell back to a daily expectation, and **Weekly Maintenance**, whose last scheduled run was on time, was reported `silent` against a 72h threshold; the doctor printed that verdict. **Decided:** `parseCronLines()` reads to the closing quote, or to the comment when unquoted, and `combinedIntervalHours()` combines lines by summing their rates rather than taking the minimum — four daily slots (`news-publish`) are one run every 6h, not one a day, so a three-day stall there is now reportable. Fixtures use the verbatim workflow text; self-test 28/28. Live: 14 workflows checked, 0 silent.

## D-S362.2 — Write-back currency classifies PROJECT_STATUS.json by key, not by file

`context/PROJECT_STATUS.json` is hand-written *and* tool-written: `resync-derived` rewrites `doctorScore` on every run, so each `chore(resync)` commit that follows a closeout carried exactly one "hand-written" file and was reported as **WRITE-BACK DEBT** 12.3h after a correct S361 closeout (`df79cc6b`, `6df82ca9`). Classing the whole file as generated would have laundered real work: `20e0dd4b2`, also a `chore(resync)`, changed `health`, `currentFocus` and `blockers`. **Decided:** classify at key level. `STATUS_RECEIPT_KEYS` (doctorScore, doctorBlockingFailing, testsSourceFingerprint, testsPlanFingerprint, ignis/entropy score + lastComputed) was surveyed across 40 commits, S344–S361. A PROJECT_STATUS edit is churn only when its changed keys are **known** and all are receipt keys; an unreadable diff leaves the commit substantive, so the rule can only over-report, never launder. Self-test 20/20 with both regressions pinned.

## D-S362.3 — The unarmed newsletter cron holds instead of failing

The Monthly Member Newsletter had failed all six of its scheduled runs since 2026-04-02 (`404 Requested function was not found`) because it is deliberately unarmed (D-S341.4; arming is a founder decision, S354). Six red runs a year are indistinguishable from a cron that broke, which is how a real breakage would hide. **Decided:** the scheduled trigger checks the repository variable `NEWSLETTER_ARMED`; when it is not `true` the run emits `::warning title=Member newsletter held::` and exits 0. The staleness probe already reports held publishers by name (S355), so the state stays visible without reading green. Manual `preview` / `dry-run` / `send` dispatches are unchanged. **This arms nothing and sends nothing.** To arm: set the variable, then dispatch one `preview` and one `dry-run` before the cron fires.

## D-S362.4 — A browser gate now installs the service worker

`verify-sw-assets.mjs` proves the precache files exist and the S361 unit test rejects duplicates, but no gate had ever run `navigator.serviceWorker.register()` — which is why an uninstallable worker survived in production from at least 2026-06-03 to S361. **Decided:** `tests/service-worker-install.spec.js` registers `/sw.js` against the local preview, requires `activated` (not `redundant`), and asserts every declared `STATIC_ASSETS` entry landed in the precache. It is a **blocking** step in the E2E compliance job and is in the `verify:local` core and extended tiers. Mutation-tested: a duplicate entry now passes (S361's install-time `Set` absorbs it, correctly), and a 404 precache entry turns the worker `redundant` and the test red.

## D-S362.5 — The precache is reviewed and kept, with numbers

100 unique entries, 3.2 MB raw / ~779 KB brotli; the largest are `vaultspark-icon.webp` (75 KB), `icon-256.png` (40 KB) and the shell CSS (36 KB). The worker is registered only by the Vault portal and the notification opt-in (D-S361.2), so this is a background cost for members who asked for offline and push, not a first-visit cost for readers. **Decided:** keep the list as it stands; no trim is justified by these numbers. The S361 board item is closed with the measurement.

## D-S362.6 — The IGNIS rescore remedy cannot work from a project repo (deferred, routed to studio-ops)

The doctor's `ignis` check reports a 10-day-stale score and names `rescore-ignis --stale` as the remedy. The propagated copy reads `portfolio/PROJECT_REGISTRY.json` from **its own repo root**, a file that exists only in studio-ops, so here it reports `staleCount: 0, rows: []` and the remedy is a structural no-op. Scoring would also run the IGNIS CLI against the `vaultspark-ignis` tree, which currently holds another session's uncommitted changes — a project session must not write there (CANON-018). **Decided:** not worked around locally. Shipped as an Ark `repo-question` to studio-ops (`01K2TR2MCB649E1AD036E22BAD`); the stale score stays honestly reported meanwhile.

## D-S362.7 — Two more receipt paths, found by the fix from an hour earlier

After the release, the repaired write-back probe still counted `chore(release): bind the S362 staging publish` and `chore(resync): converge derived graph` as substantive — in 12h they would have been a fresh false DEBT. Their only non-generated files were `output/staging-themes/*.png` (the release ceremony theme screenshots, written by `tests/staging-release.spec.js`) and `docs/GENIUS_LIST.md` (written by `generate-genius-list.mjs`). **Decided:** both are receipt paths. The probe reads "write-back current" with no substantive commits after the SIL anchor, which is the truth. Noted because it is the enumeration failure mode the S352 comment predicted: the list grows one real discovery at a time, and each one must come from an observed commit, never a guess.

## D-S362.8 — The newsletter streak is not cleared by this session, and should not be

The staleness probe still reports `Monthly Member Newsletter: 6 consecutive failures`. The hold (D-S362.3) only takes effect on the next scheduled run (2026-10-02), and the probe reads run history, not workflow source. Backfilling or muting the streak would be fabricating evidence. **Decided:** the red stands until a real held run replaces it, and this expectation is recorded here so the next session reads it as expected rather than as a regression.

## D-S363.1 — The newsletter send gate keys on the mode, not on the event

`member-newsletter.yml` held the unarmed send behind `EVENT_NAME = schedule` (D-S362.3). Two defects followed from that one choice. A manual `workflow_dispatch` with `mode=send` set `MODE=send` and `EVENT_NAME=workflow_dispatch`, skipped the hold entirely, and would have mailed every opted-in member with `NEWSLETTER_ARMED` unset — a dropdown silently overriding the arming decision D-S341.4. And the hold branch was unreachable by any manual run, so the guard added to stop the false alarm would first have executed unobserved on 2026-10-02. **Decided:** hold whenever the *effective mode* is `send` and `NEWSLETTER_ARMED != true`, whatever triggered the run. This closes the bypass and makes the branch testable by the same dispatch it now also protects. `preview` and `dry-run` send nothing to members and are never held. **This still arms nothing and sends nothing.**

## D-S363.2 — "Repaired, awaiting its next run" is a verdict the staleness probe now has — and it is not the mute D-S362.8 refused

D-S362.8 decided the newsletter's 6-failure streak must stand until a real held run replaces it, because "backfilling or muting the streak would be fabricating evidence." That reasoning is correct and is preserved here. What changed is that the probe gained a *new, independently verifiable fact* it never consulted: **the commit time of the workflow's own source**. A red streak whose every run predates the commit that fixed the workflow is pre-fix history, not a live break — and that is an observation, not a backfill.

**Decided:** `check-scheduled-workflow-staleness.mjs` reports `repairedUntested` instead of `broken` only when *all* of: every run in the streak carries a timestamp; every one of them predates the workflow file's last commit; and one full cadence interval has not yet elapsed since that commit. The streak count, the source commit and the expiry instant are all still reported by name. It self-expires: if the cron goes a whole cycle without producing a run, `broken` returns, because a repair that never ran is not a repair. A workflow nobody touched stays `broken`; a failure postdating the fix makes the streak real again; an undated run blocks the downgrade entirely. `silent` is still computed from the final verdict, so a cron quiet past its cadence keeps saying so. Nine self-test cases pin each guard, three of them named for the mute they exist to prevent.

The distinction that makes this legitimate rather than a softer red: D-S362.8 forbade *asserting* a fix the evidence did not support. This asserts only what git can prove — that the failures are older than the fix — and refuses to assert anything else.

## D-S363.3 — `overall` reflects all four Supabase planes, not just one

`probe-supabase-control-plane.mjs` computed `allReady ? 'ready' : dataRestReady ? 'partial' : 'blocked'`, pivoting the whole summary on the service-role plane. Measured live: the receipt read `overall: "blocked"` while carrying `managementApi: ready`, `sqlMigration: ready` and `edgeFunctions: ready`, and the identity receipt beside it published `readyPlanes: 3, totalPlanes: 4` next to that same `blocked` — the contradiction was in the artifact verbatim. This receipt is served to `status/`, `agents.json` and `api/release-proof.json`, so a reader taking the headline concludes edge-function deploy is unavailable. Deploy authority was live throughout (HTTP 200, 30 functions enumerated this session) — a phantom blocker produced by the probe that exists to prevent one (CANON-019, CANON-031).

**Decided:** `ready` when all four planes are ready · `partial` when any is · `blocked` only when none is. The CLI now also names which authorities are live. Checked before changing: `check-production-promotion-gate.mjs` keys on `overall === 'ready'` in both places, so nothing is loosened — and its held path requires the disclosure reason `supabase-control-plane-partial`, which this makes accurate rather than contradicted. The `supabase-credential-project-mismatch` blocker is still reported by name; the softer verdict swallows nothing.

## D-S363.4 — The propagation clobber is merged locally and escalated, not reverted

The `/start` propagation drain brought 44 changed files under `scripts/` (net +2,162 lines) and broke `build:check` in four independent places by removing symbols live consumers import: `suggestCapabilities` plus the `known`/`suggestions`/`lastProbeStatus`/`probeFailing` fields from `lib/secrets.mjs`; the caller-error render and exit code `3` from `check-secrets.mjs`; `pickV3Categories`/`sumV3Categories`/`validateV3Categories` from `lib/sil-categories.mjs` in a **pure 23-line deletion**; `parseCurrentTaskInventory`/`currentTaskInventoryLabel` from `lib/task-board.mjs`. It also resurrected `scripts/lib/test-sidecar-summary.mjs`, deliberately deleted by a prior session. Every removed item is a CANON-019 phantom-blocker guard, a CANON-031 honesty guard, or the SIL invariant helpers.

**Decided:** merged, not reverted — the propagated improvements (`reason` taxonomy, S332 `unresolvedPaths`, foreign-root test-count rejection, async `gradeCapability`) are all kept, with the removed symbols restored beside them and commented with the recurrence. A sibling repo's propagation lane is not ours to edit (CANON-018/022), so the upstream ask ships as Ark `pattern-share` cargo `01K3052GLJ1D81D97FA5043903`: the lane should diff exported symbols and refuse to drop one a recipient imports, never auto-apply a pure-deletion module rewrite, and never re-add a path the recipient deleted.

**Recorded because it is a recurrence.** S316 restored `suggestCapabilities` after this exact clobber and shipped it upstream so the next propagation would carry it. It did not. Cargo alone is evidently not sufficient. And these were caught only because most were named imports, which fail loudly — `check-secrets.mjs` kept running and simply stopped drawing two distinctions, caught only by a contract test. A dropped field with no named importer would degrade this repo's honesty surfaces in silence.

## D-S363.5 — Seven superseded orphan libs removed; the allowlist de-rotted

`check-orphan-libs` found the allowlist entry for `write-project-status.mjs` REDUNDANT (it now has real code consumers) and, across cascading passes, seven modules with zero import consumers. Following the S220 precedent for an orphan byte-identical to its studio-ops canonical copy: `session-floor-items.mjs`, `sprint-runner.mjs`, `medium-quality-gates.mjs`, `media-quality-gate.mjs`, `token-cost-tier.mjs` and `test-sidecar-summary.mjs` removed as debris belonging to studio-ops. `startup-evidence.mjs` removed as genuinely superseded — the propagated `render-startup-brief.mjs` carries a stronger version of the same property (foreign-root artifact rejection plus an explicit staleness flag, CANON-031). Its now-vacuous `--self-test` step was removed from the `build:check` manifest in the same edit, since a declared check that tests nothing reachable is worse than no check. The rotted allowlist entry is gone: an allowlist holding non-orphans eventually excuses a genuine orphan by inheritance.

## D-S363.6 — The startup brief resolves revenue freshness through the shared resolver

The brief parsed `<root>/portfolio/REVENUE_SIGNALS.md`, a path that exists only inside studio-ops, so from this repo the read always came back empty and the brief always printed `Revenue sig. not found` — a signal structurally incapable of ever being found, rendered as if the file were missing. The doctor surface resolved it fine (9d old, 2026-09-11) through `lib/revenue-freshness.mjs`, which carries the sibling fallback. **Decided:** the renderer resolves through the shared resolver and takes its signal threshold from it, so the two surfaces cannot disagree by construction. `smoke-startup-scripts`' revenue-agreement check — written for exactly this drift — caught it and now passes 60/60.

## D-S363.7 — The context-wipe guard's shape test did not match the shape it names

The closeout autopilot refused to commit, reporting `content-wipe  context/SIGNALS.md  (110.0% of HEAD)` — a file that had **grown** by 10%. `context/SIGNALS.md` is correctly listed in the guard's `GENERATED` set, which replaces the size-ratio test with a content-validity test: a generated artifact is a wipe only if it is empty, a placeholder, or has lost both its generator stamp and any structured entry. The structured-entry test accepted `^[✓⚠⛔]\s+\S` and its own comment described the file as "bare ✓/⚠/⛔ rows".

The file is not bare. Every row is box-drawn — `║  ✓  Tests         502/502 passing` — so the glyph never appears at line start, the pattern never matched, there is no `generated-by` stamp either, and **every** regeneration of this artifact classified as contentless. HEAD's copy was five weeks stale (Tests 295/295, dated 2026-08-14) while the guard stood between it and any refresh.

**Decided:** the row test accepts an optional box-drawing, quote or whitespace prefix before the glyph. The emptiness and placeholder branches are untouched, so a blanked or scaffolded file is still a wipe — verified in both directions: the real artifact now passes, while empty input, whitespace-only input and a box with no rows all still classify as wiped. `--allow-wipe` was deliberately **not** used: the guard was reporting something real about its own pattern, and suppressing it would have left the next session to rediscover this with a genuine wipe in the diff.

**Kept as a finding, not fixed here:** `scripts/run-tests.mjs` lists `tier2-context-wipe-guard.mjs` as a test tier, and that file does not exist in this repository — so the guard's own coverage is declared but absent. That is the same class as the six unreachable gates in D-S363.5 and is recorded for the next session rather than guessed at.

## D-S363.8 — Two closeout gates disagreed about the archive contract, and the prescribed repair tripped the other one

The ledger size gate aborted the closeout with `context/DECISIONS.md: 252KB > 250KB cap — run node scripts/rotate-ledger.mjs --apply`. Running exactly that repair produced a tree the context-wipe guard then rejected: `append-only-violated  context/DECISIONS.md  (79.1% of HEAD)`. The prescribed repair for one gate is a hard abort for the next, which leaves no correct move.

The cause is a contract mismatch, and the guard is the half that arrived this session. The propagated `context-wipe-guard.mjs` (+121 lines in the same drain as D-S363.4) recognises relocated history only through `context/archive/<STEM>_S<a>-S<b>.md` files **declared by an in-file pointer line**. This repo's `scripts/rotate-ledger.mjs` writes `context/archive/<TAG>_<YYYY>Q<q>.md` — `DECISIONS_2026Q3.md`, `SIL_2026Q3.md` — and adds no pointer. The archive directory has been that shape since at least 2026Q2, so the guard could never have accepted a rotation performed by this repo's own tool.

**Decided:** broaden how the guard DISCOVERS archive bodies — accept the `_YYYYQq` naming, accept `SIL` as the archive stem for `SELF_IMPROVEMENT_LOOP`, and fall back to enumerating `context/archive/<stem>_*.md` when the hot file declares no pointers. The substantive proof is deliberately untouched: every `## ` section present in HEAD must still exist verbatim in the new hot file or in an archive body, each occurrence consumed once, with every path still constrained to resolve inside `context/archive/`. Verified in both directions on the live files — the real 16-block rotation passes (170 HEAD sections: 154 in the hot file, 16 in the archive, 0 missing), and deleting a single section that is in neither still fails.

**`--allow-wipe` was not used**, here or for D-S363.7. Both aborts were the guard telling the truth about its own contract, and suppressing them would have spent this session's one legitimate escape hatch on a defect the next session would then inherit invisibly.

**Recorded as a pattern, not just a fix:** this is the third distinct shape of the same root cause today — a propagated artifact asserting the origin repo's conventions onto a sibling (the windows-hide scan roots in D-S363.5, the wipe guard's status-row format in D-S363.7, and the archive naming here). The Ark cargo shipped for D-S363.4 covers removed exports; this class — *propagated checkers encoding studio-ops-only layout* — is worth its own upstream note next session.

## D-S363.9 — A correction to D-S363.7, and the reader that could never see its own record

**Correcting my own claim.** D-S363.7 closed with: *"`scripts/run-tests.mjs` lists `tier2-context-wipe-guard.mjs` as a test tier, and that file does not exist in this repository — so the guard's own coverage is declared but absent. That is the same class as the six unreachable gates in D-S363.5."* **That is wrong**, and it is wrong in a way worth naming rather than quietly dropping.

`CI_LOCAL_STATE_TESTS` is consumed by exactly one function, `isDeferredInCi()` — it is a CI **deferral allowlist**, not a test declaration. Suite files are discovered from the filesystem (`discoverSuiteFiles` over `scripts/test/`, plus legacy `scripts/test-*.mjs`), and `scripts/test/` does not exist here at all: that whole tier registry is studio-ops'. A name listed in a deferral set for a file this repo does not have is **inert**. Nothing was stranded, and the comparison to the D-S363.5 unreachable gates was unearned. DECISIONS is append-only, so the original entry stands and this is the correction of record.

**The real gap behind the wrong claim was worse, and is now closed.** The guard was changed twice in one session (D-S363.7, D-S363.8) on the evidence of two throwaway `node -e` invocations typed at a terminal. That is not evidence anyone can re-run. `scripts/test-context-wipe-guard.mjs` now pins both changes with 21 cases and is wired into `build:check:steps` — and it is **mutation-tested in both directions**: reverting the box-drawn row acceptance turns it red (19/21), and reverting the archive discovery turns it red (18/21). Most of the cases assert the guard still FAILS — a deleted section, a section edited on its way to the archive, an empty archive directory, an unrecognised archive filename, another document's archive — because a guard that cannot fail is worse than no guard.

**`hasSessionAddendum()` could never see an addendum.** It matched the literal phrase `Session <n> addendum`. Every addendum this ledger has ever carried is headed `S<n> addendum`: five live (S357, S357-2, S358, S362, S363) and three more in the 2026Q3 archive — against zero of the form it sought. It therefore reported *"the SIL carries no S363 addendum"* with an S363 addendum directly above the line it read. I found this by writing a heading purely to satisfy the regex, which is precisely the tell that the reader and not the record was wrong. **Decided:** accept the convention actually in use, with `\b` so `S363` cannot match `S3631` and the addendum word required on the same line so a later mention cannot vouch for a heading that is not there. Eight self-test cases, seven of them negative.

**A fourth propagated-layout finding, recorded not fixed.** `scripts/arc-profile.mjs` — which arrived with this session's propagation, and which the `/arc` protocol explicitly requires be run as the LOCAL copy — resolves the registry as `<this repo>/portfolio/PROJECT_REGISTRY.json`, a path that exists only inside studio-ops. So the local copy can never match the registry and always falls back to inference: it reported `type=website (NOT in registry — inferred)` where the registry says `type=app`. No harm this session, because both readings agreed on every decisive dial (public-live · SPARKED · product rubric · direct-to-main · staging-hetzner-first · sanitize-before-push). But the skill's stated rationale for preferring the local copy does not hold for the registry field in a sibling repo, and that is the same shape as the revenue-signal path fixed in D-S363.6. Shipped upstream rather than patched locally, since a propagated file patched here is re-clobbered on the next drain.

**Also corrected this pass:** the closeout protocol requires committing 1–2 `[SIL]` items to `TASK_BOARD.md`, and S363's brainstorm lived only in the SIL ledger. The items are now on the board. The S362 `[SIL]` item about the staleness probe's flickering checked-count is closed with evidence — this session measured a stable `checked: 14` against the 14 workflow files carrying `schedule:`.


## D-S364.1 — Repair signup without weakening challenge enforcement (2026-09-22)

Share the JSON response headers across protected handlers; restore only the existing source-owned widget secret. Do not rotate the widget or use a sibling secret. The verifier targets the website project explicitly and defaults to no send; an explicit test mailbox is required for real sends, with evidence tied to a new message. Fix consumed-token reuse so retries request a fresh challenge. Identity promotion holds remain intact. The staging archive manifest also excludes its own temporary directory; the first archive attempt coincided with removal of two old audit paths and was retried after source stabilization.


## D-S364.2 — Preserve valid unmeasured context verdicts (2026-09-22)

The full build stopped because the startup renderer accepted only exit zero from context-meter, although exits 2, 3 and 4 carry valid verdict JSON. It discarded UNMEASURED and substituted a file-byte estimate. Accept the documented verdict exits and avoid formatting null before the existing unmeasured branch. Local rendering and the unchanged freshness checker now agree on UNMEASURED; the gate was not weakened.


## D-S364.3 — Scoped release exception and immediate completion (2026-09-23)

After disclosure of the article Lighthouse gate (latest 85/100, required 90), the founder instructed: "you need to wrap up, closeout and deploy asap". Apply that direction as approval for this signup-repair release only. Preserve the 90 threshold and track the performance follow-up. E2E/compliance, secrets, staging and rollback checks remain required; no identity/security gate is weakened.
## 2026-09-30 — Refresh the stale Linux visual-regression references with reviewed production evidence

The hosted snapshot workflow compared current production against reference images from an older layout and had failed on several preceding PRs. A Linux capture run produced all 70 current references; 40 changed files were inspected for the intentional page-layout drift and committed. The hosted comparison rerun passed. This repairs the existing check without changing the 1.5% pixel tolerance or declaring a screenshot of production to be proof of the candidate's new profile UI; the candidate's separate 70-capture seven-theme review remains the profile evidence.

## 2026-10-01 — Restage the complete Desk candidate before automatic promotion

A staging receipt can name a recent commit while older receiver rules withheld paths. The daily Desk workflow now restages the full content-pure Desk slice from the production baseline and checks every candidate path byte for byte. The shared repository and root-owned server rules admit persona/profile/archive content while retaining path validation, file caps and the full-site production hold. Recovery `36835514861` and Pages `36835622726` prove the 159-path lane; the next scheduled trigger remains to be observed.

## 2026-10-01 — Keep the News hub compact and preserve complete monthly archives

The 89-story corpus pushed `/news/` past its 200 KiB HTML budget. The hub now renders the seven most recent published editions and links an archive index with complete month pages; individual article and persona URLs stay stable. Archive checks cover all 89 nonsuperseded story links and page-size limits. The resulting hub is 92,390 source bytes. Production used the same reviewed content-only overlay as the persona release, with all 147 prior paths included in its 153-path scope; neither the archive nor the release alters the held full-site identity/provider gate. A future month-rollover fixture is tracked on TASK_BOARD.


## D-S367.1 — Website vault status derives from studio-ops canon only

Founder ruling: Call of Doodie, PromoGrind and Velaxis are FORGE. The catalog's "deployed on our domain means SPARKED" override is removed; being reachable is not being announced (CANON-052 single write path). A FORGE game the game registry marks playable keeps its Play CTA and is labelled "Playable Beta".

## D-S367.2 — Honest signup copy while Obelisk enrolment is invite-only

Live probe: `/auth/registration-options` answers 403 `signup-token-required`, so D-S343.2's "open enrolment" no longer holds. The register panel says enrolment is invite-led and links /contact/ for an invite until Obelisk answers Ark `01K3SH847CF5020D9D7209EB07`.

## D-S367.3 — The HTML CSP nonce is keyed

The nonce was derivable from the clock while the policy used strict-dynamic. It is now HMAC-SHA256 of the 300-second window under `CSP_NONCE_KEY` or a per-isolate random key; the window and edge cache are unchanged.

## D-S367.4 — Compatibility tokens renew from the edge, never from GoTrue

Tabs open past one hour lost data access. The client re-asks `/api/auth/session` five minutes before expiry and on focus; a 401 signs the tab out, so renewal can never outlive the Obelisk session.

## D-S367.5 — Lifecycle redefinition proposed to studio-ops

Founder direction: FORGE covers in development, unannounced and beta; SPARKED is finished and announced, with a launch kit, multi-channel announcement and an armed posting cadence. Proposal `docs/proposals/LIFECYCLE_SPARKED_GATE_S367.md` (Ark `01K3SJ87V2E1476FF1FE837A06`); canon changes stay with studio-ops.

## D-S368.1 — Membership offering: Free, VaultSparked, VaultSparked Eternal (monthly)

Founder ruling 2026-10-02 after a code-level truth map. The site sells Free, VaultSparked ($4.99/mo) and VaultSparked Eternal ($29.99/mo), monthly only; annual is labelled as coming later. Only enforced perks are advertised (badge and theme, Discord role, Ask IGNIS quota, Sparked archive and beta keys, PromoGrind live odds, monthly XP drop, Eternal Dispatch, Eternal 1000 XP/mo); 2×/3× XP, studio and rank discounts, priority queue, co-dev input and splash credit are removed. The gift button is hidden until a real 30-day expiry and a founder-set price exist. Canonical names: VaultSparked and VaultSparked Eternal. `api/membership-tiers.json` is the single source for every surface.

## D-S368.2 — Season accounting can never block a member action

Live probe 2026-10-02: `award_season_xp()` referenced columns that do not exist, so every game score, session and challenge submission insert was rolled back (challenge_submissions has never held a row), and the only season row was the expired Vault Ignition. Migration `supabase-s368-season-1-repair.sql` rewrites the function against the real schema inside an exception guard, declares Season 1 — Ignition with the already announced 2026-09-02 → 2026-10-14 window and recognition-only pass tiers, backfills season XP and adds `get_season_standings()`.

## D-S368.3 — One description per project

Founder rulings 2026-10-02: The Exodus is an engine-building card game for 2–4 players; MindFrame is a live metacognition platform (its vault status still follows canon); Solara is a browser roguelite RPG with a shared world; Project Unknown stays a sealed teaser with no status and leaves status counts until it has a canon record. Agent-resolved from canon: Gridiron GM is vaulted with no return promise; Voidfall is a nine-book saga; VaultFront carries no release window. Registry fields hold these, and pages render from them.

## D-S368.4 — AI search agents allowed, training crawlers stay blocked

Founder ruling 2026-10-02: robots.txt explicitly allows retrieval agents (Claude-SearchBot, Claude-User, Perplexity-User, alongside the existing OpenAI search agents) so answers can cite the studio; training crawlers stay disallowed, and the `noai` response header applies only to training user agents.

## D-S368.5 — Anonymous solo studio; off-catalog pages noindexed

Founder ruling 2026-10-02 (CANON-028): the site presents an independent, solo-founded studio with no founder name or photo; "Ask the Founders" becomes "Ask the Studio". Project pages that are not in the public catalog stay reachable but are noindexed and removed from listings until they join the catalog.

## D-S368.6 — The Desk Dispatch is a daily digest, auto-sent after a confirmed test issue

Founder ruling 2026-10-02: subscribers to The Desk Dispatch (Brevo list 3, double opt-in) receive at most one email a day summarising that day's Desk editions, sent automatically. Automatic sending starts only after the founder confirms a test issue sent to their own address. Persona profiles gain taglines, character sheets and a corpus-derived notebook, all clearly labelled as fictional AI correspondents.

## D-S368.7 — Each Desk story has one banner illustration and one satire cartoon

Founder rulings 2026-10-03: every story carries exactly two images. (1) The **banner** is the editorial illustration: painted, person-free, institutions shown through objects, landmarks true to the story. (2) The **satire cartoon** is the comedy and irony layer: an AI-generated, clearly drawn cartoon in the voice of the correspondent who wrote the take, and it replaces the old SVG meme panel as the primary satire image (the SVG panel remains only as a fallback until the cartoon exists). Satire cartoons may caricature **real public figures** (executives, politicians, officials) as obvious, exaggerated, non-photorealistic cartoons, always labelled "Satire · AI-generated cartoon". Never private individuals, never photorealistic, never sexual, violent or degrading. Invented and animated characters are allowed in both images; real people never appear in the banner.

## D-S368.8 — Hybrid AI + Synthetic Intelligence (SI) positioning and terminology standard

Founder direction 2026-10-04. On 2026-09-29 the White House order "Inaugurating The Era of Super Intelligence" directed federal executive agencies to say "Super Intelligence (SI)" instead of "Artificial Intelligence (AI)" in non-statutory communications; the statutory definition (15 U.S.C. 9401(3)) is unchanged and private companies are not required to follow. VaultSpark becomes a hybrid **AI & Synthetic Intelligence (SI) studio** (tagline: "From Artificial Intelligence to Synthetic Intelligence"). Terminology: **AI** = models and established AI technology; **Agentic AI** = models operating through agents and tools; **Synthetic Intelligence (SI)** = composed systems integrating models, agents, memory, tools, software, infrastructure and humans (what VaultSpark builds); **Super Intelligence (SI)** = the new U.S. federal term for AI and a future capability category, never claimed for VaultSpark systems. SI is ambiguous, so each page spells out "Synthetic Intelligence (SI)" or "Super Intelligence (SI)" on first reference (CANON-030). Hybrid, not replacement: existing AI wording and every legal or disclosure label ("AI-generated", "AI persona", AI disclosures) stay exactly as written; SI is added alongside AI only where positioning is stated. Explainers: `/synthetic-intelligence/` and `/ai-vs-si/`. The studio description, slogan and knowsAbout live once in `scripts/lib/org-entity.mjs` and feed `agents.json`, `llms.txt` and the entity graph.

## D-S368.9 — Founder-delegated cleanups: legal provider wording, Eternal credits section

Founder delegation 2026-10-05 ("do those for me"). (1) The privacy policy now names Brevo as the delivery provider for The Desk Dispatch and transactional mail, alongside Kit (Studio Dispatch) and Resend (operational notices); /security/ now states that member sign-in runs through Obelisk with Supabase holding member data behind a short-lived edge session, replacing the outdated "Supabase Auth with bcrypt" claim; /rights/ labels Supabase as the member database. (2) The "Eternal Credits Queue" section is removed from the Eternal Dispatch panel instead of renamed, because game/studio credits are listed under notOffered in api/membership-tiers.json (D-S368.1). (3) The Desk Dispatch Brevo key is set as a GitHub Actions secret; switching config/desk-dispatch.json to autoSend was refused by the session's safety classifier and is left for the founder to flip.


## D-S368.10 — Desk art goes live on the automated reviewer's approval

Founder ruling 2026-10-05: "Images and art/cartoons should always go live by your own approval and not mine - I can then review and request a different change." This supersedes the human-review step of D-S368.7. scripts/desk-art-autopilot.mjs generates, reviews each image with the Codex CLI on the ChatGPT plan against a strict rubric (likeness, text, logos, landmarks, fit), re-rolls failures up to twice, ingests passes with hash-bound approvals, and publishes through the existing CI release (desk-content-release.yml, staging-first). It runs four times a day (about 1.5 h after each edition slot) from the founder's PC in a private worktree; the founder explicitly authorized the unattended push-and-deploy. The founder reviews what is live and requests re-rolls.



## D-S369.1 — One opt-in Spark discovery surface

Retire the pictured constellation resume card and journey tour and their automatic triggers. Spark owns manually requested navigation via the header, inline entry or Ctrl/Command + K. Use CSS sphere motion with stationary functional controls, equivalent accessible list, local route preferences and a public-only manifest/export. No paid model runtime. Preserve legacy achievements. Founder accepted this direction and authorized implementation and deployment.

## D-S369.2 — MindFrame canonical launch destination

Use https://usemindframe.com/ from the project's canonical registry/status and current official site; reject retired Railway hosts even on FORGE entries. Check all external portfolio destinations rather than truncating the probe to twelve. Scriptorium 401 and VaultFront 503 remain distinct availability observations. Existing Synthetic Intelligence positioning under D-S368.8 remains unchanged; the hero question did not establish a replacement positioning decision.

## D-S369.3 — Guide retirement reaches held public markup

The approved guide removal also covers baseline Membership markup, which still references the old ambient loader and its guide children. The existing edge HTML rewriter updates only ambient-core, journey-conductor, constellation-tracker and pwa-install script references to their canonical content-addressed assets. Integrity-bound and foreign scripts are excluded. The body, membership logic, identity handlers, cookies and security policy retain their existing contracts. Old hash-named files remain intact; the HTML cache version advances so cached markup cannot hide the retirement. The four target families are fixed in code and validated against the build manifest. Verify both nonce modes with unit checks, compile the Worker, then test staged and live pages with returning-visitor history.

### D-S369.4 — Mixed-feed CI observations

The public intelligence feed embeds live CI observations. Those fields belong in the observed artifact root, while its reproducible content stays in the source root. The complete raw feed remains hashed for auditability; actual hosted CI and release gates remain mandatory. This prevents unchanged runtime code from losing staging parity when a status observation changes.


## D-S369.5 — Founder-directed Super Intelligence hero

Explicit founder direction on 2026-10-06 replaces Synthetic Intelligence with Super Intelligence in the homepage hero eyebrow. Spell out Super Intelligence (SI) on that surface. This supersedes D-S369.2's unresolved hero disposition only; the established Synthetic Intelligence explainers and machine-readable organization description remain separate. This is positioning copy, with no new capability, policy or launch promise.

## D-S369.6 — Premium Desk heading, early artwork and public image threads

Founder direction 2026-10-06 replaces the Desk hub headline with “The AI News Desk.” Article illustrations move directly below the byline; desktop reactions and optional public image comments occupy a bounded side panel, with a linear mobile layout. Satire appears below persona reactions and The Desk’s Take, above the full AI disclosure and subscription area. Story comments stay separate. Each image thread uses the existing comment slug contract (`date/art-` plus a 32-hex digest of story, image target and full PNG SHA-256), so threads do not mix across stories, image types or image versions. Missing assets receive no image thread. The existing guest/member identity, CSRF, Turnstile, moderation, report and rate-limit contracts remain unchanged; no database migration or additional comment service is introduced. Native accordion controls defer comment reads until a reader opens the relevant panel. The expanded sitewide Desk navigation changes the critical shell; final staging must bind the combined source candidate.


## D-S369.7 — Evidence-first briefs and readership metrics

Founder direction expands The Desk to a premium AI news homepage, with direct profile navigation and a sitewide AI News strip linking the full Desk and subscription area. News Brief renders the complete published source claims with attribution and receipts, without inventing new claims. The Desk’s Take replaces the former positions heading. Its signal-versus-hype axis preserves the recorded persona directions and explains the relationship between coverage, cited evidence and potential practical impact; it is not a reader-value measurement. Readership shows recorded browser loads, thresholded reading observations and weighted engaged time from the existing evidence pipeline. Article totals are lower bounds over qualifying articles; homepage counts share the five-load privacy floor. Missing counts remain collecting. No unique-reader or completion claims are made.

### D369.8 — Bounded anchor history

Anchor profiles publish 12 contributions per linked page. Global statistics retain the full corpus; stable canonical URLs, chronological order and every existing contribution remain available. This keeps growing profiles below the existing 200 KiB HTML release budget.


### D-S369.9 — Closeout records reflect the verified scoped release

Preserve all earlier candidate observations and the recorded 912/1000 score. Add final deployed dispositions and the expanded founder direction, correct the acting agent and live URL, and keep existing identity holds separate. The repeated closeout is a reconciliation of S369, not another shipped/scored session.


### D-S369.10 — Isolate public-form rate counters

Desk signup recovery (2026-10-06): production trace confirmed shared KV daily write exhaustion caused edge_handler_unavailable before Turnstile or the email provider. Public-form counters now use their isolated SQLite Durable Object binding, retaining atomic three attempts per IP/form per fixed hour, CSRF and Turnstile. Current production Worker 13980895-7780-4963-9e42-c7b7f5f3fa3a; staging dfc45f3e-949e-4277-a5c4-72a4de5f6a8d. Focused Worker/counter tests 78/78 passed; independent review passed; staging and production empty no-send requests return expected 403 turnstile_token_missing rather than 503. Provider no-send checks 6/6 passed. No confirmation email was sent by the agent; founder will test through the normal public form. Delivery remains unverified until that retry. SQLite Durable Objects are available on Workers Free; no paid plan or provider spend was enabled. Legacy hourly attempts seed the migration by read only. Durable counter outages fail closed.


### D369.11 — Inclusive newsletter consent and bounded invitations

Founder explicitly requests easy human/agent signup. Remove Turnstile only from Desk invitations; retain browser CSRF, per-network limits and other public-form protections. Enforce atomic hashed-recipient cooldown and daily send budget at the backend. Signed unsubscribe revokes all earlier invitations for that recipient, including cancellation races. No identity-plane change. Premium emails use self-contained inline table HTML and a plain-text alternative.


## D-S370.1 — publication must prove its candidate

The art autopilot passes an immutable art_head_sha to the existing staging-first workflow. Actual checkout must equal that input; run-name identifies pinned art runs, and discovery/view require a new matching manual run, head SHA and display title. Missing, ambiguous, failed or unobservable release evidence is nonpassing. Live derivatives are hashed before publication and checked against served bytes and article references. Existing scheduled/manual latest-main semantics outside the pinned art lane are preserved.

## D-S370.2 — retain compatible propagation contracts

Startup canon sync removed local capability exports needed by existing verification. Preserve the incoming copies for reconciliation and retain the tested local runtime tooling rather than shipping an incomplete propagation. The canonical adoption sync remains recorded. Conformance checker parse errors and standing STRONG gaps remain advisory to this scoped operational release; canonical staging, live stats and explicit identity holds are independently checked. No canon decision or identity hold is changed.

### 2026-10-07 — Requested site follow-through
- Founder requests the homepage title expand SI as Super Intelligence. The title now follows that wording.
- Spark is an animated corner companion with a nonmodal navigation popup, remembered left/right placement, motion preference and a session tuck-away control. The header recalls navigation; consent and other modal surfaces take precedence.
- Restore every article's full stored summary as Story Overview before artwork. Keep the separate attributed News Brief and persona analysis.
- Illustration reaction labels must wrap visibly at every width rather than truncate.
- Remove the optional Brevo campaign tag: live scheduled runs returned HTTP 405 because the account cannot use it. Keep the existing once-daily UTC schedule and double opt-in. No additional campaign or test email is sent by this work.


### 2026-10-07 — requested Spark and article behavior

Spark is an optional nonmodal corner companion, with persisted corner/motion preferences and session tuck. Requested paths and navigation remain inside its popup; unsolicited guides are retired. Story Overview retains the full summary above artwork; News Brief retains attributed claim detail below it. Desktop image discovery stays early, while mobile defers illustration traffic for overview first paint. Dispatch omits the provider-rejected optional tag and keeps its existing daily schedule. No pricing, tiers, public send promises or identity flows changed.


### 2026-10-08 — S370 follow-through closeout boundary

The founder explicitly authorizes complete closeout, main publication and deployment. Preserve earlier decisions and the scored session; this reconciliation adds no feature scope. Production promotion uses the existing bounded content lane, retaining the deployed identity/security baseline. Provider delivery is evidence of successful delivery, not of a particular inbox folder or email-client rendering.


### S370 final validation coherence repair

Closeout validation found an omitted generated answer-feed rebuild. The full derived-build profile now refreshes Oracle answers before candidate sealing; citation remains last. Independent review passed; ordering37/37 and invocation10/10 self-tests pass. Rebuilt answer and visual-retention outputs; proof-surface92/92 blocking checks pass. This is a necessary closeout coherence repair, with no browser, identity or pricing change.


## D-S371.1 — bounded release-maintenance arc (2026-10-09)

Use an isolated current-remote worktree to preserve the original checkout residue and quarantine unverified startup propagation. Implement four demonstrated maintenance defects at L2; preserve all accepted public design, rights, prices and identity holds. The persona comparator matches only its existing line-edge normalization on exact profile routes; attributes, text, links and other routes remain strict. Routine receipts record source maintenance, never infer production delivery. Founder explicitly authorizes direct main commit/push and deployment.

Canonical conformance measured zero ABSOLUTE gaps; remaining STRONG diagnostics and manual adoption reviews retain their existing project-specific posture. Delegating scripts that resolve relative to the temporary sibling stub are not treated as proof for this website; canonical probes use an explicit project path. The four S370 automated art/reseal commits and two trailing record commits discovered by full anchor history will be reconciled as an unscored addendum. S370 remains916/1000. Full release evidence is required before claiming deployment.


## D-S372.1 — restore assurance at the gate, not the symptom (2026-10-09)

The CI Health Monitor had failed daily since the S368 IA consolidation retired `/journal/`. The live matrix now requires the successor `/changelog/`. A missing required route is reported as one failure, not thrown, so one stale entry can no longer hide the whole sweep. A build:check self-test rejects any required route that `_redirects` retires. The masked Chromium journey had the same stale assumption and now checks the retirement redirect. Founder direction for this session: `/arc`, then direct main commit/push and full deployment.

## D-S372.2 — legacy redirects take one hop; chains fail the build (2026-10-09)

The Worker's `/signal-log` and `/vaultspark-football-gm` entries pointed at routes that `_redirects` itself retires. Both now target their final destinations. A fragment target receives the query before the fragment. `tests/s372-redirect-chains.unit.spec.mjs` covers both the Worker legacy maps and `_redirects`. Staging cannot verify `_redirects` behavior because Hetzner does not apply it, so production readback is the acceptance for route merges.

## D-S372.3 — receipts bind committed bytes and are re-reviewed, never rebound, when content changes (2026-10-09)

Two routine Desk lanes (art autopilot and the scheduled edition publisher) changed bound article HTML without running E2E. Each time, the affected surface was recaptured and directly re-reviewed (28/28 twice); metadata rebinding is reserved for unchanged bytes. The source binding is proven against the committed git blobs (400/400) because a Windows CRLF working copy produced a receipt CI could never match. Two non-blocking, pre-existing visual findings are recorded in the receipt and on the board. The systemic fixes (routine lanes vs bound receipts; portable hashing) are queued as `[SIL]` items rather than widened into this session.

## D-S372.4 — the cross-checkout closeout boundary is not fabricated (2026-10-09)

S371 closed out in another worktree, so this checkout lacked `.cache/closeout-brief-371.json` (build:check step 224). Recreating that receipt would falsely claim the closeout ran here. Steps 1–223 and 225–532 were verified separately; S372's own closeout renders its own boundary receipt.

## D-S372.5 — "fully deploy" means the whole committed tree, proven by byte parity (2026-10-10)

The content lane is a partial promotion: it withholds served `data/` files by type, so production was content-current but not tree-current (6 files differed, measured against the Pages origin). The founder's instruction for this session was `/arc then I authorize a direct push/commit to main/remote and fully deploy`, so the full confirmed-production lane was used. It ran under the SCOPED path (`promotable=true · scoped-disjoint`): the identity hold was not cleared and still reads `state=hold` (real-provider-e2e-pending, supabase-control-plane-partial). Clearing it needs a founder passkey ceremony and was not attempted. Byte parity showed every `auth/**` page already identical to main, so the hold withholds no bytes.

Staging first: the exact committed tree was published to Hetzner staging with untracked scratch stashed out of the manifest (10577 files, receipt 0a9204a82cb2b19c7710665d, rollback 20261010013211); ceremony 11/11. Required checks at exact candidate fcdf8fd24: E2E 38014874885 and accessibility 38014874867 passed; Lighthouse 38014874861 passed on attempt 3. Attempts 1 and 2 failed on different pages at their floors (homepage 0.75 vs 0.76; one article 0.88 vs 0.90). The run artifacts showed identical bytes scoring 0.96 and 0.88 in one batch with zero blocking time and a text LCP element, so the failures were classed as runner variance; no threshold was changed, and a fourth attempt was ruled out in advance.

## D-S372.6 — founder confirms deploy scope: complete, identity hold stays (2026-10-10)

Asked directly whether "fully deploy" included clearing the identity hold, the founder chose "Done; keep the hold". The S372 deploy is complete as the whole committed tree served at 556b4d14e plus Worker 9c7c29f1. Both hold reasons were re-probed and remain open in their own scope: `real-provider-e2e-pending` needs the founder's own-browser passkey sign-in and sign-out (no journey leg observed in 168h); `supabase-control-plane-partial` is a shared secrets-gateway slot holding a sibling project's key (live probe auth-error), owned by studio-ops and followed up via Ark 01K4HRI2I39CAD81018E7AB247.


## D-S373.1 — a deploy claim is a measurement, and the content lane carries only anchored data (2026-10-10)

"Deployed" is now reported from `check-served-parity.mjs`, which compares served bytes with a commit, rather than from a lane's exit status. The daily run is report-only and last in its job: the automated Desk lane promotes only newsroom paths, so other feeds lag between content runs by design, and an enforcing check there would be red most days. Three data files joined the content lane's exact-path allowlist because each meets its stated rule (the two ledgers are named as `source` by the public feed `api/worker-route-history.json`; `data/stats-surface.json` is a byte-identical twin of the already-allowed `stats.json`), and a self-test re-proves those anchors. `data/ignis-search-index.json` stays on the full gate because browser JavaScript reads it, so it is coupled to the shipped bundle.

## D-S373.2 — line endings are fixed at checkout, not in the receipt hash (2026-10-10)

`.gitattributes` pins `* text=auto eol=lf`. The index contained no CRLF text (3115 LF, the rest binary or empty), so the rule changes no committed byte. This removes the cause of the S372 non-portable receipt without touching the binding code.

## D-S373.3 — not decided: tolerating routine Desk content in the visual receipt (2026-10-10)

The proposed change replaces the routine `desk-more` block with a marker when hashing dated Desk articles, in the single binding function the writers and checker share, leaving the generator, stylesheet and every other byte bound. It was blocked by the session permission classifier as a change to audit code. It alters what a receipt attests, so it is recorded here as awaiting the founder's explicit approval rather than routed around. A partial edit that slipped through (an export line) was reverted at once and both receipts re-verified.

## D-S373.4 — staging mirrors Pages redirects at the Worker, behind a staging-only flag (2026-10-10)

`cloudflare/pages-redirects.js` implements only what this repository's `_redirects` uses, each behaviour measured against production (exact sources, trailing splat with `:splat`, query ahead of fragment). It runs where Pages would apply the file, after the Worker's own routes, and any failure to read the file declines to redirect instead of failing the request. Production never sets `PAGES_REDIRECTS_EMULATION`; a unit test asserts that from `wrangler.toml`.

## D-S373.5 — closeout confirmation is decided before work starts (2026-10-10)

In a non-interactive shell the closeout tool exits 2 immediately unless `--yes` or `--dry-run` is given. Auto-confirming was rejected: committing and pushing stays an explicit choice.


## D-S373.6 — routine Desk content in a reviewed article is proven, not omitted (2026-10-10, founder-approved)

Supersedes the open question in D-S373.3. The founder approved the change and asked that it carry no downside. The first proposal simply left the "More from The Desk" block out of the hash, which would have meant trusting the art lane for those bytes. What shipped instead:

- **Hashed or proven.** For a dated Desk article with exactly one such block, the receipt hashes the page with the block replaced by a fixed marker (`routine-region-v1`) and records the block's own digest. `check-receipt-ordering` then requires `generate-news-pages --check` to pass, which proves every news page is byte-for-byte what the generator renders from the committed Desk data. The generator and the stylesheet remain bound sources. No byte is unattested.
- **Fail closed.** No block, two blocks, a non-article path, a missing generator, or a failing generator check all fall back to refusing the receipt, which forces the same re-review a whole-page hash would. A receipt written before the rule cannot use it.
- **Visible.** When routine content has changed since review the checker prints a note per article and says so on its summary line; a green line never implies a re-review.
- **Layout still checked.** `tests/desk-more-cards.spec.js` asserts the current cards' layout in a browser on every CI run.

Verified on the real repository: a hand edit inside the block is refused (generator proof fails); a hand edit outside it is refused (hash); a genuine headline change regenerated through the generator (133 pages) leaves the receipt valid with a note for each reviewed article. The existing receipt was re-stamped only after all 403 review-time digests were re-verified against current raw bytes and all 28 capture hashes were confirmed unchanged.


## D-S373.7 — a builder that reads Git history refuses to write in a shallow clone (2026-10-10)

Found by `npm run verify:clean` while preparing the S373 promotion: `main` carried a public commit-velocity feed with 59 closed days rewritten as zero (5,355 commits reported as 3). Cause: the scheduled narrative publisher (`eb08776f4`) checks out at depth 1; its push had to rebase, `publish-push.sh --resync` force-rebuilt the feed from the commits it could see, and the node's own `--check` passed because it compared against the same shallow view. Five scheduled publishers run `--resync` on shallow checkouts, and the workflow depth gate cannot see that indirection.

Decision: fix the builder, not the callers. The repository is 4.4 GiB, so deepening five frequent workflows is the expensive answer and still leaves the next caller exposed. `build-oracle-velocity-public` and `build-commit-map` now ask git whether history is complete; in a shallow clone they write nothing and keep the committed file, and the velocity `--check` verifies the embedded proof and states that the history comparison was not performed. A failed `git log` now throws instead of counting as zero commits. A unit test requires every evidence-graph node sourced from `.git/HEAD` to carry the guard.

Verified in a real depth-1 clone: the previous builder wrote "1 commit" and its check then printed "59 closed day(s) stable"; the new one leaves the bytes untouched. The feed was restored from full history (5,369 commits). Not changed: the five workflows' checkout depth, and the depth gate's blindness to `--resync`, which no longer matters for these two feeds.


## D-S374.1 — non-visual scripts load after the first frame; floors stay where they are (2026-10-11)

The required Lighthouse check failed on unchanged bytes in S370, S371, S372 and twice in S373. Its result files showed a text LCP painted with FCP, and a simulated LCP that followed how many deferred scripts had finished before that paint. The fix removes scripts from that window instead of moving a threshold. Scripts are parked in `<template data-after-paint>`, which is inert, and `assets/after-paint.js` re-creates them in order after the load event and one presented frame, at the first interaction, or after five seconds. The template keeps the ordinary script tags in the HTML, so fingerprint rewriting, the service-worker list and the content lane's reference checks read them as before.

A script may be parked only if it changes nothing above the fold and initialises correctly after DOMContentLoaded. Kept eager on the homepage for stated reasons: hero scripts and the public-intelligence membrane they read; `funnel-tracking` and `hero-choice-tracking` (a first click must be recorded); `cookie-consent` (it holds the first-visit attention claim and is a visible fixed surface); `sentry-init` (waits on the load event); `schema-injector` (structured data for crawlers); `pwa-install` (must hear `beforeinstallprompt`). No Worker or CSP change: dynamic same-origin script insertion was already in use by the homepage idle loader, and the new Trusted Types policy passes `/assets/` paths only.

Not claimed: that the check is now stable. That is decided by the pushed commit's runs, at the unchanged floors (homepage 0.76, article 0.90).

## D-S374.2 — `/stats/` stays retired; CANON-054 gap justified (2026-10-11)

`check-stats-surface` reports no `/stats` route. The route was retired on purpose in S368 (72cd75566e) into `/evidence/#numbers` with a 301, and `/stats/ecosystem/` remains. The descriptor, the machine twin `/stats.json`, eight analysed metrics and the homepage showcase all exist. Restoring a standalone page to satisfy a path lookup would reverse a recorded consolidation, so the STRONG gap stands with this justification and the checker limitation went to studio-ops (Ark `01K4MH9K7Q3360206BDD384910`). The Sparked-projects count now carries `smallCountOk`: it counts publicly listed projects, and the small-count floor guards cells about people.

## D-S374.3 — SI first use: menu label changed, two titles left alone (2026-10-11)

The shared Resources label "Synthetic Intelligence" became "Synthetic Intelligence (SI)" in `config/resource-links.json`, which puts the expansion ahead of "AI vs. SI Explained" on every page (CANON-056, CANON-030). Checked on desktop and mobile in all seven themes: one line, not clipped. Two findings remain and are accepted: the `/ai-vs-si/` page title, which names the abbreviation and both expansions on one line and is the page's search title; and one published Desk headline from 2026-10-04, which is editorial record. The FAQ question "Does VaultSpark claim its systems are superintelligent?" now reads "Does VaultSpark claim Super Intelligence for its systems?"; the answer is unchanged and still says no.

## D-S374.4 — the canon adoption file is not trusted where it disagrees with the checker (2026-10-11)

`context/CANON_ADOPTION.md` records CANON-054 and CANON-055 as "adopted (suggested) — Conformance checker passed: }" although both checkers exit 1. The file is generated by studio-ops tooling and is left as generated; the posture for this session is the checker output recorded in D-S374.2, D-S374.3 and the handoff. The writer defect is in the same Ark report.

## D-S375.1 — the satire cartoon sits directly below the illustration and has its own reactions (2026-10-12)

Founder direction during S375. This replaces the S356 and D-S368.7 placement, where the cartoon followed the persona analysis. The cartoon is still labelled as AI-generated satire, credited to an AI persona, and lazy-loaded with reserved dimensions. Its reactions reuse the eight image reaction ids under a new key, `<date>/<slug>/panel/satire-cartoon`, so the Worker allowlist and storage did not change and a vote on one image cannot move the other's count. The longest published slug leaves the key well inside the Worker's 120-character limit.

## D-S375.2 — the Desk shell clips instead of hiding overflow (2026-10-12)

`overflow:hidden` boxes can still be scrolled by focus or scrollIntoView. The shell's decorative glow made it 352px wider than the viewport, and opening an image comment panel moved the article sideways. `overflow:clip` is declared after `overflow:hidden`, which stays as the fallback.

## D-S375.3 — the two dormant homepage scripts stay dormant this session (2026-10-12)

`home-intelligence.js` and `recent-ships.js` never initialise on the homepage. Fixing the listener would switch on an activity feed that has never rendered in production and writes inline styles. That is a visible homepage change that needs its own review and captures, so it was assessed and left on the task board.

## D-S376.1 — late section rendering only where the browser has scroll anchoring (2026-10-12)

Desk article sections use `content-visibility:auto` with a 700px size estimate. When a section is first rendered it takes its real height, and a browser with scroll anchoring keeps the reader's place. WebKit has no scroll anchoring, so after a jump the page moved under the reader (181px measured), and a press on a reaction was released on the article. The rule now sits inside `@supports (overflow-anchor:auto)`. WebKit renders every section up front, as it did before the rule was added; Chromium, where Lighthouse runs, is unchanged. If WebKit gains anchoring the rule applies there without another edit.

## D-S376.2 — image reactions are published apart from story totals (2026-10-12)

The reader-signal feed lists illustration and cartoon reactions under each story's `panels`, read from the image's own key, with the same five-signal floor and reset rule as stories. They are not added to the story total, so existing totals keep their meaning. A panel key longer than the 120 characters the store keeps is never probed and is published as unavailable with a reason, because it would be read under a different name and two panels could share one counter.

## D-S376.3 — the loader delivers an early reaction tap, and only that (2026-10-12)

`after-paint.js` remembers the most recent tap on a reaction button made before the parked reactions script has run, one per bar, and delivers it when the parked scripts finish. It listens at the end of the bubble path and ignores any tap whose default was cancelled, which is how the reactions script marks a tap it handled; delivering such a tap again would take the vote back. The selector is fixed in the loader. Other parked scripts get no replay.

## D-S377.1 — Initialize deferred release cards once

Use readyState-aware initialization, with a once-only DOMContentLoaded listener when needed and an immediate path after it. Hash the child module and update the existing idle-loader dependency graph so public release cards receive the repaired executable. Preserve the dormant member feed and existing data fallbacks. Acceptance: docs/RELEASE_S377.json and docs/visual-qa/LATEST.json.

## D-S377.2 — Reuse bounded session tooling

Thin adapters reuse canonical task projection and premise checks with an explicit local project and existing local audit. Reject duplicate selectors and cross-project arguments. This is session tooling, not a runtime dependency or copied control plane.

## D-S377.3 — Preserve current evidence through release repairs

Rebase generated observations in dependency order; verify unchanged UI/capture hashes before metadata-only receipt rebinding. Low-confidence retained screenshot filenames receive only the exact existing path/pattern exception, with high-confidence and mixed-line credential scanning intact. No hook bypass.


### D-S377.4 — Focused visual evidence and explicit edge parity

The release-card visual receipt binds its twelve actual source dependencies, 28 original screenshot hashes and captured consumer data. Generated payload correctness is checked by the build gate. Capture dates remain unchanged during metadata rebinding. Immutable production bytes match directly; primary HTML is separately compared using only the exact observed Cloudflare footer bootstrap and matching CSP nonce transport. Raw primary-domain parity remains nonpassing; protected identity redirects remain held. No security settings changed.

## S378 — 2026-10-13

Use reversible companion yielding instead of relocating a visitor-selected corner. Reuse the existing loader, header recall, preferences, rendered receipt and browser matrix; no dependencies or paid inference. Hash shell integrity from the generated candidate bytes because the new content-addressed file does not exist during HTML rewrite. Independent review caught selector membership invalidation and a test race; both corrected. CANON-045 identity hold remains outside this scoped unchanged-identity release; two legacy CANON-056 terminology findings remain existing carry evidence. No lifecycle/security/trust-policy changes.

## S378 served-raster release dependency — 2026-10-13

Build public low-quality image placeholders only for served raster paths, using the shared release-lane exclusions. Preserve1594 actual public placeholders; operator screenshots and raw proof art are excluded. Existing comparators used hash-verified batch Git reads for this release proof; HTTP selection, byte/hash checks and failure policy were preserved.


### S378 record recovery — 2026-10-14

Final post-closeout commits 3499f494 and 3c2c2c66 updated accepted release metadata and final production-source evidence. They introduced no additional feature or identity change. The accepted Spark control-clearance outcome and release evidence remain recorded in docs/RELEASE_S378.json. S378 score remains 933/1000; existing identity and field-vitals limitations remain. This addendum records those two commits before the fresh S379 arc.


## D-S379.1 — Target-bound registry discovery and exact identity (2026-10-15)

Resolve the target's local registry, then its Studio Ops sibling. Preserve local status fallback and unknown evidence. Registry matches require exactly one declared slug, folder name or path basename; prefixes, backup suffixes and ambiguous declarations cannot borrow another project's stage, URLs or staging policy. When the registry omits type, preserve the local website type. This repairs discovery; it does not change lifecycle records or approve a launch.

## D-S379.2 — Bounded full-archive allowance (2026-10-15)

A clean approximately2GiB staging archive timed out after300 seconds without deploying. Local archive creation now has a900-second ceiling. Manifest scope, upload limits, digest checks, remote acknowledgement, rollback and readback remain unchanged. Actual deployment and15 self-tests passed. Reducing unnecessary archive weight is a future task requiring route/rollback proof.

## D-S379.3 — Routine promotion retains explicit existing holds (2026-10-15)

CANON-045 provider acceptance remains held and is disjoint from this non-identity release under RELEASE_PROMOTION_PROTOCOL. The two accepted terminology findings retain D-S374.3's explanation; no new language policy change was made. Current conformance had zero ABSOLUTE gaps. These STRONG exceptions are explicit and do not become verified identity acceptance. No pricing, membership logic, rights, launch-date or trust-policy changes were authorized or made.


## D-S379.4 - Deterministic early-reaction fixture (2026-10-15)

The required closeout reconciliation run exposed the reaction fixture response-delay race: four real clicks exceeded400ms under host load. The fixture now holds the script response until the unchanged early-tap assertion runs, then releases it explicitly and during cleanup. Runtime code, replay assertions and test thresholds are unchanged. Targeted12/12 passed and independent review passed; complete canonical rerun follows.


## D-S380.1 — Browser runner isolation (2026-10-15)

Keep Node unit suites in node:test. Use matching js/mjs exclusions in every browser project and actual Playwright collection as a mandatory prerequisite without auth inputs. Preserve the existing Chromium-only visual baseline exception. A temporary fixture proves Node suites do not execute and fails after restoring the old exclusions. No new dependency, service or security policy.

## D-S380.2 — Evidence and release scope (2026-10-15)

The Node suite has430passed, zero failed and one historical schema-lite TODO; it is not431passed. Full authenticated runtime coverage remains distinct from successful discovery. Existing CANON-045 identity and D-S374.3 terminology exceptions remain explicit STRONG gaps; current conformance has zero ABSOLUTE gaps. The public website remains SPARKED/S1. No UI changes means CANON-053 requires no new pixel receipt; its changed-files checker passed.


## D-S380.3 — Scope report credentials to their target

The rank report must compare the configured Supabase origin with its declared website target before requesting a privileged credential. Preserve the existing public-key fallback and opt-in predicate; no RLS or user authentication changes. HTTP, malformed-body and transport failures must reject before writing, preserving previous evidence. A real public endpoint response200 with an empty array is valid evidence; an authentication error is not an empty result. Focused self-test and independent review passed.


## D-S380.4 — Discovery cannot own execution artifacts

Move mobile-audit findings cleanup from module load into its existing execution lifecycle hook. Keep worker ownership and zero-retry policy. Discovery must preserve previous measured findings and receipt bytes. The regression fixture copies the actual mobile spec into an isolated temporary project and checks exact sentinel preservation for all three browser inventories. Fresh full mobile execution is required because the old findings were deleted; previous evidence is not reused. Independent review passed.

## D-S380.5 — Stream staging archive integrity checks

The clean staging archive reached 2,151,356,408 bytes and exceeded Node's single-buffer file-read limit before upload. Calculate the same SHA-256 incrementally from a file stream, preserving exact bytes, remote hash verification, archive scope and rollback behavior. Multi-chunk equality and unreadable-input regressions belong in the existing deployer self-test. This is a necessary release prerequisite; no production policy changes.

## D-S380.6 — Keep accessible names aligned with visible labels

The required hosted accessibility gate rejected real label-content-name mismatches. Use the brand link's natural text instead of an override that omits its visible tagline. Include “Join The Discord”, “Mind-blown” and “Hmm” in the corresponding accessible names. Apply the news generator in write mode, then reconcile shell references and integrity attributes with the existing shell producer before regenerating news proof hashes. Preserve the visible layout, auth holds and all accessibility assertions. Capture and inspect before/after in every theme at desktop and mobile widths; do not treat held authenticated portal checks as public accessibility failures or passes.


## D-S381.1 — Verify the selected browser candidate (2026-10-15)

Browser navigation probes resolve internal links against the loaded candidate page; protocol-relative external destinations are skipped. Visual snapshots inherit configured Playwright baseURL unless VR_BASE_URL explicitly chooses a different deployment. Pull-request visual workflow starts the checked-out local preview; manual deployed-origin capture remains intentional. Temporary actual-spec fixtures prove a candidate404 fails despite a healthy decoy and demonstrate old-origin false passes. Existing committed baselines and pixel tolerances are unchanged.

## D-S381.2 — Existing release exceptions remain explicit (2026-10-15)

Routine non-identity promotion follows RELEASE_PROMOTION_PROTOCOL. Existing CANON-045 provider acceptance and D-S374.3 terminology remain explicit STRONG gaps; startup found zero ABSOLUTE gaps. Historic optional E2E failures are diagnostic, not proven fixed by origin routing. No trust policy, rights, pricing, lifecycle or identity changes. CANON-053 changed-files check passes with no UI changes. Local startup sync/maintenance/checklist helpers are absent; available canonical tools were used without claiming missing commands ran. Canon reconciliation succeeded against this project and official frontier evidence is current.


## D-S381.3 — Preconnect scope excludes operator artifacts (2026-10-15)

The full diagnostic gate rejected an original untracked HTML report under .cache. Exclude .cache, .ops-cache and output directories from public-page preconnect enforcement, preserving those artifacts in place. A temporary fixture proves reports are ignored and a public index missing its required Cloudflare preconnect still fails. Independent review passed.


## D-S382.1 — Test the shipped Spark contract (2026-10-16)

Retired palette tests now exercise Spark. Content-addressed child URLs are accepted, lazy-load uniqueness is retained, and mobile focus targets the heading to preserve deliberate keyboard behavior. Spark is intentionally nonmodal; native search semantics replace obsolete combobox relationships. Existing result labels and query filtering are asserted without a fixed portfolio count. No runtime, screenshot baseline, trust-policy or membership change.

## D-S382.2 — Keep diagnostic failures distinct from release acceptance (2026-10-16)

Prior exact source5bf5849590 optional E2E run38785816235 contains45 persistent failures,2 flaky,60 skipped and582 passed. All45 failure assertions are classified in a public-safe inventory; only5 obsolete search tests are selected for repair. The remaining40 failures are unresolved, including24 pixel comparisons. Routine production follows RELEASE_PROMOTION_PROTOCOL and current exact candidate required workflows; optional success does not imply every browser test passed. Existing CANON-045 identity acceptance and CANON-054/terminology exceptions retain their prior justification; zero ABSOLUTE gaps observed. Startup sync/maintenance/checklist local scripts are absent; available canonical canon synchronization and frontier-radar tools were used. No missing maintenance run is claimed.


## D-S382.3 — Regenerate coherent release projections (2026-10-16)


S382 release prerequisite: regenerate public intelligence and its dependent artifacts after ordered session writeback. Complete npm build body and a successful26-step postbuild lifecycle refreshed projections. Only semantic HTML delta is the generated launch counter225→226;28 stabilized before/after captures across seven themes and1366/390widths were directly inspected. Persona-page differences are whitespace-only. No runtime JavaScript or CSS change. The first postbuild attempt hit a transient Windows UNKNOWN file-open error; shell retry and complete postbuild rerun passed.


## D-S382.4 — Enforce public search without credentials (2026-10-16)

The required compliance job runs both verified Spark/ambient browser files against its local candidate without optional-error or credential conditions. The broad diagnostic job retains its existing scope. Focused LATEST visual receipt intentionally replaces the prior larger matrix; the previous HEAD receipt is preserved byte-for-byte at docs/visual-qa/S381_RETAINED.json. Closeout content-wipe guard flags the size reduction; archival verification establishes an intentional evidence-index replacement with no history loss.


## D-S383.1 — Verify interaction and truth-bus boundaries (2026-10-16)

Milestones load after real reader interaction or a12-second fallback, so the browser test scrolls to them instead of extending a fixed sleep or injecting their script. First-scroll coverage explicitly retains proof → Vault Door → membership; initial Desk attribution was corrected from the live DOM. Intelligence fixtures intercept the public feed, leaving the production bus and consumers intact. Homepage proof derives its numeric score band; the gauge honors the feed grade. Exact score, grade and gauge-width assertions replace a loose numeric regex. Runtime, visual baselines, identity/trust, pricing and membership logic are unchanged. The full seven-test engagement suite runs unconditionally in required CI.

## D-S383.2 — Separate observed diagnostics from release acceptance (2026-10-16)

Fresh ten-test reproduction:7pass/3fail; all three failures are in ambient engagement, while the three Desk artwork cases pass. These observations do not retroactively erase the S382 original45-failure inventory or resolve pixel diagnostics. Negative mutation proves blocked milestone loading and corrupted intelligence score are caught; the combined score/grade mutation is not a separate grade-only proof. Independent review required a documentation correction, then passed. Routine promotion follows RELEASE_PROMOTION_PROTOCOL. Current canon has zero ABSOLUTE gaps; prior CANON-045 provider acceptance and terminology exceptions retain D-S379.3/D-S374.3 justification. Local startup-sync/maintenance/checklist helpers are absent; available canonical canon sync and frontier radar succeeded, and no missing local maintenance run is claimed.


## D-S384.1 — Keep return-visit coverage aligned with attention ownership (2026-10-16)

The homepage owns an inline returning signal, so the floating digest belongs on eligible interior pages. Browser fixtures load the actual asset over its script request, await ledger consumption before asserting silence, verify previous-visit handoff and reload persistence, and retain first-visit/feed-error behavior. Six cases are unconditional required CI. Each of homepage suppression, baseline handoff and actual script loading is checked with a separate failing mutation; runtime attention, storage and membership logic are unchanged.

## D-S384.2 — Preserve browser failure artifacts (2026-10-16)

The optional broad workflow used list-only output while uploading the HTML report directory, producing a prior missing-artifact warning. It now honors configured list/HTML/JSON reporters and retains both report and failure-screenshot directories with always-upload semantics. Local intentional failure proves JSON, HTML and screenshot generation; exact-candidate hosted upload remains required acceptance. Existing diagnostic reds remain distinct from required release checks. CANON-045 positive provider acceptance and CANON-056 terminology gaps retain prior D-S379.3/D-S374.3 justification; zero ABSOLUTE gaps observed. Startup helpers missing locally are noted, not claimed executed. Canon sync and frontier radar passed. No new dependencies, policy, pricing, lifecycle, identity or public promise changes.


## D-S384.3 — Bound generated release changes (2026-10-16)

Complete build body and retried26-step postbuild refresh session-derived contracts. A Windows UNKNOWN file-open failure is retained as a failed first attempt; the complete retry passed without assertion changes. Twenty-six persona reserializations were proven whitespace-only and excluded with preserved copies. The sitemap adds the existing REX page11 and count118 to119; all-theme desktop/mobile before/after rendered review is required. No runtime JavaScript or external CSS source change; the sitemap inline color prerequisite follows. The canonical touched-score shim was stopped after targeting the control plane; explicit recipient-owned scoring verified this website at46731 with source-bound proof. Foreign shim output is not website evidence.


## D-S384.4 — Repair the observed sitemap contrast defect (2026-10-16)

S384 rendered-review prerequisite: sitemap URL labels now use the theme-aware muted token; count119 includes the already published REX page11. All28 before/after captures across seven themes and1366/390 widths were inspected in header/REX regions; measured all119 URL labels per theme at≥5.291:1. Axe reported zero violations but gradient results remain incomplete, not passed. Mobile215/215 and collection692/622/622 passed. No runtime JavaScript, membership, trust-policy or screenshot-baseline changes. Sitemap inline color is the only styling change. Staging/hosted/production acceptance remains pending.

The focused LATEST visual index replaces a larger historical matrix. Prior HEAD receipt was preserved byte-for-byte at docs/visual-qa/S383_RETAINED.json; the intentional index reduction loses no evidence. Any closeout content-wipe warning for this archived index replacement is reviewed on that basis, not ignored.


## D-S384.5 — Preserve concurrent approved Desk artwork (2026-10-16)

Remote main received four routine-art/proof commits while local verification ran. Merge both histories normally; preserve incoming art, story and review inputs, and regenerate the three overlapping derived status/stat outputs. Independent hash review confirms banner and satire approval survives normalization into published assets. The ingestion semanticVerified:false default and separate stricter promotionEligible flag are not rejection evidence. There is no incoming runtime JavaScript, stylesheet, authentication, workflow or generator-source change. The combined candidate still requires representative rendered before/after review of main/satire, listing and shared related-card surfaces across all themes and both widths, fresh complete local source checks, staging, exact hosted checks and full production readback. Earlier candidate evidence cannot substitute. This is release integration, not an extra scored outcome or editorial rewrite.


## D-S385.1 — Preserve earned rank and coverage truth (2026-10-16)

Point boundaries and podium order are independent of display handles and paid membership. Tests cover both sides of all nine rank boundaries and retain the full-population denominator. Ecosystem assertions consume the actual response rather than freezing the portfolio at19 projects; they check all project names/states, coverage denominators and filter results, plus a self-consistent unobserved single-project fixture and503 response. No rank economy, auth policy or public promise changes.

## D-S385.2 — Follow the retained link assertion to its source (2026-10-16)

Correcting the stale rank expectation exposed the member directory links for missing handles. Trim only actual strings, keep missing handles absent, render neutral non-link cards, and escape initials. Existing public-view requests and fallback remain intact. All15 focused browser cases pass and two independent mutations are detected. Twenty-eight actual before/after captures were inspected across seven themes; prior S384 LATEST receipt is retained byte-for-byte at docs/visual-qa/S384_RETAINED.json. Automated gradient contrast remains incomplete. Canon zero ABSOLUTE gaps; existing CANON-045/056 exceptions retain D-S379.3/D-S374.3 justification. Missing local startup-sync/checklist helpers are recorded rather than claimed run; canonical sync/radar succeeded.


## D-S385.3 — Preserve startup history within the existing budget (2026-10-16)

Canonical rotator found no eligible blocks. Moved completed S377/S378 notes verbatim to the existing task archive; all117 unchecked rows remain byte-for-byte in the active board. Saved820bytes without changing the42000-token guard. Existing source-preserving archive policy is reused.


## D-S385.4 — Deliver the directory fix through a new cache key (2026-10-16)

Live mutable directory asset advertises a604800-second browser cache lifetime. Register the source with the existing hashed shell builder, which rewrites the community script reference and excludes mutable source aliases from the service-worker shell. This is required delivery follow-through for the reproduced directory defect. Preserve existing asset cache policy. The first full gate stopped honestly at step160 because the visual receipt lacked its candidate binding; add that existing receipt field after final captures, then reverify the finished source.


## D-S385.5 — Retain prior rendered evidence when replacing its index (2026-10-16)

The canonical wipe guard reports exactly one size-based finding: docs/visual-qa/LATEST.json is12% of its previous index. HEAD receipt and docs/visual-qa/S384_RETAINED.json are byte-identical; all28 new capture hashes and source bindings verify. Prior history and every append-only surface remain preserved. Use the existing documented --allow-wipe option only for this intentional reviewed index replacement. No guard code, hooks or checks are disabled; final source is revalidated normally.

## D-S385.6 — Complete directory readability and search acceptance (2026-10-16)

Rendered light-theme samples exposed low rank/avatar contrast. Use existing primary text tokens, retaining rank-colored decoration.112 before/after captures cover default and three search states in all7 themes and both viewports;56 measured text/background samples pass scoped thresholds. The final replacement plan and visual index retain their exact S384 predecessors; the documented wipe override is limited to these two size-based findings after exact archive/hash checks. No append-only history or gate is bypassed.


## D-S386.1 — The Desk art reviewer judges against the generator's brief (2026-10-16)

CI Health Monitor failed 2026-10-15 and 2026-10-16 on `check-desk-art-currency`: one banner on placeholder art past 48h and three stories without satire cartoons. The autopilot reviewer received only headline and scene, while the generator draws from sourced facts, the satire target/setup/payoff and the caption. It therefore rejected faithful renders on every run (a UK setting stated only in the facts; a gag that draws the supplied payoff). `storyBrief()` now gives the reviewer up to four fact lines, the joke, caption and any `satireDirection`, all fenced as data. Country and punchline checks name those sources. No strict check, likeness rule or injection fence is relaxed.

## D-S386.2 — Exhausted art re-rolls get one critique-guided attempt per UTC day (2026-10-16)

After two in-run re-rolls the staged image was re-reviewed unchanged every run, so a stuck story could never recover without an operator. An exhausted, still-failing story/kind now gets at most one re-roll per UTC day, recorded as `dailyReroll` in the staged review record. The generator appends the last rejection reasons (cleaned, at most four, 240 characters each) before the closing instruction. Meta hashes the prompt actually sent. Banner and satire base prompts are unchanged.

## D-S386.3 — The newest Desk story is the latest publication instant (2026-10-16)

`deriveNewsReleaseContract` ranked by date, then id alphabetically. After the 22:22Z latenight edition it named the 12:35Z midday story newest; the homepage correctly features the later story, so CI Health Monitor reported a missing homepage link. Ranking now uses the full `date_published` instant before the id tie-break. Date-scoped fact/stance ledger checks are unchanged. Consumers (live matrix, live news release check, staging content deploy) share the library, so candidate and live evidence stay consistent.

## D-S386.4 — Persona pagination stays out of the Desk lane until the server rules move with it (2026-10-16)

The Desk content allowlist admits persona index pages but not `news/personas/<p>/page/<n>/`; editions add those pages and the sitemap lists them, so they 404 until a full promotion. The Hetzner staging receiver validates against a root-owned copy of the rules, so changing only the repository allowlist would make the lane send paths staging refuses and break the newsroom release. This session ships the pages through the full promotion; the coordinated allowlist and server-rules change remains a separate, approved trust-policy update.


## D-S387.1 — Diagnostics do not consume sign-in KV writes (2026-10-18)

Use private R2 batches for normalized Trusted Types reports, reusing the existing signer. Keep sampling and enforcement policy unchanged; object-store faults never fall back to auth KV. The private tt/raw/ prefix expires after 30 days, preserving unrelated lifecycle rules; staging has its own bucket. Evidence readers include legacy KV and current R2, and reject incomplete or failed reads. Other shared KV writers remain explicit follow-up work.

## D-S387.2 — Bounded release and truthful evidence (2026-10-18)

The founder authorized direct main publication and full deployment for this goal. Preserve existing identity holds; routine promotion uses the scoped release contract and actual candidate checks. Canon checks found no ABSOLUTE gaps; existing Obelisk and terminology STRONG gaps remain outside this diagnostic change and are not claimed resolved. Preserve unrelated operator residue. The broad unit suite has one existing schema-validator TODO, distinct from ordinary failures; no green wrapper converts it into a passing test.


## D-S387.3 — Bound diagnostic storage before release (2026-10-18)

R2 intake must not turn a shared free KV outage risk into unbounded diagnostic writes. Reuse the existing SQLite counter on the distinct diagnostic:tt:write-budget:v1 object: at most 3 batches/hour (72/day), each with at most 5 reports and an actual streamed 8192-byte request bound. Missing or failed counter/storage drops best-effort diagnostics without KV fallback. Existing hashed per-visitor form objects and auth policy are unchanged. Counts represent stored samples, never a complete traffic census.

### D-S387.4 — Missing meter remains unknown
A five-second meter timeout made the brief publish a file-byte estimate as runtime pressure and failed the live freshness gate. The fallback now keeps usage null and reports UNMEASURED; independent review and the existing freshness fixtures passed.


## D-S388.1 — Bound CSP diagnostics and report retained evidence (2026-10-18)

Reuse the existing private diagnostic buckets and a distinct diagnostic:csp:write-budget:v1 SQLite object. Never fall back to auth KV on intake storage failure. Keep enforcement/headers/identity unchanged. Preserve actual legacy ring entries through complete listing, not modulo counters. Summaries disclose retained counts and return503/null when any source is incomplete. CSP objects expire after3 days; TT30-day and unrelated rules are preserved. Official Cloudflare limits confirm1000 internal subrequests; accepted summary bounds stay below that limit, with concurrency5. This does not prove an account-wide quota cure.

## D-S388.2 — Authorized release and remaining canon posture (2026-10-18)

The founder authorized direct main push and full promotion for this fresh goal. Current canon sync and frontier radar passed; no ABSOLUTE gaps. Existing Obelisk identity and hybrid-terminology STRONG gaps stay outside this diagnostic change and are not claimed resolved. Routine release uses exact-candidate checks, current isolated staging, rollback and production readback. Legacy unit schema-validator TODO remains explicit. Unrelated cache/forecast/operator residue is excluded from publication.


## D-S388.3 — Bound diagnostic summary read amplification (2026-10-18)

Pre-release review found that a public GET could perform up to894 storage operations, so a per-request bound alone did not bound aggregate R2 cost or protect shared KV reads. Reuse the existing SQLite class on a distinct diagnostic:csp:summary-budget:v1 object: three expensive computations per fixed hourly window, with no intake/account key sharing or KV fallback. Admit before reading storage. Denied admission returns429 and unavailable/null; missing, failed or malformed admission returns503 and unavailable/null. Failed computations consume a slot. This bounds evidence reads, not inbound requests/counter calls; a public caller can temporarily consume operator visibility. Maximum accepted internal operations with pagination and admission907. Staging and production namespaces must be observed distinct.


## D-S389.1 — Admit deployment intent before operational IO (2026-10-19)

Reuse the existing argv guard through an additive strict wrapper; preserve caller behavior for real documented invocations. Unknown/ambiguous input exits before credential resolution, child processes, network or writes. All help and preview aliases are inert, including mixed deploy/preview requests. Desk planning remains explicit and networked under --plan. Handoff default becomes deterministic extraction with exact source hash and omission lookup; no optional paid path is needed. Preserve archive-before-trim and newline boundaries. Existing Obelisk/terminology STRONG gaps stay outside scope; no ABSOLUTE gaps were found. Founder authorization covers direct main push and full routine promotion, with staging, exact-candidate checks and readback.


## D-S389.2 — Close the human sitemap publication cascade (2026-10-19)

Full validation found existing Dot/Echo archive links missing from the human sitemap. Reuse the existing sitemap-page graph node with publishCascade:true; all five XML publishers must rebuild and stage the human page in the same commit. Negative fixtures reject a missing builder or staged page. Keep existing Desk lane/remote allowlists and identity holds unchanged. Full promotion delivers the corrected sitemap and existing archive routes. Startup-budget repair preserves three completed historical blocks verbatim in the existing archive and leaves open work live.


## D-S389.3 — Derive Oracle answers before sealing (2026-10-19)

Reuse the existing deterministic generator and active public insight/tier dependencies. Model the previously omitted answer node; build insight clusters before answers in both profiles, then seal the candidate. Require publishers of those inputs to stage the answer corpus. Current canonical dates make citation’s fallback day inactive; the graph documents this rather than introducing a candidate/citation cycle. No answer text, canonical pricing, identity flow or runtime inference changes.


## D-S389.4 — Publish field proof after grading

Reuse canonical measured verdicts and existing proof generator. Grade before deriving field-win and its consumers; stage the proof in all affected publishers. No measurement/classification change or session performance-improvement claim.


S389 D-S389.4 implementation clarification: playable recommendations embed the field-proof hash. The full profile now derives them immediately after field proof; RUM rebuilds/checks/stages them, and the existing graph node enforces their publication.43 order assertions and37 cascade fixtures cover this closure.


## D-S390.1 — Public REST queries need a live verdict (2026-10-19)

Playwright mocks fulfil any select, so ten browser queries reached production naming columns or tables it does not have. Every client query (table, select, filter and order columns) must now appear in scripts/public-rest-contract.json with a live verdict from read-only anon `limit=0` probes; build:check enforces it offline and `--live --write` refreshes it. A rejected query may remain only as `known-failing` with a deferral note. Membership-tier and identity-adjacent fixes (vault-sdk, world gates) stay deferred for founder review; the rank strip uses points only.

## D-S390.2 — Keep the handoff extract cap (2026-10-19)

Measured over 80 committed handoff versions: 31 omitted content (median 2,432 characters), and 2 cut into the newest session. The omission lookup covers older sessions, so the 6000-character cap stays. Re-measure with `compact-handoff.mjs --measure` before changing it.

## D-S390.3 — Reserve late-filled space instead of collapsing it (2026-10-19)

/journal/ redirects to /changelog/#stories, so late content above the anchor moved what readers were looking at (CLS 0.1154). The push slot reserves its height and ships a static ship-feed fallback; the empty themes grid keeps a one-line state instead of display:none; the summary reserves its settled height at narrow widths.


## D-S391.1 — Preserve operational modes while refusing ambiguous intent (2026-10-20)

Reuse strict argv admission before operational imports in six outward tools. Preserve documented no-argument callers. Provisioner --check remains an operational read-only audit; migration --dry-run remains a pre-image operation. Other preview aliases and mixed apply/preview requests are inert. Unknown migration probe names reject before credentials or SQL. No database policy, identity flow or membership logic changes.

## D-S391.2 — Detect live REST drift without rewriting accepted evidence (2026-10-20)

The weekly/manual canary uses anonymous limit=0 probes, three concurrent requests, ten-second request bounds and a ten-minute read-only hosted job. Existing deferrals carry only when rejection status and detail match; transport failures and new permission denials remain failures. CI never rewrites the manifest. Existing STRONG identity and terminology gaps remain outside this routine operational release; no ABSOLUTE gap was observed. Founder authorization covers direct main publication and full routine deployment after relevant gates.

## D-S391.3 — Keep the procedural deviation visible (2026-10-20)

The final passing strict premise checkpoint followed two delegated implementation edits; synced routine/propagation commits also appear after start_head. Retain the original nonpassing timing evidence. Baseline source inspection/replay supports the premises but cannot turn a late checkpoint into a timely one. Future delegation must wait for the passing recorded checkpoint.

## D-S391.4 — Keep offscreen layout deferred during Spark collision checks (2026-10-20)

Two exact-candidate hosted Lighthouse runs failed the unchanged News performance floor at 0.88. Chrome 155 traces identified Spark measuring controls inside skipped content-visibility subtrees. Feature-detect checkVisibility before measuring those controls; visible controls and unsupported browsers retain the existing collision path. A controlled trace comparison removed the inner loop's 10–11 forced layouts (about 20 ms); Lighthouse medians remained effectively unchanged, so this is not evidence of a score improvement. Require browser collision checks, rendered visual evidence, fresh staging and exact-candidate hosted acceptance before promotion.


## D-S392.1 — Reject ambiguous operator input before access (2026-10-20)

Moderation list filters and mutation actions have distinct grammars. Missing, duplicate, unknown and cross-command options reject before credential access. REST --write requires --live even with help/preview. Existing valid request construction remains unchanged. No authentication policy or membership-tier change.

## D-S392.2 — A partial record is not release acceptance (2026-10-20)

Use an explicitly active handoff heading before durable closeout; the completed-session heading had prematurely advanced generated public session counts. Preserve failed complete and partial test attempts. The premise timing verifier remains nonpassing because a startup-generated control-plane receipt preceded the strict checkpoint; selected source edits followed the checkpoint, but no clean timing pass is claimed. Existing STRONG identity and terminology gaps remain unchanged; no ABSOLUTE gap was observed.

## D-S392.3 — Preserve the recovery approval boundary (2026-10-20)

The exact guarded one-project Supabase restart received Founder-Twin ASK with reason no signal — defer to founder. The explicit approval question remains unanswered. Do not attempt the restart through another surface, change the helper name, or disable the gate. Observe healthy recovery non-mutatingly; production remains pending current acceptance.


## D-S393.1 — Validate rank evidence at both boundaries (2026-10-20)

Require canonical ISO timestamps, no future claims, the existing48h freshness window, consistent schema/counts and ranks derived from finite qualifying points. Reject malformed provider rows before writing; valid empty results remain valid. Keep public-profile filtering, rank thresholds, credential targeting and membership policy unchanged. Rollback: revert the bounded rank validation change and its registered tests; retain the last accepted report bytes.

## D-S393.2 — Keep release and process evidence scoped (2026-10-20)

Retain the original nonpassing premise-timing receipt: the plan existed before the checkpoint, while the selected source remained clean. Current provider recovery is observed, not attributed to a restart. Existing STRONG CANON-045 identity and CANON-056 terminology gaps remain outside this routine stabilization; held identity surfaces and policy choices are preserved, and no new identity/trust flow or public promise is introduced. Deployment still requires current staging, applicable access regressions, exact-candidate CI and production readback.


## D-S393.3 — Generated shell and visual evidence repair (2026-10-20)

Use the master stylesheet and shared theme controller, and execute the existing bootstrap after body opens. Each captured theme owns a new browser context; root/body/storage must match the request, including receipt-only acceptance. Real before images exposed the defect;84 after images now show seven palettes. Preserve12 actual dark baseline images and disclose the pre-existing dismissible mobile Spark overlap. No membership, identity or pricing policy changes.


### D-S393.4 — Immutable full product release and bounded status publication

Promote the checked c0488e184f tag through the normal full Pages path, then verify served source, provider identity and retained edge routing. The deployment-stamped build identity is checked separately; the pre-stamp staging Merkle root is not claimed byte-identical after stamping. Publish durable closing-status wording once using existing scoped gates and readback. Keep receipt-only additions separate from deployed payload generation. Existing identity holds and S147 canonical redirects are unchanged; the failed Lighthouse attempt is retained.


## D-S394.1 — Separate response acceptance from shell equality (2026-10-21)

Matching asset names do not make an HTTP error a working route. Require2xx and a nonempty expected fingerprint set, while preserving missing/unexpected diagnostics. Reuse strict argv admission; constrain base to an HTTP(S) origin and route to a site path before IO. Existing redirect following remains unchanged; future policy review is unselected. Rollback: revert the checker and its registered fixture tests.

## D-S394.2 — Preserve scoped release and process evidence (2026-10-21)

Original premise timing remains nonpassing because startup generated the genius list before the checkpoint. Selected source changes followed verified premises. Existing STRONG CANON-045 identity and CANON-056 terminology gaps remain separate from this routine verifier stabilization: no identity/trust or public terminology policy changes selected. No ABSOLUTE conformance gap observed. S393 release evidence cannot complete this fresh S394 invocation.


## D-S395.1 — Absence cannot certify deployed parity (2026-10-21)

Require complete nonempty served-text observations. Missing files and unexpected responses are unverified. Configured redirects must match status and resolved Location from the compared git tree; reuse shared Pages semantics. Strict CLI admission precedes operational IO. Report-only scheduling remains report-only. Rollback: revert bounded checker/tests and redeploy last accepted production version.

## D-S395.2 — Keep session and verification boundaries honest (2026-10-21)

S395 is a new native goal association. Prior release evidence cannot complete it. Record the nonpassing timing result caused by incoming automation after the pre-sync lock without rewriting history. Existing identity and terminology conformance gaps remain separate from this unchanged-policy stabilization; full release still needs current candidate acceptance.


## D-S395.3 — Preserve concurrent source and verify the integrated release

Incoming routine news artwork and generated pages are preserved as authored. Resolve only known generated report conflicts using owning builders and newest observation timestamps. Pre-integration acceptance remains historical; it does not certify the combined candidate. Fresh before/after pixels and current release checks are required. No extra product outcome or policy change is selected.


## D-S395.4 — S395 final integrated product release acceptance

S395 served-text parity requires complete nonempty exactly-once coverage, committed redirect status/destination and strict CLI admission. Focused fixtures3/3, self-test19/19, existing regressions9/9 and independent review pass. The earlier actual npm full build/postbuild26/26 is retained as preintegration evidence. Fresh integrated36-node native-owner closure, declared news checks and two complete 545/545 runs plus current staging11/11 pass;84 manually inspected news captures across7themes at1440/390px and215 automated device probes retain their stated limits. Retired8442f8f4 failed hosted compliance atstep143 because WORK_LOG measured251KB against the250KB cap; native rotation moved0 for session-first headings, so older history was archived verbatim before corrected candidate16f6938f. Normal full production candidate c931cc736f70b524509378c1e35e1a69e8b3927d (run 39650067973) is verified by hosted checks, provider identity, both build stamps, complete served text,65 critical leaves on Pages/apex and exactly12 incoming news-image variants on both origins. This does not certify all binary assets. Original premise timing remains nonpassing; original baseline trace/context usage is unmeasured. Existing identity and field-vitals holds remain separate; no measured visitor or performance gain is claimed.

Publication has distinct acceptance. At this product-acceptance checkpoint, the following closing work remained pending: final metadata verification/commit/push, public projection deployment/readback, Ark impact transport, owned-process cleanup and final native-goal audit. Native completion is not claimed by this product writeback. Keep SIL935/1000 and velocity1; no additional outcome is invented. The original timing deviation and preintegration receipts are retained.


## D-S395.5 — bounded article stylesheet release correction

Closing candidate b4315468 failed the unchanged article Lighthouse90 floor at88 in both attempts; its passed E2E and accessibility checks do not overrule that failure. Preserve both failed attempts and issue a changed-source candidate. Retain shared blocking CSS and a complete blocking article stylesheet; omit only the marked profile/finder region and fail if a generated article uses an omitted class. Keep nonarticle pages on their full sheet. The existing native asset pipeline owns hashing, caching and service-worker references; early hints follow the actual stylesheet selected by each route. No Lighthouse floor or engine change is selected. Local11.4 diagnostics score94/94/94 with CLS0 and the gzip payload is10207 versus16052 bytes; this is not hosted acceptance or a measured field gain. Rejected footer-containment and combined-sheet experiments are reverted. Fresh rendered, mobile, complete-suite, staging and exact-candidate release evidence is required; final acceptance is recorded in docs/RELEASE_S395.json. This is release follow-through for the existing selected outcome, with935/1000 and velocity1 unchanged.


## D-S396.1 — Reference integrity is a build gate, scoped to what a page itself declares

Two live 404s (the post-subscribe persona link and the investor-portal brand image on 8 pages) shipped past 545 build:check steps because each neighbouring gate answers a different question: route status (crawl-all-pages), project-slug canon (audit-site-links), and `<base>` rewriting (check-base-href-resolution). `scripts/check-local-references.mjs` now fails the build when any tracked public page's href/src does not resolve to a served file, a directory index, a `_redirects` source or a declared Worker runtime route. Script, style, template and comment bodies are excluded because their URLs are runtime-built; `srcset`, CSS `url()` and JSON feeds are out of scope (L3, unselected). The persona link is repointed to the existing `/news/#anchors` roster rather than inventing a new public page; a standalone roster index stays a future option. The investor portal reuses existing brand assets; its missing theme system is recorded as a pre-existing CANON-047 gap, not fixed here.


## D-S397.1 — Offline recovery must prove the requested origin and preserve current-cache isolation

Adapter online status is advisory. The offline fallback now probes the requested page with a bounded no-store, no-redirect HEAD; only success schedules reopening, and a new offline event cancels stale work. Direct /offline.html returns home on confirmed recovery. Navigation consults only declared public precache pages in the current shell cache after the runtime cache and its TTL. Existing member/auth cache behavior is unchanged. Offline scripts and the existing theme controller must be available from install precache. No dependency, identity policy, pricing, canon or lifecycle change is selected. Existing identity/contact capability gaps remain scoped separately under the prior recorded decisions; this bounded offline repair does not certify their completion.

### S397 offline fallback performance measurement scope

The affected offline document automatically exits after confirmed recovery. An ordinary online Lighthouse visit therefore measures the reopened route, so no offline-fallback Lighthouse score is claimed. The existing hosted Lighthouse candidate checks still apply; the offline failure/recovery states are accepted through actual browser/server-down behavior and the 42-image theme/device/state matrix. This is the recorded page-measurement exception permitted by the website implementation overlay, not a claimed performance improvement.


## D-S397.2 — Preserve full release gates across a transport fallback

The pinned S397 release used the existing normal Pages artifact recipe locally through the canonical Pages broker after the hosted attempt encountered a flaky502 and its retry stalled in dependency setup. Exact hosted required checks3/3 and a fresh canonical staging ceremony11/11 passed before upload; no gate, held identity contract or credential policy was relaxed. Provider identity, both build stamps, full1133-path served parity and bounded binary/HTML readback verify the actual result. The hosted attempt is not claimed as a successful deployment.

## D-S398.1 — SI first use is a Desk copy gate, enforced in story render order

The Desk's copy-quality gate blocks a story whose first bare "SI" precedes "Super Intelligence (SI)" or "Synthetic Intelligence (SI)". Fields are walked in render order (headline first), because the page title is built from the headline. Published headlines are corrected in data/news-desk/days and regenerated, and slugs never change. The author brief states the rule so the generator writes to the gate rather than discovering it at release.

## D-S398.2 — Pin production to a release tag when publishers move main

When [skip ci] data publishers land after the candidate's required checks pass, production is dispatched against a release-s<n>-<sha> tag of the verified candidate, not against main. Pausing the writer workflows needs founder-level approval (denied in S398 as a CI bypass), so it is not part of the routine path.


## D-S399.1 — Reading clearance and responsive-reference coverage

Spark's existing yield mechanism now considers actual text line rectangles in semantic main-content blocks, preserving empty margins and the stationary header recall. Responsive HTML image candidates join the existing local reference gate; no dependency was added. Baseline, focused tests, independent review and rendered proof support these bounded repairs.

## D-S399.2 — Preserve planning and rotation evidence

The premise timing classifier treats required plan briefs as implementation paths. Keep its original nonpassing evidence and the exact baseline replay; do not rewrite it into a historical pass. The startup context limit stayed 42000: after whole-block rotation found no safe move, completed rows were archived verbatim with exact open-row preservation. No canon, identity, public promise, pricing or lifecycle policy changed.


## D-S399.3 — Assert arrivals and conditional companion states

Route-progress checks observe each destination arrival ID instead of using corner-buddy visibility as a loading proxy. Companion checks explicitly prove reading yield and header recall, then isolate a clear corner for animation, nonmodal behavior and persisted preferences. All original behavioral assertions remain; local and staging 24/24 and revised exact-candidate hosted checks support the repair.


## D-S400.1 — Match browser bases and preserve readable persona copy

Reuse native URL resolution and exact active base attribute selection in the local-reference gate. Reuse the existing light persona-copy token and range-based Spark clearance; semantic notes/asides are reading content too. Decorative persona colors remain distinct from text colors. The repaired Desk sheet joins the existing fingerprinted shell pipeline so week-cached plain CSS cannot delay the fix. No dependency was added.

## D-S400.2 — Keep evidence scoped and retain failed attempts

Actual before/after images, rendered-background contrast samples and isolated note causality checks establish the bounded repair. Persona-page and disclosure-side states use separate complete capture matrices. Keep the transient staging omission, Windows write failure and nonpassing premise-timing classifications visible. No source-timing pass or field outcome is inferred.

CANON-045 STRONG gap remains justified under the existing scoped promotion contract: identity/provider migration is unchanged, and current public UI repairs do not alter identity/session/trust policy. Existing holds remain explicit; routine promotion is not an identity or lifecycle launch.


## D-S400.3 — Recover the actual metadata smoke failure

The full suite stopped after117 passing steps because an optional paragraph capture was undefined. The backfill helper now skips empty/short paragraphs, selects the first meaningful paragraph without joining later ones, and excludes internal cache/test/docs/Lighthouse trees. Imports are read-only. Four regressions and native smoke pass; no public metadata backfill was applied. Original failed measurement remains retained; current full acceptance must be rerun.


## D-S400.4 — Heartbeat checks replay the published snapshot clock

Hosted compliance reproduced elapsed-window drift: the same event ledger yielded website pulses7d14 at the artifact timestamp and13 after an event crossed seven days. Verification now reconstructs at a canonical, nonfuture artifact generatedAt; live generation retains current time. This establishes source/snapshot consistency only; it does not establish freshness. Missing or invalid clocks, changed sources and tampered counters remain failures. Four focused regressions include a real read-only CLI check. This is an acceptance repair for the two selected S400 outcomes, with no new public promise or identity change. Failed candidate/run evidence remains in docs/S400_hosted-compliance-attempt1.json.


## S400 addendum — 2026-10-24: recovered closing observation updates through 35e5d5f181. Five post-closeout commits reconcile heartbeat/status projections, cadence wording and UTC day counters. Production remains the independently accepted 06d632056f candidate; later main observations were not redeployed. No new behavior, score or acceptance claim is introduced. Recovery is separate from the fresh S401 arc.


## D-S401.1 — Verify archive inventory before staging upload

Reuse installed tar for exact member names and independent regular-entry checks, and Node streaming gunzip for complete gzip CRC validation. Admit only regular single-link sources with real directory parents and unambiguous printable ASCII relative paths. Both full and content staging producers verify before scp; the full staging receipt binds inventory count and SHA-256 digest alongside archive byte identity. Historical receipts remain readable. This proves archive names/types/integrity, not per-member source-byte equality or a frozen filesystem snapshot. No dependency or identity/trust-policy change.

CANON-045 STRONG gap remains separately justified: unchanged relying-party integration and existing provider holds are not expanded or cleared by this operational release. Canon startup sync suggest timed out once; direct suggest/check recovered successfully. Premise gate strictly verified both premises before behavior edits, but timing classifier remains nonpassing for four startup/planning artifacts. Preserve that diagnostic; do not relabel it as a pass.


### D-S401.1 release evidence addendum — 2026-10-24T05:40:51.330Z

Normal full production 7348fc96f556d3223988eee1aa0b27a8678db483 accepted; docs/RELEASE_S401.json preserves initial failed source check, diagnostic-only tail, complete final suite, exact hosted checks, real staging inventory and production readback. Canonical-root equivalence excludes only declared shell-manifest generatedAt metadata; original staging and later source fingerprints remain separately scoped. No source-byte snapshot or field gain is inferred.

## D-S402.1 — Scope current route duration to the active episode

The production feed was matched with zero open incidents but reported2.5days of current degradation. Current onset now requires an open route incident. Coarse uptime evidence must fall after the prior matching route observation and no later than the route snapshot; excluded evidence remains labelled. POST real-user telemetry does not prove the OPTIONS route-method contract, so its original aggregate day window remains corroboration only. Closed incident durations, recovery records and the append-only semantic ledger are preserved. This repairs a public status derivation, not measured availability or an identity policy.

CANON-045 STRONG gap remains separately justified: unchanged relying-party integration and existing provider acceptance holds are outside this status repair. No lifecycle, pricing, auth or trust-policy change. Strict audit premises passed before behavior edits and pending audit/plan admission passed; the timing classifier still rejects three startup/planning artifacts. Preserve that diagnostic rather than claiming timing acceptance. Rollback is a normal revert of the bounded implementation and redeployment of the prior accepted candidate7348fc96f556d3223988eee1aa0b27a8678db483.


<!-- S402-closeout-writeback -->
## D-S402.2 — accepted implementation and closing metadata have separate evidence

Decision archive is raw byte-exact to 99852b7c6d:context/DECISIONS.md (257073 bytes; SHA-256 13f61e652175a1f41f1eb1044527f62fb238d2d8b3cb1ffd1bf01a0cfa968271). The historical working-tree preimage was 257080 bytes with seven CRLF differences; that preimage is text-equivalent after newline normalization and is not claimed as raw-equal to the archive. All complete decision sections remain preserved.

SIL archive context/archive/SIL_S1-S401.md is raw byte-exact to the original committed ledger (306672 bytes; SHA-256 0ca6d0f65fc88c706ba3e4fcc5132dbfc94b29e94e3abcb3bf6e2b21407ff33c). The complete Rolling Status and recent complete sections remain in the hot file; the SIL cap is 300 KiB. Evidence: docs/S402_sil-rotation.json.

The released candidate is 1f5e24f9029bd0c9b5e4973cf4148cc1474455ad. Later writebacks do not silently replace its acceptance evidence. POST RUM samples stay corroboration-only for an OPTIONS contract. Closing publication must be verified normally; no force push, no bypass and no native-completion claim. Evidence: docs/RELEASE_S402.json.

## D-S403.1 — preservation-safe dated session rotation

Reuse the existing rotator for explicit date-first and session-first headings, including compact session labels and addenda. Leave undated metadata hot. Order same-day entries by session number and count actual UTF-8 bytes. Before any dated-ledger mutation, preserve a content-addressed exact input snapshot; refuse conflicting snapshot bytes. Focused fixtures prove complete-section preservation, CRLF equality, same-day retention and idempotency. No dependency, public promise, identity-policy or visual change is selected.

The CANON-045 STRONG gap remains separately recorded: this maintenance repair changes no identity flow and does not claim provider integration acceptance. Strict typed audit premises preceded implementation; the shared timing classifier still flags three startup/planning paths. Candidate admission passes and that timing limitation is retained. Radar write failed on its shared report; read-only follow-up proves all ten official sources current at 11.2 hours, without another cross-repo write. Full release acceptance is tracked in docs/RELEASE_S403.json.


<!-- S403-git-index-preservation -->
## D-S403.2 — 2026-10-25 — preserve raw preimages through Git staging

The repository LF filter normalized a real CRLF snapshot in the Git index during an isolated regression (3/4 red). Immutable content-addressed context/archive/*_preimage_*.md files now disable text normalization; ordinary source keeps LF. The extended real-CLI fixture verifies exact indexed bytes/digest, unchanged normal-source LF behavior, preservation and idempotency. The source-evidence fingerprint also binds .gitattributes, with removal/restoration checked. Focused4/4 green and independent implementation review passed. Full closing checks and publication remain required. This is a local archival transport rule, with no canon, trust, licensing or public-promise change.

<!-- S404-closeout-writeback -->
## D-S404.1 — 2026-10-26 — complete manifest asset parity

Reuse the positive deployment classifier and existing remote comparator. Preserve text default compatibility; opt-in all-served scope uses the compared commit manifest and Git blob IDs/sizes from one NUL-framed inventory. Hash actual downloaded binary bytes with the Git blob header; compare object identity and length. Receipts name actual scope and include independent expected Git IDs, actual Git IDs and actual SHA-256 values. Include CNAME and .nojekyll because live Pages actually serves them. Only _headers/_redirects and stamped api/build-sha.json are excluded; redirects must match the committed redirect contract. Invalid/missing inventory is nonpassing. No dependency or new service is required.

Independent review corrected served-control assumptions and measured slow per-file Git startup; the single inventory replaces that overhead. Full exact-candidate release acceptance remains in docs/RELEASE_S404.json. Rollback is a normal revert and prior accepted production deployment; never force-push or weaken release gates.

CANON-045 STRONG gap remains separately justified: this verifier repair changes no identity/auth/trust policy and cannot claim provider integration acceptance. Strict typed premises preceded behavior edits; the timing classifier counts pre-sync automation and three startup/propagated files, and its original nonpassing diagnostic is preserved. Startup canon sync and official frontier radar completed successfully; radar10/10 current at40.2hours.


## D-S404.2 — 2026-10-26 — rendered mobile kicker clearance

S404 release pixel review found the fixed page-status ring crossing the News mobile kicker. Reserve54px inline-end clearance only on mobile article kickers. Existing44px status target remains visible and functional. Actual Chromium text-range geometry reproduced pre-fix collision and passes56theme/width/article cells after the fix; existing article CSS cases2/2 pass. Native shell assets and208HTML references carry the repair.

This is a separately premise-verified and admitted repair discovered by actual rendered-pixel release inspection. Before images retain the defect; after captures must be inspected. No redesign, identity, pricing or launch change. Revert the mobile padding rule for rollback. Current accepted state remains in docs/RELEASE_S404.json.

<!-- S405-closeout-writeback -->
## D-S405.1 — 2026-10-27 — explicit manifest text scope

Reuse the existing positive manifest classifier and Git object inventory. Add served-text as manifest membership intersected with the existing case-insensitive known-text extension list, excluding provider configuration and deployed stamp. Preserve the legacy text default. Missing or invalid compared-commit manifests fail before resource comparison; dirty local manifests do not affect selection. Receipts identify source, digest and extensions. No new package, service or spending.

CANON-045 STRONG gap remains separately justified: this verifier repair changes no identity/auth/trust flow and claims no provider acceptance. Strict typed premises passed before behavior edits; startup propagation paths remain separately visible in timing diagnostics. Rollback: normal bounded revert and prior accepted production a569b1ed3df3abb738193c24d93da6b7a4832cab. Full current release acceptance is tracked in docs/RELEASE_S405.json.


S405 timing diagnostic: after-implementation for docs/GENIUS_LIST.md and two planning brief inputs; selected verifier/test edits followed the strict premise gate. Retained nonpassing. The delegated IGNIS touched-score helper resolved Studio Ops; its output is not website evidence. Recipient-owned scoreVerifiedProject was invoked explicitly for this project instead.

S405 release evidence refresh: the first full-source run stopped at167/547 passing because prior visual/mobile receipts bind earlier homepage bytes. No gate was weakened or stale receipt relabelled. Renew current actual browser captures and the complete mobile matrix before rerunning. Exact imported Ark cargo is preserved in ignored local storage; its tracked inbox was restored to the pre-session baseline before any commit or push.

### D-S405.2 — Isolate browser loading from receipt validation

S405 observed release prerequisite: receipt-only capture validation now loads Playwright only in actual capture mode. The deterministic CLI tripwire failed before repair and both focused cases passed afterward without changing timeout bounds. Actual normal capture produced28 reviewed source-bound views after repair; independent review PASS0. Two selected outcomes are locally accepted; production acceptance remains governed by docs/RELEASE_S405.json. SIL939/1000 unchanged, implementation velocity2; no field or conversion gain claimed.


<!-- S406-closeout-writeback -->
## D-S406.1 — 2026-10-28 — help before diagnostic effects

Reuse printHelpIfRequested from the existing local cli-contract library. Both aliases take precedence over other flags before health checks/self-tests, remediation, status writes or Git/worktree operations. Actual copied CLI processes use a throwing child-process boundary, filesystem snapshots and both operational/self-test controls;8/8pass. Existing normal behavior remains. Rollback is a bounded revert; no dependency or service is introduced.

CANON-045 STRONG gap remains separately justified: unchanged identity/auth/trust contracts, no provider acceptance claimed. Full release remains in docs/RELEASE_S406.json. Canon-sync transport timeouts were retained and subject-correct direct pending propagation/adoption suggestion subsequently completed. Context remains unmeasured, never inferred green. Strict premises and pending admission preceded behavior edits; planning/startup dirty paths stay in timing diagnostics.


<!-- S406-og-freshness -->
### S406 coverage freshness release prerequisite

S406 observed release prerequisite: both canonical full and refresh-live-data profiles now run the existing Open Graph (OG) inventory producer before public status and candidate sealing. Actual inventory337/337eligible public pages carded,18dark,0untriaged; age0.0days and unchanged2day limit. Existing build-order43/43, invocation-mode10/10 and generator6/6 checks passed; independent review PASS0. Complete source/staging/hosted/production acceptance remains pending in docs/RELEASE_S406.json.

Source attempt2 remains failed evidence:167passing of168executed/547planned. No timestamp-only repair, gate relaxation or skipped acceptance. Native OG recomputation and both profile entries fix the omitted producer. No UI, identity, pricing, lifecycle, trust-policy or dependency change. Rollback: bounded revert of the two profile entries. Local implementation velocity2; SIL939/1000unchanged, no product/conversion/field-performance or token-cost gain claimed.

### S406 verification batch scheduling prerequisite

The combined-source run passed all547commands but native closeout rejected its second pass: the first16-file unit batch consumed32.0% (309.2seconds), above the unchanged30% concentration limit. Split only build:check:steps into two consecutive8-file batches. All ordered unit membership, the test:unit script, subsequent546commands, deadlines and ratchet remain unchanged; the complete plan is now548commands. Native unit parity60=60=60 and runner self-tests pass; independent review PASS0. This is a release-verification prerequisite, not a third selected L2 product outcome or a performance/token gain. Actual complete548-command verification and native autopilot exit0 remain required; rejected evidence is docs/S406_source-attempt6.json.



<!-- S406-website-refresh-checkpoint -->
### S406 website refresh within the existing goal

The founder explicitly requested current, improved portals, website pages, changelogs and developer/feed/integration resources, then selected a private studio experience with decision-ready information first. Preserve existing auth, membership rules, prices, rights and historical publication dates. Use the existing published reader changelog as the member release source; actual content identity drives acknowledgements. Investor empty/error states remain distinct; inferred challenge history is removed rather than invented. Current factual editorial updates are authorized by the founder’s explicit website/changelog request and existing full-deployment authorization; the native editorial publisher and public-safe validator are retained. This does not authorize founder essays, financial projections, new subscription promises or outbound messages. Public dispatches use current public reader sources, not session bookkeeping; source-backed daily deduplication happens before advisory inference.


<!-- S406-cache-follow-through -->
The final delivery check found week-long caching on mutable portal assets. The existing shell builder now fingerprints five member/investor resources, resolves registered member assets relative to each page, preserves defer order and leaves unrelated/external URLs intact. Focused shell tests15/15, real persistent-browser warm-cache proof, current portal20/message46 interactions, native mobile215/215, and392 freshly captured/reviewed all-theme desktop/mobile views passed. Earlier full548 source acceptance at d161f7 is preserved as pre-cache-fix evidence; this source still requires fresh complete verification, staging, hosted checks and production/readback. No authentication, membership, pricing, financial document or outbound-message change was made. Release state remains docs/RELEASE_S406.json.


<!-- S406-final-release-acceptance -->
## S406 final evidence separation — 2026-10-29

Preserve implementation execution HEAD 542905dfea3ac7ce7a644429c161beabd0e18092/fingerprint 390c624684008bd329af693a separately from immutable production 94fe9ea36566d4ba63fb78fb9b61ae3dda5e6c74 and subsequent closing metadata. Publisher restoration and the passive factual studio briefing require actual successful receipts, not planned actions. Closing publication cannot borrow earlier source-run identity. Existing auth/tier/pricing/rights and independent provider/field limits remain unchanged.


<!-- S406-explicit-closeout-2026-10-29 -->
## S406 explicit closeout — 2026-10-29

The six selected S406 improvements are released: diagnostic help safety, canonical share-card coverage refresh, current member return information, a decision-ready investor workspace, purpose-led developer resources and factual studio updates. The prior arc is complete. The founder now explicitly requests a fresh closeout, all context/memory/CDR/task-board updates, normal main commit/push and a full deployment of the resulting candidate.

Prior accepted application baseline: 94fe9ea36566d4ba63fb78fb9b61ae3dda5e6c74; verified 25-file metadata overlay: b0e4d7f2082461a82a1d8638b455690e85f9c83b. Final prior publication: bc670dc2dbda915e74865168ee81b1f852367922. Prior complete served verification: 3,668 resources, zero differences or unread files. This invocation records new acceptance separately in `docs/CLOSEOUT_S406_2026-10-29.json`; earlier source and deployment proofs are historical evidence, never re-dated.

Status: records reconciled; fresh native closeout verification, current staging, exact required checks, full production and readback remain pending for this explicit request. Existing identity/provider and field-vitals limitations remain separate. No new product features, prices, entitlements, creative direction, financial figures or growth claims are introduced.



### S406 explicit closeout startup-context repair
The full native run failed at the unchanged42,000-token startup budget. Archive the complete task board before compacting only duplicate completed S406 header prose. Preserve both future SIL tasks and every earlier session section. No threshold increase, task deletion or historical acceptance rewrite.


<!-- S406-explicit-closeout-production-2026-10-29 -->
## S406 explicit closeout — verified full deployment

Explicit S406 closeout: fresh native source548/548, full staging plus exact generated-status reconciliations, canonical ceremony11/11 and exact required hosted workflows3/3 passed. The optional E2E diagnostic lane retains34 failures and60 skips (622 passed); identical failure names also occur on the prior accepted release, with causes not independently re-diagnosed. No all-E2E-success or positive authenticated acceptance is claimed. Normal full production candidate 0242fc75dd0034f1922c35a37ad18c1f5a24e74a, workflow40957103998, provider and three build stamps verified. Complete all-served readback3669/3669: 3659 byte-identical, 10 configured redirects, zero differences/unread. All five held publishers restored. Six prior improvements and SIL939/1000 retained; zero new product changes. Closing Git records are published separately from the pinned production candidate.

No new creative direction, pricing, entitlement, authentication, lifecycle or launch promise. Prior observations retain their timestamps and scope. Dated audit is the closeout checkpoint; the new ledger owns final release acceptance. Future SIL tasks remain unselected.


<!-- S406-explicit-final-publication-2026-10-29 -->
Full application 0242fc75dd0034f1922c35a37ad18c1f5a24e74a plus16 staged closing metadata paths at 994191d026ea28f11dc75f7a24fd29b63277d20e is verified across all3669 served resources, with zero differences/unread. Main publication 7532eba412722d672ab37743883873eda1347a59 was independently observed remotely at 2026-10-29T21:43:20.799Z. Both publisher windows are restored. Optional E2E34 failures/60 skips remain explicit; no all-E2E-green or positive authenticated acceptance claim. Final acceptance records close this publication transaction; moving observer commits are separate.


## S407 — preserve canonical routes and public measurement boundaries

Repair stale tests around /oracle/ consolidation into /ignis/#oracle rather than restoring duplicate navigation or the privacy-removed third mover. Remove the public page request for the unpublished pillar source and label unavailable metrics explicitly; do not expose private measurements or substitute invented scores. Existing CANON-045 STRONG gap remains unchanged and outside this content-only release scope; routine promotion follows RELEASE_PROMOTION_PROTOCOL. Existing founder authorization covers normal main push and full deployment; release proof remains pending in docs/RELEASE_S407.json.
