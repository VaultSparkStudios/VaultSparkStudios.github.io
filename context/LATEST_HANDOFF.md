# Latest Handoff — VaultSparkStudios.github.io

## Session Intent

**S321:** Run the complete `/arc`; audit and implement the strongest verified improvements, then push directly to `main` and fully deploy.

**Session 321 · 2026-08-19 · agent: claude-code (Opus 5, 1M) · full arc → three inherited blockers disproven → auth crash class closed → Worker deployed to production**

---

## Read this first — the blockers you are about to inherit were re-probed, and three of them were false

Do not inherit the identity blockers from the S320 handoff. Every one was measured live at the top of S321:

| Claim carried into this session | Live probe (2026-08-19) | Verdict |
|---|---|---|
| sign-in returns `503 auth_store_unavailable` until the KV quota resets | `GET /login` → **302** → `obeliskgate.com/auth/authorize`, full S256 PKCE | **recovered** |
| `obeliskgate.com/.well-known/openid-configuration` serves HTML, so the journey cannot start | **200 `application/json`**, complete OIDC document | **false** |
| `/auth/revoke` unshipped by the provider (D-S302.5) | `POST` → **401 `invalid_client`** — implemented, correctly rejecting an unauthenticated client | **false** |
| — | `jwks.json` → **200 `application/json`**, 1 key | live |

**The external identity chain is live.** `real-provider-e2e-pending` no longer waits on another team.

### What that means for the hold

The hold is **not cleared** — and must not be hand-cleared. Its five `providerJourney` legs still read `unverified`, and their only supported writer is `scripts/verify-provider-journey.mjs`, which observes each leg over the network during a real ceremony. That exclusivity is why the receipt is trustworthy; do not add a flag that asserts success without observing it.

What changed is the **classification**. This is no longer "blocked on a sibling repo, unsatisfiable here." It is:

```bash
node scripts/verify-provider-journey.mjs --live
```

A headed Chromium opens `/login`; the **founder** completes the passkey ceremony (the script never sees the credential); the script then observes all five legs itself. Roughly two minutes. Hardware-key enrollment is one of the few categories CANON-019 genuinely reserves for a human — do not try to automate it, and do not schedule it into an unattended run, because it will sit for ten minutes and time out.

Evidence that the rest is ready: `api/provider-chain-readiness.json` (`chainReady: true`), machine-produced by `scripts/verify-provider-chain.mjs --live --write` (20/20 self-test). It deliberately writes no journey leg — a reachable chain is necessary for the journey, not evidence that it passed.

---

## Shipped

**1. The S319 auth crash class was closed on one leg of three — now all three.**
`.delete()` is a KV *write*, so the free-tier quota exhaustion behind the S319 outage rejected in two more places that had no guard:

| Leg | Was | Now |
|---|---|---|
| `/auth/callback` (`obelisk-auth.js:662-663`) | `get()`/`delete()` before the `try` → escaped → CF 1101 / HTTP 500 | fails **closed** as a named `503 auth_store_unavailable` |
| `/api/auth/logout` (`:1001`) | unguarded `delete()` in a handler with no catch | **degrades**, returns `storeCleared: false` |
| Worker `fetch` (`security-headers-worker.js`) | **no top-level catch across 1,345 lines** | last-resort boundary → honest `edge_handler_unavailable` 503 |

The asymmetry is deliberate. The callback fails closed because without the flow record there is no nonce or PKCE verifier to check. Logout must **not** 503: clearing the signed cookie is what actually ends the member's session and succeeds regardless of KV, so failing the request would leave the credential in the browser — strictly worse. The callback leg is the costlier one to crash: the member has already completed the passkey ceremony by the time they reach it.

The boundary logs the route before answering and is mutation-tested to confirm it does **not** intercept a healthy response. It is not a substitute for fixing roots at source.

**2. `check-public-note-freshness` now checks freshness.** For fifteen sessions the file carried "freshness" in its name and asserted only three regexes over voice. It exited 0 the whole time the public status surface told visitors sign-in was unavailable while sign-in worked — the false claim is plain English and jargon-free, so it passed every assertion the gate actually owned. Degradation claims now require corroboration from a live receipt that is present, recent (24h ceiling), and actually degraded. Self-tested **both** directions (8/8): a *true* outage admission must still pass, or the gate would punish the honesty CANON-031 requires.

**3. Public copy corrected.** `publicNote`, `currentFocus`, `blockers` rewritten from live probes; `api/public-intelligence.json` + contract feeds cascade-resynced.

