# Latest Handoff — VaultSparkStudios.github.io

**Session 316 · 2026-08-14 · agent: claude-code (Opus 5, 1M) · arc (start → audit → implement → closeout)**

---

## What this session was

A full arc that found one genuinely coupled defect chain on the public `/status/` trust surface, plus a second, unrelated regression class delivered by inbound studio-ops propagation. Nothing here was speculative: every audit item was verified against live code, live feeds, or live CI before it was written down, and two candidate items were rejected as false premises and recorded as skipped.

## The headline — three defects were masking each other

Read in this order, because each one hid the next:

1. **`check-workflow-git-depth` was green while the corruption it exists to prevent was live.** Its detector matched only a direct `execFileSync('git', ['log', …])` call shape. `build-deploy-currency.mjs` routes every git call through a local helper (`const git = (args) => execFileSync('git', args, …)`), so `git(['cat-file', '-e', sha])` matched neither alternative — no whitespace after `git`, no quoted `'git',` literal. `cat-file`, `merge-base` and `describe` were also absent from the subcommand list entirely.
2. **So both producing workflows kept running a depth-1 checkout.** In a shallow clone `git cat-file -e <deployedSha>` fails for every commit that is not the tip. The producer read that failure as "this sha is not in our history" and emitted `state: "diverged"` with null commit distance — against `9527f22714e7`, which `git merge-base --is-ancestor` confirms is an ordinary ancestor of `main`.
3. **And nobody ever saw the false alarm, because the reader was looking at a field that does not exist.** `status/index.html` read `d.status`; the producer emits `d.state`. Every comparison was permanently false, so the tile rendered a neutral "Unverified" for all six real states.

**Re-probed from a full clone, production is `content-current` — 515 commits behind, shell fingerprints matched.** Not diverged. That is the number the public surface should have been showing all along.

All three are fixed at the root rather than papered over: the gate sees through helper indirection, both workflows set `fetch-depth: 0`, the producer refuses to infer divergence from an incomplete clone (and publishes `honesty.historyComplete` so the claim is auditable), and the tile reads the real state with matching severity.

## The fourth defect — a gate that punished good health

`tests/compliance-pages.spec.js` asserted `/shell fingerprint (drift|matched)/`, but the page renders the **plural** "shell fingerprints matched" for the healthy state. The regex therefore matched only the two degraded strings: **the E2E Test Suite went red exactly when shell parity was healthy, and green when it was broken.** That was the live CI red at session start.

## Propagation regressed three local-ahead surfaces

An inbound studio-ops delivery (applied at the start of this session) overwrote local work in three places. All three were restored locally and reported upstream as **Ark cargo** — no sibling tree was edited (CANON-018):

- **`resolveCapability` reverted to its pre-CANON-019 shape** and `suggestCapabilities` was deleted. This was a hard break — `build:check` died at step 21/295 on a missing export — *and* a silent correctness regression: an UNKNOWN capability name became indistinguishable from a genuinely missing credential, which is precisely the phantom blocker CANON-019 forbids.
- **The secrets gateway's sibling capability-map fallback** was reduced to a local-only path, while secret *values* still resolve from the sibling. Latent, not live-breaking here (this repo has its own map), but it degrades any consumer repo without one to empty capability resolution, silently.
- **The startup-brief renderer** lost both `lib/startup-evidence.mjs` and the shared revenue-freshness resolver. This repo's version is strictly ahead of upstream's.

Two Ark cargos shipped: `01JVVLUPSJ6A620694A3A4DE60` and `01JVVM6OMUB52830298E40F99E`.

## Verification (exit codes read directly, never through a pipe)

| Gate | Result |
|---|---|
| Canonical `build:check` | **295/295 from step one**, exit 0 |
| Playwright compliance (chromium) | **18/18**, including the previously red release-truth test |
| `build-deploy-currency --self-test` | 59/59 |
| `check-workflow-git-depth --self-test` | 22/22, plus a live mutation test |
| `check-capability-discovery-contract` | 8/8 |
| `node scripts/ops.mjs doctor` | **blockingFailing: 0** |

## State of the tree

Pushed directly to `main` per this project's workflow. The three non-green doctor probes (revenue-signal freshness, sibling session locks, IGNIS freshness) are the same **sibling-owned / derived** probes that were amber at session start — not self-debt, and unchanged by this session.

## Honest gaps

- **The light-theme capture did not apply the theme swap.** The tile is verified in dark theme at 1280px and the change reuses severity tokens already proven across themes, but a fresh light-theme pixel proof of this specific tile was not obtained. Not claimed as verified.
- **`api/deploy-currency.json` was re-probed from this workstation, not from CI.** The next scheduled `uptime-probe` run is the first CI-side proof that `fetch-depth: 0` produces the corrected state in the environment that actually publishes it. Worth confirming.
- **`ignis/output/ecosystem-state.json` is regenerated by an external process mid-run** and is gitignored, so `sanitize-public-oracle-feed --check` can drift during a long `build:check`. It was sanitized before the passing run; the ordering fragility is real but was not fixed this session.

## Suggested next

1. Confirm the next `uptime-probe` CI run publishes `content-current` with `historyComplete: true` — that closes the loop this session opened.
2. The startup-brief renderer now diverges from upstream in both directions (this repo has evidence + revenue integrations; upstream has brief-preflight + semantic-fingerprint). A real merge, driven from studio-ops, would end the clobber cycle rather than replaying it each propagation.
3. `Reader-signal → Director's Report closure` and `Claim-evidence relationship map` remain the top open product items and are unblocked.
