```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S317 · 2026-08-16 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    Every reported Desk defect had a deeper cause than the symptom — and the console log       ║
║    the founder pasted contained a 404 that had been live on every page since S306.            ║
║                                                                                               ║
║  PROJECT IMPACT     ████████░░   84/100                                                       ║
║  ECOSYSTEM IMPACT   ███████▌░░   79/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#1]  reactions-deployment-gap                                  PROJ 10  ·  ECOS 9
         ── organization ────────────────────────────────────────────────────────────────────
         Handlers landed 2026-08-10; the deployed Worker was 2026-07-31. cloudflare/** is
         hard-blocked from the content lane while hash-named client JS promotes freely, so
         the lane shipped the fetch() and could never ship the endpoint. Deployed through the
         identity lane, which leaves the promotion hold intact.
         → /v/desk-reaction + /v/desk-presence now 200 GET / 204 OPTIONS, probed live

  [#7]  gates-that-never-ran                                      PROJ 9  ·  ECOS 10
         ── organization ────────────────────────────────────────────────────────────────────
         generate-news-pages --check and build-news-desk-engagement --check lived only in a
         news:check npm script nothing invoked. build:check went 295 to 302. Registering the
         new feeds in the evidence graph then immediately caught a live strand:
         refresh-live-data.yml re-renders the article pages via npm run build but staged only
         api/, discarding them every run.
         → build:check 302/302, exit code read directly

  [#2]  provenance-laundering                                     PROJ 9  ·  ECOS 9
         ── observability ───────────────────────────────────────────────────────────────────
         isVantageChallenged returned true if ANY one route was challenge-shaped, so a single
         missing route relabelled the whole receipt 'vantage-challenged' — while /_health
         returned 200 JSON from the same probe in the same run. A clear control now disproves
         a challenge, and 'missing' is a first-class state that names the absent routes.
         → worker-route-provenance self-tests 14/14 · re-probe 7/7 matched

  [#4]  counting-unit-reach                                       PROJ 9  ·  ECOS 8
         ── observability ───────────────────────────────────────────────────────────────────
         rum-beacon has been posting per-route to R2 all along, so reach needed no Worker
         change and works retroactively. But most /v/rum objects are ux EVENTS: a sampled day
         held 4 rows of which 2 were pageloads. Counting rows would have published a
         fabricated visitor number on a public page. A pageload is a row with no ux key,
         pinned by self-test.
         → news-audience self-tests 11/11 · engagement feed schema 1.1

  [#5]  idle-as-band                                              PROJ 7  ·  ECOS 8
         ── security ────────────────────────────────────────────────────────────────────────
         The founder asked for idle time; D-S315.3 had deliberately declined it. Both
         honoured by transmitting a coarse four-value BAND rather than a duration, allow-list
         validated at the edge so an unrecognised value is dropped rather than stored, held
         to the same five-observation floor, and never blended into reading time.
         attentionRatio ships alongside as the sharper answer.
         → worker unit tests 43/43 including an explicit rejection case

  [#6]  reader-signal-rollup                                      PROJ 8  ·  ECOS 7
         ── featureDepth ────────────────────────────────────────────────────────────────────
         Counts had lived only in edge KV since S310. The rollup enumerates slugs from the
         committed corpus rather than KV.list (an unbounded prefix would cost without limit
         and surface reactions for unpublished stories), publishes its truncation, and
         reports a dropping cumulative counter as 'reset' with both numbers rather than
         drawing a decline that never happened.
         → reactions self-tests 10/10 · live probe against the restored endpoint

  [#3]  signal-labels-wrong-field                                 PROJ 8  ·  ECOS 6
         ── ux ──────────────────────────────────────────────────────────────────────────────
         The badge read story.kind, a hand-authored enum, instead of day.leadSlug — so any
         day with two trending stories printed 'Lead signal' on both, while RSS called the
         same concept 'The Quiet Story' and nothing on the site defined either term. Now
         'Today's lead' / 'The quiet story', correctly derived, consistent across
         hub/article/feed, with a legend. Both fields are now validated.
         → hub cards + article kickers regenerated; zero occurrences of the old labels remain

  [#8]  console-log-404s                                          PROJ 7  ·  ECOS 6
         ── speed ───────────────────────────────────────────────────────────────────────────
         journey-conductor.js is predicate-loaded from ambient-loader, so it never had an
         HTML src to hash, so the content lane could never promote it while the full-site
         lane stayed held — its 38 siblings work only because they shipped in an earlier full
         deploy. Content-addressing fixed it; then clean-stale-shells would have DELETED the
         fix, because its reference map covered only HTML.
         → all 39 ambient scripts now 200 · social icons resolve at every depth

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • Confirm reach and reader signals cross their floors on real traffic, and observe the first end-to-end idleBand row in R2 — the only outstanding proof for this session's work.
    • Complete Reader-signal → Director's Report closure now that the rollup exists, reusing build-you-asked-shipped.mjs for the public receipt.
    • The stale Link: preload header at the edge still needs a full-site Pages deploy; _headers is blocked from the content lane.

  BLOCKERS
    (none)

  ACTION GATE
    8 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
