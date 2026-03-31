# Studio OS — Agent Instructions

This project is **VaultSparkStudios.github.io** and runs on the VaultSpark Studio OS.
Type: website

## Session aliases (mandatory)

When the user says only `start`, read and execute `prompts/start.md` exactly.
When the user says only `closeout`, read and execute `prompts/closeout.md` exactly.

Do NOT ask "what would you like to work on" — execute the prompt.

## Required reading

@AGENTS.md

## Project structure

- `context/` — Live project state (CURRENT_STATE, TASK_BOARD, LATEST_HANDOFF, etc.)
- `prompts/` — Session protocols (start, closeout)
- `audits/` — Session audit JSONs

## Build and test

- Build: N/A — static site served via GitHub Pages
- Test: `npm test` for Playwright coverage, `npm run test:a11y` for accessibility coverage, optional authenticated portal coverage via `VAULT_TEST_EMAIL` + `VAULT_TEST_PASSWORD`

## Key rules

- Never edit prior entries in DECISIONS.md, SELF_IMPROVEMENT_LOOP.md, or CREATIVE_DIRECTION_RECORD.md — append only
- LATEST_HANDOFF.md is the authoritative handoff source
- context/PROJECT_STATUS.json must stay current — Studio Hub reads it via GitHub API
