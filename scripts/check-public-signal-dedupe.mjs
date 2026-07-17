#!/usr/bin/env node
/** Homepage public-signal request-coalescing contract. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SELF_TEST = process.argv.includes('--self-test');
const BUS = 'assets/public-intelligence.js';
const SIGNAL_RE = /\/api\/(?:public-intelligence|founder-presence)\.json/;

function homepageAssetScripts(index) {
  return [...String(index).matchAll(/<script\s+[^>]*src=["']\/?(assets\/[^"']+\.js)["'][^>]*>/gi)]
    .map((match) => match[1].split('?')[0]);
}

export function evaluate(index, sources) {
  const findings = [];
  const bus = sources[BUS] || '';
  if (!/window\.VSPublicSignals\s*=/.test(bus)) findings.push('shared signal bus missing');
  if (!/var nativeFetch = window\.fetch\.bind\(window\)/.test(bus) || !/window\.fetch = function/.test(bus)) {
    findings.push('legacy fetch compatibility membrane missing');
  }
  if (!bus.includes("'/api/public-intelligence.json'") || !bus.includes("'/api/founder-presence.json'")) {
    findings.push('signal membrane endpoint allowlist incomplete');
  }

  const eager = [...String(index).matchAll(/<link\s+[^>]*rel=["']prefetch["'][^>]*href=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((href) => ['/api/founder-presence.json', '/vault-member/', '/games/'].includes(href));
  if (eager.length) findings.push(`unconditional prefetches: ${eager.join(', ')}`);

  const scripts = homepageAssetScripts(index);
  const busPosition = scripts.indexOf(BUS);
  if (busPosition < 0) findings.push('signal bus absent from homepage');
  const consumers = scripts.filter((file) => file !== BUS && SIGNAL_RE.test(sources[file] || ''));
  for (const file of consumers) {
    if (scripts.indexOf(file) < busPosition) findings.push(`${file}: loads before signal membrane`);
  }
  return { ok: findings.length === 0, findings, consumers };
}

if (SELF_TEST) {
  const bus = "var nativeFetch = window.fetch.bind(window); window.fetch = function(){}; window.VSPublicSignals = {}; '/api/public-intelligence.json'; '/api/founder-presence.json';";
  const sources = { [BUS]: bus, 'assets/a.js': "fetch('/api/public-intelligence.json')" };
  const good = evaluate('<script src="/assets/public-intelligence.js"></script><script src="/assets/a.js"></script>', sources);
  const badOrder = evaluate('<script src="/assets/a.js"></script><script src="/assets/public-intelligence.js"></script>', sources);
  const badBus = evaluate('<script src="/assets/public-intelligence.js"></script>', { [BUS]: 'window.VSPublicSignals = {}' });
  const cases = [
    ['discovered consumer is membrane-covered', good.ok && good.consumers.length === 1],
    ['consumer-before-membrane fails', badOrder.findings.some((finding) => finding.includes('loads before'))],
    ['missing compatibility membrane fails', badBus.findings.some((finding) => finding.includes('membrane missing'))],
    ['script discovery is source-driven', homepageAssetScripts('<script src="/assets/a.js"></script>').join() === 'assets/a.js'],
  ];
  cases.forEach(([name, ok]) => console.log(`  ${ok ? 'ok' : 'fail'} ${name}`));
  process.exit(cases.every(([, ok]) => ok) ? 0 : 1);
}

const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = homepageAssetScripts(index);
const sources = Object.fromEntries(scripts
  .filter((file) => fs.existsSync(path.join(ROOT, file)))
  .map((file) => [file, fs.readFileSync(path.join(ROOT, file), 'utf8')]));
const result = evaluate(index, sources);
if (!result.ok) {
  console.error('check-public-signal-dedupe: failed');
  result.findings.forEach((finding) => console.error(`  - ${finding}`));
  process.exit(1);
}
console.log(`check-public-signal-dedupe: ok (${result.consumers.length} discovered homepage consumers membrane-covered)`);