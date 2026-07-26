#!/usr/bin/env node
/**
 * The /status/ incident renderer must only read fields the feed actually has.
 *
 * S293: the incident panel was written against `d.current.degradedSince` while
 * api/worker-route-history.json publishes `current.onsetNotLaterThan`. Every
 * generator self-test was green — they cover the FEED, not the READER — so the
 * page silently rendered "an unrecorded date" in place of the incident onset.
 * A real browser caught it; nothing in CI would have.
 *
 * This gate reads the renderer's actual property accesses out of the page and
 * validates each one against the committed feed, so a field rename on either
 * side fails the build instead of degrading a public trust surface to a
 * plausible-looking fallback.
 *
 * Deliberately narrow: it checks the incident block's reads against one feed.
 * A generic "all JS vs all JSON" scanner would drown in false positives and get
 * allowlisted into uselessness.
 *
 * Usage:
 *   node scripts/check-status-feed-field-contract.mjs
 *   node scripts/check-status-feed-field-contract.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = path.join(ROOT, 'status', 'index.html');
const FEED = path.join(ROOT, 'api', 'worker-route-history.json');
const START = "fetch('/api/worker-route-history.json'";
const END = '</script>';

/** Isolate the renderer block so unrelated page scripts cannot vouch for a field. */
export function extractBlock(html) {
  const start = html.indexOf(START);
  if (start === -1) return null;
  const end = html.indexOf(END, start);
  return end === -1 ? null : html.slice(start, end);
}

/**
 * Property reads the renderer performs, mapped to their path in the feed.
 * `d` is the feed root, `d.current` its current block, and the forEach binding
 * is an element of `d.incidents`.
 */
export function extractReads(block, itemBinding = 'i') {
  const reads = new Set();
  for (const m of block.matchAll(/\bd\.current\.([A-Za-z_]\w*)/g)) reads.add(`current.${m[1]}`);
  for (const m of block.matchAll(/\bd\.([A-Za-z_]\w*)/g)) {
    if (m[1] !== 'current') reads.add(m[1]);
  }
  const itemRe = new RegExp(`\\b${itemBinding}\\.([A-Za-z_]\\w*)`, 'g');
  for (const m of block.matchAll(itemRe)) reads.add(`incidents[].${m[1]}`);
  return [...reads].sort();
}

/** Resolve a dotted read against the feed. Arrays resolve through their first element. */
export function feedHas(feed, read) {
  if (read.startsWith('incidents[].')) {
    const key = read.slice('incidents[].'.length);
    const sample = Array.isArray(feed.incidents) ? feed.incidents[0] : null;
    return sample ? Object.hasOwn(sample, key) : false;
  }
  if (read.startsWith('current.')) {
    const key = read.slice('current.'.length);
    return !!feed.current && Object.hasOwn(feed.current, key);
  }
  return Object.hasOwn(feed, read);
}

function selfTest() {
  const block = "fetch('/api/worker-route-history.json', {}) d.state d.current.openIncidents d.current.degradedForDays d.asOf d.incidents.forEach(function (i) { i.method i.path })";
  const feed = {
    state: 'mismatch',
    asOf: 'x',
    incidents: [{ method: 'GET', path: '/x', open: true }],
    current: { openIncidents: 1, degradedForDays: 2 },
  };
  const reads = extractReads(block);
  const bogus = extractReads(block + ' d.current.degradedSince');
  const html = `<html><script>${block}</script><script>d.current.ghostField</script></html>`;

  const cases = [
    ['renderer block is isolated from other scripts', (extractBlock(html) || '').includes('i.method') && !(extractBlock(html) || '').includes('ghostField')],
    ['a missing block is reported, not assumed empty', extractBlock('<html></html>') === null],
    ['root reads are collected', reads.includes('state') && reads.includes('asOf')],
    ['current.* reads are collected', reads.includes('current.openIncidents') && reads.includes('current.degradedForDays')],
    ['current is not double-counted as a root field', !reads.includes('current')],
    ['incident item reads are collected', reads.includes('incidents[].method') && reads.includes('incidents[].path')],
    ['every real read resolves against the feed', reads.every((read) => feedHas(feed, read))],
    ['THE S293 BUG: a wrong current.* field is caught', bogus.includes('current.degradedSince') && !feedHas(feed, 'current.degradedSince')],
    ['a wrong incident field is caught', !feedHas(feed, 'incidents[].expectedStatusCode')],
    ['a wrong root field is caught', !feedHas(feed, 'summary')],
    ['an empty incidents array cannot vouch for a field', !feedHas({ ...feed, incidents: [] }, 'incidents[].method')],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`check-status-feed-field-contract --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`check-status-feed-field-contract --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const block = extractBlock(fs.readFileSync(PAGE, 'utf8'));
  if (!block) {
    console.error('check-status-feed-field-contract: the /status/ incident renderer block was not found — if it was intentionally removed, remove this gate too');
    process.exit(1);
  }
  const feed = JSON.parse(fs.readFileSync(FEED, 'utf8'));
  const reads = extractReads(block);
  const missing = reads.filter((read) => !feedHas(feed, read));
  if (missing.length) {
    console.error('check-status-feed-field-contract: /status/ reads field(s) api/worker-route-history.json does not publish:');
    for (const read of missing) console.error(`  ✗ ${read}`);
    console.error('  a missing field renders a plausible fallback instead of the truth — fix the reader or the feed, never the fallback.');
    process.exit(1);
  }
  console.log(`check-status-feed-field-contract: ${reads.length} renderer field read(s) all backed by api/worker-route-history.json`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
