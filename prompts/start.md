# Start Protocol

Use this when the user says only `start`.

## Read order

1. `AGENTS.md`
2. `context/PROJECT_BRIEF.md`
3. `context/SOUL.md`
4. `context/BRAIN.md`
5. `context/CURRENT_STATE.md`
6. `context/DECISIONS.md`
7. `context/TASK_BOARD.md`
8. `context/LATEST_HANDOFF.md`
9. `HANDOFF_PHASE6.md` — only if deep phase/schema context is needed
10. Only then task-specific files

## Startup rules

- Treat repo files as source of truth, not prior chat memory
- Do not edit code during startup unless the user explicitly asks for implementation immediately
- Use `context/LATEST_HANDOFF.md` as the active handoff source
- Treat `HANDOFF_PHASE6.md` as historical context only (don't update it — update context/LATEST_HANDOFF.md instead)
- Note assumptions clearly

## Required startup output

Reply with a concise `Startup Brief` containing:

1. Project identity (one line)
2. Current state summary
3. Active priorities
4. Important constraints
5. Likely next best move
6. Blockers or ambiguities
