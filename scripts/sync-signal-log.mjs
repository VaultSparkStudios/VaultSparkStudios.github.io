/**
 * sync-signal-log.mjs
 *
 * Reads the private studio-ops Creative Direction Record (when available locally) and
 * extracts entries explicitly marked `public: true`. Writes a public-safe markdown log to
 * `signal-log/index.html` (replaces the entries section) so the studio's open
 * communications loop is visible from /signal-log/.
 *
 * Usage:
 *   node scripts/sync-signal-log.mjs [--dry-run]
 *
 * Behavior:
 *   - Looks for `../vaultspark-studio-ops/docs/CREATIVE_DIRECTION_RECORD.md` relative to repo root
 *     OR honors `STUDIO_OPS_PATH` env var.
 *   - Parses entries demarcated by `## YYYY-MM-DD …` and looks for a `public: true` line in each entry.
 *   - Emits public-safe rendering to `signal-log/index.html` between
 *     <!-- signal-log:start --> and <!-- signal-log:end --> markers.
 *   - If the source file is unavailable, exits 0 with a log line — non-failing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry-run');

const opsPath = process.env.STUDIO_OPS_PATH
  || path.resolve(ROOT, '..', 'vaultspark-studio-ops');
const cdrFile = path.join(opsPath, 'docs', 'CREATIVE_DIRECTION_RECORD.md');

if (!fs.existsSync(cdrFile)) {
  console.log('[sync-signal-log] CDR not found at ' + cdrFile + ' — skipping.');
  process.exit(0);
}

const raw = fs.readFileSync(cdrFile, 'utf8');
const entryRegex = /^## (\d{4}-\d{2}-\d{2})[^\n]*\n([\s\S]*?)(?=^## \d{4}-\d{2}-\d{2}|\Z)/gm;
const publicEntries = [];
let m;
while ((m = entryRegex.exec(raw)) !== null) {
  const date = m[1];
  const body = m[2];
  if (!/^\s*public\s*:\s*true\s*$/im.test(body)) continue;
  // strip the public: line and any private: lines
  const cleaned = body
    .split('\n')
    .filter((line) => !/^\s*public\s*:/i.test(line) && !/^\s*private\s*:/i.test(line))
    .join('\n')
    .trim();
  publicEntries.push({ date, body: cleaned });
}

publicEntries.sort((a, b) => b.date.localeCompare(a.date));

const renderedEntries = publicEntries.map((e) => {
  const safeBody = e.body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return [
    '<article class="signal-entry">',
    '  <header><time datetime="' + e.date + '">' + e.date + '</time></header>',
    '  <pre class="signal-body">' + safeBody + '</pre>',
    '</article>',
  ].join('\n');
}).join('\n\n');

const block = '<!-- signal-log:start -->\n' + (renderedEntries || '<p class="signal-empty">No public signals yet. The forge is quiet on this channel — drop us a line at <a href="/contact/">/contact/</a>.</p>') + '\n<!-- signal-log:end -->';

const target = path.join(ROOT, 'signal-log', 'index.html');
if (!fs.existsSync(target)) {
  console.log('[sync-signal-log] /signal-log/index.html does not exist yet — create it with markers <!-- signal-log:start --> ... <!-- signal-log:end -->');
  process.exit(0);
}

const existing = fs.readFileSync(target, 'utf8');
if (!/<!-- signal-log:start -->[\s\S]*?<!-- signal-log:end -->/.test(existing)) {
  console.log('[sync-signal-log] markers not found in /signal-log/index.html — leaving file untouched.');
  process.exit(0);
}

const updated = existing.replace(/<!-- signal-log:start -->[\s\S]*?<!-- signal-log:end -->/, block);
if (updated === existing) {
  console.log('[sync-signal-log] no change.');
  process.exit(0);
}

if (DRY) {
  console.log('[sync-signal-log][dry-run] would update /signal-log/index.html with ' + publicEntries.length + ' public entries.');
} else {
  fs.writeFileSync(target, updated, 'utf8');
  console.log('[sync-signal-log] wrote ' + publicEntries.length + ' public entries to /signal-log/index.html');
}
