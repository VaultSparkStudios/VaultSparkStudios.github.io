#!/usr/bin/env node
/** Exact corpus → NDJSON → rendered-page fact parity gate. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveClaimsFeed } from './lib/news-desk.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAYS = path.join(ROOT, 'data', 'news-desk', 'days');
const CLAIMS = path.join(ROOT, 'api', 'news-desk-claims.ndjson');

const parseLines = (text) => String(text || '').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const loadDays = () => fs.readdirSync(DAYS).filter((name) => name.endsWith('.json')).sort()
  .map((name) => JSON.parse(fs.readFileSync(path.join(DAYS, name), 'utf8')))
  .filter((day) => day?.simulated !== true);

export function validateClaimParity({ days, claimsText, pageFor }) {
  const errors = [];
  const expected = parseLines(deriveClaimsFeed(days));
  let actual = [];
  try { actual = parseLines(claimsText); } catch (error) { return [`claims NDJSON parse failed: ${error.message}`]; }
  const expectedFacts = expected.filter((row) => row.type === 'fact');
  const actualFacts = actual.filter((row) => row.type === 'fact');
  const ids = new Set();
  for (const row of actualFacts) {
    if (ids.has(row.id)) errors.push(`duplicate fact id ${row.id}`);
    ids.add(row.id);
    if (!/^[a-f0-9]{64}$/.test(row.hash || '')) errors.push(`${row.id}: invalid stable hash`);
    if (row.anchor !== row.id || !String(row.url || '').endsWith(`#${row.id}`)) errors.push(`${row.id}: article anchor mismatch`);
    if (!row.sourceHealth || !['healthy', 'degraded', 'unavailable', 'declared'].includes(row.sourceHealth.state)) errors.push(`${row.id}: source-health metadata missing`);
  }
  if (JSON.stringify(actualFacts) !== JSON.stringify(expectedFacts)) errors.push(`feed facts differ from corpus (${actualFacts.length}/${expectedFacts.length})`);
  for (const row of actual) {
    const refs = row.factRefs || [];
    if (new Set(refs).size !== refs.length) errors.push(`${row.type}:${row.id || row.story}: duplicate factRefs`);
    for (const ref of refs) if (!ids.has(ref)) errors.push(`${row.type}:${row.id || row.story}: orphan factRef ${ref}`);
  }
  for (const fact of expectedFacts) {
    const html = pageFor(fact.date, fact.story);
    if (!html) { errors.push(`${fact.id}: rendered article missing`); continue; }
    if (!html.includes(`id="${fact.id}"`) || !html.includes(`data-fact-hash="${fact.hash}"`)) errors.push(`${fact.id}: receipt absent from rendered article`);
    if (!html.includes(fact.factText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))) errors.push(`${fact.id}: fact text absent from rendered article`);
  }
  return errors;
}

function selfTest() {
  const days = [{ date: '2026-08-16', stories: [{ slug: 'one', facts: [{ text: 'A fact.', sourceUrl: 'https://example.com/a' }], stances: [{ personaId: 'vera', sources: ['https://example.com/a'] }], predictions: [] }] }];
  const claimsText = deriveClaimsFeed(days);
  const fact = parseLines(claimsText)[0];
  const page = `<li id="${fact.id}" data-fact-hash="${fact.hash}">A fact.</li>`;
  const clean = validateClaimParity({ days, claimsText, pageFor: () => page });
  const duplicate = validateClaimParity({ days, claimsText: claimsText.replace('\n', `\n${JSON.stringify(fact)}\n`), pageFor: () => page });
  const orphanRows = parseLines(claimsText); orphanRows.at(-1).factRefs = ['fact-nope'];
  const orphan = validateClaimParity({ days, claimsText: orphanRows.map(JSON.stringify).join('\n') + '\n', pageFor: () => page });
  const cases = [
    ['exact corpus/feed/page parity passes', clean.length === 0],
    ['duplicate fact ids fail', duplicate.some((e) => /duplicate fact id/.test(e))],
    ['orphan factRefs fail', orphan.some((e) => /orphan factRef/.test(e))],
  ];
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`);
  if (cases.some(([, ok]) => !ok)) process.exit(1);
  console.log(`check-news-claim-parity --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const errors = validateClaimParity({
    days: loadDays(),
    claimsText: fs.readFileSync(CLAIMS, 'utf8'),
    pageFor: (date, story) => {
      const target = path.join(ROOT, 'news', date, story, 'index.html');
      return fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    },
  });
  if (errors.length) {
    errors.forEach((error) => console.error(`✗ ${error}`));
    process.exit(1);
  }
  console.log('check-news-claim-parity: corpus, claims feed, factRefs, and article receipts are exact');
}

main();
