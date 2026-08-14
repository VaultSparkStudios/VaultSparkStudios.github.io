```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S316 · 2026-08-14 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    Three defects were masking each other on the public status page — production was never     ║
║    diverged, it was content-current all along.                                                ║
║                                                                                               ║
║  PROJECT IMPACT     ████████░░   83/100                                                       ║
║  ECOSYSTEM IMPACT   ███████▌░░   77/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#3]  git-depth-gate-blind-spot                                 PROJ 9  ·  ECOS 10
         ── organization ────────────────────────────────────────────────────────────────────
         Its detector matched only a direct execFileSync('git', ['log']) shape, so the live
         generator's helper-bound git(['cat-file', '-e', sha]) bought a total exemption.
         Detection now spans all three call shapes plus cat-file/merge-base/describe,
         self-tests are pinned to the verbatim live call shape, and the gate was
         mutation-tested against the real tree rather than only fixtures.
         → check-workflow-git-depth 22/22 · mutation test: removing fetch-depth makes it exit 1 and name the right workflow

  [#2]  shallow-clone-false-diverged                              PROJ 10  ·  ECOS 9
         ── observability ───────────────────────────────────────────────────────────────────
         git cat-file -e fails for every non-tip commit in a shallow clone, and the producer
         read that as 'this sha is not in our history'. The deployed sha is an ordinary
         ancestor of main. Both workflows now set fetch-depth 0, and classify() refuses to
         infer divergence from an incomplete clone — absence of evidence is no longer
         published as evidence.
         → build-deploy-currency 59/59 · re-probed from a complete clone: content-current, 515 behind, shell matched

  [#1]  deploy-currency-reader-field-contract                     PROJ 10  ·  ECOS 8
         ── observability ───────────────────────────────────────────────────────────────────
         status/index.html read d.status while the producer emits d.state, so every
         comparison was permanently false and the tile rendered a neutral Unverified
         regardless of truth — including while the feed said diverged. It now reads the real
         vocabulary with severity that matches, and an unrecognised future state degrades to
         neutral rather than borrowing another state's colour.
         → status/index.html · rendered-pixel capture: 'Content current · 515 commits behind · shell fingerprints matched'

  [#5]  propagation-regression-recovery                           PROJ 8  ·  ECOS 9
         ── security ────────────────────────────────────────────────────────────────────────
         secrets.mjs reverted resolveCapability to its pre-CANON-019 shape and deleted
         suggestCapabilities — a hard build break at step 21/295 plus a silent regression
         making a mistyped capability indistinguishable from a missing credential, the exact
         phantom blocker CANON-019 forbids. The sibling capability-map fallback and the
         startup-brief renderer's evidence/revenue integrations were also lost. Restored
         locally, shipped upstream as Ark cargo, no sibling tree edited.
         → capability-discovery-contract 8/8 · Ark 01JVVLUPSJ6A620694A3A4DE60 + 01JVVM6OMUB52830298E40F99E

  [#4]  compliance-gate-inverted                                  PROJ 8  ·  ECOS 7
         ── organization ────────────────────────────────────────────────────────────────────
         The assertion expected 'shell fingerprint matched' while the page renders the plural
         'shell fingerprints matched', so it matched only the two degraded states. CI went
         red exactly when parity was good and green when it was broken — it had never been
         seen to pass on a good day.
         → Playwright compliance 18/18 including the previously red release-truth test

  [#6]  publisher-push-retry                                      PROJ 7  ·  ECOS 6
         ── organization ────────────────────────────────────────────────────────────────────
         Run 31778262455 committed ten analytics files then hit a GitHub HTTP 500 on a
         single-shot push; the commit died with the runner and that data window was never
         published. Both crons now retry with rebase and backoff, failing loudly only after
         the attempts are spent.
         → .github/workflows/cloudflare-analytics-pull.yml · uptime-probe.yml

  [#7]  hygiene-and-canon-currency                                PROJ 6  ·  ECOS 5
         ── organization ────────────────────────────────────────────────────────────────────
         Each removed lib was byte-identical to its canonical studio-ops copy with zero local
         consumers — including obelisk-broker.mjs, which D-S220.1 had already removed for
         that reason and propagation re-delivered. Four session-protocol scripts were
         allowlisted instead, with their real-but-unscannable SKILL.md callers documented.
         AGENTS.md indexed through CANON-053 while live canon has 54 headings.
         → check-orphan-libs clean · check-orphan-scripts clean · AGENTS.md CANON-054/055 added

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • Confirm the next CI uptime-probe run publishes content-current with historyComplete true — the first CI-side proof that fetch-depth 0 works where the feed is actually published.
    • Drive a two-way merge of render-startup-brief.mjs from studio-ops so the propagation clobber cycle ends instead of replaying each delivery.
    • sanitize-public-oracle-feed --check can drift mid-run against an externally regenerated gitignored file; the ordering fragility is real and unfixed.

  BLOCKERS
    (none)

  ACTION GATE
    7 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
