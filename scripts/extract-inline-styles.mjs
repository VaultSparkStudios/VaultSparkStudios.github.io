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
  'studio-pulse/index.html',
  'security/index.html'
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

function appendClass(attrs, className) {
  if (/\sclass\s*=\s*["'][^"']*["']/i.test(attrs)) {
    return attrs.replace(/(\sclass\s*=\s*["'])([^"']*)(["'])/i, (_m, open, value, close) => {
      const names = new Set(value.split(/\s+/).filter(Boolean));
      names.add(className);
      return `${open}${Array.from(names).join(' ')}${close}`;
    });
  }
  return `${attrs} class="${className}"`;
}

function extractFromHtml(text, styles) {
  return text.replace(/<([a-zA-Z][\w:-]*)([^<>]*?)\sstyle=(["'])(.*?)\3([^<>]*?)>/g, (match, tag, before, _quote, styleValue, after) => {
    if (!styleValue.trim()) return match;
    const className = classNameFor(styleValue);
    styles.set(className, styleValue.trim().replace(/\s+/g, ' '));
    const attrs = appendClass(`${before}${after}`, className).replace(/\s{2,}/g, ' ');
    return `<${tag}${attrs}>`;
  });
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

for (const rel of targets) {
  const abs = path.join(ROOT, rel);
  const original = fs.readFileSync(abs, 'utf8');
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
