#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

// Importing this module (a test, another gate) must not run a 188-file scan and
// print a verdict as a side effect. Guarded so only direct invocation executes.
const RUN_DIRECT = process.argv[1]
  && url.pathToFileURL(process.argv[1]).href === import.meta.url;

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

/**
 * How close a solo-bet phrase has to sit to a VaultSpark mention before it reads
 * as self-description rather than reporting. One sentence, roughly.
 */
const SELF_REFERENCE_WINDOW = 180;
const STUDIO_MENTION = /vaultspark|the studio|our studio|we build|this studio/i;

/**
 * The Desk publishes journalism about other organisations, and the solo-bet
 * patterns are about how THE STUDIO presents itself — so on `/news/` they fire
 * on the wrong thing. S309: JUNO's piece named an AWS support engineer nobody
 * had credited, and "one person" blocked the build. Founder call, taken
 * explicitly: exempt third-party editorial.
 *
 * The exemption is NOT blanket. A news page describing VaultSpark itself as a
 * one-person shop is precisely what the rule exists to catch, and a story is an
 * easy place for that to slip in unnoticed. So on news pages the phrase only
 * passes when it is NOT sitting next to a studio mention — reporting is free,
 * self-description is still gated.
 */
function isEditorial(name) {
  return name === 'news/index.html' || name.startsWith('news/');
}

export function evaluate(files) {
  const findings = [];
  for (const [name, raw] of Object.entries(files)) {
    const text = stripMarkup(raw);
    for (const pattern of SOLO_BET_PATTERNS) {
      const match = text.match(pattern);
      if (!match) continue;
      if (isEditorial(name)) {
        const at = match.index ?? 0;
        const near = text.slice(Math.max(0, at - SELF_REFERENCE_WINDOW), at + SELF_REFERENCE_WINDOW);
        if (!STUDIO_MENTION.test(near)) continue; // reporting about someone else
        findings.push(`${name} describes the STUDIO with solo-bet framing: ${pattern} (editorial is exempt, self-description is not)`);
        continue;
      }
      findings.push(`${name} contains solo-bet framing: ${pattern}`);
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
  // Editorial exemption, both directions. A one-way test would let the exemption
  // silently widen into "news pages are never checked", which is how the studio
  // ends up describing itself as a solo bet inside a story nobody re-reads.
  // evaluate() also reports the absent studio/index.html, which is unrelated to
  // solo-bet framing — assert on the finding CLASS, not the count, or the test
  // passes and fails for reasons it is not about.
  const soloBet = (findings) => findings.filter((f) => /solo-bet/.test(f));
  const editorialReporting = soloBet(evaluate({
    'news/2026-08-10/a-story/index.html':
      '<main>An AWS support engineer found the snapshot. One person awake, and zero of the coverage was about him.</main>',
  }));
  const editorialSelfDescription = soloBet(evaluate({
    'news/2026-08-10/b-story/index.html':
      '<main>VaultSpark Studios is one person with a single seat, moving like many.</main>',
  }));

  console.log(`  ${good.length === 0 ? 'ok' : 'fail'} good studio posture`);
  console.log(`  ${bad.length >= 6 ? 'ok' : 'fail'} bad studio posture`);
  console.log(`  ${editorialReporting.length === 0 ? 'ok' : 'fail'} editorial about a third party is exempt`);
  console.log(`  ${editorialSelfDescription.length > 0 ? 'ok' : 'fail'} editorial describing the STUDIO is still caught`);
  const pass = good.length === 0 && bad.length >= 6
    && editorialReporting.length === 0 && editorialSelfDescription.length > 0;
  process.exit(pass ? 0 : 1);
}

if (RUN_DIRECT) {
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
}
