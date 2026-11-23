#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STYLE_PATH = path.join(ROOT, 'assets', 'style.css');
const DEFAULT_TARGETS = [
  'index.html',
  'oracle/index.html',
  'social/index.html',
  'studio/index.html',
  'trust/index.html',
  'beta/index.html',
  'agents/index.html',
  'devlog/index.html',
  'press/index.html',
  'dispatch/index.html'
];

const START = '/* extracted intelligence surface inline styles: start */';
const END = '/* extracted intelligence surface inline styles: end */';
const CHECK = process.argv.includes('--check');
const LIST_TARGETS = process.argv.includes('--list-targets');

function argValue(name) {
  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function selectedTargets() {
  const raw = argValue('--targets');
  if (!raw) return DEFAULT_TARGETS;
  const targets = raw.split(',').map((item) => item.trim()).filter(Boolean);
  const unknown = targets.filter((target) => !DEFAULT_TARGETS.includes(target));
  if (unknown.length) {
    throw new Error(`Unknown target(s): ${unknown.join(', ')}. Run --list-targets for supported files.`);
  }
  return targets;
}

function classNameFor(style) {
  const hash = crypto.createHash('sha1').update(style.trim()).digest('hex').slice(0, 10);
  return `vsx-${hash}`;
}

// Read actual HTML tokens, not apparent tags inside JS/CSS/template source.
// Attribute delimiters are recognized only outside quoted values (which may
// themselves contain >, <, or the opposite quote character).
function readTag(text, start) {
  const head = text.slice(start).match(/^<\/?([a-zA-Z][\w:-]*)(?=[\s/>])/);
  if (!head) return null;
  let i = start + head[0].length, quote = null;
  for (; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = null; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === '>') return { start, end: i + 1, name: head[1].toLowerCase(), closing: text[start + 1] === '/', headEnd: start + head[0].length };
  }
  return null;
}

function attributes(text, tag) {
  const result = []; let i = tag.headEnd;
  while (i < tag.end - 1) {
    const whitespaceStart = i;
    while (/\s/.test(text[i] || '') && i < tag.end - 1) i++;
    if (i >= tag.end - 1 || text[i] === '/') break;
    const start = i;
    while (i < tag.end - 1 && !/[\s=/>]/.test(text[i])) i++;
    if (start === i) { i++; continue; }
    const name = text.slice(start, i).toLowerCase();
    while (/\s/.test(text[i] || '') && i < tag.end - 1) i++;
    let valueStart = i, valueEnd = i, quote = null;
    if (text[i] === '=') {
      i++; while (/\s/.test(text[i] || '') && i < tag.end - 1) i++;
      if (text[i] === '"' || text[i] === "'") {
        quote = text[i++]; valueStart = i;
        while (i < tag.end - 1 && text[i] !== quote) i++;
        valueEnd = i; if (text[i] === quote) i++;
      } else {
        valueStart = i; while (i < tag.end - 1 && !/\s/.test(text[i])) i++;
        valueEnd = i;
      }
    }
    result.push({ name, start, end: i, whitespaceStart, valueStart, valueEnd, quote, value: text.slice(valueStart, valueEnd) });
  }
  return result;
}

const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes']);
function rawEnd(text, start, name) {
  const close = new RegExp(`</${name}(?=[\\s/>])`, 'ig'); close.lastIndex = start;
  const match = close.exec(text);
  return match ? (readTag(text, match.index)?.end ?? text.length) : text.length;
}
function templateEnd(text, start) {
  let depth = 1, i = start;
  while (i < text.length) {
    const next = text.indexOf('<', i); if (next < 0) return text.length;
    if (text.startsWith('<!--', next)) { const end = text.indexOf('-->', next + 4); i = end < 0 ? text.length : end + 3; continue; }
    const tag = readTag(text, next); if (!tag) { i = next + 1; continue; }
    i = tag.end;
    if (tag.name === 'template') { depth += tag.closing ? -1 : 1; if (!depth) return i; }
    else if (!tag.closing && RAW_TEXT.has(tag.name)) i = rawEnd(text, i, tag.name);
  }
  return text.length;
}

