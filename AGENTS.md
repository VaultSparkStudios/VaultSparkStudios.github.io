# Project Agent Guide

## Session Protocol (agent-neutral — applies to Claude Code, Codex, any agent)

The canonical execution protocol for every Studio OS session lives in **`docs/SESSION_PROTOCOL.md`** in this repo (propagated from studio-ops).

It covers the 3-command rhythm (`/start` → `/go` → `/closeout`), full protocol for 15 commands, and agent-specific notes for Claude Code + Codex. Both agents execute the same instructions; per-agent branching is flagged explicitly with `IF agent = claude-code:` / `IF agent = codex:`.

See `docs/SKILL_MAP.md` for the one-page command cheatsheet.

## Studio OS

This project runs under the VaultSpark Studio OS.
Local path: *(see Studio Owner's local environment)*
GitHub: https://github.com/VaultSparkStudios/VaultSparkStudios.github.io
Live URL: https://vaultsparkstudios.com/

For portfolio-level intelligence, templates, and canonical protocols:
Read `vaultspark-studio-ops/portfolio/PROJECT_REGISTRY.md`
Read `vaultspark-studio-ops/docs/templates/project-system/`
Read `vaultspark-studio-ops/docs/STUDIO_HUB_ONBOARDING.md`

## Read order

1. `context/PROJECT_BRIEF.md`
2. `context/SOUL.md`
3. `context/BRAIN.md`
4. `context/CURRENT_STATE.md`
5. `context/DECISIONS.md`
6. `context/TASK_BOARD.md`
7. `context/LATEST_HANDOFF.md`
8. `context/SELF_IMPROVEMENT_LOOP.md` (header only)
9. `context/TRUTH_AUDIT.md` (if relevant)

## Required Studio OS files

| File | When to update |
|---|---|
| `context/LATEST_HANDOFF.md` | Every closeout — primary handoff |
| `context/CURRENT_STATE.md` | When shipped behavior changes |
| `context/TASK_BOARD.md` | When tasks complete or new ones are added |
| `context/DECISIONS.md` | When a meaningful decision is made |
| `context/TRUTH_AUDIT.md` | When source-of-truth status changes |
| `context/SELF_IMPROVEMENT_LOOP.md` | Every closeout — append audit + brainstorm entry |
| `context/PROJECT_STATUS.json` | Every closeout — keep `currentFocus`, `nextMilestone`, `blockers`, `lastUpdated` current |
| `logs/WORK_LOG.md` | Every closeout — append session entry |

## Closeout write-back (mandatory)

After any meaningful session:
1. `context/CURRENT_STATE.md`
2. `context/TASK_BOARD.md`
3. `context/LATEST_HANDOFF.md`
4. `context/PROJECT_STATUS.json`
5. `context/DECISIONS.md` (if decisions made)
6. `context/SELF_IMPROVEMENT_LOOP.md` — score, brainstorm, commit 1–2 items to TASK_BOARD

## Session aliases

If the user says only `start`, follow `prompts/start.md`.
If the user says only `closeout`, follow `prompts/closeout.md`.

## Cross-repo write safety

Before committing or pushing to **any repo other than this one**, run:
```bash
node <studio-ops-local-path>/scripts/ops.mjs check-lock "<repo-local-path>"
```
If locked → do not write; add blocker to TASK_BOARD.

**Lock file:** `context/.session-lock`
Written at session start (Step 1 of `prompts/start.md`). Cleared by Stop hook and at closeout.

## Studio Hub integration

This project is tracked in the VaultSpark Studio Hub at `vaultsparkstudios.com/studio-hub/`.
The hub reads `context/PROJECT_STATUS.json` from this repo via GitHub API.

Required fields: `status`, `health`, `currentFocus`, `nextMilestone`, `blockers`, `lastUpdated`.

## VaultSpark Brand Vocabulary — Vault Status

| Status | Meaning |
|---|---|
| **FORGE** | In development |
| **SPARKED** | Live and active |
| **VAULTED** | Paused / archived |

This project is **SPARKED**.

## CANON rules (binding)

- **CANON-006**: Every public-facing page must have VaultSpark Studios branding linked to `https://vaultsparkstudios.com/`. This project is the brand anchor — all internal pages are exempt; external-facing pages must comply.
- **CANON-007**: SPARKED projects must have a staging environment before deploying. Staging: `website.staging.vaultsparkstudios.com` on Hetzner (`stagingType: hetzner`).

## IP and Licensing (CANON-008)

All VaultSpark Studios code, content, assets, and designs are **proprietary by default**. All rights are reserved by VaultSpark Studios LLC unless a license is explicitly declared and approved by the Studio Owner.

**Agent rules:**
- Never add a `LICENSE` file with open-source terms unless explicitly instructed by the Studio Owner
- Never label a page, readme, or doc as "open source" for VaultSpark-original work
- Attribution/compliance pages on public sites must use proprietary-first language
- `docs/RIGHTS_PROVENANCE.md` default: `License: Proprietary — All Rights Reserved, VaultSpark Studios LLC`

**Exceptions (legal obligations — not discretionary):**
Any project forked from a copyleft-licensed upstream must declare its license in `context/DECISIONS.md` and `docs/RIGHTS_PROVENANCE.md`. Check `docs/RIGHTS_PROVENANCE.md` for this project's obligations.

Full decision: `vaultspark-studio-ops/docs/STUDIO_CANON.md` → CANON-008

---

## Escalate before changing

- Canon decisions
- Public promises / subscription pricing
- Auth or security flows
- Membership tier logic
- Launch dates

## Public-safe constraint

This is a public GitHub repo. Do NOT commit:
- API keys, secrets, or credentials
- Internal business planning or financial projections
- Private Studio OS operator runbooks
- Detailed session logs with business-sensitive content

Deployable site code, browser-safe client code, and public documentation are safe to commit.
