#!/usr/bin/env node
/**
 * S158 — Touch-target audit gate.
 *
 * Parses `assets/style.css` for interactive selectors that declare an explicit
 * width OR height OR min-* value below 44px inside a mobile media query.
 * Mobile media queries are recognized as those with `(max-width: NNN)` where
 * NNN ≤ 980.
 *
 * Why 44px? Apple HIG + WCAG 2.5.5 enhanced target size minimum.
 *
 * Modes:
 *   default / --strict → fail on violations (release blocking)
 *   --report → advisory report only
 *   --self-test
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const STRICT = !args.includes('--report');
const SELF_TEST = args.includes('--self-test');
const TARGET_MIN = 44;
const MOBILE_MAX_WIDTH = 980;

const INTERACTIVE_TOKENS = [
  /\ba\b/,
  /\bbutton\b/,
  /\.btn\b/,
  /\.button\b/,
  /\[role=["']?button["']?\]/,
  /\.tap-target\b/,
  /input\[/,
  /\.nav-center a\b/,
];

const DECORATIVE_TAIL = /\.(caret|icon|chip|swatch|dot|badge|arrow|sigil)\b\s*$|\bsvg\s*$|\b(img|i)\s*$/;

function isInteractive(selector) {
  if (/::before|::after/.test(selector)) return false;
  if (DECORATIVE_TAIL.test(selector)) return false; // selector targets a child icon, not the tap target
  return INTERACTIVE_TOKENS.some((re) => re.test(selector));
}

function extractValue(text, prop) {
  // Match the property value, stripping !important and trailing semicolons.
  const re = new RegExp(`(?:^|;|\\{)\\s*${prop}\\s*:\\s*([^;}]+)`, 'i');
  const m = text.match(re);
  if (!m) return null;
  const raw = m[1].trim().replace(/\s*!important\s*$/i, '').trim();
  const pxMatch = raw.match(/^([\d.]+)px$/);
  if (pxMatch) return Number(pxMatch[1]);
  const remMatch = raw.match(/^([\d.]+)rem$/);
  if (remMatch) return Number(remMatch[1]) * 16;
  // calc() / clamp() / var() — skip (can't statically verify)
  return null;
}

function findMobileBlocks(css) {
  const blocks = [];
  const mediaRe = /@media\s*([^{]+)\{/g;
  let m;
  while ((m = mediaRe.exec(css)) !== null) {
    const cond = m[1];
    const widthMatch = cond.match(/max-width\s*:\s*(\d+)/);
    if (!widthMatch) continue;
    const maxW = Number(widthMatch[1]);
    if (maxW > MOBILE_MAX_WIDTH) continue;
    // Find balanced closing brace
    let depth = 1;
    let i = mediaRe.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    blocks.push({ cond: cond.trim(), maxW, body: css.slice(mediaRe.lastIndex, i - 1) });
  }
  return blocks;
}

function findRulesInBlock(block) {
  const rules = [];
  const re = /([^{}]+)\{([^{}]+)\}/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    rules.push({ selector: m[1].trim(), declarations: m[2].trim() });
  }
  return rules;
}

function audit(css) {
  const violations = [];
  const blocks = findMobileBlocks(css);
  for (const b of blocks) {
    const rules = findRulesInBlock(b.body);
    for (const r of rules) {
      const selectors = r.selector.split(',').map((s) => s.trim());
      for (const sel of selectors) {
        if (!isInteractive(sel)) continue;
        for (const prop of ['height', 'min-height', 'width', 'min-width']) {
          const v = extractValue(r.declarations, prop);
          if (v != null && v < TARGET_MIN) {
            violations.push({
              media: `max-width: ${b.maxW}px`,
              selector: sel,
              property: prop,
              valuePx: v,
              minRequired: TARGET_MIN,
            });
          }
        }
      }
    }
  }
  return violations;
}

if (SELF_TEST) {
  const cases = [
    {
      name: 'button height 32px in mobile → flag',
      css: '@media (max-width: 768px){ button { height: 32px; } }',
      expect: 1,
    },
    {
      name: 'button height 48px in mobile → ok',
      css: '@media (max-width: 768px){ button { height: 48px; } }',
      expect: 0,
    },
    {
      name: 'desktop-only block (1200px) → ignored',
      css: '@media (max-width: 1200px){ button { height: 32px; } }',
      expect: 0,
    },
    {
      name: 'min-height 2rem (32px) → flag',
      css: '@media (max-width: 640px){ .btn { min-height: 2rem; } }',
      expect: 1,
    },
    {
      name: 'non-interactive selector div → ignored',
      css: '@media (max-width: 640px){ div.row { height: 12px; } }',
      expect: 0,
    },
    {
      name: 'calc()/var() value → skipped',
      css: '@media (max-width: 640px){ button { height: var(--btn-h); } }',
      expect: 0,
    },
  ];
  let pass = 0, fail = 0;
  for (const c of cases) {
    const got = audit(c.css).length;
    const ok = got === c.expect;
    console.log(`  ${ok ? '✓' : '✗'} ${c.name} (expect ${c.expect}, got ${got})`);
    ok ? pass++ : fail++;
  }
  console.log(`\nself-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

const cssPath = path.join(ROOT, 'assets', 'style.css');
if (!fs.existsSync(cssPath)) {
  console.log('check-touch-targets: assets/style.css missing — skip');
  process.exit(0);
}
const css = fs.readFileSync(cssPath, 'utf8');
const violations = audit(css);

console.log('check-touch-targets');
console.log('──────────────────────────────────────────────');
console.log(`  Threshold:    ${TARGET_MIN}px (WCAG 2.5.5 enhanced)`);
console.log(`  Violations:   ${violations.length}`);

if (violations.length) {
  console.log('');
  for (const v of violations.slice(0, 12)) {
    console.log(`  ✗ ${v.selector} { ${v.property}: ${v.valuePx}px } (@${v.media})`);
  }
  if (violations.length > 12) console.log(`  … +${violations.length - 12} more`);
}

if (STRICT && violations.length) process.exit(1);
if (violations.length) console.log('\n(--report is advisory; the default mode blocks releases)');
else console.log('\n✓ all interactive selectors at or above 44px in mobile media queries');
process.exit(0);
