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
 * Deliberately narrow: it checks the incident and deploy-currency renderer
 * blocks against their exact feeds. A generic "all JS vs all JSON" scanner
 * would drown in false positives and get allowlisted into uselessness.
 *
 * Usage:
 *   node scripts/check-status-feed-field-contract.mjs
 *   node scripts/check-status-feed-field-contract.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from './lib/safe-spawn.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = path.join(ROOT, 'status', 'index.html');
const FEED = path.join(ROOT, 'api', 'worker-route-history.json');
const DEPLOY_FEED = path.join(ROOT, 'api', 'deploy-currency.json');
const NEWSROOM_FEED = path.join(ROOT, 'api', 'newsroom-run.json');
const START = "fetch('/api/worker-route-history.json'";
const DEPLOY_START = "getProof('/api/deploy-currency.json'";
const END = '</script>';

/** Isolate the renderer block so unrelated page scripts cannot vouch for a field. */
export function extractBlockAt(html, marker, endMarker = END) {
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const end = html.indexOf(endMarker, start + marker.length);
  return end === -1 ? null : html.slice(start, end);
}
export function extractBlock(html) {
  return extractBlockAt(html, START);
}

/**
 * Property reads the renderer performs, mapped to their path in the feed.
 * `d` is the feed root, `d.current` its current block, and the forEach binding
 * is an element of `d.incidents`.
 */
export function extractReads(block, itemBinding = 'i') {
  const reads = new Set();
  for (const m of block.matchAll(/\bd\.([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)/g)) reads.add(m[1]);
  const onsetAssignment = block.match(/\bvar\s+onset\s*=\s*([^;]+);/);
  if (onsetAssignment) {
    const targets = [...onsetAssignment[1].matchAll(/\bd\.([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)/g)];
    const target = targets.at(-1)?.[1];
    if (target) for (const m of block.matchAll(/\bonset\.([A-Za-z_]\w*)/g)) reads.add(`${target}.${m[1]}`);
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
  let current = feed;
  for (const part of read.split('.')) {
    if (!current || typeof current !== 'object' || !Object.hasOwn(current, part)) return false;
    current = current[part];
  }
  return true;
}

function selfTest() {
  const block = "fetch('/api/worker-route-history.json', {}) d.state d.current.openIncidents d.current.degradedForDays d.asOf d.recovery.latest.invariants.closedRoutes var onset = d.honesty.onsetEvidence.interval; onset.onsetNotEarlierThan (d.incidents || []).forEach(function (i) { i.method i.path })";
  const feed = {
    state: 'mismatch',
    asOf: 'x',
    incidents: [{ method: 'GET', path: '/x', open: true }],
    current: { openIncidents: 1, degradedForDays: 2 },
    recovery: { latest: { invariants: { closedRoutes: 1 } } },
    honesty: { onsetEvidence: { interval: { onsetNotEarlierThan: 'x' } } },
  };
  const reads = extractReads(block);
  const bogus = extractReads(block + ' d.current.degradedSince');
  const html = `<html><script>${block}</script><script>d.current.ghostField</script></html>`;
  const deployBlock = "getProof('/api/deploy-currency.json') d.state d.publisherPromotion.maxLagHours";
  const deployFeed = { state: 'current', publisherPromotion: { maxLagHours: 4 } };

  const cases = [
    ['renderer block is isolated from other scripts', (extractBlock(html) || '').includes('i.method') && !(extractBlock(html) || '').includes('ghostField')],
    ['a missing block is reported, not assumed empty', extractBlock('<html></html>') === null],
    ['root reads are collected', reads.includes('state') && reads.includes('asOf')],
    ['current.* reads are collected', reads.includes('current.openIncidents') && reads.includes('current.degradedForDays')],
    ['nested recovery reads are collected', reads.includes('recovery.latest.invariants.closedRoutes')],
    ['aliased onset reads resolve to their feed path', reads.includes('honesty.onsetEvidence.interval.onsetNotEarlierThan')],
    ['incident item reads are collected', reads.includes('incidents[].method') && reads.includes('incidents[].path')],
    ['every real read resolves against the feed', reads.every((read) => feedHas(feed, read))],
    ['THE S293 BUG: a wrong current.* field is caught', bogus.includes('current.degradedSince') && !feedHas(feed, 'current.degradedSince')],
    ['a wrong incident field is caught', !feedHas(feed, 'incidents[].expectedStatusCode')],
    ['a wrong root field is caught', !feedHas(feed, 'summary')],
    ['an empty incidents array cannot vouch for a field', !feedHas({ ...feed, incidents: [] }, 'incidents[].method')],
    ['deploy promotion cadence reads are feed-backed',
      extractReads(deployBlock).every((read) => feedHas(deployFeed, read))],
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
  // These receipts feed the status surface. Validate them immediately before
  // checking the renderer so the public-field contract cannot vouch for stale
  // or structurally invalid inputs.
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/build-attention-pressure.mjs'), '--check'], { cwd: ROOT, stdio: 'inherit' });
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/probe-canonical-destinations.mjs'), '--check'], { cwd: ROOT, stdio: 'inherit' });
  const html = fs.readFileSync(PAGE, 'utf8');
  const contracts = [
    { label: 'incident', marker: START, path: FEED },
    {
      label: 'deploy currency',
      marker: DEPLOY_START,
      endMarker: "getProof('/api/worker-route-provenance.json'",
      path: DEPLOY_FEED,
    },
    {
      label: 'newsroom automation',
      marker: "getProof('/api/newsroom-run.json'",
      endMarker: "getProof('/api/site-health.json'",
      path: NEWSROOM_FEED,
    },
  ];
  let totalReads = 0;
  for (const contract of contracts) {
    const block = extractBlockAt(html, contract.marker, contract.endMarker);
    if (!block) {
      console.error(`check-status-feed-field-contract: the /status/ ${contract.label} renderer block was not found`);
      process.exit(1);
    }
    const feed = JSON.parse(fs.readFileSync(contract.path, 'utf8'));
    const reads = extractReads(block);
    const missing = reads.filter((read) => !feedHas(feed, read));
    if (missing.length) {
      console.error(`check-status-feed-field-contract: /status/ ${contract.label} reads field(s) ${path.relative(ROOT, contract.path)} does not publish:`);
      for (const read of missing) console.error(`  ✗ ${read}`);
      console.error('  a missing field renders a plausible fallback instead of the truth — fix the reader or the feed, never the fallback.');
      process.exit(1);
    }
    totalReads += reads.length;
  }
  console.log(`check-status-feed-field-contract: ${totalReads} renderer field read(s) backed by their exact public feeds`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
