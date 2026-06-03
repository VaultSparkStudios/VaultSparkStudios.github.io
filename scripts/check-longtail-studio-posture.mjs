#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SELF_TEST = process.argv.includes('--self-test');

const TARGETS = {
  'projects/vorn/index.html': [
    /VaultSpark Studios portfolio/i,
    /studio operating rhythm/i,
    /member feedback loop/i
  ],
  'privacy/index.html': [
    /professional creative studio/i,
    /member systems/i,
    /public studio intelligence/i
  ],
  'terms/index.html': [
    /professional creative studio/i,
    /portfolio of games, tools, worlds, and member systems/i
  ],
  'faq/index.html': [
    /professional creative studio/i,
    /browser-first games, intelligent software, and public studio systems/i
  ],
  'journal/community-enters-the-vault/index.html': [
    /professional creative studio/i,
    /community feedback loop/i
  ]
};

function stripMarkup(text) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function evaluate(files) {
  const findings = [];
  for (const [rel, patterns] of Object.entries(TARGETS)) {
    const text = stripMarkup(files[rel] || '');
    if (!text) {
      findings.push(`${rel} missing from long-tail posture scan`);
      continue;
    }
    for (const pattern of patterns) {
      if (!pattern.test(text)) findings.push(`${rel} missing long-tail posture phrase: ${pattern}`);
    }
  }
  return findings;
}

if (SELF_TEST) {
  const good = Object.fromEntries(Object.entries(TARGETS).map(([rel, patterns]) => [
    rel,
    `<main>${patterns.map((pattern) => pattern.source.replaceAll('\\ ', ' ')).join(' ')}</main>`
  ]));
  const bad = { 'projects/vorn/index.html': '<main>generic project page</main>' };
  const goodFindings = evaluate(good);
  const badFindings = evaluate(bad);
  console.log(`  ${goodFindings.length === 0 ? 'ok' : 'fail'} good long-tail posture contract`);
  console.log(`  ${badFindings.length >= 7 ? 'ok' : 'fail'} bad long-tail posture contract`);
  process.exit(goodFindings.length === 0 && badFindings.length >= 7 ? 0 : 1);
}

const files = {};
for (const rel of Object.keys(TARGETS)) {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) files[rel] = fs.readFileSync(abs, 'utf8');
}

const findings = evaluate(files);
if (findings.length) {
  console.error(`long-tail studio posture failed (${findings.length})`);
  findings.forEach((finding) => console.error(`  ${finding}`));
  process.exit(1);
}

console.log(`long-tail studio posture ok (${Object.keys(TARGETS).length} pages)`);
