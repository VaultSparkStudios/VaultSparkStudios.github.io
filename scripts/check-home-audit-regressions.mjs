#!/usr/bin/env node
/**
 * check-home-audit-regressions.mjs
 *
 * Guards source-visible regressions surfaced by the 2026-07-01 external
 * homepage audit: placeholder proof counters, crawlable loading copy, mystery
 * titles with no audience promise, and the roadmap/project Vault Pipeline label
 * collision.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const index = readFileSync(resolve(root, 'index.html'), 'utf8');
const nav = readFileSync(resolve(root, 'scripts/propagate-nav.mjs'), 'utf8');

const failures = [];

function fail(message) {
  failures.push(message);
}

function sectionBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  if (start === -1) return '';
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  return source.slice(start, end === -1 ? undefined : end);
}

const proof = sectionBetween(index, '<section id="vault-proof"', '<!-- S201 vault-climbers-monthly-digest');
if (!proof) fail('vault-proof section missing from homepage');
for (const id of ['proof-members', 'proof-sparked', 'proof-challenges', 'proof-sessions']) {
  const match = proof.match(new RegExp(`<strong id="${id}">([\\s\\S]*?)</strong>`));
  if (!match) {
    fail(`${id} fallback missing`);
  } else if (/^[\s\u2014-]+$/.test(match[1])) {
    fail(`${id} still renders a dash placeholder fallback`);
  }
}

const spine = sectionBetween(index, '<section id="studio-spine"', '<!-- Micro-feedback');
if (!spine) fail('studio-spine section missing from homepage');
if (/Loading|loading|Consulting|Proof loading/i.test(spine)) {
  fail('studio-spine contains crawlable loading/consulting placeholder copy');
}
if (/<strong data-spine-(active|pulses)>[\s\u2014-]+<\/strong>/.test(spine)) {
  fail('studio-spine count fallback still uses dash placeholders');
}

if (/Project \?\?\?/.test(index)) {
  fail('homepage still exposes Project ??? mystery placeholder');
}

if (nav.includes('<a href="/roadmap/">Vault Pipeline</a>')) {
  fail('roadmap nav label still collides with the Vault Pipeline project label');
}

if (failures.length) {
  console.error('check-home-audit-regressions: FAIL');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('check-home-audit-regressions: ok');