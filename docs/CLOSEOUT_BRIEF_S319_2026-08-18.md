```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S319 · 2026-08-18 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    The 12-day production dark period had a second, unfiled cause — an hourly cron             ║
║    invalidating the release candidate and re-judging it in the same commit — and deploying    ║
║    revealed that production sign-in has been returning HTTP 500.                              ║
║                                                                                               ║
║  PROJECT IMPACT     █████████░   90/100                                                       ║
║  ECOSYSTEM IMPACT   ███████▌░░   76/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#2]  login-500-outage-diagnosed                                PROJ 10  ·  ECOS 9
         ── security ────────────────────────────────────────────────────────────────────────
         vaultsparkstudios.com/login returns HTTP 500 (Cloudflare 1101, unhandled Worker
         throw) because obeliskgate.com/.well-known/openid-configuration answers 200 with
         HTML. Our side now degrades to an honest 503; the discovery document is Obelisk's
         and was shipped as Ark cargo. This is also why real-provider-e2e-pending never
         cleared.
         → cloudflare/obelisk-auth.js · 38/38 unit tests · Ark 01K09H7FPDC44A67D990320A8B

  [#1]  reproducible-promotion-candidate                          PROJ 10  ·  ECOS 8
         ── release ─────────────────────────────────────────────────────────────────────────
         The uptime cron rewrote 5 of 31 hashed leaves AND, in the same commit, the manifest
         and release-proof that judge them. Three roots were observed for one unchanged
         source, so an 8/8 ceremony was unreachable by construction. Root now covers only
         commit-derived bytes; telemetry hashes into a published observedRoot that cannot
         invalidate a promotion.
         → scripts/build-candidate-artifact-manifest.mjs · 18/18 self-tests · root stable across a simulated cron tick

  [#3]  blast-radius-scoped-hold                                  PROJ 9  ·  ECOS 8
         ── release ─────────────────────────────────────────────────────────────────────────
         hold/releaseState/reasons are unchanged; resolution was added. A candidate provably
         disjoint from every active radius may promote while held surfaces stay held and are
         named publicly. Fails closed on an undeclared radius, an intersecting leaf, an
         unclassifiable leaf, or an empty candidate.
         → scripts/check-promotion-scope.mjs 25/25 · promotion gate 23/23 · ceremony reports mode=scoped

  [#5]  structural-reproducibility-gate                           PROJ 8  ·  ECOS 7
         ── efficiency ──────────────────────────────────────────────────────────────────────
         After fixing the uptime cron, the new gate immediately flagged
         cloudflare-analytics-pull writing two more hashed leaves. Exemptions must carry a
         reason, and hazard detection is measured on the artifact's own bytes rather than
         inferred from its producer.
         → scripts/check-artifact-reproducibility.mjs · 20/20 self-tests

  [#4]  desk-scheduled-and-surfaced                               PROJ 8  ·  ECOS 6
         ── product ─────────────────────────────────────────────────────────────────────────
         news:publish was referenced by zero workflows, so cadence was whatever a session
         happened to run — last edition 7 days old. Four editions now publish daily on free
         self-hosted inference that writes voice and never fact. The Desk also has a homepage
         module for the first time; its cadence line reads Paused because that is currently
         true.
         → .github/workflows/news-publish.yml · scripts/author-news-edition.mjs 19/19 · scripts/build-home-desk-module.mjs 24/24

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • Scope the ceremony's browser evidence to the promotion blast radius — the authority is scoped, the evidence suite is not, and that is what blocks promotion now.
    • Add a live /login synthetic probe to the uptime cron; a 500 on the sign-in path was found incidentally rather than reported.
    • Land the /login guard once the Worker lane unblocks.

  BLOCKERS
    • LIVE: vaultsparkstudios.com/login returns HTTP 500 — upstream Obelisk discovery serves HTML instead of JSON.
    • Production promotion: the CI ceremony re-runs a browser suite that tests the broken identity surface, so a disjoint release is still refused.
    • The /login fix lives in cloudflare/**, which the content lane blocks, and the Worker lane runs the same ceremony — the fix is gated behind the outage.

  ACTION GATE
    5 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
