#!/usr/bin/env node
/** Homepage public-signal request-coalescing contract. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SELF_TEST = process.argv.includes('--self-test');
/**
 * The signal bus, resolved by STEM rather than by a frozen path.
 *
 * S357 — this was the literal 'assets/public-intelligence.js'. Fingerprinting
 * that file (so a retired fetch could not be served stale) moved it to
 * assets/public-intelligence.shell-<hash>.js, and this gate immediately reported
 * "shared signal bus missing" and "signal bus absent from homepage" — on a
 * homepage where the bus was present and correct.
 *
 * Same shape of defect as a required literal call site: pinning a gate to a path
 * turns a legitimate rotation into a false red, and the obvious repair is to
 * edit the literal, which just moves the trap one hash along. Matching the stem
 * follows every future rotation for free, and an unfingerprinted file still
 * matches its own bare name.
 */
const BUS_RE = /^assets\/public-intelligence(?:\.shell-[a-f0-9]{10})?\.js$/;
export function resolveBus(scripts) {
  return (scripts || []).find((file) => BUS_RE.test(file)) || 'assets/public-intelligence.js';
}
const SIGNAL_RE = /\/api\/public-intelligence\.json/;

function homepageAssetScripts(index) {
  return [...String(index).matchAll(/<script\s+[^>]*src=["']\/?(assets\/[^"']+\.js)["'][^>]*>/gi)]
    .map((match) => match[1].split('?')[0]);
}

export function evaluate(index, sources) {
  const findings = [];
  const BUS = resolveBus(homepageAssetScripts(index));
  const bus = sources[BUS] || '';
  if (!/window\.VSPublicSignals\s*=/.test(bus)) findings.push('shared signal bus missing');
  if (!/var nativeFetch = window\.fetch\.bind\(window\)/.test(bus) || !/window\.fetch = function/.test(bus)) {
    findings.push('legacy fetch compatibility membrane missing');
  }
  if (!bus.includes("'/api/public-intelligence.json'")) {
    findings.push('signal membrane endpoint allowlist incomplete');
  }

  const eager = [...String(index).matchAll(/<link\s+[^>]*rel=["']prefetch["'][^>]*href=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((href) => ['/vault-member/', '/games/'].includes(href));
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
  const bus = "var nativeFetch = window.fetch.bind(window); window.fetch = function(){}; window.VSPublicSignals = {}; '/api/public-intelligence.json';";
  const BARE = 'assets/public-intelligence.js';
  const HASHED = 'assets/public-intelligence.shell-c86a6ecc39.js';
  const sources = { [BARE]: bus, [HASHED]: bus, 'assets/a.js': "fetch('/api/public-intelligence.json')" };
  const good = evaluate('<script src="/assets/public-intelligence.js"></script><script src="/assets/a.js"></script>', sources);
  const badOrder = evaluate('<script src="/assets/a.js"></script><script src="/assets/public-intelligence.js"></script>', sources);
  const badBus = evaluate('<script src="/assets/public-intelligence.js"></script>', { [BARE]: 'window.VSPublicSignals = {}' });
  // S357 — the rotation control. Before resolveBus() this exact homepage
  // reported "shared signal bus missing" and "signal bus absent from homepage"
  // while the bus was present and correct, just fingerprinted.
  const rotated = evaluate('<script src="/assets/public-intelligence.shell-c86a6ecc39.js"></script><script src="/assets/a.js"></script>', sources);
  const cases = [
    ['discovered consumer is membrane-covered', good.ok && good.consumers.length === 1],
    ['consumer-before-membrane fails', badOrder.findings.some((finding) => finding.includes('loads before'))],
    ['missing compatibility membrane fails', badBus.findings.some((finding) => finding.includes('membrane missing'))],
    ['script discovery is source-driven', homepageAssetScripts('<script src="/assets/a.js"></script>').join() === 'assets/a.js'],
    ['a FINGERPRINTED bus is still found', rotated.ok && rotated.consumers.length === 1],
    ['the bus resolves by stem, not by a frozen path', resolveBus([HASHED]) === HASHED && resolveBus([BARE]) === BARE],
    ['an unrelated asset is never mistaken for the bus', resolveBus(['assets/other.js']) === BARE],
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
