# Implement Plan — S171 Audit

Source: `docs/AUDIT_2026-05-28-S171.{md,json}`

## Sequence

1. `s171-runway-truth-cleanup` — close stale task-board truth first so generated lists stop re-promoting already-shipped work.
2. `rum-export-path-diagnostics` — add a cheap diagnostic gate before expensive browser work.
3. `longtail-visual-proof-pack` — capture and verify desktop/mobile screenshots after the proof scripts exist.

## Verification

- `node scripts/check-rum-export-path.mjs --self-test`
- `node scripts/check-rum-export-path.mjs --check`
- `node scripts/capture-longtail-visual-proof.mjs`
- `node scripts/check-longtail-visual-proof.mjs --self-test`
- `node scripts/check-longtail-visual-proof.mjs`
- `node scripts/generate-genius-list.mjs`
- `npm run build`
- `npm run build:check`
