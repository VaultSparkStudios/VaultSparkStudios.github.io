#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SELF_TEST = process.argv.includes('--self-test');

const SKIP_DIRS = new Set([
  '.git',
  '.cache',
  'node_modules',
  'playwright-report',
  'test-results',
  'docs',
  'context',
  'logs'
]);

const SOLO_BET_PATTERNS = [
  /\bone person\b/i,
  /\bsingle[- ]person\b/i,
  /\bsingle seat\b/i,
  /\bwhen you['’]re alone\b/i,
  /\bsolo founder\b/i,
  /\bone spark\b/i,
  /\bno single person\b/i
];

const REQUIRED_STUDIO_TERMS = [
  /professional/i,
  /studio os/i,
  /portfolio/i,
  /release/i
];

function stripMarkup(text) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

export function evaluate(files) {
  const findings = [];
  for (const [name, raw] of Object.entries(files)) {
    const text = stripMarkup(raw);
    for (const pattern of SOLO_BET_PATTERNS) {
      if (pattern.test(text)) findings.push(`${name} contains solo-bet framing: ${pattern}`);
    }
  }

  const studio = files['studio/index.html'] ? stripMarkup(files['studio/index.html']) : '';
  if (!studio) findings.push('studio/index.html missing from posture scan');
  for (const pattern of REQUIRED_STUDIO_TERMS) {
    if (studio && !pattern.test(studio)) findings.push(`studio/index.html missing studio posture term: ${pattern}`);
  }
  return findings;
}

if (SELF_TEST) {
  const good = evaluate({
    'studio/index.html': '<main>VaultSpark is a professional Studio OS portfolio with release standards.</main>'
  });
  const bad = evaluate({
    'studio/index.html': '<main>One person with a single seat, moving like many.</main>',
    'index.html': '<main>No single person should build this.</main>'
  });
  console.log(`  ${good.length === 0 ? 'ok' : 'fail'} good studio posture`);
  console.log(`  ${bad.length >= 6 ? 'ok' : 'fail'} bad studio posture`);
  process.exit(good.length === 0 && bad.length >= 6 ? 0 : 1);
}

const files = {};
for (const abs of walk(ROOT)) {
  const rel = path.relative(ROOT, abs).replaceAll(path.sep, '/');
  files[rel] = fs.readFileSync(abs, 'utf8');
}

const findings = evaluate(files);
if (findings.length) {
  console.error(`studio content posture failed (${findings.length})`);
  findings.forEach((finding) => console.error(`  ${finding}`));
  process.exit(1);
}

console.log(`studio content posture ok (${Object.keys(files).length} html files checked)`);
