# Desk Art Worker — operator runbook

Real editorial illustrations for The Desk (`/news`), made at **zero marginal cost** with the
founder's ChatGPT plan through the Codex CLI. Runs **only on the founder's Windows machine** —
never in GitHub Actions.

## Why this exists

The scheduled publisher (`.github/workflows/news-publish.yml`) has no image model. When a new
story has no art, `scripts/generate-news-art.mjs` renders a **procedural fallback**: an abstract,
text-free composition that sits cleanly under the editorial overlay. Its receipt says
`pixelInspection.kind: "procedural-fallback"`. CI keeps publishing with the fallback, so a slot is
never dropped just because real art hasn't been made yet.

Real art replaces the fallback later, in three local steps:

| Step | Script | Writes |
|---|---|---|
| 1. Generate | `scripts/generate-news-art-codex.mjs` | `.cache/desk-art-staging/<date>--<slug>/` only (self-ignoring) |
| 2. Review | you look at every image | a list of accepted ids |
| 3. Ingest | `scripts/ingest-news-art.mjs` | `data/news-desk/art/*.png`, the story's receipt, that story's `assets/og/news` derivatives |

## Two images per story (D-S368.7)

Every story carries exactly two images:

| Image | What it is | Source master | On the page |
|---|---|---|---|
| **Banner** | The painted editorial illustration. Person-free; institutions shown through objects; landmarks true to the story. | `data/news-desk/art/<id>.png` (`visual.artSource`) | The overlaid panel (`assets/og/news/<id>--meme.*`), captioned with the meme line |
| **Satire cartoon** | A clearly drawn, square, single-panel gag in the register of the correspondent who wrote the meme line. May caricature real **public** figures. | `data/news-desk/art/<id>--satire.png` (`visual.satireCartoon.artSource`) | Below the panel's reactions: the cartoon, the meme line as an HTML caption, the persona byline, and the label **Satire · AI-generated cartoon** (+ a caricature note when recorded) |

Until a story has its cartoon, the banner panel is its only image (it already carries the meme
line, so nothing is missing for the reader). The worker stages both kinds side by side:
`.cache/desk-art-staging/<id>/art.png` and `.cache/desk-art-staging/<id>/satire.png`.

**Format: square 1:1** (≥1024x1024; stored ≤1200x1200; derivatives 1024 PNG/WebP/AVIF + a 640
WebP for phones). Square is the one shape every social surface shows uncropped, it is the classic
single-panel gag frame, and it is the image model's native 1024x1024 output.

**Register per correspondent** (`SATIRE_CARTOON_STYLES` in `scripts/lib/news-memes.mjs`):
NIB engraved broadsheet cartoon · DOT deadpan chart gag · MARA highlighted-document gag ·
ECHO then-and-now split · VERA 3 a.m. pager gag · REX big declaration · JUNO one figure ·
MICA tool frame.

**Caricature rules** (in the prompt, and checked by the reviewer):

- Real **public** figures only (executives, politicians, officials), and only as obvious,
  exaggerated, non-photorealistic cartoons that mock their public role or claim.
- Never a private individual, never photorealistic, never sexual, violent, gory or degrading;
  never mock anyone's body, ethnicity, gender, religion, disability or age.
- Invented and animated characters are fine. No real logos or trademarks.
- Prefer **no text** in the image: the page prints the caption. One perfectly legible word is
  tolerated if it is essential to the gag; anything garbled is a reject.
- Real people never appear in the **banner**.

**Data contract** — `visual.satireCartoon` (validated by `validateSatireCartoon` in
`scripts/lib/news-desk.mjs`; `visual.satire` stays the written joke the cartoon is drawn from):

```json
{
  "artSource": "data/news-desk/art/<date>--<slug>--satire.png",
  "kind": "satire-cartoon",
  "alt": "AI-generated satirical cartoon in VERA’s 3 a.m. pager gag style. …",
  "caption": "<the story's memeLine.text>",
  "persona": "vera",
  "register": "pager",
  "caricature": false,
  "reviewer": "codex image_generation (ChatGPT plan) + operator satire-cartoon review",
  "reviewedAt": "2026-10-03",
  "semanticVerified": false,
  "sha256": "<64 hex of the stored raster>",
  "width": 1024, "height": 1024, "bytes": 0, "entropy": 0,
  "promptSha256": "<sha256 of satire-prompt.txt, when satire-meta.json exists>"
}
```

The alt text is **derived** (`satireCartoonBrief`) from the same persona register and satire fields
the prompt was built from; ingest refuses a cartoon whose staged `satire-meta.json` alt no longer
matches (the joke changed after generation — re-roll it).