**4. `contractLive` is a hard assertion** in the `/v/rum` probe. D-S320.4 left it informational only for the Worker rollout window and said so ("Tighten once contractLive holds"); it holds — verified live `202 {"ok":true,"synthetic":true}`. Losing it silently resumes a KV write per probe run, which is the pattern that exhausted the quota. probe-uptime 40/40.

**5. Deployed.** Staging Worker (verified on the zone **and** `workers.dev` vantages) → production with `--confirm-production`, release ceremony **8/8**. Production verified live: `/_health` 200, `/login` 302 + PKCE, `POST /v/rum` 202 synthetic, `/api/auth/me` 200, homepage 200 with CSP. Route provenance re-probed **after** the deploy so the receipt binds new source to new deployment: **7/7 matched**.

**6. Ark cargo** → studio-ops: `scripts/start-canon-sync.mjs` is not propagated here, so the `/start` canon gate ran from the sibling copy. Verified safe this time (it honored `--project .` and reported this repo's root), but the arc documents that invocation as a hazard.

---

## Disproven, not built — read before you re-open it

S320's committed brainstorm item was: *"probe the unchallenged `pages.dev` origin as a corroborating second vantage"* for route provenance. **It is unimplementable as written.**

```
https://vaultsparkstudios-website.pages.dev/_health      → 404 text/html
https://vaultsparkstudios-website.pages.dev/api/auth/me  → 404 text/html
OPTIONS .../v/rum                                        → 405
```

`pages.dev` is the Pages origin *behind* the Worker; the Worker owns the `vaultsparkstudios.com/*` route and is not on the pages.dev route. It can never observe Worker route provenance. Worse, `isMissingRoute` treats a 404 beside a clear control as a fact about the **deployment**, so this vantage could have produced a false `routes-absent-from-deployed-worker` verdict — actively worse than leaving the gap open.

**Re-scoped:** the only vantage that can corroborate is one that *is* the Worker. `https://vaultspark-security-headers-staging.founder-d73.workers.dev` was measured this session serving the full contract (`/_health` 200 JSON, `/login` 302 + PKCE, `POST /v/rum` 202, `/api/auth/me` 200) and is not behind the zone's bot management. It attests the **build**, not the production route binding — label the two distinctly. **Do not weaken the split-release guard; it was right to refuse.**

---

## A false red was blocking every production deploy

The release ceremony's `staging-browser-receipt` step failed on chromium, firefox **and** webkit with `Test timeout of 30000ms exceeded` — while staging served the homepage in **425 ms** and every Worker route answered correctly. Run directly, the test **passes in 35.7 s**: it sweeps seven themes and runs a full axe WCAG analysis on each, and axe dominates the runtime.

The budget was scoped to that one test (`test.setTimeout(120_000)` in `tests/staging-release.spec.js`); the global 30s default is untouched and **no assertion was relaxed**. A timeout is not a readability measurement, and a gate that goes red on a healthy site is how gates earn a reputation for lying and get bypassed.

**If a browser gate fails, check duration before assuming breakage.**

---

## Still open

- **`real-provider-e2e-pending`** — one founder passkey ceremony (above). Everything around it is verified and receipted.
- **Route provenance vantage** — re-scoped to `workers.dev` (above); still needs wiring, so content promotion currently depends on a probe from an unchallenged vantage.
- **`data/news-desk-engagement-history.ndjson` still does not exist**, so the Desk engagement floors correctly read `unavailable`. This is a scheduled `rum-pull` outcome, not a code item. **Do not lower a floor to make the page look alive.**
- **IGNIS freshness (16d)** — portfolio-owned artifact in studio-ops, unwritable from here (CANON-018). Doctor's ⛔ is sibling drift, not self-debt.
- **Rollback architecture** — the Pages warm origin still follows mutable `main`; D-S303 requires explicit founder authorization.
- **The Dispatch** has zero confirmed subscribers until the founder clicks the double-opt-in email.

## Verification receipts

| Check | Result |
|---|---|
| `npm run build:check` | green (see final run in `.cache/`) |
| `tests/obelisk-auth.unit.spec.js` | 41/41 |
| `tests/worker.unit.spec.js` | 50/50 |
| `verify-provider-chain --self-test` | 20/20 |
| `check-public-note-freshness --self-test` | 8/8 |
| `probe-uptime --self-test` | 40/40 |
| release ceremony | 8/8 |
| `worker-route-provenance --check` | matched 7/7 |
| doctor | blockingFailing 0 |
