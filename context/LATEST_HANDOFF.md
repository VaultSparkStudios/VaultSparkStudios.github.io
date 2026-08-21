# Latest Handoff — VaultSparkStudios.github.io

## Session Intent

**S326 next:** Verify the first real Desk article to cross the five-pageload privacy floor, then add a bounded newsroom-run receipt to `/status/` so a failed scan/author/art/promote stage is visible before readers notice a publishing gap. Do not lower any reader floor. The founder passkey ceremony and immutable warm-origin decision remain separate founder-gated work.

## Where We Left Off — S325 · 2026-08-21

The founder reported that The Desk had published nothing since August 11 and that the planned reader views/read-time statistics were not visible. Both symptoms are fixed in source and verified locally. The August 21 edition **“Memory Configs: The +9.5% Lift That Actually Works”** is in the canonical corpus at `/news/2026-08-21/how-much-memory-does-your-agent-actually-need/`, with bespoke ImageGen art and full authored body copy.

The scheduler now invokes the actual trend scan, installs dependencies, preserves body/visual metadata, generates and validates art before promotion, rebuilds reader/reaction feeds before pages, and enforces a real daily freshness postcondition. All article pages show `~N min` estimated read time and `Reader views` above the fold; observed views and engaged time publish only after five real pageloads, otherwise the surface says `Collecting` and retains the estimate.

Broader arc work shipped too: the reachability ratchet covers 233/233 declared build-scope gates, the Oracle velocity feed carries a closed-day SHA-256 proof, and `/status/` explains the cost-neutral four-hour coalesced production-promotion lag. Final local evidence is canonical `build:check` 368/368, visual review 28/28 across seven themes × desktop/mobile, mobile runtime 235/235, News engagement coherence 12/12 with all eight article panels exact, and Linux visual baselines refreshed from successful run 32446357122.

Release continuation: commit/push, staging overlay, release gate, production content promotion, and live verification are authorized and are being completed in this same goal. If this handoff is read after interruption, inspect the latest GitHub Actions runs and the served August 21 article before declaring completion.

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
