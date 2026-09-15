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

## Nightly / session-start routine

```powershell
# 0. See what needs art (read-only)
node scripts/generate-news-art-codex.mjs --dry-run

# 1. Generate (about 2 min per story; resumable, one retry, 9-minute timeout each)
node scripts/generate-news-art-codex.mjs --since 2026-08-24
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
$repo = "C:\Users\<you>\documents\development\vaultsparkstudios.github.io"
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