## Cost guard

The worker refuses to run unless all of these hold:

- `codex --version` works.
- `codex login status` says **Logged in using ChatGPT**. API-key auth is refused.
- `codex features list` shows `image_generation … true`.
- `~/.codex/config.toml` declares no custom `model_provider` (anything other than `openai` is
  refused). A ChatGPT login does not by itself stop a custom provider from aiming the run at a
  billable endpoint. Only the provider **name** is read from that file; nothing else is read or
  printed, because it can hold tokens.

It also removes `OPENAI_API_KEY`, `CODEX_API_KEY` and `OPENAI_BASE_URL` from Codex's environment.

## Confinement guard — what is actually verified

`buildPrompt()` sends the agent model-written, **externally sourced** story text (the scene and
satire lines, derived from third-party headlines) and Codex can run commands, so prompt-injected
text reaching an unconfined shell is the risk this guard exists for. Preflight therefore **proves**
confinement before any story text is sent and **fails closed** if it cannot:

```powershell
codex sandbox node -e "...write probe..."      # must be DENIED, or the worker refuses to run
```

Verified on the founder's machine on **2026-09-14** with **codex-cli 0.153.4** (Windows 11,
10.0.26200):

| Claim | Result |
|---|---|
| `codex sandbox` with the configured `[windows] sandbox = "elevated"` | **FAILS to start** — `windows sandbox failed: CryptUnprotectData failed: 2148073483` |
| `codex doctor` → `sandbox.helpers` | **fail** — "elevated Windows sandbox provisioning recorded a structured failure" (`helper_read_acl_helper_spawn_failed`) |
| `codex sandbox -c windows.sandbox="unelevated"` write probe | **enforced** — writes denied `EPERM` inside the cwd, outside it, and to `%USERPROFILE%` |
| Network inside that sandbox | **not blocked** by the sandbox itself (`fetch` returned 200) |
| `codex exec` flags | `--sandbox read-only\|workspace-write\|danger-full-access`, `--add-dir`, `--ephemeral`, `--strict-config`, `--skip-git-repo-check` all exist; there is **no network flag** |
| `-c sandbox_workspace_write.network_access=false` | **recognized** (accepted under `--strict-config`, which rejects unknown fields) |
| `-c windows.sandbox=…` | accepts **only** `elevated` or `unelevated` |

So preflight probes the configured backend first and then each explicit Windows backend, uses the
one that actually confines, and passes it to every run. On this machine that means
`windows.sandbox="unelevated"`. Each generation run is:

```
codex exec --strict-config --skip-git-repo-check --ephemeral --color never \
           --sandbox workspace-write \
           -c sandbox_workspace_write.network_access=false \
           -c windows.sandbox="<verified mode>" -
```

Codex also runs in `%TEMP%\vaultspark-desk-art\…`, outside the repo, so it never reads this repo's
`AGENTS.md`.

**Not verified — do not claim it.** These flags are what the CLI accepts; this runbook has *not*
observed the in-run sandbox denying a command *during* a real `codex exec` generation, because that
requires spending a real model run. What is proven is that the same sandbox backend denies writes
under `codex sandbox`, and that the worker refuses to start when it cannot prove that. Likewise,
`network_access=false` denies the **sandboxed shell** network access; the agent's own model calls
are made by the CLI process outside the sandbox and still work. If a future Codex build needs shell
network access for image generation, a run will fail with that visible in
`codex-attempt-N.log` — pass `--allow-network` to lift only that denial, and note why.

## S368 — why art silently stopped, and what now keeps it running

Between 2026-09-17 and 2026-10-03 no real art was generated: 52 stories shipped on
procedural placeholders. The worker spawned the npm `codex.cmd` shim with `shell: true`;
under Node 24, `cmd.exe` re-parsed every argument, the sandbox probe's `node -e` script
and `windows.sandbox="unelevated"` were mangled, the probe never printed its marker, and
preflight reported "the Codex sandbox could not start" (correctly refusing to run). The
worker now resolves the native `codex.exe` behind the shim (`resolveCodexBin`, override
with `CODEX_BIN`) and spawns it without a shell, so arguments pass through verbatim.

Three guards keep it from going quiet again:

- **Nightly generation** — Windows scheduled task `VaultSpark Desk Art (nightly)` runs
  `scripts/generate-news-art-codex.mjs` daily at 7:30 pm local (after the late-night
  edition) and appends to `.cache/desk-art-staging/nightly.log`. It only stages art.
  With no `--kind` the worker runs **both** passes (banner, then satire), so the task needs
  no change for D-S368.7; the satire pass covers stories since
  max(2026-10-03, today − 7 days) that have no `visual.satireCartoon` yet, and skips any
  cartoon already staged.
