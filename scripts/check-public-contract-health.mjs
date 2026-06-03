#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SELF_TEST = process.argv.includes('--self-test');
const INTERNAL_TERMS = /\b(human action required|founder action required|api key|private financial|mrr|arr)\b/i;
const LEGACY_SHAPE_ALLOWLIST = new Set([
  'api\\ci-status.json',
  'api\\commit-map.json',
  'api\\eternal-credits.json',
  'api\\feedback-provenance.json',
  'api\\feedback-summary.json',
  'api\\founder-presence.json',
  'api\\heartbeat.json',
  'api\\ignis-conduit.json',
  'api\\ignis-roi.json',
  'api\\oracle-queries.json',
  'api\\public-intelligence.json',
  'api\\public-status.json',
  'api\\vault-narrative-history.json',
  '.well-known\\entity-graph.json',
  '.well-known\\llms-full.txt',
  'llms-full.txt'
]);

function evaluate(name, text) {
  const findings = [];
  const legacy = LEGACY_SHAPE_ALLOWLIST.has(name);
  if (!legacy && INTERNAL_TERMS.test(text)) findings.push('internal/private vocabulary');
  if (name.endsWith('.json')) {
    try {
      const parsed = JSON.parse(text);
      if (!legacy && !parsed.schemaVersion) findings.push('missing schemaVersion');
      if (!legacy && !parsed.generatedAt && !['ci-status.json'].includes(path.basename(name))) findings.push('missing generatedAt');
    } catch {
      findings.push('invalid JSON');
    }
  }
  return findings;
}

if (SELF_TEST) {
  const good = evaluate('api/x.json', '{"schemaVersion":"1.0","generatedAt":"2026-05-27","publicSafe":true}');
  const bad = evaluate('api/x.json', '{"generatedAt":"2026-05-27","note":"api key"}');
  console.log(`  ${good.length === 0 ? 'ok' : 'fail'} good contract`);
  console.log(`  ${bad.length >= 2 ? 'ok' : 'fail'} bad contract`);
  process.exit(good.length === 0 && bad.length >= 2 ? 0 : 1);
}

const targets = [];
for (const dir of ['api', '.well-known']) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const entry of fs.readdirSync(abs)) {
    if (/\.(json|txt)$/.test(entry)) targets.push(path.join(dir, entry));
  }
}
targets.push('llms-full.txt');

const failures = [];
for (const rel of targets) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const findings = evaluate(rel, fs.readFileSync(abs, 'utf8'));
  if (findings.length) failures.push({ rel, findings });
}

if (failures.length) {
  console.error(`public contract health failed (${failures.length})`);
  failures.forEach((f) => console.error(`  ${f.rel}: ${f.findings.join(', ')}`));
  process.exit(1);
}
console.log(`public contract health ok (${targets.length} files checked)`);