function rewriteTag(text, tag, styles) {
  if (tag.closing) return text.slice(tag.start, tag.end);
  const attrs = attributes(text, tag), style = attrs.find(a => a.name === 'style');
  if (!style?.value.trim()) return text.slice(tag.start, tag.end);
  const className = classNameFor(style.value);
  styles.set(className, style.value.trim().replace(/\s+/g, ' '));
  const existing = attrs.find(a => a.name === 'class');
  const edits = [{ start: style.whitespaceStart, end: style.end, value: '' }];
  if (existing) {
    const names = new Set(existing.value.split(/\s+/).filter(Boolean)); names.add(className);
    edits.push({ start: existing.start, end: existing.end, value: `class=${existing.quote || '"'}${[...names].join(' ')}${existing.quote || '"'}` });
  } else {
    const insertion = text[tag.end - 2] === '/' ? tag.end - 2 : tag.end - 1;
    edits.push({ start: insertion, end: insertion, value: ` class="${className}"` });
  }
  let result = text.slice(tag.start, tag.end);
  for (const edit of edits.sort((a, b) => b.start - a.start)) result = result.slice(0, edit.start - tag.start) + edit.value + result.slice(edit.end - tag.start);
  return result;
}

function extractFromHtml(text, styles) {
  let out = '', at = 0;
  while (at < text.length) {
    const next = text.indexOf('<', at);
    if (next < 0) { out += text.slice(at); break; }
    out += text.slice(at, next);
    if (text.startsWith('<!--', next) || text.startsWith('<![CDATA[', next)) {
      const marker = text.startsWith('<!--', next) ? '-->' : ']]>', end = text.indexOf(marker, next + 4), stop = end < 0 ? text.length : end + marker.length;
      out += text.slice(next, stop); at = stop; continue;
    }
    const tag = readTag(text, next);
    if (!tag) { out += '<'; at = next + 1; continue; }
    out += rewriteTag(text, tag, styles); at = tag.end;
    if (!tag.closing && (RAW_TEXT.has(tag.name) || tag.name === 'template' || tag.name === 'plaintext')) {
      const stop = tag.name === 'template' ? templateEnd(text, at) : tag.name === 'plaintext' ? text.length : rawEnd(text, at, tag.name);
      out += text.slice(at, stop); at = stop;
    }
  }
  return out;
}

function stripPreviousBlock(css) {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  if (start === -1 || end === -1 || end < start) return css.trimEnd();
  return `${css.slice(0, start).trimEnd()}\n${css.slice(end + END.length).trimStart()}`.trimEnd();
}

// S176 regression fix: extraction is CUMULATIVE. The HTML keeps its vsx-
// classes forever after rewrite, so previously extracted rules must survive
// every future run. Before S176 the block was rebuilt from only the current
// run's finds — one run after the HTML was rewritten, 241/253 rules were
// silently deleted while every page still referenced them (visible symptom:
// the retired now-playing bar lost its display:none and rendered "Loading…").
function seedFromExistingBlock(css, styles) {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  if (start === -1 || end === -1 || end < start) return;
  const block = css.slice(start + START.length, end);
  for (const m of block.matchAll(/\.(vsx-[a-f0-9]{10})\{([^}]*)\}/g)) {
    styles.set(m[1], m[2]);
  }
}

// Prune safety valve: a rule may only be dropped when its class appears in
// no HTML file anywhere in the repo (not just the extraction targets).
function collectReferencedClasses() {
  const referenced = new Set();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.name.endsWith('.html')) {
        const text = fs.readFileSync(abs, 'utf8');
        for (const m of text.matchAll(/vsx-[a-f0-9]{10}/g)) referenced.add(m[0]);
      }
    }
  };
  walk(ROOT);
  return referenced;
}

const styles = new Map();
let changed = 0;
const targets = selectedTargets();

