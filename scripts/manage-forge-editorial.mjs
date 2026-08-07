#!/usr/bin/env node
// Source-bound editorial state machine for the human-voice Forge journal.
// Drafting is autonomous; review and publication are explicit, separately
// evidenced transitions. Unreviewed prose never becomes a journal route.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildForgeDraft, extractDoneLines } from './draft-weekly-forge.mjs';

const MANIFEST_PATH = 'data/forge-editorial/manifest.json';
const RECEIPT_PATH = 'api/forge-editorial-freshness.json';
const LEDGER_PATH = 'feed/forge-ledger.json';
const BOARD_PATH = 'context/TASK_BOARD.md';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const readText = (path) => readFileSync(path, 'utf8');
const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

export function sourceBinding({ ledgerText, boardText }) {
  const ledgerHash = sha256(ledgerText);
  const boardHash = sha256(boardText);
  return {
    ledger: { path: LEDGER_PATH, sha256: ledgerHash },
    taskBoard: { path: BOARD_PATH, sha256: boardHash },
    aggregateSha256: sha256(`${ledgerHash}:${boardHash}`),
  };
}

export function transition(entry, next, evidence = {}) {
  const allowed = { draft: ['reviewed'], reviewed: ['published'], published: [] };
  if (!allowed[entry.status]?.includes(next)) throw new Error(`invalid editorial transition ${entry.status} -> ${next}`);
  if (next === 'reviewed' && (!evidence.reviewer || !evidence.sourceHash)) throw new Error('review requires reviewer and confirmed source hash');
  if (next === 'published' && (!evidence.url || !evidence.contentHash)) throw new Error('publication requires URL and confirmed content hash');
  return { ...entry, status: next, transitions: [...(entry.transitions || []), { state: next, ...evidence }] };
}

export function buildReceipt({ manifest, nowIso }) {
  const entries = manifest.entries || [];
  const latest = entries.at(-1) || null;
  const published = entries.filter((entry) => entry.status === 'published').at(-1) || null;
  const publishedAt = published?.transitions?.filter((item) => item.state === 'published').at(-1)?.at || null;
  const ageDays = publishedAt == null ? null : Math.max(0, Math.floor((Date.parse(nowIso) - Date.parse(publishedAt)) / 86400000));
  const state = publishedAt == null ? 'never-published-by-circuit' : ageDays > manifest.maxPublishedAgeDays ? 'stale' : 'fresh';
  return {
    schemaVersion: 1,
    generatedAt: nowIso,
    authority: 'editorial-state-machine',
    state,
    maxPublishedAgeDays: manifest.maxPublishedAgeDays,
    latest: latest && { id: latest.id, status: latest.status, asOf: latest.asOf, contentSha256: latest.contentSha256, sourceAggregateSha256: latest.sources.aggregateSha256 },
    latestPublishedAt: publishedAt,
    publishedAgeDays: ageDays,
    counts: Object.fromEntries(['draft', 'reviewed', 'published'].map((status) => [status, entries.filter((entry) => entry.status === status).length])),
    publishable: latest?.status === 'reviewed',
    nextAction: latest?.status === 'draft'
      ? `Review ${latest.id} and confirm source hash ${latest.sources.aggregateSha256}`
      : latest?.status === 'reviewed'
        ? `Publish ${latest.id} only after rendered-pixel review, then record its public URL and content hash`
        : 'Create the next source-bound Forge draft',
  };
}

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return { schemaVersion: 1, maxPublishedAgeDays: 30, entries: [] };
  return JSON.parse(readText(MANIFEST_PATH));
}

function validateManifest(manifest) {
  const errors = [];
  const ids = new Set();
  for (const entry of manifest.entries || []) {
    if (ids.has(entry.id)) errors.push(`duplicate id ${entry.id}`);
    ids.add(entry.id);
    if (!['draft', 'reviewed', 'published'].includes(entry.status)) errors.push(`invalid state ${entry.id}`);
    if (!entry.contentSha256 || !entry.sources?.aggregateSha256) errors.push(`missing hash binding ${entry.id}`);
    if (!existsSync(entry.draftPath)) errors.push(`missing draft ${entry.draftPath}`);
    else if (sha256(readText(entry.draftPath)) !== entry.contentSha256) errors.push(`content drift ${entry.id}`);
  }
  return errors;
}

