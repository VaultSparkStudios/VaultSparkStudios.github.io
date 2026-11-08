<!-- Session 411 · source: docs/AUDIT_2026-11-06-S411.json -->
# S411 recovery: accurate quoted-question boundaries

The sigil repair is locally verified; full release is pending. Selected pending outcome3: quoted-question-continuation, depthL2. This recovery addendum is not the new native goal's fresh audit.

Keep an embedded quoted question/exclamation attached to an explicit lowercase clause continuation, while retaining detection of genuine lowercase new sentences and unquoted boundaries. Cover both live corpus examples and straight/curly quotation/control cases in the existing native self-test. Do not change published prose or suppress findings globally.

User outcome: Valid published prose passes the copy gate while genuine lowercase sentence defects remain rejected.

Acceptance: Add regressions that fail before the parser repair; pass them after repair, preserve all prior self-tests and pass the real full-corpus gate. Genuine unquoted and quoted new lowercase sentences still fail. Preserve the executed failure receipt.

Rollback: revert the focused parser/self-test changes. No runtime UI, authentication or published prose changes.
