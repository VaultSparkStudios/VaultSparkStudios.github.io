#!/usr/bin/env node
/**
 * Monthly draft-only Signal Log revival. Advisory inference proposes prose;
 * this script never writes outside journal/_drafts and never publishes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chat } from './lib/desk-inference.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'journal', '_drafts');
const month = new Date().toISOString().slice(0, 7);
const OUT = path.join(OUT_DIR, 'revival-' + month + '.md');

function sourceSnapshot() {
  const intel = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'public-intelligence.json'), 'utf8'));
  return {
    generatedAt: intel.generatedAt,
    session: intel.project?.currentSession || null,
    focus: intel.project?.currentFocus || '',
    shipped: (intel.pulse?.shipped || []).slice(0, 8),
    now: (intel.pulse?.now || []).slice(0, 6),
  };
}

export function renderDraft(content, source) {
  return [
    '---',
    'status: draft-for-human-review',
    'publish: false',
    'month: ' + month,
    'sourceGeneratedAt: ' + source.generatedAt,
    'sourceSession: ' + source.session,
    'generatedBy: scripts/draft-journal-revival.mjs',
    '---',
    '',
    '# Signal Log revival — ' + month,
    '',
    '> Draft only. This file is never part of the public build until a person deliberately promotes and edits it.',
    '',
    content.trim(),
    '',
    '## Source ledger',
    '',
    '- Current focus: ' + source.focus,
    ...source.shipped.map((item) => '- Shipped: ' + item),
    ...source.now.map((item) => '- In motion: ' + item),
    '',
  ].join('\n');
}

async function main() {
  const source = sourceSnapshot();
  const result = await chat({
    maxTokens: 1400,
    thinking: false,
    temperature: 0.35,
    messages: [{ role: 'user', content: 'Draft a 500–800 word monthly Signal Log entry from only this JSON. Be specific, reflective, proprietary-first, and mark uncertainty. Do not invent. JSON:\n' + JSON.stringify(source) }],
  });
  if (!result.ok) {
    console.warn('draft-journal-revival: advisory inference unavailable · ' + result.state + ' · no draft changed');
    return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, renderDraft(result.content, source));
  console.log('draft-journal-revival: wrote review-only artifact ' + path.relative(ROOT, OUT));
}

if (process.argv.includes('--self-test')) {
  const rendered = renderDraft('Grounded draft.', { generatedAt: '2026-08-01T00:00:00Z', session: 1, focus: 'x', shipped: ['y'], now: [] });
  if (!rendered.includes('publish: false') || !rendered.includes('status: draft-for-human-review')) throw new Error('draft-only contract failed');
  console.log('draft-journal-revival: self-test passed');
} else {
  main().catch((error) => { console.error(error); process.exit(1); });
}
