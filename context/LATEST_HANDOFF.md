# Latest Handoff — VaultSparkStudios.github.io

## Session Intent

**S320:** Run the complete `/arc`; audit and implement the strongest verified improvements, then push directly to `main` and fully deploy.

**Session 320 · 2026-08-18 · agent: claude-code (Opus 5, 1M) · full arc → content lane promoted → Worker deployed → both verified live**

---

## Read this first — S319's open item is CLOSED

**Production is serving current content again.** The static content lane had been unpromoted for 13.8 days: production markup sat at baseline `9527f227` from 2026-08-04 while 839 commits — including the homepage Desk module — were built, committed, pushed, and invisible to every reader.

The lane promoted **259 content-pure paths** (run `32192776059`, `contentLaneHead 60ed3748c`), withholding 733 repo-internal paths at baseline. Verified at the served surface, not merely in CI:

| surface | evidence |
|---|---|
| `api/build-sha.json` | `deployedBy: pages-deploy-content-lane` · `contentLaneHead 60ed3748c` · 259 paths · built 22:27:43Z |
| `/` | 200, homepage Desk module present |
| `/news/` | 200 |
| `deploy-currency` | FAIL (839 behind · 13.8d · past 48h ceiling) → **WARN `content-current`** |
| doctor | blocking failures **1 → 0** (13/16 → 14/16 passing) |

`baselineSha` deliberately still reads `9527f227`: the identity backlog genuinely is unpromoted, and the lane refuses to claim otherwise. `confirm_production` stayed `false` throughout — **the production hold was never waived**, only a narrower authority exercised.

**The Worker also deployed** (run `32193258963`): ceremony passed, post-deploy liveness green, no rollback.

---

## The circular dependency — read this before the next deploy

Resolution order was the reverse of the intuitive one. Worker deploy required a green doctor → doctor's only blocker was stale production content → the content lane clears that → **but the lane blocked on the S317 split-release guard**, because nine promoted callers reference `/v/rum`, `/v/desk-reaction` and `/v/desk-presence` while `api/worker-route-provenance.json` held no live evidence for them.

The routes were live the whole time. Only the evidence was missing — exactly the case that guard exists to separate from a real caller/callee split, and it was right to refuse. A probe from an unchallenged vantage returned **7/7 matched** and the lane opened.

**So: content lane first, Worker second.** And note the residual below — this is not yet self-sufficient.

---

## What else shipped

**Three observability gates that were reading green on nothing** — repaired *before* the deploy, deliberately, so the deploy was watched by instruments that could see it fail.

- **`/v/rum` was probed with `OPTIONS` only.** That preflight is answered `204` unconditionally by `corsRumResponse`, so it stayed green throughout an outage in which `POST` returned 500 — long enough that `data/news-desk-engagement-history.ndjson` never came into existence at all. Now probed on the real method against an expected status.
- **`/login` was not probed at all**, which is why production sign-in returning 500 was found by accident while deploying. Now probed, and a named `503 auth_store_unavailable` is classified as honest self-restoring degradation while a 500/1101 is judged `down`.
- **`check-writeback-currency` — the arc's own cut-off detector — returned an unmeasurable window as a pass.** Fixed 60-commit scan; once ~60 `[skip ci]` beacon commits accumulate the SIL anchor falls out of view and it goes permanently, silently green. Reproduced live in both directions inside one session. Window is now anchor-derived, `unmeasured` exits `3` (distinct from `0` and `1`), and churn is classified structurally rather than by a subject enumeration that never matched this repo's real crons. **68 false positives → 6.**

The `/v/rum` probe sends `synthetic: true`; the Worker validates fully, answers 202, and **skips the store write**, so the probe cannot pollute the dataset it protects. Verified live: `{"ok":true,"synthetic":true}`.

`deploy-currency` is now observed at the *top* of the uptime step rather than below its low-churn short-circuit — "nothing else changed this hour" is precisely when a staleness clock needs reading.

---

## Verification

- `npm run build:check` **319/319 passing**, exit code read directly, never through a pipe.
- `probe-uptime --self-test` 40/40 (was 33), **mutation-tested** — neutering the login-crash branch correctly dropped it to 39/40.
- `check-writeback-currency --self-test` 11/11 (new). One case originally passed for the wrong reason (in-flight grace rather than churn classification) and was rewritten to actually exercise the classifier.
- Live production probe: content routes 200 served · `/v/rum (POST) 202` · `/login (GET) 503` classified as honest degradation · overall `up`.

---

## Open — pick up here

1. **Content promotion is not self-sufficient.** CI is bot-challenged at the production origin and cannot produce the live route evidence the split-release guard requires, so the lane opens only after a probe run from an unchallenged vantage. Committed to the board: probe the unchallenged `pages.dev` origin as a corroborating second vantage. Until then a human-timed step is load-bearing on the path that most needs to be routine.
2. **Tighten the ingest probe.** `contractLive` was left informational so the probe would not page during the Worker's rollout window. The contract is now deployed and verified, so it can be promoted to a hard assertion.
3. **Sign-in returns 503 until the 00:00 UTC KV reset.** The crash is fixed and the beacon samples its counter; confirm recovery at the reset.
4. **Watch the first engagement rows accrue.** Telemetry ingest is verified working for the first time — `data/news-desk-engagement-history.ndjson` should finally gain rows. Do not lower a Desk floor to make a page look alive.
5. **Production promotion stays held** on `real-provider-e2e-pending` (Obelisk discovery serves HTML, sibling-owned — Ark cargo already filed).

---

## Traps this session paid for

- **`git push origin main` from a detached HEAD pushes the stale local `main`.** An unfinished rebase left HEAD detached; `git rev-list --left-right` reported `0 behind` while the server rejected as non-fast-forward. Check `git rev-parse --abbrev-ref HEAD` before diagnosing a push rejection as a race.
- **During a rebase, `--ours` is the *upstream* side.** Resolving generated conflicts that way discarded a freshly probed provenance receipt in favour of CI's bot-challenged version. For evidence artifacts, regenerate after the rebase rather than picking a side.
- **Git Bash was unresponsive all session** (even `echo` timed out). PowerShell worked throughout.
