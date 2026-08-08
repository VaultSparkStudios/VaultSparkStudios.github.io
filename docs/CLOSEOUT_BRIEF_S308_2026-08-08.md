```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S308 · 2026-08-08 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    The Desk's debate was one-dimensional by construction — S308 added the missing axis,       ║
║    three voices that differ by what they know, four daily editions, a corroboration-first     ║
║    trend radar, and a live identity-free newsletter.                                          ║
║                                                                                               ║
║  PROJECT IMPACT     ███████▌░░   79/100                                                       ║
║  ECOSYSTEM IMPACT   █████▌░░░░   58/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#6]  corroboration-silently-dead                               PROJ 9  ·  ECOS 8
         ── truth ───────────────────────────────────────────────────────────────────────────
         Every Google News RSS link is a news.google.com redirect, so domain-based counting
         collapsed a hundred independent outlets into one source and the highest-weighted
         term could never fire. Nothing errored; the queue merely looked thin. Found by
         running the radar, not by reading it. Outlet identity now recovers the publisher
         from the feed's source tag; live queue went 7 to 24.
         → itemOutlet() + regression tests asserting both directions

  [#3]  record-reactive-voice                                     PROJ 9  ·  ECOS 6
         ── product ─────────────────────────────────────────────────────────────────────────
         personaForm turns ledger accuracy into a writing directive: chastened on a cold
         streak, emboldened on a run. Gated at four resolved calls so a thin record earns
         'unproven' and no tone shift at all. Only possible because the desk keeps a
         verifiable record — no other news product can run this.
         → personaForm() + standing chip on the editorial board

  [#8]  light-theme-contrast                                      PROJ 7  ·  ECOS 7
         ── ux ──────────────────────────────────────────────────────────────────────────────
         The theme matrix captures at 1366x900, so the new CTA sat below the fold and
         appeared in none of the 42 shots — a green matrix proving nothing about the changed
         surface. Focused component captures found a Subscribe button using flat var(--gold)
         with near-black ink; in light theme that token is #7a5c00, a TEXT colour. Fixed by
         reusing the sitewide .button so contrast is one design-system decision.
         → docs/visual-qa/LATEST.json · 42 hash-bound captures · blockingDefectsOpen 0

  [#5]  trend-radar                                               PROJ 8  ·  ECOS 6
         ── product ─────────────────────────────────────────────────────────────────────────
         Free key-less sources clustered into corroborated topics. Corroboration is the
         largest scoring term and engagement is capped, because volume and virality both pull
         toward slop. Four hard disqualifications: single unverified source, already-covered
         re-run, uncastable beat, vendor marketing.
         → scripts/news-trend-radar.mjs --self-test 56/56 · live scan 24 queued / 163 rejected

  [#1]  second-stance-axis                                        PROJ 9  ·  ECOS 5
         ── product ─────────────────────────────────────────────────────────────────────────
         direction was a single scalar and heat was mean pairwise distance on it, so the
         debate axis WAS hype level and every story resolved to the same shape. horizon
         (immediate to structural) makes 'we agree it matters, we disagree on when'
         expressible; heatBreakdown names the split. Backward compatibility is structural —
         horizon defaults to 0 and the divisor stays at the 1-D maximum — so published heat
         provably cannot move.
         → scripts/lib/news-desk.mjs · build-news-desk.mjs --self-test 52/52 · ledger/carousel/feed byte-stable under --check

  [#9]  genius-list-self-contradiction                            PROJ 6  ·  ECOS 7
         ── organization ────────────────────────────────────────────────────────────────────
         The genius list marked BRAND items actionable while writing 'requires founder
         sign-off' into their rationale; the gate-integrity check reads both and correctly
         failed. Pre-existing S307 debt — the item entered TASK_BOARD after S307's build
         check ran. The gate now derives from the category that produces the prose, so the
         two cannot disagree. The check was right and was not softened.
         → FOUNDER_AUTHORITY_CATEGORIES in generate-genius-list.mjs · smoke 60/60

  [#7]  desk-dispatch                                             PROJ 8  ·  ECOS 5
         ── growth ──────────────────────────────────────────────────────────────────────────
         send-member-newsletter is Vault-Member gated and structurally cannot serve /news/,
         whose whole claim is that it needs no account. subscribe-desk-dispatch is separate
         and deliberately identity-free: Brevo double opt-in, origin allowlist,
         enumeration-safe responses, verify_jwt pinned in config.toml rather than a deploy
         flag.
         → live endpoint 5/5 incl. negative controls (malformed 400 · foreign origin 403 · real DOI dispatched)

  [#2]  epistemic-cast                                            PROJ 8  ·  ECOS 4
         ── product ─────────────────────────────────────────────────────────────────────────
         VERA has run it in production, ECHO has seen the cycle, JUNO tracks who it lands on
         — none is a fourth opinion about hype. REX/MARA/DOT retained because the
         hash-chained ledger references their ids; retiring one would orphan the public track
         record. castForStory seats a beat anchor plus its rival so six voices give rotation,
         not noise.
         → PERSONAS + castForStory in scripts/lib/news-desk.mjs

  [#4]  intraday-editions                                         PROJ 7  ·  ECOS 4
         ── product ─────────────────────────────────────────────────────────────────────────
         validateDay hard-capped 1-3 stories per day, so 'throughout every single day' could
         not be expressed. EDITIONS (Wire, Midday, Close, Late Night) move volume discipline
         from per-day to per-edition, each with its own editorial job, so publishing more
         often cannot decay into more of the same.
         → EDITIONS + per-edition cap enforcement in validateDay

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • Wire the radar into an authored edition: emit a validateDay-clean day from a queued topic with the cast seated and standing directives applied.
    • Schedule --scan per edition slot and surface the queue at /start so cadence is prompted rather than remembered.
    • Publish persona standing as a public surface (/news/record/) — personaForm already computes it.
    • Correction receipts: when a prediction resolves wrong, say so on the story that made it.

  BLOCKERS
    • Obelisk: https://website.staging.vaultsparkstudios.com/auth/callback still unregistered for client vaultsparkstudios-website — untouched by this session and unrelated to News.
    • The Dispatch double-opt-in confirmation email requires a real click in founder@vaultsparkstudios.com; that leg cannot be closed by an agent.

  ACTION GATE
    9 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