function draft({ days = 7 } = {}) {
  const ledgerText = readText(LEDGER_PATH);
  const boardText = readText(BOARD_PATH);
  const ledger = JSON.parse(ledgerText);
  const dates = (ledger.items || []).map((item) => item.date_published).filter(Boolean).sort();
  const asOf = dates.at(-1) || '2026-01-01T00:00:00.000Z';
  const date = new Date(asOf).toISOString().slice(0, 10);
  const id = `forge-week-${date}`;
  const draftPath = join('data', 'forge-editorial', 'drafts', `${id}.md`).replaceAll('\\', '/');
  const markdown = `${buildForgeDraft({ items: ledger.items || [], doneLines: extractDoneLines(boardText), asOf, days })}\n`;
  const sources = sourceBinding({ ledgerText, boardText });
  const manifest = loadManifest();
  const prior = (manifest.entries || []).find((entry) => entry.id === id);
  if (prior && prior.status !== 'draft') throw new Error(`${id} is ${prior.status}; refusing to overwrite it`);
  mkdirSync(dirname(draftPath), { recursive: true });
  writeFileSync(draftPath, markdown);
  const entry = { id, status: 'draft', asOf, windowDays: days, draftPath, contentSha256: sha256(markdown), sources, transitions: [{ state: 'draft', at: asOf, actor: 'forge-editorial-circuit' }] };
  manifest.entries = [...(manifest.entries || []).filter((item) => item.id !== id), entry].sort((a, b) => a.asOf.localeCompare(b.asOf));
  writeJson(MANIFEST_PATH, manifest);
  writeJson(RECEIPT_PATH, buildReceipt({ manifest, nowIso: asOf }));
  return entry;
}

function updateState({ action, id, reviewer, sourceHash, url, contentHash, at }) {
  const manifest = loadManifest();
  const index = (manifest.entries || []).findIndex((entry) => entry.id === id);
  if (index < 0) throw new Error(`unknown editorial draft ${id}`);
  const now = at || new Date().toISOString();
  if (action === 'review') {
    if (sourceHash !== manifest.entries[index].sources.aggregateSha256) throw new Error('source hash confirmation does not match');
    manifest.entries[index] = transition(manifest.entries[index], 'reviewed', { at: now, reviewer, sourceHash });
  } else {
    if (contentHash !== manifest.entries[index].contentSha256) throw new Error('content hash confirmation does not match');
    manifest.entries[index] = transition(manifest.entries[index], 'published', { at: now, actor: reviewer, url, contentHash });
  }
  writeJson(MANIFEST_PATH, manifest);
  writeJson(RECEIPT_PATH, buildReceipt({ manifest, nowIso: now }));
}

function selfTest() {
  let pass = 0;
  const check = (name, condition) => { if (!condition) throw new Error(`self-test failed: ${name}`); pass++; };
  const sources = sourceBinding({ ledgerText: '{}', boardText: '# board' });
  check('binding is deterministic', sources.aggregateSha256 === sourceBinding({ ledgerText: '{}', boardText: '# board' }).aggregateSha256);
  const entry = { id: 'x', status: 'draft', sources, contentSha256: 'abc', transitions: [] };
  const reviewed = transition(entry, 'reviewed', { at: '2026-08-04T00:00:00Z', reviewer: 'founder', sourceHash: sources.aggregateSha256 });
  check('review transition', reviewed.status === 'reviewed');
  const published = transition(reviewed, 'published', { at: '2026-08-04T01:00:00Z', actor: 'founder', url: '/journal/x/', contentHash: 'abc' });
  check('publish transition', published.status === 'published');
  check('receipt reports fresh', buildReceipt({ manifest: { maxPublishedAgeDays: 30, entries: [published] }, nowIso: '2026-08-05T00:00:00Z' }).state === 'fresh');
  let rejected = false;
  try { transition(entry, 'published', { url: '/x', contentHash: 'abc' }); } catch { rejected = true; }
  check('cannot skip review', rejected);
  console.log(`manage-forge-editorial self-test: ${pass}/${pass} passing`);
}

const argv = process.argv.slice(2);
if (argv.includes('--self-test')) selfTest();
else if (argv.includes('--draft')) {
  const daysAt = argv.indexOf('--days');
  const entry = draft({ days: daysAt >= 0 ? Number(argv[daysAt + 1]) || 7 : 7 });
  console.log(`Forge editorial draft ${entry.id}: ${entry.contentSha256}`);
} else if (argv.includes('--check')) {
  const manifest = loadManifest();
  const errors = validateManifest(manifest);
  const receipt = JSON.parse(readText(RECEIPT_PATH));
  const expected = buildReceipt({ manifest, nowIso: receipt.generatedAt });
  if (JSON.stringify(expected) !== JSON.stringify(receipt)) errors.push('freshness receipt drift');
  if (errors.length) { errors.forEach((error) => console.error(error)); process.exit(1); }
  console.log(`Forge editorial state valid: ${(manifest.entries || []).length} entr${manifest.entries?.length === 1 ? 'y' : 'ies'}`);
} else if (argv.includes('--review')) {
  updateState({ action: 'review', id: argv[argv.indexOf('--review') + 1], reviewer: argv[argv.indexOf('--reviewer') + 1], sourceHash: argv[argv.indexOf('--source-hash') + 1] });
} else if (argv.includes('--publish')) {
  updateState({ action: 'publish', id: argv[argv.indexOf('--publish') + 1], reviewer: argv[argv.indexOf('--reviewer') + 1], url: argv[argv.indexOf('--url') + 1], contentHash: argv[argv.indexOf('--content-hash') + 1] });
} else {
  console.log('Usage: --draft [--days N] | --review ID --reviewer NAME --source-hash SHA | --publish ID --reviewer NAME --url URL --content-hash SHA | --check | --self-test');
}
