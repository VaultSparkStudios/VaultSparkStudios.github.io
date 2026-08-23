# Latest Handoff — VaultSparkStudios.github.io

## Session Intent

**S327 intent:** Run the complete project-aware /arc: audit the live website, implement every verified in-scope item and second-order innovation at the selected depth, pass Hetzner staging and all public-release gates, then commit and push directly to main, deploy production, verify the live result, and complete canonical closeout. Preserve the five-pageload Desk privacy floor; founder-passkey enrollment and the immutable warm-origin architecture decision remain separate CANON-gated work unless independently required by a verified release gate.

## Where We Left Off — S327 · 2026-08-23

- **Shipped:** five improvements across editorial presentation, publication safety, release evidence, observability, and delivery. The Desk meme compositor owns all visible typography through opaque masthead/caption safe zones; generated source art is text-free; duplicate page-level punchlines and meta-description copy are suppressed; ordinary newsroom rebuilds preserve complete reviewed art families and fail on partial families; exact News checks now retry only within a bounded Pages propagation window.
- **Tests:** canonical build/check 368/368; News rebuild self-test 139/139; CI publisher resilience 18/18 and 29 workflows; live release contract self-test 7/7; exact E2E, compliance, accessibility, mobile runtime, local Lighthouse, and staging Lighthouse green. CANON-053 receipt: 28/28 manually reviewed captures across the News index/newest article, seven themes, desktop/mobile, zero defects.
- **Deploy:** deployed to Hetzner staging and the Cloudflare Pages production content lane. Production run `32662840244` promoted only the authorized News partition and completed every gate, including exact live art bytes and the durable release receipt. The canonical domain serves 12 pages, 36 exact assets, newest edition `2026-08-23`, and five claim rows. Final production desktop/mobile captures show one readable masthead, one punchline, and no overlap/conflicting text.
- **Scope held:** full-site/identity promotion remains held on `real-provider-e2e-pending`; `confirm_production` stayed false. The founder passkey ceremony and immutable warm-origin decision are unchanged and outside this content GO.
- **Next:** keep the five-pageload privacy floor intact; bind a deterministic visual receipt to each future edition; add a recent-edition visual-diversity memory; verify the first real article to qualify for public Reader views.

## Human Action Required

- [ ] Complete the real-provider passkey ceremony with `node scripts/verify-provider-journey.mjs --live`; hardware-key enrollment is founder-reserved and remains the only identity leg holding full-site production promotion.
- [ ] Authorize or decline the D-S303 immutable GitHub Pages warm-origin migration.
- [ ] Click The Dispatch double-opt-in confirmation in the founder mailbox if the first subscriber should become confirmed.

## Where We Left Off — S326 · 2026-08-22

The founder's Desk complaint is fully resolved in production. The site now carries three editions newer than August 11: two dated August 21 and one dated August 22. Every live article renders estimated read time and privacy-thresholded Reader views; the current honest state is `Collecting` until five real browser pageloads qualify. Production `/v/desk-presence` answers 204.

The scheduled publisher was repaired end to end in S325. S326 completed the authorized push/staging/production release and then found one secondary release-partition defect through independent live verification: `api/news-desk-claims.ndjson` had the August 21/22 rows in Git but production still served its August 11 copy because the content lane accepted `api/*.json` and withheld `.ndjson`. `check-content-hotfix-gate.mjs` now allowlists only the canonical Desk claim ledger by exact path; every other NDJSON path remains blocked. Self-tests are 43/43 and 63/63.

Verification is complete: canonical build/check 368/368; exact commit `0b5e2bd88` passed E2E, compliance, 235/235 mobile runtime, accessibility, local Lighthouse, and staging Lighthouse; Hetzner staging served five August 22 claim rows at content head `0b5e2bd88`; production deployment run 32605433768 promoted 137 content-pure paths. Independent live checks returned 200 for `/news/` and all three new article routes, daily freshness through August 22, feed order through August 22, five August 22 claim rows, visible `~1 min` / `Reader views` / `Collecting`, and production content receipt head `ef703658c814d913c5ed4b553fcd787c64ee3777`.

Open work is evidence-driven, not a release blocker: wait for real traffic to cross the reader privacy floor; add the claims ledger to the workflow's exact live verifier; make staging probes derive the newest edition instead of pinning August 7 fixtures; and add the bounded newsroom-run receipt already carried from S325.

---

**Session 324 · 2026-08-20 · agent: claude-code (Opus 5, 1M) · not cut off (routine sync, F7 clean) → build-gate reachability sweep → push + deploy**

---

## Read this first — the suite said 319/319 and three public feeds were stale anyway

S323 swept the 173 `check-*.mjs` gates for the name-vs-body defect and left one standing item: the `build-*.mjs --check` gates had never been swept as a class. It predicted the defect would be *volatile-input drift* or *absent-input-defaults-green*.

That prediction was wrong, and following the evidence instead of the prediction is what mattered.

