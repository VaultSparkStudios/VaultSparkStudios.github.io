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
  'feedback/index.html',
  'social/index.html',
  'studio-pulse/index.html',
  'nervous-system/index.html',
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

const styles = new Map();
let changed = 0;
const targets = selectedTargets();

if (LIST_TARGETS) {
  console.log(DEFAULT_TARGETS.join('\n'));
  process.exit(0);
}

for (const rel of targets) {
  const abs = path.join(ROOT, rel);
  const original = fs.readFileSync(abs, 'utf8');
  const next = extractFromHtml(original, styles);
  if (next !== original) {
    changed += 1;
    if (!CHECK) fs.writeFileSync(abs, next);
  }
}

const extractedCss = Array.from(styles.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([className, declarations]) => `.${className}{${declarations}}`)
  .join('\n');

const currentCss = fs.readFileSync(STYLE_PATH, 'utf8');
const nextCss = `${stripPreviousBlock(currentCss)}\n\n${START}\n${extractedCss}\n${END}\n`;
const cssChanged = styles.size > 0 && nextCss !== currentCss;
if (!CHECK) fs.writeFileSync(STYLE_PATH, nextCss);

if (CHECK) {
  if (changed || cssChanged) {
    console.error(`inline style extraction drift: ${changed} target file${changed === 1 ? '' : 's'} would change; css block ${cssChanged ? 'would change' : 'is current'}`);
    process.exit(1);
  }
  console.log(`inline style extraction ok (${targets.length} targets)`);
} else {
  console.log(`extracted inline styles from ${changed} file${changed === 1 ? '' : 's'} into ${styles.size} classes`);
}
