#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SELF_TEST = process.argv.includes('--self-test');

const PAGE_CONTRACTS = {
  'index.html': [/professional operating rhythm/i, /portfolio is alive/i],
  'studio/index.html': [/professional creative studio/i, /Studio OS keeps the work visible/i],
  'projects/index.html': [/project portfolio/i, /infrastructure of the vault/i],
  'games/index.html': [/shared studio standards/i, /inside the portfolio/i],
  'universe/index.html': [/universe layer/i, /lore becomes an operating system/i],
  'membership/index.html': [/identity layer/i, /free tier/i],
  'roadmap/index.html': [/public read on studio momentum/i, /portfolio into a map/i]
};

const REQUIRED_PRIMITIVES = [
  '.vs-immersive-band',
  '.vs-section-kicker',
  '.vs-signal-grid',
  '.vs-proof-note'
];

const LONGTAIL_PRIMITIVE_USAGE = {
  'projects/vorn/index.html': [
    'vs-immersive-band',
    'vs-section-kicker',
    'vs-signal-grid',
    'vs-proof-note'
  ],
  'privacy/index.html': [
    'vs-immersive-band'
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
  for (const [rel, patterns] of Object.entries(PAGE_CONTRACTS)) {
    const text = files[rel] ? stripMarkup(files[rel]) : '';
    if (!text) {
      findings.push(`${rel} missing from studio theme scan`);
      continue;
    }
    for (const pattern of patterns) {
      if (!pattern.test(text)) findings.push(`${rel} missing evolved studio copy: ${pattern}`);
    }
  }

  const css = files['assets/style.css'] || '';
  const doc = files['docs/STUDIO_THEME_EVOLUTION_SYSTEM.md'] || '';
  for (const primitive of REQUIRED_PRIMITIVES) {
    if (!css.includes(primitive)) findings.push(`assets/style.css missing primitive ${primitive}`);
    if (!doc.includes(primitive)) findings.push(`theme evolution doc missing primitive ${primitive}`);
  }
  for (const [rel, classes] of Object.entries(LONGTAIL_PRIMITIVE_USAGE)) {
    const text = files[rel] || '';
    if (!text) {
      findings.push(`${rel} missing from studio primitive usage scan`);
      continue;
    }
    for (const className of classes) {
      if (!text.includes(className)) findings.push(`${rel} missing primitive usage .${className}`);
    }
  }
  if (!/professional creative studio/i.test(doc)) findings.push('theme evolution doc missing professional studio posture');
  return findings;
}

if (SELF_TEST) {
  const complete = Object.fromEntries(Object.entries(PAGE_CONTRACTS).map(([rel, patterns]) => [
    rel,
    `<main>${patterns.map((pattern) => pattern.source.replaceAll('\\ ', ' ')).join(' ')}</main>`
  ]));
  complete['assets/style.css'] = REQUIRED_PRIMITIVES.join('\n');
  complete['docs/STUDIO_THEME_EVOLUTION_SYSTEM.md'] = `professional creative studio\n${REQUIRED_PRIMITIVES.join('\n')}`;
  for (const [rel, classes] of Object.entries(LONGTAIL_PRIMITIVE_USAGE)) {
    complete[rel] = `${complete[rel] || '<main></main>'} ${classes.join(' ')}`;
  }
  const good = evaluate(complete);
  const bad = evaluate({ 'index.html': '<main>generic page</main>', 'assets/style.css': '', 'docs/STUDIO_THEME_EVOLUTION_SYSTEM.md': '' });
  console.log(`  ${good.length === 0 ? 'ok' : 'fail'} good studio theme contract`);
  console.log(`  ${bad.length > 8 ? 'ok' : 'fail'} bad studio theme contract`);
  process.exit(good.length === 0 && bad.length > 8 ? 0 : 1);
}

const files = {};
for (const rel of [...Object.keys(PAGE_CONTRACTS), ...Object.keys(LONGTAIL_PRIMITIVE_USAGE), 'assets/style.css', 'docs/STUDIO_THEME_EVOLUTION_SYSTEM.md']) {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) files[rel] = fs.readFileSync(abs, 'utf8');
}

const findings = evaluate(files);
if (findings.length) {
  console.error(`studio theme evolution failed (${findings.length})`);
  findings.forEach((finding) => console.error(`  ${finding}`));
  process.exit(1);
}

console.log(`studio theme evolution ok (${Object.keys(PAGE_CONTRACTS).length} pages, ${REQUIRED_PRIMITIVES.length} primitives)`);
