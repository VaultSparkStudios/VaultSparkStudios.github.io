# Closeout Protocol

Use this when the user says only `closeout`.

## Required write-back

If meaningful work happened, update in this order:

1. `context/CURRENT_STATE.md`
2. `context/TASK_BOARD.md`
3. `context/LATEST_HANDOFF.md`
4. `logs/WORK_LOG.md`
5. `context/DECISIONS.md` when reasoning changed
6. `docs/CREATIVE_DIRECTION_RECORD.md` when human creative direction changed
7. `docs/INNOVATION_PIPELINE.md` when a strong new idea emerged
8. any project-type or repo-specific files whose truth changed

## Repo-specific write-back examples

- deployment or release docs
- migration notes
- onboarding docs
- API or systems docs
- branded launch or social docs
- project-specific handoff or session files

## Required closeout output

Reply with a concise `Session Closeout` containing:

1. what was completed
2. files changed
3. validation status
4. open problems
5. recommended next action
6. exact files the next AI should read first
