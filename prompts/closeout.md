# Closeout Protocol

Use this when the user says only `closeout`.

## Required write-back

If meaningful work happened, update in this order:

1. `context/CURRENT_STATE.md`
2. `context/TASK_BOARD.md`
3. `context/LATEST_HANDOFF.md`
4. `logs/WORK_LOG.md`
5. `context/DECISIONS.md` — when reasoning changed or a new decision was made
6. Any repo-specific files whose truth changed (e.g. HANDOFF_PHASE6.md for major phase completions, supabase SQL files for schema changes)

## Required closeout output

Reply with a concise `Session Closeout` containing:

1. What was completed
2. Files changed
3. Validation status
4. Open problems
5. Recommended next action
6. Exact files the next session should read first

## Then

After outputting the Session Closeout:
1. Commit all changes: `git add -A && git commit -m "<summary>"`
2. Push: `git push`
