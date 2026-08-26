#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'config', 'cache-evidence-classification.json');
const SELF_TEST = process.argv.includes('--self-test');

export function validate(payload) {
  const errors = [];
  if (payload?.schemaVersion !== 1 || !Array.isArray(payload?.artifacts)) errors.push('invalid schema');
  const pairs = new Set();
  for (const row of payload?.artifacts || []) {
    if (!/^\.cache\//.test(row.path || '')) errors.push('non-cache path: ' + row.path);
    if (!row.class || !row.owner) errors.push('missing class/owner: ' + row.path);
    const pair = row.path + '|' + row.class;
    if (pairs.has(pair)) errors.push('duplicate classification: ' + pair);
    pairs.add(pair);
    if (!fs.existsSync(path.join(ROOT, row.owner))) errors.push('missing owner: ' + row.owner);
  }
  const classes = new Set((payload?.artifacts || []).map((x) => x.class));
  if (!classes.has('derived-evidence') || !classes.has('volatile-source') || !classes.has('coordination-lock')) {
    errors.push('classification vocabulary incomplete');
  }
  return errors;
}

if (SELF_TEST) {
  const bad = validate({ schemaVersion: 1, artifacts: [{ path: 'api/x.json', class: '', owner: 'missing' }] });
  if (bad.length < 2) process.exit(1);
  console.log('check-cache-evidence-classification --self-test: all passed');
} else {
  const payload = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const errors = validate(payload);
  if (errors.length) {
    errors.forEach((e) => console.error('  - ' + e));
    process.exit(1);
  }
  console.log('check-cache-evidence-classification: ok (' + payload.artifacts.length + ' declarations)');
}
