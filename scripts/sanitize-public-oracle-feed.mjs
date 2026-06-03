#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizePublicOracleFeed } from './lib/public-oracle-text.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');

const TARGETS = [
  path.join(repoRoot, 'ignis', 'output', 'project-voices.json'),
  path.join(repoRoot, 'ignis', 'output', 'ecosystem-state.json'),
];

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${path.relative(repoRoot, file)} is not valid JSON: ${error.message}`);
  }
}

function stableJSON(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

let changed = 0;

for (const file of TARGETS) {
  if (!fs.existsSync(file)) continue;

  const original = fs.readFileSync(file, 'utf8');
  const sanitized = stableJSON(sanitizePublicOracleFeed(readJSON(file)));

  if (original !== sanitized) {
    changed += 1;
    if (!check) fs.writeFileSync(file, sanitized);
    console.log(`${check ? 'drift' : 'updated'} ${path.relative(repoRoot, file)}`);
  }
}

if (check && changed) {
  console.error(`Public Oracle feed sanitization drift: ${changed} file(s). Run node scripts/sanitize-public-oracle-feed.mjs.`);
  process.exit(1);
}

console.log(`public-oracle-feed sanitizer ${check ? 'check' : 'write'}: ${changed ? `${changed} updated` : 'clean'}`);