- **Review + ingest at session start** — staged art is reviewed (look at every image)
  and ingested by the next agent session; nothing unreviewed is published.
- **Currency alert** — `scripts/check-desk-art-currency.mjs` runs in the daily CI Health
  Monitor and fails when any published story has carried placeholder art for more than
  48 hours (`npm run desk:art:check` for a local report). For stories since 2026-10-03 it
  also reports a missing satire cartoon: a **warning** for the first 7 days, **failing**
  after that.

## Nightly / session-start routine

```powershell
# 0. See what needs art (read-only; lists banner targets, then stories lacking a satire cartoon)
node scripts/generate-news-art-codex.mjs --dry-run

# 1. Generate (about 2 min per image; resumable, one retry, 9-minute timeout each)
node scripts/generate-news-art-codex.mjs                       # both kinds (what the nightly task runs)
node scripts/generate-news-art-codex.mjs --kind banner --since 2026-08-24
node scripts/generate-news-art-codex.mjs --kind satire --limit 3
#    or target specific stories:
node scripts/generate-news-art-codex.mjs --story 2026-09-12/anthropic-says-it-blocked-potential-ai-bioweapon-misuse
```

Each item directory holds `art.png`, `prompt.txt`, `meta.json` and `codex-attempt-N.log`. Every run
appends one row per story to `.cache/desk-art-staging/results.ndjson`. A valid staged image is
skipped on reruns; pass `--force` to generate it again.

### 2. Review every image (required, not automatable)

Open each staged `art.png` and reject it if any of these fail:

- No text, letters, numbers, logos, watermarks or UI anywhere in the image.
- No real, identifiable person or likeness. Institutions and systems only.
- It illustrates *this* story's scene or satire, not a generic AI image.
- The main subject sits in the upper-middle band. The top ~18% gets the label bar and the bottom ~46%
  gets the caption panel, so nothing important should be there.

Re-roll a rejected image with `--story <id> --force`. Write the accepted ids to a file (one per line,
`#` comments allowed) or pass them inline.

**Approval is bound to the pixels, not the story id.** An entry is either `<id>` or
`<id>@<sha256 prefix>`:

- `<id>@<hash>` — the staged image's sha256 must start with that prefix, or that story is refused.
  The refusal message prints the hash to approve.
- `<id>` alone — accepted **only** when no re-roll is detectable: no prior reviewed source-raster
  receipt for different pixels, no discarded `art.invalid-*.png` beside the image, and not more than
  one `generated` row for that id in `results.ndjson`. After a re-roll the plain form is refused and
  the `@hash` form is required.

That rule exists because approval used to be keyed on the id alone, so a `--force` re-roll after the
review would publish unlooked-at pixels under an "operator visual review" receipt.

### 2b. Review every satire cartoon (required, not automatable)

Open each staged `satire.png` (and its `satire-prompt.txt`) and reject it if any of these fail:

- **Legible and clean**: reads at a glance as one gag; no garbled letters, no stray words, no
  watermark, no UI text. One perfectly legible essential word at most.
- **Obviously a cartoon**: drawn line art / flat colour. Anything that could pass for a photo or a
  realistic render is a reject.
- **Public figures only**: any recognisable real person must be a public figure (executive,
  politician, official) drawn as an exaggerated caricature. A private person, or a bystander who
  looks like a real individual, is a reject.
- **Nothing degrading**: no sexual, violent or gory content; no jokes about bodies, ethnicity,
  gender, religion, disability or age. The target is the claim or the institution.
- **The punchline fits**: it lands the story's meme line (the caption printed under it) and the
  correspondent's register.

Every satire approval must also record the **caricature decision**: append `+caricature` when the
cartoon shows a real public figure (the page then adds the caricature note), or `+none`:

```
2026-10-03--apple-says-it-8217-s-tightening-macos-8216-full@1a2b3c4d5e6f7a8b+none
2026-10-03--openai-safety-leader-quits-warning-ai-companys-culture-is@9f2c1ab4c0ffee00+caricature
```

The `@hash` rule is the same as for banners (the plain id is refused after a re-roll).

### 3. Ingest

```powershell
node scripts/ingest-news-art.mjs --dry-run                    # validate everything staged, write nothing
node scripts/ingest-news-art.mjs --reviewed reviewed.txt      # or --reviewed id1,id2
#   --from <dir>   ingest a backfill folder of <date>--<slug>/art.png instead of the staging dir
```

Ingest checks each image before writing anything:

