#!/usr/bin/env node
/**
 * publish-changelog-draft.mjs — the approve→publish half of the changelog flow (S284).
 *
 * The changelog renders data/consumer-changelog.json (public-safe, curated). Drafts are
 * auto-generated into context/changelog-drafts/<date>.md by draft-changelog-entry.mjs
 * (dev-voice starting point). A human edits the draft into audience voice and marks it
 * `approved: true`. THIS script promotes approved drafts into the live feed — with a
 * public-safe validator that refuses raw dev voice, so the changelog can stay current
 * without ever leaking commit text (the exact leak the ignis-conduit hardening fixed).
 *
 * Founder gate (hand-curated truth, CANON): an entry is published ONLY if its draft
 * carries `approved: true`. Nothing here calls an LLM or auto-approves.
 *
 * Usage:
 *   node scripts/publish-changelog-draft.mjs                 # publish every approved draft
 *   node scripts/publish-changelog-draft.mjs --file <path>   # publish one draft
 *   node scripts/publish-changelog-draft.mjs --dry-run       # validate + preview, no write
 *   node scripts/publish-changelog-draft.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const DRAFTS_DIR = path.join(ROOT, 'context', 'changelog-drafts');
const FEED = path.join(ROOT, 'data', 'consumer-changelog.json');

// Reject dev voice on the public changelog — same discipline as the hero-ticker guard.
const DEVISH = [
  /\bD-S\d/i, /\bS\d{2,}\b/, /\bCANON-\d/i,
  /[A-Za-z0-9_-]+\.(mjs|js|json|html|css|ts|tsx|yml|yaml|md|ndjson|xml)\b/i,
  /\/[a-z0-9_.-]+\//i, /`[^`]+`/, /=>/, /[a-z]+[A-Z][a-zA-Z]*\(/,
  /\bbuild:check\b/i, /\bself-test\b/i, /\bexit\s?\d/i, /\b\d+\/\d+\b/,
  /\bgitignored?\b/i, /\bregex\b/i, /\bndjson\b/i, /\bbeacon\b/i, /\bcron\b/i,
  /\bcloseout\b/i, /\brebase\b/i, /\bcommit\b/i, /\bgate\b/i, /\bself-heal/i,
];

function parseDraft(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!m) return { error: 'missing YAML frontmatter (--- … ---)' };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  const highlights = m[2].split('\n')
    .map((l) => l.replace(/^\s*[-*]\s+/, '').trim())
    .filter(Boolean);
  return { meta, highlights };
}

// Returns { entry } or { error }.
export function validateDraft(parsed) {
  if (parsed.error) return { error: parsed.error };
  const { meta, highlights } = parsed;
  if (!meta.date || !/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) return { error: 'missing/invalid date (YYYY-MM-DD)' };
  if (!meta.title) return { error: 'missing title' };
  if (!highlights.length) return { error: 'no highlight bullets' };
  const approved = /^(true|yes|1)$/i.test(String(meta.approved || ''));
  if (!approved) return { error: 'not approved (set `approved: true` after founder review)' };
  const blob = [meta.title, ...highlights].join(' ␟ ');
  const hit = DEVISH.find((re) => re.test(blob));
  if (hit) return { error: `dev-voice content rejected (matched ${hit}) — rewrite in audience voice` };
  if (highlights.some((h) => h.length > 220)) return { error: 'a highlight exceeds 220 chars — tighten it' };
  return { entry: { date: meta.date, title: meta.title, highlights } };
}

function readFeed() {
  try {
    const raw = JSON.parse(fs.readFileSync(FEED, 'utf8'));
    return Array.isArray(raw) ? { entries: raw } : raw;
  } catch { return { schemaVersion: '1.0', note: 'Published, public-safe changelog entries.', entries: [] }; }
}

function upsert(feed, entry) {
  const key = (e) => e.date + '|' + e.title;
  const map = new Map(feed.entries.map((e) => [key(e), e]));
  map.set(key(entry), entry);
  feed.entries = [...map.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  feed.updated = feed.entries[0] ? feed.entries[0].date : null;
  return feed;
}

function selfTest() {
  const cases = [
    ['valid approved', '---\ndate: 2026-07-16\ntitle: A cleaner changelog\napproved: true\n---\n- Search and filters you can share\n- The banner links to the exact update', (r) => !!r.entry],
    ['not approved', '---\ndate: 2026-07-16\ntitle: X\napproved: false\n---\n- ok', (r) => /not approved/.test(r.error || '')],
    ['dev voice rejected', '---\ndate: 2026-07-16\ntitle: fix\napproved: true\n---\n- ran build:check 213/213 and rebased', (r) => /dev-voice/.test(r.error || '')],
    ['bad date', '---\ndate: soon\ntitle: X\napproved: true\n---\n- ok', (r) => /date/.test(r.error || '')],
    ['no highlights', '---\ndate: 2026-07-16\ntitle: X\napproved: true\n---\n', (r) => /highlight/.test(r.error || '')],
    ['no frontmatter', 'just text', (r) => /frontmatter/.test(r.error || '')],
  ];
  let pass = 0;
  for (const [name, raw, check] of cases) {
    const r = validateDraft(parseDraft(raw));
    const ok = check(r);
    console.log(`  ${ok ? '✓' : '✗'} ${name}`);
    if (ok) pass++;
  }
  console.log(`publish-changelog-draft --self-test: ${pass}/${cases.length}`);
  process.exit(pass === cases.length ? 0 : 1);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) return selfTest();
  const dryRun = args.includes('--dry-run');
  const fileArg = args.indexOf('--file') >= 0 ? args[args.indexOf('--file') + 1] : null;

  let files = [];
  if (fileArg) files = [path.resolve(fileArg)];
  else if (fs.existsSync(DRAFTS_DIR)) files = fs.readdirSync(DRAFTS_DIR).filter((f) => f.endsWith('.md')).map((f) => path.join(DRAFTS_DIR, f));

  if (!files.length) { console.log('publish-changelog-draft: no drafts found (context/changelog-drafts/*.md).'); return; }

  const feed = readFeed();
  let published = 0, skipped = 0;
  for (const file of files) {
    const parsed = parseDraft(fs.readFileSync(file, 'utf8'));
    const res = validateDraft(parsed);
    if (res.error) { console.log(`  – skip ${path.basename(file)}: ${res.error}`); skipped++; continue; }
    upsert(feed, res.entry);
    console.log(`  ✓ ${dryRun ? 'would publish' : 'published'} ${res.entry.date} — ${res.entry.title} (${res.entry.highlights.length} highlights)`);
    published++;
  }
  if (published && !dryRun) {
    fs.writeFileSync(FEED, JSON.stringify(feed, null, 2) + '\n');
    console.log(`publish-changelog-draft: wrote ${feed.entries.length} entries → data/consumer-changelog.json (newest ${feed.updated}). Run \`npm run build\` to render.`);
  } else if (!published) {
    console.log(`publish-changelog-draft: nothing published (${skipped} skipped).`);
  }
}

// Run only when invoked directly (import-safe for the exported validateDraft).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
