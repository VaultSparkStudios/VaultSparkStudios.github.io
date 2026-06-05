#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SELF_TEST = process.argv.includes('--self-test');

function evaluate(html) {
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/g)].map((m) => m[1]).filter((h) => h.startsWith('/'));
  const labels = [...html.matchAll(/<a\b[^>]*href=["'][^"']+["'][^>]*>(.*?)<\/a>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim().toLowerCase()).filter(Boolean);
  const dupLabels = labels.filter((label, idx) => labels.indexOf(label) !== idx && !['overview'].includes(label));
  const vague = labels.filter((label) => /^(more|learn more|click here|read more)$/.test(label));
  return { hrefCount: hrefs.length, duplicateLabels: [...new Set(dupLabels)], vagueLabels: vague };
}

if (SELF_TEST) {
  const result = evaluate('<a href="/a/">More</a><a href="/b/">More</a><a href="/c/">Clear</a>');
  console.log(`  ${result.duplicateLabels.includes('more') && result.vagueLabels.length ? 'ok' : 'fail'} detects weak scent`);
  process.exit(result.duplicateLabels.includes('more') && result.vagueLabels.length ? 0 : 1);
}

const nav = fs.readFileSync(path.join(ROOT, 'scripts', 'propagate-nav.mjs'), 'utf8');
const result = evaluate(nav);
const findings = [];
if (result.hrefCount > 130) findings.push(`nav/footer expose ${result.hrefCount} hrefs; review grouping if it grows past 130`);
if (result.vagueLabels.length) findings.push(`vague labels: ${result.vagueLabels.join(', ')}`);
if (result.duplicateLabels.filter((l) => !['vault member', 'press kit', 'brand kit', 'contact', 'all social channels'].includes(l)).length > 35) findings.push('too many duplicate labels');

if (findings.length) {
  console.error('navigation scent warnings');
  findings.forEach((f) => console.error(`  ${f}`));
  process.exit(1);
}
console.log(`navigation scent ok (${result.hrefCount} hrefs)`);
