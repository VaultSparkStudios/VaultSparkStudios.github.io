# VaultSpark Local Project Bootstrap

Use this before a project becomes a Git repo.

This public repo copy is a public-safe reference. The preferred long-term home
for this workflow is the private `vaultspark-studio-ops` repo.

## Purpose

This is the pre-Git version of the VaultSpark studio bootstrap process. Use it
when a project exists only as a local folder, outline package, or early concept
workspace and you want it to start with the same gold-standard memory and
handoff system used across VaultSpark repos.

## When to use this

- before `git init`
- before creating a GitHub repo
- when a local folder already has outline docs but lacks the studio control layer
- when you want `start` and `closeout` to work from the first serious session

## Script

Run the bootstrap script from the studio ops repo:

```powershell
pwsh -File .\scripts\bootstrap-local-project.ps1 -ProjectPath "C:\path\to\project" -ProjectName "Project Name" -ProjectType "project type" -Medium generic
```

Example for an app product:

```powershell
pwsh -File .\scripts\bootstrap-local-project.ps1 -ProjectPath "C:\Users\p4cka\Documents\Development\mindframe" -ProjectName "MindFrame" -ProjectType "web-first metacognition training platform and analytics product" -Medium app
```

## What it creates

- `AGENTS.md`
- `README.md` if missing
- `context/`
- `logs/`
- `handoffs/`
- `prompts/`
- `docs/`
- `plans/`
- universal memory files
- `prompts/start.md`
- `prompts/closeout.md`

It creates missing files only. Existing files are preserved.

## Default rule

If the local folder already has product or architecture docs:

- keep them
- do not rename them unless there is a strong reason
- merge the studio system around them
- map them in `docs/PROJECT_SYSTEM_INDEX.md` and `context/TRUTH_MAP.md`

## Minimum files to fill before implementation

- `context/PROJECT_BRIEF.md`
- `context/BRAIN.md`
- `context/SOUL.md`
- `context/CURRENT_STATE.md`
- `context/TASK_BOARD.md`
- `context/LATEST_HANDOFF.md`
- `AGENTS.md`
- `prompts/start.md`
- `prompts/closeout.md`

## Recommended next steps after bootstrap

1. Review the generated control files
2. Merge any existing outline docs into `TRUTH_MAP.md` and `PROJECT_SYSTEM_INDEX.md`
3. Use `start` for the first serious AI session
4. Initialize Git only after the local structure feels correct
5. Create the GitHub repo after the project has a stable identity and control layer

## Portfolio Tracking

As part of local bootstrap, create and fill:

- `context/PORTFOLIO_CARD.md`
- `context/PROJECT_STATUS.json`

Do this before Git initialization so the project can enter the studio-wide portfolio registry immediately.

