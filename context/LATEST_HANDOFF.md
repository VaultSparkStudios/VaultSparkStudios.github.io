# Latest Handoff — Session 285

Last updated: 2026-07-17

## Where We Left Off (Session 285)
- Shipped: **3 observability-resilience improvements** across 2 groups — CI-resilience (beacon-503 root-fix, RUM-R2-5xx root-fix), prevention (structural publisher-resilience gate + smoke wiring).
- Tests: `build:check` **215/215 EXIT 0** · doctor 15/15 blockingFailing 0 · unit green · scan-secrets 0 findings · smoke-startup 51/51.
- Deploy: committed direct-to-main; the beacon/RUM fixes take effect on their next scheduled/`workflow_run` firing.

## The one-paragraph version (Session 285)
The `/arc` started against a board S284 had largely cleared, so the honest move was not to manufacture features but to **verify the thin carry list against live code and follow the one real signal**. The carries checked out real (the Franchise Architect 301 is live; the S282 verify is a pruned-run stale) — but CI history showed the `CI Status Beacon` had gone **red twice on `gh: HTTP 503`**. A health beacon that reports the repo unhealthy on GitHub's own transient outage is the CANON-031 lie pointed at CI itself. The root-fix (D-S285.1) teaches `build-ci-status-beacon.mjs` to tell transient from real (`isTransientGhError`), retry the transient with backoff, and **degrade honest-dark** — preserve the last-known-good beacon (timestamp reveals staleness, the 96h gate is the backstop) and exit 0, while real auth/config errors still surface. The "check every failure mode" rule then found the identical class in `fetch-rum-from-r2.mjs` (exit 1 on a transient R2 5xx) and fixed it the same way — crucially keeping `AccessDenied` a hard-fail so the standing token-scope blocker stays visible. Prevention over patch: `check-ci-publisher-resilience.mjs` makes "unattended publishers degrade on transient upstream" a standing contract (clean 0/27, self-test with teeth), sibling to the existing `check-build-step-resilience` gate.

## Start here next session
- The board is again thin — this was a cleanup/resilience session on a mature codebase. Expect `/audit` to lean toward **subtractive** or **founder-gated** items. The two standing agent-blocked levers persist: **Worker RUM token re-scope** (CF dashboard, founder-gated — verified via `/user` 403) and the **homepage inline-CSS split** (FOUC-risky, founder-device gated). The **Franchise Architect multi-sport runway** (`playfranchisearchitect.com` + per-sport leaderboards, CDR #24) is the open product expansion, founder-gated on domain + scope.
- If a fresh signal is needed, `node scripts/generate-genius-list.mjs --brief` regenerates the hit list from the board.

---

# Latest Handoff — Session 284

Last updated: 2026-07-16

## Where We Left Off (Session 284)
- **A founder-directed feature session** that began by recovering the cut-off S283, then delivered four visitor-facing wins: a reworked **changelog**, a de-leaked **homepage banner**, a full **Franchise Architect rebrand**, and a **changelog freshness flow** so the feed stays current.
- Everything is committed direct-to-main and pushed (~9 commits). `build:check` **213/213 EXIT 0** at every step; doctor blockingFailing 0; SIL 999/1000. Every surface was browser-smoked, not just gate-checked.

## The one-paragraph version
The through-line is *a public "what shipped" story that had been fed by raw git and stale curation*. The homepage hero ticker was wrapping raw commit subjects onto the brand's front door; the changelog had a single confusing "Time Machine" scrubber (with inverted Older/Newer buttons), no search, and no new entries since May 14; and clicking the banner dropped you at the top of the changelog with nothing highlighted. S284 fixed all of it at the root: the ticker and the changelog now pass any commit-derived text through the same public-safe reject guard; the changelog gained real search + year filters + per-entry permalinks + URL-synced shareable state + a corrected scrubber + deep-links; and a data-driven, founder-approved draft→publish flow (`data/consumer-changelog.json` + `publish-changelog-draft.mjs`) keeps it current without ever admitting dev voice. Layered on top, the founder's **Franchise Architect** rebrand shipped end-to-end *without breaking a single URL* — by decoupling the name change (risk-free) from the slug change (routed through a Cloudflare Pages `_redirects` file, which deploys the 301s without the founder-gated Worker).

## Start here next session
1. **✅ DONE — nothing to re-verify from S284 locally.** All work is pushed and build:check-green. The one thing that needs a *live* check (CF Pages behavior can't be tested from local preview): `curl -sI https://vaultsparkstudios.com/games/vaultspark-football-gm/` should return **301** → `/games/franchise-architect/`. If it 404s, the Pages `_redirects` didn't apply and the Worker's Layer-0c 301s (already in the repo) need the Worker to deploy — which is the standing founder-gated token blocker.
2. **Keep the changelog current** — the flow exists and is founder-gated. Per meaningful ship: `node scripts/draft-changelog-entry.mjs` (auto-drafts a dev-voice starting point) → edit to audience voice + set `approved: true` → `node scripts/publish-changelog-draft.mjs` → `npm run build`. The public-safe validator rejects dev voice, so it's safe.
3. **Franchise Architect multi-sport runway** (CDR #24, founder-gated) — `playfranchisearchitect.com` + per-sport `/leaderboards/<sport>/`. The rebrand deliberately established the umbrella; the leaderboard slug stayed sport-scoped to leave room for it.

## Open founder actions (unchanged, genuinely gated)
- **Worker RUM token** — `CF_WORKER_API_TOKEN` lacks `Workers R2 Storage:Edit` + `User Details:Read`; RUM/TT/CSP ingest runs on a stale build until re-scoped. (The rebrand redirects route *around* the Worker via CF Pages, so they don't depend on this — but the Worker's canonical Layer-0c 301s and RUM ingest do.)
- **Homepage 47KB inline-CSS split** — the one confirmed perf lever, FOUC-risky on the brand anchor, founder-device gated.
- **TT enforce flip** — AMBER soak.
- **Wishlist "N waiting"** — public-optics call.

## Trust notes for the next agent
- **The rebrand is complete on every live surface.** Only intentional residue remains: the tombstone card (records "VaultSpark Football GM" as the retired name — correct) and the Worker's legacy redirect *source* keys (`/vaultspark-football-gm` → new — correct).
- **Name vs slug are decoupled on purpose.** The display name is "Franchise Architect" everywhere; the leaderboard slug stays `/leaderboards/football-gm/` by design (sport facet of the umbrella brand, not an oversight).
- **The changelog is now data-driven.** Edit `data/consumer-changelog.json` only via `publish-changelog-draft.mjs` (it validates public-safe + dedupes + sorts). The hardcoded array in `generate-public-intelligence.mjs` is now just the historical seed.
- **Three new self-tests guard this work** in build:check: `build-ignis-conduit --self-test` (banner narration), `publish-changelog-draft --self-test` (changelog publish validation), and the standing `verify-changelog-time-machine` gate.
