#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SELF_TEST = process.argv.includes('--self-test');
const STRICT = process.argv.includes('--strict');

const HTML_TARGETS = [
  'index.html',
  'oracle/index.html',
  'social/index.html',
  'studio-pulse/index.html',
  'nervous-system/index.html',
  'security/index.html'
];

const RUNTIME_TARGETS = [
  'assets/ignis-answer-engine.js',
  'assets/feedback-decision-board.js',
  'assets/social-dashboard-public.js',
  'assets/security-posture.js',
  'assets/intent-flight-director.js',
  'assets/rank-economy-simulator.js'
];

const INLINE_STYLE_ATTR = /\sstyle\s*=\s*["']/i;
const JS_INLINE_STYLE = /(?:\.style\.|setAttribute\(\s*['"]style['"]|cssText\s*=|<[^>]+\sstyle=)/i;
const REQUIRED_STYLE_CLASSES = [
  '.vs-oracle__head',
  'body.light-mode .vs-oracle__head'
];

export function evaluate(files) {
  const findings = [];
  for (const [name, text] of Object.entries(files.html || {})) {
    if (INLINE_STYLE_ATTR.test(text)) findings.push(`${name} contains inline style attributes`);
  }
  for (const [name, text] of Object.entries(files.runtime || {})) {
    if (JS_INLINE_STYLE.test(text)) findings.push(`${name} creates inline styles at runtime`);
  }
  for (const selector of REQUIRED_STYLE_CLASSES) {
    if (!files.style.includes(selector)) findings.push(`assets/style.css missing ${selector}`);
  }
  return findings;
}

if (SELF_TEST) {
  const good = evaluate({
    html: { 'oracle/index.html': '<section class="oracle-card"></section>' },
    runtime: { 'assets/x.js': 'node.className = "oracle-card";' },
    style: '.vs-oracle__head{} body.light-mode .vs-oracle__head{}'
  });
  const bad = evaluate({
    html: { 'oracle/index.html': '<section style="color:red"></section>' },
    runtime: { 'assets/x.js': 'node.style.color = "red";' },
    style: ''
  });
  console.log(`  ${good.length === 0 ? 'ok' : 'fail'} good intelligence style contract`);
  console.log(`  ${bad.length >= 4 ? 'ok' : 'fail'} bad intelligence style contract`);
  process.exit(good.length === 0 && bad.length >= 4 ? 0 : 1);
}

const html = {};
for (const rel of HTML_TARGETS) {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) html[rel] = fs.readFileSync(abs, 'utf8');
}

const runtime = {};
for (const rel of RUNTIME_TARGETS) {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) runtime[rel] = fs.readFileSync(abs, 'utf8');
}

const findings = evaluate({
  html,
  runtime,
  style: fs.readFileSync(path.join(ROOT, 'assets', 'style.css'), 'utf8')
});

if (findings.length && STRICT) {
  console.error('intelligence style contract failed');
  findings.forEach((finding) => console.error(`  ${finding}`));
  process.exit(1);
}

if (findings.length) {
  console.warn(`intelligence style contract advisory (${findings.length} existing debt item${findings.length === 1 ? '' : 's'})`);
  findings.forEach((finding) => console.warn(`  ${finding}`));
} else {
  console.log(`intelligence style contract ok (${Object.keys(html).length} pages, ${Object.keys(runtime).length} runtimes)`);
}
