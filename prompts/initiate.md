<!-- template-version: local-pointer -->
<!-- canonical-source: VaultSparkStudios/vaultspark-studio-ops/prompts/initiate.md -->

# INITIATE

Executed when the user says `initiate`, `/initiate`, or when `prompts/start.md`
classifies the repo as bootstrap/foundation (Type A or B).

**This repo (`vaultsparkstudios.github.io`) is already initiated and SPARKED** — it
is the studio's public brand anchor. For any re-initiation, recovery, or protocol
refresh, follow the canonical control-plane prompt (single source of truth):

```bash
../vaultspark-studio-ops/prompts/initiate.md
```

The full procedure also lives, agent-neutral, in `docs/SESSION_PROTOCOL.md` §4 —
read it there if the control-plane checkout is unavailable.

Local guardrails (CANON-003 keeps bootstrap instructions out of `prompts/start.md`
for token efficiency — never merge initiation work back into start.md):

- Preserve existing project identity in `context/PROJECT_BRIEF.md`, `context/SOUL.md`,
  `context/BRAIN.md`, `context/CURRENT_STATE.md`, and `context/PROJECT_STATUS.json`.
- Proprietary-first (CANON-008): do not add an open-source `LICENSE` unless the
  Studio Owner explicitly approves it.
- Refresh `context/CANON_ADOPTION.md` with the live canon posture after any
  initiation refresh (`node ../vaultspark-studio-ops/scripts/check-canon-adoption.mjs --project . --write`).
- Use Studio Ark for cross-repo changes (CANON-018); never edit a sibling repo's
  tree directly.
- Public-facing brand anchor: re-verify CANON-006 branding link-back and the
  CANON-011 universal page set survive any re-scaffold.