Those shapes were rare. What was actually there was **twelve `--check` gates that no runner in this repo ever invoked**. A gate nothing asks is indistinguishable, from the outside, from a gate that passed — so three of them had been failing for an unknown number of sessions, and the three public artifacts they guard were stale on the live site the whole time, while the headline verification number read 319/319 green every session.

| Population | Count |
|---|---|
| git-tracked `scripts/build-*.mjs` | 88 |
| ...implementing a `--check` mode | 82 |
| ...wired into `build:check:steps` | 54 |
| ...reached one hop in (`check-proof-surface` `STEPS`/`ADVISORY_STEPS`, `check-generated-drift-preflight`) | 16 |
| **...reachable by no runner at all** | **12** |

The 16 indirect ones are why this had to be a graph resolution and not a substring scan: a naive "is it named in `build:check:steps`?" test calls all 28 non-wired gates broken and is wrong about 16 of them.

---

## Shipped

### 1. Three stale public feeds, repaired at the source

- `api/changelog-narrative.json` — the plain-English public changelog was missing the newest shipped work (22 committed entries vs 23 derivable).
- `api/intent-map.json` — the **CANON-048** machine-readable outcome-to-route-to-evidence map that agents read had drifted.
- `data/stats-surface.json` + `stats.json` — the **CANON-054** public stats surface had drifted.

Root cause, found by chasing the first one: the 4-hourly `refresh-live-data` cron regenerates `api/commit-map.json` and never regenerated its consumer. **Seven publisher crons** turned out to be in that state once the generators were modeled in the evidence graph. All 29 workflows now report closed cascades.

### 2. Two gate bodies that did not measure what they name

- **`build-release-dependencies --check`** printed `state: rejected` and exited **0** — a well-formed rejection was a pass, so the cross-repo release handshake could not hold a release. It now exits 1 on `rejected`; `pending` stays non-blocking (an unanswered but in-flight cargo is an honest state). Placed in the **advisory** lane deliberately — see D-S324.2.
- **`build-tt-summary --check`** derived the fresh payload and then compared nothing, asserting only that the committed file parsed as JSON. It now compares the control structure minus the wall-clock timestamp, the same pattern `build-security-posture` already uses.

### 3. The structural replacement for the list

`scripts/check-build-gate-reachability.mjs` resolves the runner graph out of `npm run build:check` to a fixpoint — direct wiring, one-hop `STEPS`/`ADVISORY_STEPS` tables, and argv-inheriting ESM imports — and fails on any `build-*.mjs --check` with no path to it. A genuine report-only dry-run is exempt by declaring `@check-mode dry-run` **in its own source**, so the exemption travels with the script instead of rotting in an allowlist. **79/79 reachable · 3 declared dry-runs · self-test 7/7.**

### 4. The evidence graph learned that a surface can have two writers

`index.html` carries SSR fragments from both `build-home-desk-module` and `build-launch-age`. The graph could represent only one, and its topological ordering silently dropped the other — modeling the second made the whole projection refuse to build. Shared outputs are now declared (`sharedOutput: true`, required of every writer), edges resolve through a multimap, and a consumer waits for the **last** writer, not the first.

---

## Verification

`npm run build:check` **327/327 · exit 0**, captured directly from the command — never read through a pipe.

Self-tests added or extended: reachability 7/7 · release-dependencies 11/11 · evidence-graph 9/9 · evidence-projection 25/25 · publish-cascade 19/19.

---

## Honest gaps — recorded, not papered over

- **`api/ecosystem-velocity.json` has no drift gate.** `build-oracle-velocity-public --check` is declared `@check-mode dry-run` and prints its summary without comparing anything — and it cannot compare, because its source is a moving 60-day `git log` window that would make any byte or count gate go red on every new commit. A gate that cries wolf daily is worse than a declared gap, because the next session mutes it. The real fix is a window-anchored fingerprint over days already closed; it is on TASK_BOARD as a design task, not half-shipped here.
- **The same reachability question is unasked of `check-*.mjs`, `generate-*.mjs`, `derive-*.mjs`, `enrich-*.mjs`.** `check-orphan-scripts` proves a script has *a consumer somewhere*, which is strictly weaker than *this gate runs in the verification suite*. On TASK_BOARD.
- **`obelisk-staging-registration` is still `missing`** — an Ark cargo a sibling repo has not answered. Now surfaced by name on every build instead of printed as a pass. Resolve upstream (CANON-018), never from here.

## Unchanged, still correctly held

- **Real-provider sign-in ceremony** — founder passkey, CANON-019 reserved. The only thing holding production promotion; the external chain has been verified live since S321.
- **GitHub Pages warm-origin rollback migration** — founder decision, D-S303.
- **IGNIS freshness** — studio-ops owned (CANON-018). Resolve upstream; never backdate a timestamp.
- **The Dispatch has zero confirmed subscribers** until the founder clicks the double-opt-in confirmation.