- It is a PNG, at least 1200x630, with an aspect ratio between 1.6 and 2.1.
- Its entropy is at least 5.
- Its pixels don't duplicate any existing Desk art.
- Its panel derivatives fit the PNG 650 KB / WebP 250 KB / AVIF 210 KB budgets.

It then:

1. Normalizes the image to fit within 1600x900.
2. Writes `data/news-desk/art/<id>.png` and rebinds the receipt: sha256, entropy, size,
   `kind: "source-raster"`, reviewer `codex image_generation (ChatGPT plan) + operator visual review`,
   `semanticVerified: false`.
3. Runs `node scripts/build-news-desk.mjs --rebuild --refresh-art-only <date/slug,...>`. This
   re-encodes **only** those stories' panels; every other historical panel stays byte-locked
   (D-S327.2).

Satire cartoons ingest separately:

```powershell
node scripts/ingest-news-art.mjs --kind satire --dry-run
node scripts/ingest-news-art.mjs --kind satire --reviewed satire-reviewed.txt   # id@hash+caricature|none per line
```

It checks: PNG, ≥1024x1024, square (aspect 0.9–1.1), entropy ≥3 (rejects blank output — flat
colour cartoons are legitimately lower-entropy than paintings), pixels unique across all Desk art,
derivatives within the satire budgets (PNG 650 KB / WebP 250 KB / AVIF 210 KB / 640 WebP 120 KB),
and that the derived alt still matches the generation brief. It writes
`data/news-desk/art/<id>--satire.png`, records `visual.satireCartoon`, and runs
`build-news-desk.mjs --rebuild --refresh-satire-only <ids>`, which writes only those stories'
`assets/og/news/<id>--satire{.png,.webp,.avif,--640.webp}`. The banner raster, receipt and panels
are never touched.

### 4. Cascade, verify, commit

```powershell
node scripts/build-lqip-map.mjs; node scripts/inject-lqip.mjs
node scripts/generate-news-pages.mjs --apply
node scripts/build-news-visual-receipts.mjs
# CANON-053: look at the rendered article pages (desktop ≥1280px + mobile ≤430px, every theme),
# refresh docs/visual-qa/LATEST.json, then:
node ../vaultspark-studio-ops/scripts/check-visual-qa.mjs --project . --changed
npm run build:check
git add data/news-desk/art data/news-desk/days assets/og/news news api
git commit -m "feat(desk): real editorial art for <ids>"
```

The workflow's "mutated reviewed artwork" lock (`git diff --diff-filter=MD -- assets/og/news/`) only
checks what a scheduled run changes inside its own checkout. A local commit becomes that checkout's
`HEAD`, so later scheduled runs see no diff. **The workflow doesn't need to change.**

## Scheduling (Windows Task Scheduler, hidden window)

Schedule **generation only**. Review and ingest stay manual. Codex's ChatGPT login lives in your user
profile, so the task must run as you, only while you're logged on. This example uses PowerShell; it
is documentation only, so create the task yourself if you want one:

```powershell
# Run this from a shell already sitting in the repo, so the path is never hardcoded.
$repo = (Resolve-Path .).Path
# No --kind = banner + satire passes. (--since narrows the banner pass; the satire pass already
# defaults to the last 7 days.)
$cmd  = "Set-Location '$repo'; node scripts/generate-news-art-codex.mjs --since (Get-Date).AddDays(-3).ToString('yyyy-MM-dd') *>> .cache\desk-art-staging\nightly.log"
# conhost --headless keeps the console fully hidden on Windows 11 (no flash);
# on older builds use: powershell.exe -NoProfile -WindowStyle Hidden -Command $cmd
$action  = New-ScheduledTaskAction -Execute "conhost.exe" -Argument "--headless powershell.exe -NoProfile -NonInteractive -Command `"$cmd`""
$trigger = New-ScheduledTaskTrigger -Daily -At 23:30
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 3) -StartWhenAvailable -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "VaultSpark Desk Art Worker" -Action $action -Trigger $trigger -Settings $settings -RunLevel Limited
```

Make sure the log directory exists first (`.cache\desk-art-staging`; the first manual run creates
it). A preflight failure exits `2` and is logged. Nothing is ever written outside the staging
directory.

## Self-tests

```powershell
node scripts/generate-news-art.mjs --self-test        # text-free fallback, zones, classify, overlay budgets
node scripts/generate-news-art-codex.mjs --self-test  # mocked codex spawn, preflight refusals, resume/retry/timeout
node scripts/ingest-news-art.mjs --self-test          # temp repo fixture: review gate, rejects, receipt, scoped rebuild
node scripts/generate-news-art.mjs --preview <dir>    # render a fallback + overlaid panel to look at
```
