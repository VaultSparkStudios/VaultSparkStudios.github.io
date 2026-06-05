<!-- generated-by: /implement S173 · founder-yesno-retire-vaultsparked-proof -->
<!-- generated-at: 2026-06-04 -->

# Membership Orphan Decision — `assets/vaultsparked-proof.js`

## Recommendation

Delete `assets/vaultsparked-proof.js`.

## Evidence

- `docs/MEMBERSHIP_ORPHAN_DOSSIER_S172.md` found it is not loaded anywhere.
- `/vaultsparked/` already loads `assets/live-proof.js`.
- `assets/live-proof.js` writes the same `vs-proof-members`, `vs-proof-sparked`, and `vs-proof-challenges` IDs, plus richer proof surfaces.

## Consequence

Expected user-visible change: none. The retired file is superseded and disconnected.

## Rollback

Restore the file from the previous commit if a hidden consumer is discovered:

```bash
git restore --source=HEAD~1 -- assets/vaultsparked-proof.js
```

Founder gate remains: delete only after the yes/no confirmation requested in TASK_BOARD.
