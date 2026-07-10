# CANON-041 Mobile Parity Attestation — Template

Reusable pattern from `VaultSparkStudios.github.io` (`scripts/check-mobile-contracts.mjs`) for any
sibling repo that needs to prove desktop↔mobile parity locally, then attest into the studio-wide
`check-mobile-parity` portfolio gate. Ship this file's contents to your own repo — do not import
across trees; the portfolio gate reads each repo's own attestation, not this repo's checker.

## Why this exists

The portfolio-wide `check-mobile-parity` doctor probe goes red when a sibling repo has no local
mobile-contract gate and no attestation record — not because its mobile UI is actually broken. Each
repo closes this by adopting the 7-contract pattern below (or a project-appropriate subset) and
recording the attestation, without any cross-repo file edits (CANON-018: cargo, not direct writes).

## The 7 contract classes (adapt to your stack)

1. **`overflow-x: clip` not `hidden` on `body`/`html`** — `hidden` silently breaks iOS Safari
   `position: sticky` by promoting body to the scroll container.
2. **16px input-font floor at `<=768px`** — anything smaller triggers iOS Safari focus-zoom.
3. **Brand wordmark structural split** (`.brand-suffix` span or equivalent) — lets mobile hide a
   suffix via CSS instead of truncating with an ellipsis mid-word.
4. **Theme-safe state overrides** — `body.<theme> .X` commonly outranks `.X.open` on specificity;
   state-toggle rules that set color/background need a `body`/`:where()` guard.
5. **Fixed drawer escapes sticky-header stacking context** — a `position: sticky` header can trap a
   `position: fixed` mobile drawer below a body-level backdrop, making it untappable. Portal the
   drawer to `document.body` on open, restore on close.
6. **Theme/state specificity budget (generalized #4)** — same rule, any element, not just nav.
7. **`env(safe-area-inset-*)` on viewport-edge-pinned fixed elements** — iPhone notch / home
   indicator overlaps un-padded top/bottom-pinned bars.

## Adoption steps (local, no cross-repo writes)

1. Copy the contract list above into your repo's own `scripts/check-mobile-contracts.mjs` (or
   equivalent), scoped to the stack you actually have — drop contracts that don't apply (e.g. no
   theme system → skip #4/#6).
2. Wire it into your `build:check` (or CI-equivalent) so it gates on every push, not just once.
3. Record the attestation: add a `CANON-041` entry to your repo's `context/CANON_ADOPTION.md` (or
   run `check-canon-adoption.mjs --suggest` if you have it) once your gate exists and is green.
4. That attestation is what the portfolio `check-mobile-parity` probe reads — no sibling-repo file
   edit required from this repo or any other.

## Reference implementation

Full source with self-test: `VaultSparkStudios.github.io/scripts/check-mobile-contracts.mjs`
(7/7 contracts passing as of Session 273). Self-test pattern: inject a known-bad and a known-safe
sample per contract, assert the detector flags exactly the bad one — proves the gate catches what
it claims to catch, per `[[feedback_structural_gate_pattern]]`.
