# VaultSpark Studio Project System

This document defines the VaultSpark Studios operating system for project memory,
handoffs, canon protection, creative direction, and AI-assisted continuity.

Use this together with:

- `docs/STUDIO_REPO_TOPOLOGY.md`
- `docs/STUDIO_DOCUMENT_AUTHORITY.md`
- `docs/STUDIO_NEW_PROJECT_BOOTSTRAP.md`
- `docs/STUDIO_EXISTING_PROJECT_MIGRATION.md`
- `docs/STUDIO_PROJECT_TYPE_MATRIX.md`

## Goal

VaultSpark should be able to run games, films, novels, music, dashboards, apps,
and shared universes without losing identity, history, or operational clarity.

## Universal baseline for every serious project

Every project should have these files from day one or be migrated into them:

- `context/PROJECT_BRIEF.md`
- `context/BRAIN.md`
- `context/SOUL.md`
- `context/CURRENT_STATE.md`
- `context/DECISIONS.md`
- `context/TASK_BOARD.md`
- `context/OPEN_QUESTIONS.md`
- `context/LATEST_HANDOFF.md`
- `logs/WORK_LOG.md`
- `docs/CREATIVE_DIRECTION_RECORD.md`
- `AGENTS.md`
- `prompts/start.md`
- `prompts/closeout.md`

## Soul versus Brain

- `SOUL.md` protects identity, taste, emotional promise, and anti-drift rules
- `BRAIN.md` captures strategic thinking, mental models, heuristics, priorities, and the best current understanding of how the project should think

If `SOUL` is the project's heart, `BRAIN` is its operating intelligence.

## Expanded high-leverage records

These are not mandatory for every project, but they create a real studio-grade
memory system.

- `context/ASSUMPTIONS_REGISTER.md`
- `context/RISK_REGISTER.md`
- `context/TRUTH_MAP.md`
- `docs/RIGHTS_PROVENANCE.md`
- `docs/CANON.md`
- `docs/ENTITY_BIBLE.md`
- `docs/RETCON_LOG.md`
- `docs/ASSET_REGISTRY.md`
- `docs/BRAND_SYSTEM.md`
- `docs/SOCIAL_SYSTEM.md`
- `prompts/PROMPT_LIBRARY.md`
- `plans/DECISION_HEATMAP.md`
- `plans/LEARNING_LOOP.md`

## Especially strong files for AI-heavy studios

- `TRUTH_MAP.md`: defines which documents win when sources conflict
- `DECISION_HEATMAP.md`: separates reversible, expensive, public, and canon-sensitive decisions
- `RIGHTS_PROVENANCE.md`: tracks source, ownership, licenses, and evidence
- `CREATIVE_DIRECTION_RECORD.md`: additive record of human-guided creative decisions, approvals, reversals, and canon-affecting direction
- `LEARNING_LOOP.md`: captures what was learned, what changed, and what still needs validation

## Update discipline

After meaningful work:

1. Update `context/CURRENT_STATE.md`
2. Update `context/TASK_BOARD.md`
3. Append key reasoning to `context/DECISIONS.md`
4. Update `context/LATEST_HANDOFF.md`
5. Append to `logs/WORK_LOG.md`
6. Append to `docs/CREATIVE_DIRECTION_RECORD.md` whenever a human provides creative direction, approval, rejection, refinement, or canon-impacting intent

## Session aliases

All VaultSpark projects should support two universal prompts:

- `start`: run the full startup protocol and produce a concise startup brief
- `closeout`: run the full closeout protocol and perform write-back

These should be implemented in project-local `prompts/start.md` and
`prompts/closeout.md`, then referenced from the project's `AGENTS.md`.

## Minimum viable philosophy

Do not force every document onto every project.

Use:

- the universal baseline for all projects
- world/franchise files only when IP spans projects
- medium-specific files only when the medium requires them
