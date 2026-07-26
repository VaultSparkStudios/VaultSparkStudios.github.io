#!/usr/bin/env node
/**
 * Converts Ark signature failures into a founder/studio-ops repair packet.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INBOX = path.join(ROOT, '.cache', 'ark-inbox.json');
const OUT = path.join(ROOT, 'docs', 'ARK_SIGNATURE_FAILURE_DOSSIER_2026-06-04.md');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');

export function renderDossier(inbox) {
  const failures = inbox.sigFailures || [];
  const rows = failures.length
    ? failures.map((f) => `| \`${f.id || ''}\` | ${f.from || 'unknown'} | ${f.type || 'unknown'} | ${f.error || 'unknown'} | ${f.ts || ''} |`).join('\n')
    : '| none | none | none | none | none |';
  return `<!-- generated-by: scripts/build-ark-signature-dossier.mjs -->
<!-- generated-at: ${new Date().toISOString().slice(0, 10)} -->

# Ark Signature Failure Dossier

Ark drain is restored, but signature failures mean some cross-repo cargo cannot be trusted or applied. This dossier is public-safe: IDs, producers, cargo types, and repair recommendations only.

| Cargo id | Producer | Type | Error | Observed |
|---|---|---|---|---|
${rows}

## Recommended Studio-Ops Repair

- Verify producer key material for \`vaultspark-studio-ops\` versus \`studio-ops\` naming.
- Re-sign or re-emit the failed \`port-online\` cargo after key normalization.
- Keep website-side Ark drain enabled; do not bypass signature checks locally.
`;
}

export function shouldPreserveDossier(inbox, outputExists) {
  return outputExists && (inbox.sigFailures || []).length === 0;
}

if (SELF_TEST) {
  const doc = renderDossier({ sigFailures: [{ id: 'x', from: 'studio-ops', type: 'port-online', error: 'sig mismatch' }] });
  const cases = [
    ['contains failure id', doc.includes('`x`')],
    ['contains repair section', doc.includes('Recommended Studio-Ops Repair')],
    ['clean volatile inbox preserves dated history', shouldPreserveDossier({ sigFailures: [] }, true)],
    ['missing dossier still renders a clean snapshot', !shouldPreserveDossier({ sigFailures: [] }, false)],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

if (CHECK && !fs.existsSync(OUT)) {
  console.error('build-ark-signature-dossier --check: missing dossier; run without --check');
  process.exit(1);
}

let inbox = {};
try { inbox = JSON.parse(fs.readFileSync(INBOX, 'utf8')); } catch {}
if (CHECK) {
  // S183 (audit #23, deterministic gates): this dossier is a point-in-time
  // forensic *snapshot* (note the dated filename), but its table is rendered
  // from `.cache/ark-inbox.json` — volatile runtime state that every `/start`
  // Ark drain rewrites. Byte-comparing the committed snapshot against a fresh
  // re-render from the live inbox guaranteed drift after any drain (the prior
  // date-only normalization didn't cover the row content), which is the single
  // reason `build:check` couldn't go green locally. Freeze the live input:
  // validate structural integrity instead of re-deriving from runtime state.
  const current = fs.readFileSync(OUT, 'utf8');
  const required = [
    ['header', /^#\s*Ark Signature Failure Dossier/m],
    ['generated-by marker', /generated-by: scripts\/build-ark-signature-dossier\.mjs/],
    ['table schema', /\| Cargo id \| Producer \| Type \| Error \| Observed \|/],
    ['repair section', /## Recommended Studio-Ops Repair/],
  ];
  const missing = required.filter(([, re]) => !re.test(current)).map(([name]) => name);
  if (missing.length) {
    console.error(`build-ark-signature-dossier --check: malformed dossier (missing: ${missing.join(', ')}); run node scripts/build-ark-signature-dossier.mjs`);
    process.exit(1);
  }
  console.log('build-ark-signature-dossier --check: ok (structure valid, live inbox not gated)');
  process.exit(0);
}
if (shouldPreserveDossier(inbox, fs.existsSync(OUT))) {
  console.log('build-ark-signature-dossier: 0 live failure(s) — preserved dated historical dossier');
  process.exit(0);
}
fs.writeFileSync(OUT, renderDossier(inbox), 'utf8');
console.log(`build-ark-signature-dossier: ${(inbox.sigFailures || []).length} failure(s)`);