if (LIST_TARGETS) {
  console.log(DEFAULT_TARGETS.join('\n'));
  process.exit(0);
}

const currentCss = fs.readFileSync(STYLE_PATH, 'utf8');
seedFromExistingBlock(currentCss, styles); // cumulative: prior rules survive
// Read every required source before the first rewrite. A missing later route
// must not leave earlier HTML with generated classes whose CSS was never saved.
const originals = new Map(targets.map(rel => [rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')]));

for (const rel of targets) {
  const abs = path.join(ROOT, rel);
  const original = originals.get(rel);
  const next = extractFromHtml(original, styles);
  if (next !== original) {
    changed += 1;
    if (!CHECK) fs.writeFileSync(abs, next);
  }
}

// Drop only rules whose class is referenced by no HTML file in the repo.
const referenced = collectReferencedClasses();
let pruned = 0;
for (const className of Array.from(styles.keys())) {
  if (!referenced.has(className)) {
    styles.delete(className);
    pruned += 1;
  }
}

const extractedCss = Array.from(styles.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([className, declarations]) => `.${className}{${declarations}}`)
  .join('\n');

const nextCss = `${stripPreviousBlock(currentCss)}\n\n${START}\n${extractedCss}\n${END}\n`;
const cssChanged = nextCss !== currentCss;
if (!CHECK && cssChanged) fs.writeFileSync(STYLE_PATH, nextCss);

// ── S275 CLS root-fix: per-page inline vsx block ─────────────────────────────
// Extraction moved formerly-inline styles into assets/style.css — which loads
// via the async media=print swap AFTER first paint. Every extraction target
// therefore painted a semi-unstyled fold and snapped when the sheet landed
// (field CLS p75: /oracle/ 0.465 · /changelog/ 0.637 · /studio-pulse/ 0.243).
// Re-emit each target page's OWN vsx rules as an inline <style> so first paint
// is styled again; the shared sheet still carries the rules for cross-page
// caching (identical text → the double-apply is a no-op).
const PAGE_BLOCK_RE = /<style data-vs-page-styles>[\s\S]*?<\/style>/;
let pageBlocksChanged = 0;
for (const rel of targets) {
  const abs = path.join(ROOT, rel);
  const html = fs.readFileSync(abs, 'utf8');
  const used = new Set(Array.from(html.matchAll(/vsx-[a-f0-9]{10}/g), (m) => m[0]));
  const rules = Array.from(styles.entries())
    .filter(([className]) => used.has(className))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([className, declarations]) => `.${className}{${declarations}}`)
    .join('');
  const block = `<style data-vs-page-styles>${rules}</style>`;
  let next;
  if (PAGE_BLOCK_RE.test(html)) {
    next = html.replace(PAGE_BLOCK_RE, block);
  } else {
    next = html.replace('</head>', `  ${block}\n</head>`);
  }
  if (next !== html) {
    pageBlocksChanged += 1;
    if (!CHECK) fs.writeFileSync(abs, next);
  }
}

// Coverage invariant: every referenced vsx class must have a rule after this run.
const uncovered = Array.from(referenced).filter((c) => !styles.has(c));
if (uncovered.length) {
  console.error(`✗ ${uncovered.length} vsx class(es) referenced in HTML but missing a rule (e.g. ${uncovered.slice(0, 3).join(', ')}) — recover from a prior shell css or re-extract.`);
  process.exitCode = 1;
}

if (CHECK) {
  if (changed || cssChanged || pageBlocksChanged) {
    console.error(`inline style extraction drift: ${changed} target file${changed === 1 ? '' : 's'} would change; css block ${cssChanged ? 'would change' : 'is current'}; ${pageBlocksChanged} page style block(s) stale`);
    process.exit(1);
  }
  console.log(`inline style extraction ok (${targets.length} targets)`);
} else {
  console.log(`extracted inline styles from ${changed} file${changed === 1 ? '' : 's'} into ${styles.size} classes (cumulative · pruned ${pruned} unreferenced · ${pageBlocksChanged} page block(s) refreshed)`);
}
